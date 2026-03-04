from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.inbox_capture import InboxCapture
from src.services.capture_subagent_runtime import CaptureSubAgentRuntime
from src.sync.litellm_client import LiteLLMClient
from src.sync.prompt_composer import PromptComposer, PromptComposerInput

ALLOWED_ACTION_TYPES = {
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
    "review",
}


def should_escalate_capture_analysis(semantic_text: str) -> bool:
    lowered = semantic_text.lower()
    has_temporal_dependency = any(
        token in lowered
        for token in [
            "avant",
            "before",
            "apres",
            "after",
            "ensuite",
            "then",
            "puis",
        ]
    )
    has_meeting_signal = any(
        token in lowered for token in ["meeting", "réunion", "reunion", "rdv", "appointment"]
    )
    has_location_signal = any(
        token in lowered
        for token in ["à ", " a ", "chez", "au ", "adresse", "location", "lieu"]
    )
    has_trial_or_warranty = any(
        token in lowered
        for token in [
            "warranty",
            "garantie",
            "trial",
            "essai gratuit",
            "renewal",
            "renouvellement",
        ]
    )
    has_multiple_intents = len(re.findall(r"\b(et|and|puis|then)\b", lowered)) >= 2
    return bool(
        has_temporal_dependency
        or (has_meeting_signal and not has_location_signal)
        or has_trial_or_warranty
        or has_multiple_intents
    )


def _extract_json_object(raw: str) -> dict[str, Any] | None:
    compact = raw.strip()
    if not compact:
        return None
    try:
        parsed = json.loads(compact)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", compact, flags=re.IGNORECASE)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None

    start = compact.find("{")
    end = compact.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(compact[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _clean_action_candidates(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw[:6]:
        if not isinstance(item, dict):
            continue
        action_type = item.get("type")
        label = item.get("label")
        if not isinstance(action_type, str) or action_type not in ALLOWED_ACTION_TYPES:
            continue
        if not isinstance(label, str) or not label.strip():
            continue
        confidence = item.get("confidence")
        if not isinstance(confidence, (int, float)):
            confidence = 0.7
        requires_confirm = item.get("requires_confirm")
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        out.append(
            {
                "type": action_type,
                "label": label.strip(),
                "confidence": max(0.0, min(1.0, float(confidence))),
                "requires_confirm": (
                    bool(requires_confirm) if isinstance(requires_confirm, bool) else True
                ),
                "payload": payload,
            }
        )
    return out


async def analyze_capture_with_sync_agent(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
    capture_type: str,
    metadata: dict[str, Any] | None = None,
    locale: str = "fr-FR",
) -> dict[str, Any] | None:
    if not settings.CAPTURE_SYNC_SUBAGENT_ENABLED:
        return None
    if not should_escalate_capture_analysis(semantic_text):
        return None

    runtime = CaptureSubAgentRuntime(
        db=db,
        capture=capture,
        metadata=metadata or {},
        locale=locale,
    )
    context = await runtime.build_context()
    workspace_notes = [
        "You are in capture_analysis mode. Return strictly JSON.",
        "Never mutate data. Propose previews/actions only.",
        f"Prompt modules enabled: {', '.join(context.modules)}",
    ]

    system_prompt, retrieval_snapshot, tool_snapshot = PromptComposer.compose(
        PromptComposerInput(
            agent_name=context.agent_name,
            prompt_mode="capture_analysis",
            user_message=semantic_text[:8000],
            retrieval_snippets=[],
            allowed_tools=context.allowed_tools,
            workspace_notes=workspace_notes,
            extra_system_prompt=context.extra_system_prompt,
            user_timezone=context.user_timezone,
            user_now=datetime.now(UTC),
            locale=locale,
            runtime_info={
                "agent": str(context.agent_id) if context.agent_id else "capture_analysis",
                "mode": "analyze",
                "status": "processing",
                "model": settings.SYNC_MODEL_BALANCED,
            },
        )
    )
    if context.prompt_instructions:
        system_prompt = f"{system_prompt}\nExtra instructions: {context.prompt_instructions}"

    user_message = (
        f"Capture type: {capture_type}\n"
        f"Capture metadata: {json.dumps(metadata or {}, ensure_ascii=True)}\n"
        f"Capture semantic text:\n{semantic_text[:12000]}\n\n"
        "Return only valid JSON."
    )

    result = await LiteLLMClient.complete(
        prompt=system_prompt,
        user_message=user_message,
        model=settings.SYNC_MODEL_BALANCED,
        tools=None,
    )
    content = str(result.get("content") or "").strip()
    payload = _extract_json_object(content)
    if not payload:
        return None

    normalized_facts = payload.get("normalized_facts")
    questions_if_needed = payload.get("questions_if_needed")
    action_candidates = _clean_action_candidates(payload.get("action_candidates"))
    if not action_candidates:
        return None

    return {
        "provider": result.get("provider") or "unknown",
        "model": result.get("model") or settings.SYNC_MODEL_BALANCED,
        "normalized_facts": normalized_facts if isinstance(normalized_facts, dict) else {},
        "questions_if_needed": (
            [str(item).strip() for item in questions_if_needed if str(item).strip()]
            if isinstance(questions_if_needed, list)
            else []
        ),
        "action_candidates": action_candidates[:3],
        "agent_id": str(context.agent_id) if context.agent_id else None,
        "agent_name": context.agent_name,
        "modules": context.modules,
        "prompt_snapshot": system_prompt,
        "toolset_snapshot": tool_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }
