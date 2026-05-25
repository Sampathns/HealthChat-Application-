from fastapi import APIRouter
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from services.ai_service import AIService

ai_router = APIRouter()
ai = AIService()


class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []
    user_role: str = "patient"
    user_name: str = "User"


class SymptomsRequest(BaseModel):
    symptoms: List[str]
    age: Optional[int] = None
    gender: Optional[str] = None


class RecommendationsRequest(BaseModel):
    conditions: List[str] = []
    medications: List[str] = []


@ai_router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    reply = await ai.chat(req.message, req.history, req.user_role, req.user_name)
    return {"success": True, "reply": reply}


@ai_router.post("/analyze-symptoms")
async def analyze_endpoint(req: SymptomsRequest):
    result = await ai.analyze_symptoms(req.symptoms, req.age, req.gender)
    return {"success": True, **result}


@ai_router.post("/recommendations")
async def recs_endpoint(req: RecommendationsRequest):
    result = await ai.get_health_recommendations(req.conditions, req.medications)
    return {"success": True, **result}