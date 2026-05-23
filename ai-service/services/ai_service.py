"""
HealthChat AI Service — Google Gemini Only
==========================================
Uses Google Gemini 2.5 Flash for all AI responses.
Get your free API key: https://aistudio.google.com/app/apikey
"""

import os
import json
from typing import List, Optional
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
3. For ANY emergency symptoms (chest pain, stroke signs, severe bleeding, unconsciousness) → immediately say "Call emergency services (911) now"
4. Always be empathetic, warm, and professional
5. Use simple, easy-to-understand language
6. Always remind the user you are an AI, not a real doctor
7. Keep responses concise but thorough — use bullet points when listing items

You ONLY use Google Gemini AI. Respond in the same language the user writes in."""


# ── Gemini AI Service ──────────────────────────────────────────────────────────
class AIService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = None
        self._setup_gemini()

    def _setup_gemini(self):
        """Initialize Google Gemini client."""
        if not self.gemini_key:
            print("⚠️  GEMINI_API_KEY not found in .env file")
            print("    Get your free key at: https://aistudio.google.com/app/apikey")
            print("    Running in FALLBACK mode — basic responses only")
            return

        try:
            import google.generativeai as genai
            from google.generativeai.types import GenerationConfig

            genai.configure(api_key=self.gemini_key)

            # Gemini 1.5 Flash සඳහා ගැළපෙන config object එක
            generation_config = GenerationConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=1024,
            )

            # Safety settings — allow medical content
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT",       "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_HATE_SPEECH",      "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT","threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]

            # Gemini 1.5 Flash වලට System Instruction දෙන්නේ මෙන්න මේ ක්‍රමයටයි
            # Attempt to list available models and save them for debugging.
            try:
                available = genai.list_models()
                model_names = []
                try:
                    # `available` may be a generator; iterate and extract a name attribute
                    for m in available:
                        name = None
                        if isinstance(m, dict):
                            name = m.get('name') or m.get('model') or str(m)
                        else:
                            name = getattr(m, 'name', None) or getattr(m, 'model', None) or str(m)
                        model_names.append(name)

                    with open(os.path.join(os.path.dirname(__file__), '..', 'available_models.json'), 'w', encoding='utf-8') as mf:
                        json.dump(model_names, mf, ensure_ascii=False, indent=2)
                    print("ℹ️  Wrote available model names to available_models.json")
                except Exception as iter_err:
                    print(f"ℹ️  Could not iterate available models: {iter_err}")
            except Exception as list_err:
                print(f"ℹ️  Could not list models: {list_err}")

            # Try candidates: prefer the env model, then the list_models output if available,
            # otherwise fall back to some common names.
            env_model = os.getenv("GEMINI_MODEL")
            candidates = []
            if env_model:
                candidates.append(env_model)

            # If list_models created `model_names`, prefer those.
            if 'model_names' in locals() and model_names:
                # extend with models discovered from the API (they include 'models/...' prefix)
                candidates.extend(model_names)
            else:
                candidates.extend([
                    "models/gemini-2.5-flash", "models/gemini-2.5-pro", "models/gemini-1.5-flash",
                    "models/gemini-1.5", "models/chat-bison", "models/text-bison"
                ])

            chosen = None
            for model_name in candidates:
                try:
                    m = genai.GenerativeModel(
                        model_name=model_name,
                        generation_config=generation_config,
                        safety_settings=safety_settings,
                        system_instruction=SYSTEM_PROMPT,
                    )

                    # Lightweight capability check: attempt a tiny generate request.
                    try:
                        _test = m.generate_content(contents="Hello")
                        chosen = model_name
                        self.model = m
                        print("✅ Google Gemini AI initialized successfully")
                        print(f"   Model: {model_name}")
                        break
                    except Exception as gen_err:
                        print(f"   Model {model_name} unsupported: {gen_err}")
                        continue

                except Exception as build_err:
                    print(f"   Failed to construct model {model_name}: {build_err}")
                    continue

            if not chosen:
                print("❌ No compatible Gemini model found; running in fallback mode.")
                self.model = None

        except ImportError:
            print("❌ google-generativeai package not installed")
            print("   Run: pip install google-generativeai")
            self.model = None
        except Exception as e:
            print(f"❌ Gemini setup error: {e}")
            self.model = None

    # ── Main chat method ───────────────────────────────────────────────────────
    async def chat(
        self,
        message: str,
        history: list,
        user_role: str = "patient",
        user_name: str = "User",
    ) -> str:
        """Send a message to Gemini and get a response."""

        if not self.model:
            return self._fallback_response(message)

        history = history or []
        try:
            # Gemini 1.5 Flash බලාපොරොත්තු වන නිවැරදි History Format එක
            chat_history = []
            for h in history[-10:]:
                role = "user"
                content = ""
                if isinstance(h, dict):
                    role = "user" if h.get('role', 'user') == 'user' else 'model'
                    content = h.get('content', '')
                else:
                    role = "user" if getattr(h, 'role', 'user') == 'user' else 'model'
                    content = getattr(h, 'content', '')

                chat_history.append({
                    "role": role,
                    "parts": [content], # මෙතන ලැයිස්තුවක් (List) තිබීම අනිවාර්යයි
                })

            context_prefix = f"[User: {user_name} | Role: {user_role}]\n"
            full_message = context_prefix + message

            # Chat එක ආරම්භ කර පණිවිඩය යැවීම
            chat_session = self.model.start_chat(history=chat_history)
            response = chat_session.send_message(full_message)

            return response.text

        except Exception as e:
            print(f"❌ Gemini chat error: {e}")
            try:
                # History එකේ ගැටලුවක් ආවොත් කෙලින්ම generate කරන ක්‍රමය
                response = self.model.generate_content(contents=full_message)
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
        """Analyze a list of symptoms using Gemini 1.5 Flash."""

        symptom_list = ", ".join(symptoms)
        age_str    = f"{age} year old" if age else "unknown age"
        gender_str = gender or "person"

        prompt = f"""A {age_str} {gender_str} is experiencing these symptoms: {symptom_list}

