"""
HealthChat AI Microservice — Google Gemini 2.0 Flash
"""

import os
from google import genai
from google.genai import types
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are HealthAssist AI, an intelligent healthcare assistant built into the HealthChat platform.
You help patients and doctors with:
- Symptom assessment and health triage
- General health information and medical education
- Medication information and reminders
- Appointment scheduling guidance
- Healthy lifestyle and wellness recommendations
- Explaining medical terminology in simple language

STRICT RULES — follow these always:
1. NEVER diagnose diseases — always say "consult a licensed physician"
2. NEVER prescribe medications or specific dosages
3. For ANY emergency symptoms (chest pain, stroke signs, severe bleeding, unconsciousness) → immediately say "Call emergency services (1990) now"
4. Always be empathetic, warm, and professional
5. Use simple, easy-to-understand language
6. Always remind the user you are an AI, not a real doctor
7. Keep responses concise but thorough — use bullet points when listing items
You ONLY use Google Gemini AI. Respond in the same language the user writes in."""

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()

class AIService:
    def __init__(self):
        self.gemini_key = GEMINI_KEY
        self.client = None
        self._setup_gemini()

    def _setup_gemini(self):
        if not self.gemini_key:
            print("⚠️ GEMINI_API_KEY not found. Running in FALLBACK mode.")
            return
        try:
            self.client = genai.Client(api_key=self.gemini_key)
            print("✅ Google Gemini AI (gemini-2.0-flash) initialized successfully")
        except Exception as e:
            print(f"❌ Gemini setup error: {e}")
            self.client = None

    async def chat(
        self,
        message: str,
        history: list,
        user_role: str = "patient",
        user_name: str = "User",
    ) -> str:
        if not self.client:
            return self._fallback_response(message)

        try:
            # Build history for Gemini
            chat_history = []
            for h in (history or [])[-10:]:
                role = "user" if h.get('role', 'user') == 'user' else 'model'
                content = h.get('content', '')
                if content.strip():
                    chat_history.append(types.Content(
                        role=role,
                        parts=[types.Part(text=content)]
                    ))

            context_prefix = f"[User: {user_name} | Role: {user_role}]\n"
            full_message = context_prefix + message

            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=chat_history + [types.Content(
                    role="user",
                    parts=[types.Part(text=full_message)]
                )],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.7,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=1024,
                )
            )
            return response.text

        except Exception as e:
            print(f"❌ Gemini chat error: {e}")
            return self._fallback_response(message)

    async def analyze_symptoms(
        self,
        symptoms: List[str],
        age: Optional[int] = None,
        gender: Optional[str] = None,
    ) -> dict:
        symptom_list = ", ".join(symptoms)
        age_str = f"{age} year old" if age else "unknown age"
        gender_str = gender or "person"
        prompt = f"A {age_str} {gender_str} is experiencing these symptoms: {symptom_list}\nPlease provide a structured health assessment."
        response = await self.chat(prompt, [], "patient", "Patient")
        return {
            "symptoms": symptoms,
            "analysis": response,
            "disclaimer": "⚠️ This analysis is AI-generated for informational purposes only. Please consult a licensed healthcare provider."
        }

    async def get_health_recommendations(
        self,
        conditions: List[str],
        medications: List[str],
    ) -> dict:
        conditions_str = ", ".join(conditions) if conditions else "None specified"
        medications_str = ", ".join(medications) if medications else "None"
        prompt = f"Generate personalized health recommendations for someone with:\n- Medical conditions: {conditions_str}\n- Current medications: {medications_str}"
        response = await self.chat(prompt, [], "patient", "Patient")
        return {
            "conditions": conditions,
            "medications": medications,
            "recommendations": response,
            "disclaimer": "⚠️ Always consult your doctor before making any changes to your routine."
        }

    def _fallback_response(self, message: str) -> str:
        if any(w in message.lower() for w in ["emergency", "heart attack", "stroke", "unconscious"]):
            return "🚨 **This sounds like a medical emergency!** Please call 1990 (Suwa Seriya) immediately."
        return "👋 Hello! HealthAssist AI is connecting. How can I help you today?"