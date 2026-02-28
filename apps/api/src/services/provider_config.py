from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from src.core.config import settings

CaptureProvider = Literal["mistral", "openai", "heuristic"]


class TranscriptionProviderConfig(BaseModel):
    provider: CaptureProvider = "mistral"
    mistral_api_key: str | None = None
    openai_api_key: str | None = None
    model: str = "voxtral-mini-latest"
    language: str = "auto"
    fallback_enabled: bool = True
    timeout_seconds: float = Field(default=20.0, ge=1, le=120)


class OcrProviderConfig(BaseModel):
    provider: CaptureProvider = "mistral"
    mistral_api_key: str | None = None
    openai_api_key: str | None = None
    model: str = "mistral-ocr-latest"
    fallback_enabled: bool = True
    timeout_seconds: float = Field(default=20.0, ge=1, le=120)


class VlmProviderConfig(BaseModel):
    provider: CaptureProvider = "mistral"
    mistral_api_key: str | None = None
    openai_api_key: str | None = None
    model: str = "pixtral-12b-latest"
    fallback_enabled: bool = True
    timeout_seconds: float = Field(default=20.0, ge=1, le=120)


class SummarizationProviderConfig(BaseModel):
    provider: CaptureProvider = "mistral"
    mistral_api_key: str | None = None
    openai_api_key: str | None = None
    model: str = "mistral-small-latest"
    fallback_enabled: bool = True
    timeout_seconds: float = Field(default=20.0, ge=1, le=120)


class MapsProviderConfig(BaseModel):
    provider: Literal["google_maps", "heuristic"] = "google_maps"
    api_key: str | None = None
    default_mode: str = "driving"
    timeout_seconds: float = Field(default=10.0, ge=1, le=120)


def _safe_provider(value: object, fallback: CaptureProvider) -> CaptureProvider:
    if isinstance(value, str) and value in {"mistral", "openai", "heuristic"}:
        return value
    return fallback


def _safe_model(value: object, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _safe_language(value: object, fallback: str = "auto") -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _safe_fallback_enabled(value: object, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    return default


def _setting_from_overrides(overrides: dict[str, Any] | None, key: str) -> dict[str, Any]:
    if not isinstance(overrides, dict):
        return {}
    value = overrides.get(key)
    return value if isinstance(value, dict) else {}


def load_transcription_provider_config(
    overrides: dict[str, Any] | None = None,
) -> TranscriptionProviderConfig:
    source = _setting_from_overrides(overrides, "transcription")
    provider = _safe_provider(source.get("provider"), _safe_provider(settings.CAPTURE_TRANSCRIPTION_PROVIDER, "mistral"))
    return TranscriptionProviderConfig(
        provider=provider,
        mistral_api_key=settings.MISTRAL_API_KEY,
        openai_api_key=settings.OPENAI_API_KEY,
        model=_safe_model(source.get("model"), settings.CAPTURE_TRANSCRIPTION_MODEL),
        language=_safe_language(source.get("language"), "auto"),
        fallback_enabled=_safe_fallback_enabled(source.get("fallback_enabled"), True),
        timeout_seconds=settings.CAPTURE_PROVIDER_TIMEOUT_SECONDS,
    )


def load_ocr_provider_config(overrides: dict[str, Any] | None = None) -> OcrProviderConfig:
    source = _setting_from_overrides(overrides, "ocr")
    provider = _safe_provider(source.get("provider"), _safe_provider(settings.CAPTURE_OCR_PROVIDER, "mistral"))
    return OcrProviderConfig(
        provider=provider,
        mistral_api_key=settings.MISTRAL_API_KEY,
        openai_api_key=settings.OPENAI_API_KEY,
        model=_safe_model(source.get("model"), settings.CAPTURE_OCR_MODEL),
        fallback_enabled=_safe_fallback_enabled(source.get("fallback_enabled"), True),
        timeout_seconds=settings.CAPTURE_PROVIDER_TIMEOUT_SECONDS,
    )


def load_vlm_provider_config(overrides: dict[str, Any] | None = None) -> VlmProviderConfig:
    source = _setting_from_overrides(overrides, "vlm")
    provider = _safe_provider(source.get("provider"), _safe_provider(settings.CAPTURE_VLM_PROVIDER, "mistral"))
    return VlmProviderConfig(
        provider=provider,
        mistral_api_key=settings.MISTRAL_API_KEY,
        openai_api_key=settings.OPENAI_API_KEY,
        model=_safe_model(source.get("model"), settings.CAPTURE_VLM_MODEL),
        fallback_enabled=_safe_fallback_enabled(source.get("fallback_enabled"), True),
        timeout_seconds=settings.CAPTURE_PROVIDER_TIMEOUT_SECONDS,
    )


def load_summarization_provider_config(
    overrides: dict[str, Any] | None = None,
) -> SummarizationProviderConfig:
    source = _setting_from_overrides(overrides, "summarization")
    provider = _safe_provider(
        source.get("provider"),
        _safe_provider(settings.CAPTURE_SUMMARIZATION_PROVIDER, "mistral"),
    )
    return SummarizationProviderConfig(
        provider=provider,
        mistral_api_key=settings.MISTRAL_API_KEY,
        openai_api_key=settings.OPENAI_API_KEY,
        model=_safe_model(source.get("model"), settings.CAPTURE_SUMMARIZATION_MODEL),
        fallback_enabled=_safe_fallback_enabled(source.get("fallback_enabled"), True),
        timeout_seconds=settings.CAPTURE_PROVIDER_TIMEOUT_SECONDS,
    )


def load_maps_provider_config() -> MapsProviderConfig:
    provider = "google_maps" if settings.GOOGLE_MAPS_API_KEY else "heuristic"
    return MapsProviderConfig(
        provider=provider,
        api_key=settings.GOOGLE_MAPS_API_KEY,
        default_mode=settings.MAPS_DEFAULT_TRAVEL_MODE,
        timeout_seconds=min(settings.CAPTURE_PROVIDER_TIMEOUT_SECONDS, 10.0),
    )
