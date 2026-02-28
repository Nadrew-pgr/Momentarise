import logging
from typing import Any

from src.services.provider_config import (
    SummarizationProviderConfig,
    load_summarization_provider_config,
)
from src.services.provider_http import extract_http_error, post_json

logger = logging.getLogger(__name__)


def _heuristic_summary(text: str) -> dict[str, Any]:
    compact = text.strip()
    if not compact:
        compact = "Review this capture."
    summary = compact.splitlines()[0][:240]
    return {
        "text": summary,
        "provider": "heuristic",
        "model": "v0",
        "confidence": 0.65,
        "fallback_used": True,
    }


def _extract_completion_text(result: dict[str, Any]) -> str | None:
    choices = result.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, str) and content.strip():
        return content.strip()
    return None


def summarize_text(
    *,
    text: str,
    config: SummarizationProviderConfig | None = None,
) -> dict[str, Any]:
    cfg = config or load_summarization_provider_config()
    source = text.strip()
    if not source:
        return _heuristic_summary(source)
    if cfg.provider == "heuristic":
        return _heuristic_summary(source)

    endpoint = ""
    headers: dict[str, str] = {}
    if cfg.provider == "mistral":
        if not cfg.mistral_api_key:
            if cfg.fallback_enabled:
                return _heuristic_summary(source)
            raise ValueError("Mistral API key is missing")
        endpoint = "https://api.mistral.ai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {cfg.mistral_api_key}"}
    elif cfg.provider == "openai":
        if not cfg.openai_api_key:
            if cfg.fallback_enabled:
                return _heuristic_summary(source)
            raise ValueError("OpenAI API key is missing")
        endpoint = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {cfg.openai_api_key}"}
    else:
        if cfg.fallback_enabled:
            return _heuristic_summary(source)
        raise ValueError(f"Unsupported summarization provider '{cfg.provider}'")

    try:
        payload = {
            "model": cfg.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Summarize the input in at most 240 characters. "
                        "Prioritize concrete obligations, dates, and decisions."
                    ),
                },
                {
                    "role": "user",
                    "content": source[:12000],
                },
            ],
            "temperature": 0.1,
            "max_tokens": 180,
        }
        result = post_json(
            endpoint,
            payload=payload,
            headers=headers,
            timeout_seconds=cfg.timeout_seconds,
        )
        text_value = _extract_completion_text(result)
        if not text_value:
            raise ValueError("Missing summary text")
        return {
            "text": text_value[:240],
            "provider": cfg.provider,
            "model": cfg.model,
            "confidence": 0.84,
            "fallback_used": False,
        }
    except Exception as exc:
        logger.warning("summarization provider failed: %s", extract_http_error(exc))
        if cfg.fallback_enabled:
            return _heuristic_summary(source)
        raise
