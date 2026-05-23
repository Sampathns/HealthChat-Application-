"""
HealthChat AI Router — Google Gemini Only
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.ai_service import AIService

router = APIRouter()
ai = AIService()   # single shared instance


# ── Request models ─────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    role: str       # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message:   str
    history:   Optional[List[HistoryItem]] = None
    user_role: Optional[str] = "patient"
    user_name: Optional[str] = "User"

class SymptomRequest(BaseModel):
    symptoms: List[str]
    age:      Optional[int]  = None
    gender:   Optional[str]  = None

class RecommendationRequest(BaseModel):
    conditions:  Optional[List[str]] = []
    medications: Optional[List[str]] = []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/chat")
async def gemini_chat(req: ChatRequest):
    """Chat with HealthAssist AI (Gemini Pro)."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        response = await ai.chat(
            message   = req.message.strip(),
            history   = req.history or [],
            user_role = req.user_role or "patient",
            user_name = req.user_name or "User",
        )
        return {"success": True, "response": response, "provider": "gemini"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/analyze-symptoms")
async def analyze_symptoms(req: SymptomRequest):
    """Analyze symptoms using Gemini and return structured health assessment."""
    if not req.symptoms:
        raise HTTPException(status_code=400, detail="At least one symptom is required")
    try:
        result = await ai.analyze_symptoms(
            symptoms = req.symptoms,
            age      = req.age,
            gender   = req.gender,
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/recommendations")
async def get_recommendations(req: RecommendationRequest):
    """Get personalized health recommendations based on conditions and medications."""
    try:
        result = await ai.get_health_recommendations(
            conditions  = req.conditions  or [],
            medications = req.medications or [],
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")
