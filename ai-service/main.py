from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import router

app = FastAPI(
    title="AI Candidate Discovery — AI Service",
    description="Interview generation, fraud detection, multilingual support, semantic search",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
