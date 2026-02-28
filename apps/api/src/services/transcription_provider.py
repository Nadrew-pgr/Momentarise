import logging
from pathlib import Path
from typing import Any

from src.services.provider_config import (
    TranscriptionProviderConfig,
    load_transcription_provider_config,
)
from src.services.provider_http import extract_http_error, post_multipart_file

logger = logging.getLogger(__name__)


def _heuristic_transcript(file_name: str | None) -> dict[str, Any]:
    base = f"Transcribed from {file_name}." if file_name else "Transcribed audio content."
    return {
        "text": base,
        "provider": "heuristic",
        "model": "v0",
        "confidence": 0.72,
        "fallback_used": True,
    }


def _extract_text(payload: dict[str, Any]) -> str | None:
    for key in ("text", "transcript"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _request_mistral_transcription(
    *,
    cfg: TranscriptionProviderConfig,
    file_path: Path,
    mime_type: str | None,
    file_name: str,
) -> dict[str, Any]:
    if not cfg.mistral_api_key:
        raise ValueError("Mistral API key is missing")
    fields: dict[str, str] = {"model": cfg.model}
    if cfg.language and cfg.language != "auto":
        fields["language"] = cfg.language
    result = post_multipart_file(
        url="https://api.mistral.ai/v1/audio/transcriptions",
        file_path=file_path,
        file_field="file",
        file_name=file_name,
        file_mime_type=mime_type,
        extra_fields=fields,
        headers={"Authorization": f"Bearer {cfg.mistral_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    text = _extract_text(result)
    if not text:
        raise ValueError("Missing text in Mistral transcription response")
    return {
        "text": text,
        "provider": "mistral",
        "model": cfg.model,
        "confidence": 0.9,
        "fallback_used": False,
    }


def _request_openai_transcription(
    *,
    cfg: TranscriptionProviderConfig,
    file_path: Path,
    mime_type: str | None,
    file_name: str,
) -> dict[str, Any]:
    if not cfg.openai_api_key:
        raise ValueError("OpenAI API key is missing")
    fields = {
        "model": cfg.model,
        "response_format": "json",
    }
    if cfg.language and cfg.language != "auto":
        fields["language"] = cfg.language
    result = post_multipart_file(
        url="https://api.openai.com/v1/audio/transcriptions",
        file_path=file_path,
        file_field="file",
        file_name=file_name,
        file_mime_type=mime_type,
        extra_fields=fields,
        headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    text = _extract_text(result)
    if not text:
        raise ValueError("Missing text in OpenAI transcription response")
    return {
        "text": text,
        "provider": "openai",
        "model": cfg.model,
        "confidence": 0.9,
        "fallback_used": False,
    }


def transcribe_audio_file(
    *,
    file_path: Path,
    mime_type: str | None,
    file_name: str | None = None,
    config: TranscriptionProviderConfig | None = None,
) -> dict[str, Any]:
    cfg = config or load_transcription_provider_config()
    safe_name = file_name or file_path.name

    if cfg.provider == "heuristic" or not file_path.exists():
        return _heuristic_transcript(safe_name)

    try:
        if cfg.provider == "mistral":
            return _request_mistral_transcription(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
                file_name=safe_name,
            )
        if cfg.provider == "openai":
            return _request_openai_transcription(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
                file_name=safe_name,
            )
        raise ValueError(f"Unsupported transcription provider '{cfg.provider}'")
    except Exception as exc:
        logger.warning("transcription provider failed: %s", extract_http_error(exc))
        if cfg.fallback_enabled:
            return _heuristic_transcript(safe_name)
        raise
