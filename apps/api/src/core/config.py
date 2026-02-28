from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:3000"
    CAPTURE_STORAGE_DIR: str = "/tmp/momentarise_captures"
    CAPTURE_MAX_UPLOAD_BYTES: int = 25_000_000
    CAPTURE_EXTERNAL_TOKEN: str | None = None
    GOOGLE_MAPS_API_KEY: str | None = None


settings = Settings()  # type: ignore[call-arg]
