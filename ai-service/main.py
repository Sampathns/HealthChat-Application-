"""
HealthChat AI Microservice — Groq (llama-3.3-70b)
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ai_router import ai_router as router

load_dotenv()

app = FastAPI(
    title="HealthChat AI Service",
    description="AI-powered healthcare assistant — Groq llama-3.3-70b",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/ai", tags=["AI — Groq"])

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "HealthChat AI",
        "version": "2.1.0",
        "provider": "Groq llama-3.3-70b",
        "status": "running"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    return {
        "status": "healthy",
        "api_key_set": bool(groq_key),
        "message": "✅ Groq ready" if groq_key else "⚠️ GROQ_API_KEY not set",
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)