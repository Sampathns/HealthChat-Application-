

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.ai_router import router as ai_router

load_dotenv()

app = FastAPI(
    title="HealthChat AI Service",
    description="AI-powered healthcare assistant — Google Gemini Pro",
    version="2.0.0",
    docs_url="/docs",        # Swagger UI at /docs
    redoc_url="/redoc",
)

# CORS — allow all origins in dev (lock down in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount AI router
app.include_router(ai_router, prefix="/ai", tags=["AI — Gemini"])



@app.get("/", tags=["Health"])
async def root():
    return {
        "service":   "HealthChat AI",
        "version":   "2.0.0",
        "provider":  "Google Gemini pro",
        "status":    "running",
        "endpoints": {
            "chat":            "POST /ai/chat",
            "symptoms":        "POST /ai/analyze-symptoms",
            "recommendations": "POST /ai/recommendations",
            "docs":            "GET  /docs",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status":     "healthy",
        "provider":   "gemini",
        "api_key_set": bool(gemini_key),
        "message":    "✅ Gemini ready" if gemini_key else "⚠️ GEMINI_API_KEY not set",
    }


if __name__ == "__main__":
    import uvicorn
  
    server_port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=server_port, reload=False) 