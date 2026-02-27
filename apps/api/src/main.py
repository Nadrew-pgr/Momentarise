from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.auth import router as auth_router
from src.api.v1.events import router as events_router
from src.api.v1.health import router as health_router
from src.api.v1.inbox import router as inbox_router
from src.api.v1.items import router as items_router
from src.api.v1.preferences import router as preferences_router
from src.api.v1.timeline import router as timeline_router
from src.api.v1.today import router as today_router
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
app.include_router(today_router, prefix="/api/v1")
app.include_router(timeline_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(inbox_router, prefix="/api/v1")
app.include_router(items_router, prefix="/api/v1")
app.include_router(preferences_router, prefix="/api/v1")
