from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Load env from apps/api/.env regardless of current working directory.
    model_config = SettingsConfigDict(env_file=str(_API_ROOT / ".env"), env_file_encoding="utf-8")

    APP_ENV: str = "development"
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:3000"
    AUTO_MIGRATE_ON_STARTUP: bool = True
    AUTO_MIGRATE_TIMEOUT_SECONDS: int = 30

    # Capture pipeline flags
    CAPTURE_UPLOAD_ENABLED: bool = True
    CAPTURE_AI_SUGGESTIONS_ENABLED: bool = True
    CAPTURE_AUTO_APPLY_ENABLED: bool = False
    CAPTURE_MISTRAL_PIPELINE_ENABLED: bool = True
    CAPTURE_SYNC_SUBAGENT_ENABLED: bool = True
    CAPTURE_SUBAGENT_ROUTING_ENABLED: bool = True
    CAPTURE_CONTEXT_ENRICHMENT_ENABLED: bool = False
    CAPTURE_WEB_RESEARCH_ENABLED: bool = False
    CAPTURE_BADGES_V2_ENABLED: bool = True
    CAPTURE_ASYNC_WORKER_ENABLED: bool = False

    # Capture storage
    CAPTURE_STORAGE_DIR: str = "/tmp/momentarise_captures"
    CAPTURE_MAX_UPLOAD_BYTES: int = 25_000_000
    CAPTURE_EXTERNAL_TOKEN: str | None = None
    NOTE_SUMMARY_MIN_CHARS: int = 180

    # Celery / queue runtime
    CELERY_BROKER_URL: str | None = None
    CELERY_TASK_MAX_RETRIES: int = 3
    CELERY_TASK_SOFT_TIME_LIMIT_SECONDS: int = 780
    CELERY_TASK_TIME_LIMIT_SECONDS: int = 900
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = 1
    CELERY_TASK_ALWAYS_EAGER: bool = False

    # Provider settings
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    CAPTURE_PROVIDER_TIMEOUT_SECONDS: float = 20.0
    CAPTURE_TRANSCRIPTION_PROVIDER: str = "mistral"
    CAPTURE_TRANSCRIPTION_MODEL: str = "voxtral-mini-latest"
    CAPTURE_OCR_PROVIDER: str = "mistral"
    CAPTURE_OCR_MODEL: str = "mistral-ocr-latest"
    CAPTURE_VLM_PROVIDER: str = "mistral"
    CAPTURE_VLM_MODEL: str = "pixtral-12b-latest"
    CAPTURE_SUMMARIZATION_PROVIDER: str = "mistral"
    CAPTURE_SUMMARIZATION_MODEL: str = "mistral-small-latest"

    # Travel settings
    GOOGLE_MAPS_API_KEY: str | None = None
    MAPS_DEFAULT_TRAVEL_MODE: str = "driving"

    # Sync LLM runtime
    MISTRAL_API_KEY: str | None = None
    SYNC_LLM_PROVIDER: str = "mistral"
    SYNC_MODEL_SMALL: str = "mistral-small-latest"
    SYNC_MODEL_BALANCED: str = "mistral-medium-latest"
    SYNC_MODEL_QUALITY: str = "mistral-large-latest"
    SYNC_LLM_TIMEOUT_SECONDS: float = 45.0
    SYNC_LLM_MAX_RETRIES: int = 2
    SYNC_MAX_TOOL_LOOPS: int = 4
    SYNC_ENABLE_FALLBACK: bool = True


settings = Settings()  # type: ignore[call-arg]
