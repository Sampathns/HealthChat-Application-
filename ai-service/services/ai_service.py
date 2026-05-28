"""
HealthChat AI Microservice — Groq llama-3.3-70b
"""

import os
from groq import Groq
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

STRICT RULES:
1. NEVER diagnose diseases — always say "consult a licensed physician"
2. NEVER prescribe medications or specific dosages
3. For ANY emergency symptoms (chest pain, stroke, severe bleeding) → say "Call emergency services (1990) now"
4. Always be empathetic, warm, and professional
5. Always remind the user you are an AI, not a real doctor
Respond in the same language the user writes in."""

GROQ_KEY = os.getenv("GROQ_API_KEY", "").strip()
MODEL = "llama-3.3-70b-versatile"

class AIService:
    def __init__(self):
        self.client = None
        self._setup_groq()

    def _setup_groq(self):
        if not GROQ_KEY:
            print("⚠️ GROQ_API_KEY not found. Running in FALLBACK mode.")
            return
        try:
            self.client = Groq(api_key=GROQ_KEY)
            print(f"✅ Groq AI ({MODEL}) initialized successfully")
        except Exception as e:
            print(f"❌ Groq setup error: {e}")
            self.client = None

    async def chat(self, message: str, history: list, user_role: str = "patient", user_name: str = "User") -> str:
        if not self.client:
            return self._fallback_response(message)
        try:
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for h in (history or [])[-10:]:
                content = h.get("content", "")
                if content.strip():
                    role = "assistant" if h.get("role") in ["assistant", "model"] else "user"
                    messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": f"[{user_name} | {user_role}]\n{message}"})

            response = self.client.chat.completions.create(
                model=MODEL,
                messages=messages, # type: ignore
                temperature=0.7,
                max_tokens=1024,
            )
            return response.choices[0].message.content # type: ignore
        except Exception as e:
            print(f"❌ Groq chat error: {e}")
            return self._fallback_response(message)

    async def analyze_symptoms(self, symptoms: List[str], age: Optional[int] = None, gender: Optional[str] = None) -> dict:
        symptom_list = ", ".join(symptoms)
        prompt = f"A {age or 'unknown age'} year old {gender or 'person'} has: {symptom_list}. Provide a health assessment."
        response = await self.chat(prompt, [], "patient", "Patient")
        return {
            "symptoms": symptoms,
            "analysis": response,
            "disclaimer": "⚠️ AI-generated only. Please consult a licensed healthcare provider."
        }

    async def get_health_recommendations(self, conditions: List[str], medications: List[str]) -> dict:
        prompt = f"Conditions: {', '.join(conditions) or 'None'}. Medications: {', '.join(medications) or 'None'}. Give health recommendations."
        response = await self.chat(prompt, [], "patient", "Patient")
        return {
            "conditions": conditions,
            "medications": medications,
            "recommendations": response,
            "disclaimer": "⚠️ Always consult your doctor before making changes."
        }

    def _fallback_response(self, message: str) -> str:
        if any(w in message.lower() for w in ["emergency", "heart attack", "stroke", "unconscious"]):
            return "🚨 This sounds like a medical emergency! Please call 1990 immediately."
        return "👋 HealthAssist AI is connecting. How can I help you today?"