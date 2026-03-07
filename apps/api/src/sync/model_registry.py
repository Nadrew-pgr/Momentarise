"""
Model Registry — centralised catalogue of all supported LLM models.

Auto-discovery is based on the API keys present in the environment.
Models are tagged with tier (free/pro/ultra), feature compatibility,
reasoning level support, and capability metadata.

Last updated: 2026-03-04
Pricing source: official provider pages + artificialanalysis.ai
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.core.config import settings


@dataclass(frozen=True, slots=True)
class ModelEntry:
    id: str
    provider: str
    label: str
    tier: str  # "free" | "pro" | "ultra"
    features: list[str] = field(default_factory=list)
    reasoning_levels: list[str] | None = None  # e.g. ["low", "medium", "high"]
    supports_tools: bool = True
    supports_vision: bool = False
    supports_reasoning: bool = False
    context_window: int = 128_000
    cost_hint: str = "balanced"  # "fast" | "balanced" | "reasoning"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "label": self.label,
            "tier": self.tier,
            "features": self.features,
            "reasoning_levels": self.reasoning_levels,
            "capabilities": {
                "supports_tools": self.supports_tools,
                "supports_vision": self.supports_vision,
                "supports_reasoning": self.supports_reasoning,
                "context_window": self.context_window,
                "cost_hint": self.cost_hint,
            },
        }


# ---------------------------------------------------------------------------
# Full model catalogue — curated for quality/price, March 2026
# ---------------------------------------------------------------------------
# Pricing: $/M input | $/M output
# ---------------------------------------------------------------------------

_ALL_MODELS: list[ModelEntry] = [

    # ── Mistral AI ─────────────────────────────────────────────────────────
    # Strengths: open-weight, fast, excellent multilingual, great value
    # Mistral Large 3 — $0.50/$1.50 — best open-weight flagship, vision, 262k
    ModelEntry(
        id="mistral-large-latest",
        provider="mistral",
        label="Mistral Large 3",
        tier="free",
        features=["sync", "capture_summarization"],
        supports_vision=True,
        supports_reasoning=True,
        context_window=262_000,
        cost_hint="balanced",
    ),
    # Mistral Small — $0.10/$0.30 — ultra-cheap, good for simple tasks
    ModelEntry(
        id="mistral-small-latest",
        provider="mistral",
        label="Mistral Small",
        tier="free",
        features=["sync", "capture_summarization"],
        cost_hint="fast",
    ),
    # Specialised capture models (not user-selectable for sync)
    ModelEntry(
        id="voxtral-mini-latest",
        provider="mistral",
        label="Voxtral Mini",
        tier="free",
        features=["capture_transcription"],
        supports_tools=False,
        cost_hint="fast",
    ),
    ModelEntry(
        id="mistral-ocr-latest",
        provider="mistral",
        label="Mistral OCR",
        tier="free",
        features=["capture_ocr"],
        supports_tools=False,
        supports_vision=True,
        cost_hint="fast",
    ),
    ModelEntry(
        id="pixtral-large-latest",
        provider="mistral",
        label="Pixtral Large",
        tier="free",
        features=["capture_vlm"],
        supports_tools=False,
        supports_vision=True,
        context_window=128_000,
        cost_hint="balanced",
    ),

    # ── Anthropic ──────────────────────────────────────────────────────────
    # Strengths: best writing/reasoning quality, strongest tool use, safest
    # Sonnet 4.6 — $3/$15 — best value pro, coding + tool use king
    ModelEntry(
        id="claude-sonnet-4-6-20260217",
        provider="anthropic",
        label="Sonnet 4.6",
        tier="pro",
        features=["sync", "capture_summarization"],
        reasoning_levels=["low", "high"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=200_000,
        cost_hint="balanced",
    ),
    # Opus 4.6 — $5/$25 — absolute frontier for complex reasoning
    ModelEntry(
        id="claude-opus-4-6-20260205",
        provider="anthropic",
        label="Opus 4.6",
        tier="ultra",
        features=["sync"],
        reasoning_levels=["low", "high"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=200_000,
        cost_hint="reasoning",
    ),
    # Haiku 4.5 — $1/$5 — fastest Claude, great for bulk tasks
    ModelEntry(
        id="claude-haiku-4-5-20251001",
        provider="anthropic",
        label="Haiku 4.5",
        tier="free",
        features=["sync", "capture_summarization"],
        supports_vision=True,
        context_window=200_000,
        cost_hint="fast",
    ),

    # ── OpenAI ─────────────────────────────────────────────────────────────
    # Strengths: broadest ecosystem, excellent reasoning series, vision
    # GPT-5.3 Instant — $0.88/$7 — 400k ctx, 2x faster, half cost of 5.2
    ModelEntry(
        id="gpt-5.3-instant",
        provider="openai",
        label="GPT-5.3 Instant",
        tier="pro",
        features=["sync", "capture_summarization"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=400_000,
        cost_hint="balanced",
    ),
    # GPT-5.3 Codex — $1.75/$14 — top coding model, 400k ctx, agentic
    ModelEntry(
        id="gpt-5.3-codex",
        provider="openai",
        label="GPT-5.3 Codex",
        tier="ultra",
        features=["sync"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=400_000,
        cost_hint="reasoning",
    ),
    # GPT-5.2 — $1.75/$14 — reasoning low/medium/high/xhigh, flagship
    ModelEntry(
        id="gpt-5.2",
        provider="openai",
        label="GPT-5.2",
        tier="pro",
        features=["sync"],
        reasoning_levels=["low", "medium", "high"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=128_000,
        cost_hint="reasoning",
    ),
    # GPT-5 — $1.25/$10 — strong all-around flagship
    ModelEntry(
        id="gpt-5",
        provider="openai",
        label="GPT-5",
        tier="pro",
        features=["sync"],
        supports_reasoning=True,
        supports_vision=True,
        context_window=128_000,
        cost_hint="balanced",
    ),
    # GPT-5-mini — $0.25/$2 — incredible value, production workhorse
    ModelEntry(
        id="gpt-5-mini",
        provider="openai",
        label="GPT-5 Mini",
        tier="free",
        features=["sync", "capture_summarization"],
        supports_vision=True,
        context_window=128_000,
        cost_hint="fast",
    ),
    # o3 — $2/$8 — best-in-class reasoning (math, science, planning)
    ModelEntry(
        id="o3",
        provider="openai",
        label="o3",
        tier="pro",
        features=["sync"],
        reasoning_levels=["low", "medium", "high"],
        supports_reasoning=True,
        context_window=200_000,
        cost_hint="reasoning",
    ),
    # o4-mini — $1.10/$4.40 — reasoning at a budget
    ModelEntry(
        id="o4-mini",
        provider="openai",
        label="o4-mini",
        tier="pro",
        features=["sync"],
        reasoning_levels=["low", "medium", "high"],
        supports_reasoning=True,
        context_window=200_000,
        cost_hint="balanced",
    ),

    # ── Google Gemini ──────────────────────────────────────────────────────
    # Strengths: massive context (1-2M), multimodal, very competitive pricing
    # Gemini 3.1 Pro — latest flagship (released 2026-02-19)
    ModelEntry(
        id="gemini/gemini-3.1-pro",
        provider="gemini",
        label="Gemini 3.1 Pro",
        tier="pro",
        features=["sync"],
        supports_vision=True,
        supports_reasoning=True,
        context_window=2_000_000,
        cost_hint="reasoning",
    ),
    # Gemini 3 Flash — $0.10/$0.40 — lowest cost frontier model
    ModelEntry(
        id="gemini/gemini-3-flash",
        provider="gemini",
        label="Gemini 3 Flash",
        tier="free",
        features=["sync", "capture_summarization"],
        supports_vision=True,
        context_window=1_000_000,
        cost_hint="fast",
    ),
    # Gemini 3.1 Flash Lite — ultra-cheap
    ModelEntry(
        id="gemini/gemini-3.1-flash-lite",
        provider="gemini",
        label="Flash Lite 3.1",
        tier="free",
        features=["sync", "capture_summarization"],
        supports_vision=True,
        context_window=1_000_000,
        cost_hint="fast",
    ),
]

# ---------------------------------------------------------------------------
# Auto routing — best model per feature × tier
# Optimised for quality/price balance
# ---------------------------------------------------------------------------

AUTO_ROUTING: dict[str, dict[str, str]] = {
    "sync": {
        "free": "mistral-large-latest",           # $0.50/$1.50 — best free
        "pro": "claude-sonnet-4-6-20260217",       # $3/$15 — best tool-use
        "ultra": "claude-opus-4-6-20260205",       # $5/$25 — frontier reasoning
    },
    "capture_transcription": {
        "free": "voxtral-mini-latest",
        "pro": "voxtral-mini-latest",
        "ultra": "voxtral-mini-latest",
    },
    "capture_ocr": {
        "free": "mistral-ocr-latest",
        "pro": "mistral-ocr-latest",
        "ultra": "mistral-ocr-latest",
    },
    "capture_vlm": {
        "free": "pixtral-large-latest",
        "pro": "pixtral-large-latest",
        "ultra": "pixtral-large-latest",
    },
    "capture_summarization": {
        "free": "mistral-small-latest",
        "pro": "claude-sonnet-4-6-20260217",
        "ultra": "claude-sonnet-4-6-20260217",
    },
}


# ---------------------------------------------------------------------------
# Provider availability (based on API keys in .env)
# ---------------------------------------------------------------------------

def _available_providers() -> set[str]:
    """Return the set of providers whose API key is configured."""
    providers: set[str] = set()
    if (settings.MISTRAL_API_KEY or "").strip():
        providers.add("mistral")
    if (settings.ANTHROPIC_API_KEY or "").strip():
        providers.add("anthropic")
    if (settings.OPENAI_API_KEY or "").strip():
        providers.add("openai")
    if (settings.GEMINI_API_KEY or "").strip():
        providers.add("gemini")
    return providers


def get_available_models(
    *,
    feature: str | None = None,
    include_specialised: bool = False,
) -> list[dict[str, Any]]:
    """
    Return models filtered by:
    - Optional feature filter (e.g. "sync", "capture_transcription")
    - include_specialised: if False, exclude models that are only for
      capture_transcription / capture_ocr / capture_vlm (not user-selectable)

    Important:
    - The model catalog remains visible even when some provider keys are missing.
    - Runtime key availability is handled later by the LLM client (with fallback).
    """
    models: list[dict[str, Any]] = []
    for entry in _ALL_MODELS:
        if feature and feature not in entry.features:
            continue
        if not include_specialised:
            # Skip models that are only for specialised capture tasks
            if entry.features and all(
                f.startswith("capture_") and f != "capture_summarization"
                for f in entry.features
            ):
                continue
        models.append(entry.to_dict())

    return models


def resolve_auto_model(
    feature: str,
    user_tier: str = "free",
) -> str:
    """
    Resolve the best model for a given feature × user tier,
    falling back to the free tier if the user's tier isn't found.
    Only returns models whose provider has an API key configured.
    """
    feature_routing = AUTO_ROUTING.get(feature, AUTO_ROUTING.get("sync", {}))
    model_id = feature_routing.get(user_tier) or feature_routing.get("free", "mistral-large-latest")

    providers = _available_providers()

    def _provider_for(model_candidate: str | None) -> str | None:
        if not model_candidate:
            return None
        for entry in _ALL_MODELS:
            if entry.id == model_candidate:
                return entry.provider
        return None

    # 1) Preferred candidate for tier if provider key is available.
    preferred_provider = _provider_for(model_id)
    if preferred_provider and preferred_provider in providers:
        return model_id

    # 2) Try any routed tier candidate whose provider is available.
    for tier in (user_tier, "pro", "free", "ultra"):
        candidate = feature_routing.get(tier)
        candidate_provider = _provider_for(candidate)
        if candidate and candidate_provider and candidate_provider in providers:
            return candidate

    # 3) If nothing is key-routable, keep deterministic free fallback.
    return feature_routing.get("free", "mistral-large-latest")


def get_model_entry(model_id: str) -> ModelEntry | None:
    """Look up a model entry by its ID."""
    for entry in _ALL_MODELS:
        if entry.id == model_id:
            return entry
    return None
