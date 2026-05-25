"""
HealthChat AI Microservice — Google Gemini 1.5 Flash
"""

import os
import google.generativeai as genai
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# ── System prompt ──────────────────────────────────────────────────────────────
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

# Configure Gemini API Globally
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

class AIService:
    def __init__(self):
        self.gemini_key = GEMINI_KEY
        self.model = None
        self._setup_gemini()

    def _setup_gemini(self):
        if not self.gemini_key:
            print("⚠️ GEMINI_API_KEY not found. Running in FALLBACK mode.")
            return

        try:
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=SYSTEM_PROMPT,        
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=1024,
                )
            )
            print("✅ Google Gemini AI (gemini-1.5-flash) initialized successfully")
        except Exception as e:
            print(f"❌ Gemini setup error: {e}")
            self.model = None

    # ── Main chat method (සම්පූර්ණ කරන ලදි) ──────────────────────────────────
    async def chat(
        self,
        message: str,
        history: list,
        user_role: str = "patient",
        user_name: str = "User",
    ) -> str:
        if not self.model:
            return self._fallback_response(message)
        
        try:
            chat_history = []
            for h in (history or [])[-10:]:
                # 'user' සහ 'model' යන roles දෙක පමණක් හඳුනා ගැනීම
                role = "user" if h.get('role', 'user') == 'user' else 'model'
                content = h.get('content', '')
                
                if content.strip():
                    chat_history.append({"role": role, "parts": [content]})

            # User context එකක් ලෙස එක් කිරීම
            context_prefix = f"[User: {user_name} | Role: {user_role}]\n"
            full_message = context_prefix + message

            # Chat session ආරම්භ කිරීම
            chat_session = self.model.start_chat(history=chat_history)
            response = chat_session.send_message(full_message)
            return response.text

        except Exception as e:
            print(f"❌ Gemini chat error: {e}")
            try:
                # History එකේ අවුලක් නම් පමණක් කෙලින්ම පණිවිඩය යැවීම
                response = self.model.generate_content(full_message)
                return response.text
            except Exception as e2:
                print(f"❌ Gemini retry error: {e2}")
                return self._fallback_response(message)

    # ── Symptom analysis ───────────────────────────────────────────────────────
    async def analyze_symptoms(
        self,
        symptoms: List[str],
        age: Optional[int] = None,
        gender: Optional[str] = None,
    ) -> dict:
        symptom_list = ", ".join(symptoms)
        age_str = f"{age} year old" if age else "unknown age"
        gender_str = gender or "person"

        prompt = f"""A {age_str} {gender_str} is experiencing these symptoms: {symptom_list}
Please provide a structured health assessment based on the system prompt rules."""

        response = await self.chat(prompt, [], "patient", "Patient")
        return {
            "symptoms": symptoms,
            "analysis": response,
            "disclaimer": "⚠️ This analysis is AI-generated for informational purposes only. Please consult a licensed healthcare provider."
        }

    # ── Health recommendations ─────────────────────────────────────────────────
    async def get_health_recommendations(
        self,
        conditions: List[str],
        medications: List[str],
    ) -> dict:
        conditions_str = ", ".join(conditions) if conditions else "None specified"
        medications_str = ", ".join(medications) if medications else "None"

        prompt = f"""Generate personalized health recommendations for someone with:
- Medical conditions: {conditions_str}
- Current medications: {medications_str}"""

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