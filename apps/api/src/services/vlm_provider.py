import logging
from pathlib import Path
from typing import Any

from src.services.provider_config import VlmProviderConfig, load_vlm_provider_config
from src.services.provider_http import extract_http_error, post_json, to_data_url

logger = logging.getLogger(__name__)


def _heuristic_visual_analysis(file_name: str | None) -> dict[str, Any]:
    base = f"Visual analysis placeholder for {file_name}." if file_name else "Visual analysis placeholder."
    return {
        "text": base,
        "provider": "heuristic",
        "model": "v0",
        "confidence": 0.62,
        "fallback_used": True,
    }


def _extract_content_from_completion(result: dict[str, Any]) -> str | None:
    choices = result.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, str) and content.strip():
        return content.strip()
    return None


def _request_mistral_vlm(
    *,
    cfg: VlmProviderConfig,
    file_path: Path,
    mime_type: str | None,
) -> dict[str, Any]:
    if not cfg.mistral_api_key:
        raise ValueError("Mistral API key is missing")
    safe_mime = mime_type or ""
    if not safe_mime.startswith("image/"):
        raise ValueError("VLM analysis supports image/* only")

    data_url = to_data_url(file_path, safe_mime)
    payload = {
        "model": cfg.model,
        "messages": [
            {
                "role": "system",
                "content": "You analyze user captures and extract practical context, entities, and potential actions. Be concise.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image capture and provide actionable context."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.1,
        "max_tokens": 700,
    }
    result = post_json(
        "https://api.mistral.ai/v1/chat/completions",
        payload=payload,
        headers={"Authorization": f"Bearer {cfg.mistral_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    text = _extract_content_from_completion(result)
    if not text:
        raise ValueError("Missing VLM response content")
    return {
        "text": text,
        "provider": "mistral",
        "model": cfg.model,
        "confidence": 0.8,
        "fallback_used": False,
    }


def _request_openai_vlm(
    *,
    cfg: VlmProviderConfig,
    file_path: Path,
    mime_type: str | None,
) -> dict[str, Any]:
    if not cfg.openai_api_key:
        raise ValueError("OpenAI API key is missing")
    safe_mime = mime_type or ""
    if not safe_mime.startswith("image/"):
        raise ValueError("VLM analysis supports image/* only")
    data_url = to_data_url(file_path, safe_mime)
    payload = {
        "model": cfg.model,
        "messages": [
            {
                "role": "system",
                "content": "You analyze user captures and extract practical context, entities, and potential actions. Be concise.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image capture and provide actionable context."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.1,
        "max_tokens": 700,
    }
    result = post_json(
        "https://api.openai.com/v1/chat/completions",
        payload=payload,
        headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    text = _extract_content_from_completion(result)
    if not text:
        raise ValueError("Missing VLM response content")
    return {
        "text": text,
        "provider": "openai",
        "model": cfg.model,
        "confidence": 0.78,
        "fallback_used": False,
    }


def analyze_visual_file(
    *,
    file_path: Path,
    mime_type: str | None,
    file_name: str | None = None,
    config: VlmProviderConfig | None = None,
) -> dict[str, Any]:
    cfg = config or load_vlm_provider_config()
    safe_name = file_name or file_path.name

    if cfg.provider == "heuristic" or not file_path.exists():
        return _heuristic_visual_analysis(safe_name)

    try:
        if cfg.provider == "mistral":
            return _request_mistral_vlm(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
            )
        if cfg.provider == "openai":
            return _request_openai_vlm(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
            )
        raise ValueError(f"Unsupported VLM provider '{cfg.provider}'")
    except Exception as exc:
        logger.warning("vlm provider failed: %s", extract_http_error(exc))
        if cfg.fallback_enabled:
            return _heuristic_visual_analysis(safe_name)
        raise
