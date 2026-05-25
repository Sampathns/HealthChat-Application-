"""
HealthChat AI Microservice — Google Gemini 2.5 Flash
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ai_router import ai_router as router

load_dotenv()



app = FastAPI(
    title="HealthChat AI Service",
    description="AI-powered healthcare assistant — Google Gemini 2.5 Flash",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount AI router
app.include_router(router, prefix="/api/ai", tags=["AI — Gemini"])

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "HealthChat AI",
        "version": "2.1.0",
        "provider": "Google Gemini 2.5 Flash",
        "status": "running"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    return {
        "status": "healthy",
        "api_key_set": bool(gemini_key),
        "message": "✅ Gemini 2.5 Flash ready" if gemini_key else "⚠️ GEMINI_API_KEY not set",
    }

if __name__ == "__main__":
    import uvicorn
    # Render එකට ගැළපෙන පෝට් එක
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)