Please provide a structured health assessment:

**Possible Causes** (list 3-5, most to least likely):
- ...

**Urgency Level**: [Emergency / Urgent / Non-urgent / Monitor at home]

**Recommended Actions**:
- ...

**Warning Signs** (when to seek immediate care):
- ...

**Home Care Tips** (if non-urgent):
- ...

⚠️ Always end with a reminder to consult a real doctor for proper diagnosis."""

        response = await self.chat(prompt, [], "patient", "Patient")

        return {
            "symptoms": symptoms,
            "analysis": response,
            "disclaimer": (
                "⚠️ This analysis is AI-generated for informational purposes only. "
                "Please consult a licensed healthcare provider for proper medical diagnosis and treatment."
            ),
        }

    # ── Health recommendations ─────────────────────────────────────────────────
    async def get_health_recommendations(
        self,
        conditions: List[str],
        medications: List[str],
    ) -> dict:
        """Generate personalized health recommendations."""

        conditions_str  = ", ".join(conditions)  if conditions  else "None specified"
        medications_str = ", ".join(medications) if medications else "None"

        prompt = f"""Generate personalized health recommendations for someone with:
- Medical conditions: {conditions_str}
- Current medications: {medications_str}

Please cover:

**Lifestyle Recommendations**:
- ...

**Diet & Nutrition**:
- ...

**Exercise Guidance**:
- ...

**Daily Monitoring**:
- ...

**Medication Reminders**:
- ...

**Warning Signs to Watch For**:
- ...

Keep it practical and easy to follow."""

        response = await self.chat(prompt, [], "patient", "Patient")

        return {
            "conditions": conditions,
            "medications": medications,
            "recommendations": response,
            "disclaimer": (
                "⚠️ Always consult your doctor before making any changes "
                "to your medications, diet, or exercise routine."
            ),
        }

    # ── Fallback responses (no API key / error) ────────────────────────────────
    def _fallback_response(self, message: str) -> str:
        """Return a helpful response when Gemini is unavailable."""
        msg = message.lower()

        if any(w in msg for w in ["emergency", "heart attack", "stroke", "unconscious",
                                  "can't breathe", "severe bleeding", "overdose"]):
            return (
                "🚨 **This sounds like a medical emergency!**\n\n"
                "**Please call emergency services immediately:**\n"
                "- 🇱🇰 Sri Lanka: **1990** (Suwa Seriya)\n"
                "- 🌍 International: **911** or your local emergency number\n\n"
                "Do NOT wait — get help right now."
            )

        if any(w in msg for w in ["symptom", "pain", "ache", "fever", "cough",
                                  "headache", "nausea", "dizzy", "tired"]):
            return (
                "I understand you're not feeling well. While my AI engine is connecting, here's general advice:\n\n"
                "✅ **Immediate steps:**\n"
                "- Rest and stay hydrated\n"
                "- Monitor your temperature\n"
                "- Avoid strenuous activity\n\n"
                "🩺 **See a doctor if:**\n"
                "- Symptoms last more than 2-3 days\n"
                "- Fever exceeds 39°C (102°F)\n"
                "- Symptoms suddenly worsen\n\n"
                "Would you like to book an appointment with one of our doctors?"
            )

        if any(w in msg for w in ["appointment", "book", "schedule", "doctor", "visit"]):
            return (
                "📅 **Booking an Appointment:**\n\n"
                "You can easily book an appointment through HealthChat:\n"
                "1. Go to **Find Doctors** in the sidebar\n"
                "2. Browse by specialization\n"
                "3. Click **Book** on any doctor's card\n"
                "4. Select your preferred date and time slot\n\n"
                "Would you like me to help you find the right specialist?"
            )

        if any(w in msg for w in ["medicine", "medication", "drug", "tablet", "pill", "dosage"]):
            return (
                "💊 **Medication Information:**\n\n"
                "I can provide general information about medications, but for specific dosage "
                "and prescription advice, please consult your doctor.\n\n"
                "For medication reminders and prescription details, check the **Prescriptions** "
                "section in your dashboard.\n\n"
                "What medication would you like to know about?"
            )

        return (
            "👋 Hello! I'm **HealthAssist AI**, powered by Google Gemini 2.5 Flash.\n\n"
            "I'm here to help you with:\n"
            "- 🩺 Symptom checking and health guidance\n"
            "- 💊 Medication information\n"
            "- 📅 Appointment advice\n"
            "- 💪 Healthy lifestyle tips\n\n"
            "⚠️ I provide general health information only — always consult "
            "a licensed doctor for medical diagnosis and treatment.\n\n"
            "How can I help you today?"
        )