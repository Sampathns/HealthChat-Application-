from fastapi import APIRouter  # 1. මේ ඉම්පෝර්ට් එක අනිවාර්යයෙන්ම තියෙන්න ඕනේ


import os
import json
import google.generativeai as genai
from typing import List, Dict, Any

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
ai_router = APIRouter()
class AIService:
    def __init__(self):
        # ඩොක්ටර් කෙනෙක් වගේ වගකීමෙන් උත්තර දෙන්න AI එකට දෙන ප්‍රධාන උපදෙස (System Instruction)
        system_prompt = (
            "You are an expert, empathetic AI healthcare assistant named HealthChat AI. "
            "Your goal is to provide helpful, accurate, and structured medical information. "
            "Always maintain a professional yet caring tone. "
            "CRITICAL: Always include a clear, friendly medical disclaimer stating that your advice "
            "is for informational purposes only and the user should consult a real doctor for serious conditions."
        )
        
        # ✅ පරණ gemini-pro වෙනුවට අලුත්ම gemini-2.5-flash එක මෙතනට දැම්මා
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt
        )

    async def chat(self, message: str, history: List[Any], user_role: str, user_name: str) -> str:
        """Handles continuous chat conversations using Gemini 2.5 Flash."""
        try:
            # පරණ චැට් හිස්ට්‍රි එක Gemini එකට ගැළපෙන විදිහට සකස් කිරීම
            gemini_history = []
            for item in history:
                # ෆ්‍රන්ට්එන්ඩ් එකෙන් එන role එක 'user' හෝ 'model' (නැත්නම් 'assistant') කියලා ෂුවර් කරගන්නවා
                role = "user" if item.role == "user" else "model"
                gemini_history.append({"role": role, "parts": [item.content]})

            # චැට් එක ස්ටාර්ට් කිරීම
            chat_session = self.model.start_chat(history=gemini_history)
            
            # පරිශීලකයාගේ විස්තරත් එක්ක ප්‍රොම්ප්ට් එක සකස් කිරීම
            context_prompt = f"Patient Name: {user_name}, Role: {user_role}. Message: {message}"
            
            response = chat_session.send_message(context_prompt)
            return response.text
            
        except Exception as e:
            raise Exception(f"Chat generation failed: {str(e)}")

    async def analyze_symptoms(self, symptoms: List[str], age: int = None, gender: str = None) -> Dict[str, Any]: # type: ignore
        """Analyzes symptoms and returns structured information."""
        try:
            symptoms_str = ", ".join(symptoms)
            prompt = (
                f"Analyze the following symptoms for a patient. "
                f"Patient Details — Age: {age if age else 'Not provided'}, Gender: {gender if gender else 'Not provided'}. "
                f"Symptoms: {symptoms_str}. "
                f"Provide a structured response. Mention potential causes, urgency level (Low, Medium, High), "
                f"home remedies if applicable, and next steps."
            )
            
            response = self.model.generate_content(prompt)
            return {
                "analysis": response.text,
                "symptoms_evaluated": symptoms,
                "urgency_hint": "Please refer to the analysis text for urgency level."
            }
        except Exception as e:
            raise Exception(f"Symptom analysis failed: {str(e)}")

    async def get_health_recommendations(self, conditions: List[str], medications: List[str]) -> Dict[str, Any]:
        """Generates health recommendations based on existing conditions and medicines."""
        try:
            conditions_str = ", ".join(conditions) if conditions else "None reported"
            medications_str = ", ".join(medications) if medications else "None reported"
            
            prompt = (
                f"Provide personalized health and wellness recommendations for a patient with the following profile:\n"
                f"- Existing Health Conditions: {conditions_str}\n"
                f"- Current Medications: {medications_str}\n"
                f"Suggest lifestyle modifications, dietary advice, and general precautionary tips. "
                f"Highlight any potential general food-drug or lifestyle interactions if visible."
            )
            
            response = self.model.generate_content(prompt)
            return {
                "recommendations": response.text,
                "conditions": conditions,
                "medications": medications
            }
        except Exception as e:
            raise Exception(f"Failed to fetch recommendations: {str(e)}")
        
        # ෆයිල් එකේ අන්තිමට මේ රවුට්ස් ටික එකතු කරන්න:
ai = AIService()

@ai_router.post("/chat")
async def chat_endpoint(req: Dict[str, Any]):
    return await ai.chat(
        req["message"], 
        req.get("history", []), 
        req.get("user_role", "patient"), 
        req.get("user_name", "User")
    )

@ai_router.post("/analyze-symptoms")
async def analyze_endpoint(req: Dict[str, Any]):
    return await ai.analyze_symptoms(req["symptoms"], req.get("age"), req.get("gender")) # type: ignore

@ai_router.post("/recommendations")
async def recs_endpoint(req: Dict[str, Any]):
    return await ai.get_health_recommendations(req.get("conditions", []), req.get("medications", []))