from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.auth import router as auth_router
from src.api.v1.health import router as health_router
from src.core.config import settings

app = FastAPI(title="Momentarise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
