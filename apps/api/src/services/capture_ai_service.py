from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.capture_artifact import CaptureArtifact
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.services.capture_subagent_runtime import CaptureSubAgentContext, CaptureSubAgentRuntime
from src.sync.litellm_client import LiteLLMClient
from src.sync.prompt_composer import PromptComposer, PromptComposerInput
from src.sync.retrieval import RetrievalService

ALLOWED_ACTION_TYPES = {
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
    "review",
}


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


def _clean_missing_fields(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        text = str(item).strip()
        if not text:
            continue
        if text in out:
            continue
        out.append(text)
    return out[:6]


def _deterministic_summary_from_text(raw: str, *, max_len: int = 240) -> str:
    compact = " ".join(str(raw or "").split()).strip()
    if not compact:
        return "Capture received."
    sentence_match = re.search(r"^(.{1,400}?[.!?])(?:\s|$)", compact)
    candidate = sentence_match.group(1).strip() if sentence_match else compact
    return candidate[:max_len].strip() or compact[:max_len].strip() or "Capture received."


def _deterministic_title_from_summary(summary: str) -> str | None:
    compact = " ".join(str(summary or "").split()).strip()
    if not compact:
        return None
    candidate = compact.split(":")[0].split(".")[0].strip()
    normalized = candidate or compact
    return normalized[:160].strip() or None


async def _build_retrieval_snippets(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
) -> list[dict[str, Any]]:
    snippets: list[dict[str, Any]] = []
    if settings.CAPTURE_CONTEXT_ENRICHMENT_ENABLED:
        query = semantic_text.strip()[:500] or capture.raw_content.strip()[:500]
        if query:
            snippets.extend(
                await RetrievalService.search(
                    db,
                    workspace_id=capture.workspace_id,
                    query=query,
                    limit=4,
                )
            )

    result = await db.execute(
        select(CaptureArtifact)
        .where(
            CaptureArtifact.capture_id == capture.id,
            CaptureArtifact.deleted_at.is_(None),
        )
        .order_by(CaptureArtifact.created_at.desc())
        .limit(3)
    )
    for row in result.scalars().all():
        if not isinstance(row.content_json, dict):
            continue
        text_value = row.content_json.get("text")
        if not isinstance(text_value, str) or not text_value.strip():
            continue
        snippets.append(
            {
                "doc_id": str(capture.id),
                "chunk_id": f"artifact:{row.id}",
                "chunk_text": text_value.strip()[:1200],
                "metadata": {
                    "source": "capture_artifact",
                    "artifact_type": row.artifact_type,
                },
            }
        )

    item_result = await db.execute(
        select(Item)
        .where(
            Item.workspace_id == capture.workspace_id,
            Item.source_capture_id == capture.id,
            Item.deleted_at.is_(None),
        )
        .order_by(Item.created_at.asc())
        .limit(1)
    )
    item = item_result.scalar_one_or_none()
    if item is not None:
        item_text = f"{item.title}\n{json.dumps(item.meta or {}, ensure_ascii=True)}".strip()
        snippets.append(
            {
                "doc_id": str(item.id),
                "chunk_id": f"item:{item.id}",
                "chunk_text": item_text[:1200],
                "metadata": {"source": "source_item"},
            }
        )

    if capture.raw_content.strip():
        snippets.append(
            {
                "doc_id": str(capture.id),
                "chunk_id": f"capture:{capture.id}",
                "chunk_text": capture.raw_content.strip()[:1200],
                "metadata": {"source": "capture_raw"},
            }
        )

    # Keep deterministic ordering and avoid duplicate chunk ids.
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for snippet in snippets:
        chunk_id = str(snippet.get("chunk_id") or "")
        if not chunk_id or chunk_id in seen:
            continue
        seen.add(chunk_id)
        deduped.append(snippet)
    return deduped[:8]


async def _compose_prompt_context(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
    locale: str,
    mode: str,
    model: str,
    metadata: dict[str, Any],
) -> tuple[CaptureSubAgentContext, str, list[dict[str, Any]], list[str]]:
    runtime = CaptureSubAgentRuntime(
        db=db,
        capture=capture,
        metadata=metadata,
        locale=locale,
    )
    context = await runtime.build_context(mode=mode)
    retrieval_snippets = await _build_retrieval_snippets(
        db=db,
        capture=capture,
        semantic_text=semantic_text,
    )
    workspace_notes = [
        "You are in capture_analysis mode. Return strictly JSON.",
        "Never mutate data. Propose previews/actions only.",
        f"Prompt modules enabled: {', '.join(context.modules)}",
        f"Capture mode: {context.mode}",
    ]

    system_prompt, retrieval_snapshot, tool_snapshot = PromptComposer.compose(
        PromptComposerInput(
            agent_name=context.agent_name,
            prompt_mode=context.prompt_mode,
            user_message=semantic_text[:8000],
            retrieval_snippets=retrieval_snippets,
            allowed_tools=context.allowed_tools,
            workspace_notes=workspace_notes,
            extra_system_prompt=context.extra_system_prompt,
            user_timezone=context.user_timezone,
            user_now=datetime.now(UTC),
            locale=locale,
            runtime_info={
                "agent": str(context.agent_id) if context.agent_id else "capture_analysis",
                "mode": context.mode,
                "status": "processing",
                "model": model,
            },
        )
    )
    if context.prompt_instructions:
        system_prompt = f"{system_prompt}\nExtra instructions: {context.prompt_instructions}"
    return context, system_prompt, retrieval_snapshot, tool_snapshot


async def _complete_json_with_fallback_models(
    *,
    system_prompt: str,
    user_message: str,
    model_candidates: list[str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    errors: list[str] = []
    seen_models: set[str] = set()
    for candidate in model_candidates:
        model = str(candidate or "").strip()
        if not model or model in seen_models:
            continue
        seen_models.add(model)
        try:
            result = await LiteLLMClient.complete(
                prompt=system_prompt,
                user_message=user_message,
                model=model,
                tools=None,
            )
            payload = _extract_json_object(str(result.get("content") or ""))
            if payload is None:
                errors.append(f"model={model}:invalid_json")
                continue
            return payload, result
        except Exception as exc:
            errors.append(f"model={model}:{type(exc).__name__}")
            continue

    raise RuntimeError(
        "capture_subagent_completion_failed:" + ",".join(errors if errors else ["no_model"])
    )


def build_capture_preview_plan_fallback(
    *,
    capture: InboxCapture,
    selected_action: dict[str, Any] | None,
) -> dict[str, Any]:
    payload = (
        selected_action.get("payload")
        if isinstance(selected_action, dict) and isinstance(selected_action.get("payload"), dict)
        else {}
    )
    action_type = str(selected_action.get("type") or "review") if isinstance(selected_action, dict) else "review"
    action_key = str(selected_action.get("key") or "") if isinstance(selected_action, dict) else ""
    suggested_title = (
        str(payload.get("title")).strip()
        if isinstance(payload.get("title"), str) and str(payload.get("title")).strip()
        else capture.raw_content.strip().splitlines()[0][:120]
        if capture.raw_content.strip()
        else "Review capture"
    )
    suggested_kind = "task" if action_type in {"create_event", "create_task"} else "note"
    confidence = (
        float(selected_action.get("confidence"))
        if isinstance(selected_action, dict) and isinstance(selected_action.get("confidence"), (int, float))
        else 0.7
    )
    return {
        "action_key": action_key or None,
        "action_type": action_type,
        "suggested_title": suggested_title or "Review capture",
        "suggested_kind": suggested_kind,
        "confidence": max(0.0, min(1.0, confidence)),
        "reason": "Deterministic preview built from selected action payload.",
        "preview_payload": payload,
        "missing_fields": [],
    }


async def generate_capture_summary_with_subagent(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
    capture_type: str,
    metadata: dict[str, Any] | None = None,
    locale: str = "fr-FR",
) -> dict[str, Any]:
    if not settings.CAPTURE_SYNC_SUBAGENT_ENABLED:
        raise RuntimeError("capture_sync_subagent_disabled")

    context, system_prompt, retrieval_snapshot, tool_snapshot = await _compose_prompt_context(
        db=db,
        capture=capture,
        semantic_text=semantic_text,
        locale=locale,
        mode="summary_generation",
        model=settings.SYNC_MODEL_SMALL,
        metadata=metadata or {},
    )

    user_message = (
        f"Capture type: {capture_type}\n"
        f"Capture metadata: {json.dumps(metadata or {}, ensure_ascii=True)}\n"
        f"Capture semantic text:\n{semantic_text[:12000]}\n\n"
        "Return only valid JSON."
    )
    payload, result = await _complete_json_with_fallback_models(
        system_prompt=system_prompt,
        user_message=user_message,
        model_candidates=[settings.SYNC_MODEL_SMALL, settings.SYNC_MODEL_BALANCED],
    )

    title = str(payload.get("title") or "").strip()[:160]
    summary = str(payload.get("summary") or "").strip()
    description = str(payload.get("description") or "").strip()
    key_points = payload.get("key_points")
    summary_fallback_used = False
    if not summary:
        summary = description.splitlines()[0].strip() if description else ""
    if not summary:
        summary = _deterministic_summary_from_text(semantic_text)
        summary_fallback_used = True
    if not description:
        description = _deterministic_summary_from_text(semantic_text, max_len=1200)
    if not title:
        title = _deterministic_title_from_summary(summary) or ""

    cleaned_points = (
        [str(item).strip() for item in key_points if str(item).strip()]
        if isinstance(key_points, list)
        else []
    )

    return {
        "provider": result.get("provider") or "unknown",
        "model": result.get("model") or settings.SYNC_MODEL_SMALL,
        "title": title or None,
        "text": summary[:240],
        "description": description[:1200] if description else summary[:1200],
        "key_points": cleaned_points[:6],
        "missing_fields": _clean_missing_fields(payload.get("missing_fields")),
        "confidence": 0.82,
        "fallback_used": bool(result.get("fallback_used")) or summary_fallback_used,
        "agent_id": str(context.agent_id) if context.agent_id else None,
        "agent_name": context.agent_name,
        "mode": context.mode,
        "modules": context.modules,
        "prompt_snapshot": system_prompt,
        "toolset_snapshot": tool_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }


async def suggest_capture_actions_with_subagent(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
    capture_type: str,
    metadata: dict[str, Any] | None = None,
    locale: str = "fr-FR",
) -> dict[str, Any]:
    if not settings.CAPTURE_SYNC_SUBAGENT_ENABLED:
        raise RuntimeError("capture_sync_subagent_disabled")

    context, system_prompt, retrieval_snapshot, tool_snapshot = await _compose_prompt_context(
        db=db,
        capture=capture,
        semantic_text=semantic_text,
        locale=locale,
        mode="suggest_actions",
        model=settings.SYNC_MODEL_BALANCED,
        metadata=metadata or {},
    )

    user_message = (
        f"Capture type: {capture_type}\n"
        f"Capture metadata: {json.dumps(metadata or {}, ensure_ascii=True)}\n"
        f"Capture semantic text:\n{semantic_text[:12000]}\n\n"
        "Return only valid JSON."
    )
    payload, result = await _complete_json_with_fallback_models(
        system_prompt=system_prompt,
        user_message=user_message,
        model_candidates=[settings.SYNC_MODEL_BALANCED, settings.SYNC_MODEL_SMALL],
    )

    normalized_facts = payload.get("normalized_facts")
    questions_if_needed = payload.get("questions_if_needed")
    action_candidates = _clean_action_candidates(payload.get("action_candidates"))

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
        "missing_fields": _clean_missing_fields(payload.get("missing_fields")),
        "agent_id": str(context.agent_id) if context.agent_id else None,
        "agent_name": context.agent_name,
        "mode": context.mode,
        "modules": context.modules,
        "prompt_snapshot": system_prompt,
        "toolset_snapshot": tool_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }


async def build_capture_preview_plan_with_subagent(
    *,
    db: AsyncSession,
    capture: InboxCapture,
    semantic_text: str,
    capture_type: str,
    selected_action: dict[str, Any] | None,
    metadata: dict[str, Any] | None = None,
    locale: str = "fr-FR",
) -> dict[str, Any]:
    if not settings.CAPTURE_SYNC_SUBAGENT_ENABLED:
        fallback = build_capture_preview_plan_fallback(capture=capture, selected_action=selected_action)
        fallback["error_code"] = "capture_sync_subagent_disabled"
        return fallback

    context, system_prompt, retrieval_snapshot, tool_snapshot = await _compose_prompt_context(
        db=db,
        capture=capture,
        semantic_text=semantic_text,
        locale=locale,
        mode="preview_plan",
        model=settings.SYNC_MODEL_BALANCED,
        metadata=metadata or {},
    )

    selected_action_json = json.dumps(selected_action or {}, ensure_ascii=True)
    user_message = (
        f"Capture type: {capture_type}\n"
        f"Capture metadata: {json.dumps(metadata or {}, ensure_ascii=True)}\n"
        f"Selected action: {selected_action_json}\n"
        f"Capture semantic text:\n{semantic_text[:12000]}\n\n"
        "Return only valid JSON."
    )

    try:
        payload, result = await _complete_json_with_fallback_models(
            system_prompt=system_prompt,
            user_message=user_message,
            model_candidates=[settings.SYNC_MODEL_BALANCED, settings.SYNC_MODEL_SMALL],
        )
    except Exception:
        fallback = build_capture_preview_plan_fallback(capture=capture, selected_action=selected_action)
        fallback["error_code"] = "capture_preview_plan_generation_failed"
        fallback["agent_id"] = str(context.agent_id) if context.agent_id else None
        fallback["agent_name"] = context.agent_name
        fallback["mode"] = context.mode
        fallback["modules"] = context.modules
        fallback["prompt_snapshot"] = system_prompt
        fallback["toolset_snapshot"] = tool_snapshot
        fallback["retrieval_snapshot"] = retrieval_snapshot
        return fallback

    fallback = build_capture_preview_plan_fallback(capture=capture, selected_action=selected_action)
    action_key = payload.get("action_key")
    action_type = payload.get("action_type")
    suggested_title = payload.get("suggested_title")
    suggested_kind = payload.get("suggested_kind")
    confidence = payload.get("confidence")
    reason = payload.get("reason")
    preview_payload = payload.get("preview_payload")

    return {
        "provider": result.get("provider") or "unknown",
        "model": result.get("model") or settings.SYNC_MODEL_BALANCED,
        "action_key": str(action_key).strip() if isinstance(action_key, str) and action_key.strip() else fallback["action_key"],
        "action_type": (
            str(action_type).strip()
            if isinstance(action_type, str) and action_type.strip()
            else fallback["action_type"]
        ),
        "suggested_title": (
            str(suggested_title).strip()
            if isinstance(suggested_title, str) and suggested_title.strip()
            else fallback["suggested_title"]
        ),
        "suggested_kind": (
            str(suggested_kind).strip()
            if isinstance(suggested_kind, str) and suggested_kind.strip()
            else fallback["suggested_kind"]
        ),
        "confidence": (
            max(0.0, min(1.0, float(confidence)))
            if isinstance(confidence, (int, float))
            else fallback["confidence"]
        ),
        "reason": str(reason).strip() if isinstance(reason, str) and reason.strip() else fallback["reason"],
        "preview_payload": preview_payload if isinstance(preview_payload, dict) else fallback["preview_payload"],
        "missing_fields": _clean_missing_fields(payload.get("missing_fields")),
        "agent_id": str(context.agent_id) if context.agent_id else None,
        "agent_name": context.agent_name,
        "mode": context.mode,
        "modules": context.modules,
        "prompt_snapshot": system_prompt,
        "toolset_snapshot": tool_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }
