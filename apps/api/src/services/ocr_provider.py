import logging
from pathlib import Path
from typing import Any

from src.services.provider_config import OcrProviderConfig, load_ocr_provider_config
from src.services.provider_http import extract_http_error, post_json, to_data_url

logger = logging.getLogger(__name__)


def _heuristic_extraction(file_name: str | None) -> dict[str, Any]:
    base = f"Extracted text from {file_name}." if file_name else "Extracted text from document/image."
    return {
        "text": base,
        "provider": "heuristic",
        "model": "v0",
        "confidence": 0.68,
        "fallback_used": True,
    }


def _extract_text_from_mistral_ocr(payload: dict[str, Any]) -> str | None:
    direct = payload.get("text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    pages = payload.get("pages")
    if isinstance(pages, list):
        chunks: list[str] = []
        for page in pages:
            if not isinstance(page, dict):
                continue
            for key in ("text", "markdown", "content"):
                value = page.get(key)
                if isinstance(value, str) and value.strip():
                    chunks.append(value.strip())
                    break
        if chunks:
            return "\n\n".join(chunks)

    output = payload.get("output")
    if isinstance(output, dict):
        for key in ("text", "markdown"):
            value = output.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _request_mistral_ocr(
    *,
    cfg: OcrProviderConfig,
    file_path: Path,
    mime_type: str | None,
) -> dict[str, Any]:
    if not cfg.mistral_api_key:
        raise ValueError("Mistral API key is missing")
    safe_mime = mime_type or "application/octet-stream"
    data_url = to_data_url(file_path, safe_mime)
    payload = {
        "model": cfg.model,
        "document": {
            "type": "document_url",
            "document_url": data_url,
        },
        "include_image_base64": False,
    }
    result = post_json(
        "https://api.mistral.ai/v1/ocr",
        payload=payload,
        headers={"Authorization": f"Bearer {cfg.mistral_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    text = _extract_text_from_mistral_ocr(result)
    if not text:
        raise ValueError("Missing OCR text in Mistral response")
    return {
        "text": text,
        "provider": "mistral",
        "model": cfg.model,
        "confidence": 0.85,
        "fallback_used": False,
    }


def _request_openai_vision_ocr(
    *,
    cfg: OcrProviderConfig,
    file_path: Path,
    mime_type: str | None,
) -> dict[str, Any]:
    if not cfg.openai_api_key:
        raise ValueError("OpenAI API key is missing")
    safe_mime = mime_type or ""
    if not safe_mime.startswith("image/"):
        raise ValueError("OpenAI OCR path supports image/* only")
    data_url = to_data_url(file_path, safe_mime)
    payload = {
        "model": cfg.model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract readable text from this image. Return plain text only.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }
        ],
        "max_tokens": 800,
    }
    result = post_json(
        "https://api.openai.com/v1/chat/completions",
        payload=payload,
        headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
        timeout_seconds=cfg.timeout_seconds,
    )
    choices = result.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("Missing choices in OCR response")
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    text = message.get("content") if isinstance(message, dict) else None
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Missing OCR text")
    return {
        "text": text.strip(),
        "provider": "openai",
        "model": cfg.model,
        "confidence": 0.82,
        "fallback_used": False,
    }


def extract_text_from_file(
    *,
    file_path: Path,
    mime_type: str | None,
    file_name: str | None = None,
    config: OcrProviderConfig | None = None,
) -> dict[str, Any]:
    cfg = config or load_ocr_provider_config()
    safe_name = file_name or file_path.name

    if cfg.provider == "heuristic" or not file_path.exists():
        return _heuristic_extraction(safe_name)

    try:
        if cfg.provider == "mistral":
            return _request_mistral_ocr(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
            )
        if cfg.provider == "openai":
            return _request_openai_vision_ocr(
                cfg=cfg,
                file_path=file_path,
                mime_type=mime_type,
            )
        raise ValueError(f"Unsupported OCR provider '{cfg.provider}'")
    except Exception as exc:
        logger.warning("ocr provider failed: %s", extract_http_error(exc))
        if cfg.fallback_enabled:
            return _heuristic_extraction(safe_name)
        raise
