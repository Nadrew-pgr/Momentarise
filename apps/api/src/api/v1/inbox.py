import json
import logging
import uuid
from hashlib import sha256
from datetime import UTC, datetime, timedelta
from pathlib import Path
from time import perf_counter
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.capture_action_suggestion import CaptureActionSuggestion
from src.models.capture_artifact import CaptureArtifact
from src.models.capture_asset import CaptureAsset
from src.models.capture_job import CaptureJob
from src.models.capture_tag import CaptureTag, CaptureTagLink
from src.models.entity_link import EntityLink
from src.models.event import Event
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.business_block import BUSINESS_BLOCK_TYPES
from src.schemas.inbox import (
    ApplyCaptureRequest,
    ApplyCaptureResponse,
    CaptureActionResponse,
    CaptureActionSuggestionOut,
    CaptureLinksResponse,
    CaptureArtifactOut,
    CaptureArtifactsResponse,
    CaptureAssetOut,
    CaptureBadgeOut,
    CaptureDetailResponse,
    CaptureJobOut,
    CapturePreviewRequest,
    CapturePreviewResponse,
    CaptureUploadResponse,
    CreateCaptureRequest,
    InboxCaptureOut,
    InboxListResponse,
    InboxSearchEntryOut,
    InboxSearchResponse,
    NoteSummaryRefreshResponse,
    UpdateCaptureRequest,
)
from src.schemas.item import EntityLinkOut
from src.services.capture_ai_service import (
    build_capture_preview_plan_fallback,
    build_capture_preview_plan_with_subagent,
    generate_capture_summary_with_subagent,
)
from src.services.capture_async_queue import (
    capture_async_worker_unavailable_reason,
    create_capture_run_id,
    is_capture_async_worker_available,
    publish_capture_outbox_event_by_id,
    relay_pending_capture_outbox_events,
    queue_name_for_tier,
    resolve_workspace_billing_tier,
    schedule_capture_pipeline_outbox_event,
    update_capture_queue_meta,
)
from src.services.capture_pipeline import (
    enqueue_default_jobs,
    process_capture_jobs,
    store_upload_asset,
)

router = APIRouter(prefix="/inbox", tags=["inbox"])

DEFAULT_AI_MODE = "proposal_only"
DEFAULT_AUTO_APPLY_THRESHOLD = 0.90
DEFAULT_MAX_ACTIONS = 3
SAFE_AUTO_APPLY_ACTIONS = {"create_item", "create_task"}
SUPPORTED_CAPTURE_ACTION_TYPES = {
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
    "review",
}
COMING_SOON_CAPABILITIES = [
    "context_research",
    "web_research",
    "advanced_enrichments",
    "connectors",
]
CAPTURE_TITLE_MAX_LEN = 160
logger = logging.getLogger(__name__)


def _request_id_from_request(request: Request | None) -> str:
    if request is None:
        return "unknown"
    value = getattr(request.state, "request_id", None)
    if isinstance(value, str) and value.strip():
        return value
    return "unknown"


def _validate_link_content(raw_content: str) -> str:
    normalized = raw_content.strip()
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="capture_type=link requires a valid http(s) URL in raw_content",
        )
    return normalized


def _normalize_capture_title(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return ""
    return cleaned[:CAPTURE_TITLE_MAX_LEN]


def _use_async_capture_worker(trigger: str) -> bool:
    if not settings.CAPTURE_ASYNC_WORKER_ENABLED:
        return False
    if is_capture_async_worker_available():
        return True
    logger.warning(
        "capture.async.inline_fallback trigger=%s reason=%s",
        trigger,
        capture_async_worker_unavailable_reason() or "unknown",
    )
    return False


async def _get_capture_or_404(
    db: AsyncSession,
    workspace_id: UUID,
    capture_id: UUID,
    include_deleted: bool = False,
) -> InboxCapture:
    clauses = [
        InboxCapture.id == capture_id,
        InboxCapture.workspace_id == workspace_id,
    ]
    if not include_deleted:
        clauses.append(InboxCapture.deleted_at.is_(None))
    result = await db.execute(select(InboxCapture).where(*clauses))
    capture = result.scalar_one_or_none()

    # Item-centric compatibility: allow passing an item_id that points to
    # an inbox capture via Item.source_capture_id.
    if capture is None:
        item_clauses = [
            Item.id == capture_id,
            Item.workspace_id == workspace_id,
        ]
        if not include_deleted:
            item_clauses.append(Item.deleted_at.is_(None))
        item_result = await db.execute(select(Item).where(*item_clauses).limit(1))
        source_item = item_result.scalar_one_or_none()
        source_capture_id = source_item.source_capture_id if source_item is not None else None
        if source_capture_id is not None:
            capture_clauses = [
                InboxCapture.id == source_capture_id,
                InboxCapture.workspace_id == workspace_id,
            ]
            if not include_deleted:
                capture_clauses.append(InboxCapture.deleted_at.is_(None))
            capture_result = await db.execute(select(InboxCapture).where(*capture_clauses))
            capture = capture_result.scalar_one_or_none()

    if capture is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capture not found",
        )
    return capture


async def _load_capture_suggestions(
    db: AsyncSession, capture_ids: list[UUID]
) -> dict[UUID, list[CaptureActionSuggestion]]:
    if not capture_ids:
        return {}
    result = await db.execute(
        select(CaptureActionSuggestion)
        .where(
            CaptureActionSuggestion.capture_id.in_(capture_ids),
            CaptureActionSuggestion.deleted_at.is_(None),
        )
        .order_by(
            CaptureActionSuggestion.capture_id.asc(),
            CaptureActionSuggestion.is_primary.desc(),
            CaptureActionSuggestion.confidence.desc(),
            CaptureActionSuggestion.created_at.asc(),
        )
    )
    mapping: dict[UUID, list[CaptureActionSuggestion]] = {}
    for row in result.scalars().all():
        mapping.setdefault(row.capture_id, []).append(row)
    return mapping


async def _load_capture_tags(
    db: AsyncSession,
    capture_ids: list[UUID],
) -> dict[UUID, list[str]]:
    if not capture_ids:
        return {}
    result = await db.execute(
        select(CaptureTagLink.capture_id, CaptureTag.name)
        .join(CaptureTag, CaptureTag.id == CaptureTagLink.tag_id)
        .where(
            CaptureTagLink.capture_id.in_(capture_ids),
            CaptureTagLink.deleted_at.is_(None),
            CaptureTag.deleted_at.is_(None),
        )
        .order_by(
            CaptureTagLink.capture_id.asc(),
            CaptureTagLink.confidence.desc(),
            CaptureTag.name.asc(),
        )
    )
    mapping: dict[UUID, list[str]] = {}
    for capture_id, tag_name in result.all():
        if not isinstance(tag_name, str) or not tag_name.strip():
            continue
        mapping.setdefault(capture_id, []).append(tag_name.strip())
    return mapping


async def _load_source_items(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    capture_ids: list[UUID],
) -> dict[UUID, Item]:
    if not capture_ids:
        return {}
    result = await db.execute(
        select(Item)
        .where(
            Item.workspace_id == workspace_id,
            Item.source_capture_id.in_(capture_ids),
            Item.deleted_at.is_(None),
        )
        .order_by(Item.created_at.asc())
    )
    out: dict[UUID, Item] = {}
    for row in result.scalars().all():
        source_capture_id = row.source_capture_id
        if source_capture_id is None:
            continue
        if source_capture_id in out:
            continue
        out[source_capture_id] = row
    return out


def _title_case(value: str | None) -> str:
    text = (value or "").replace("_", " ").strip()
    if not text:
        return ""
    return " ".join(part.capitalize() for part in text.split())


def _build_capture_badges(capture: InboxCapture, tags: list[str]) -> list[CaptureBadgeOut]:
    if not settings.CAPTURE_BADGES_V2_ENABLED:
        return []
    capture_type = getattr(capture, "capture_type", "text")
    category = getattr(capture, "category", None)
    actor = getattr(capture, "actor", "user")
    badges: list[CaptureBadgeOut] = [
        CaptureBadgeOut(
            key=f"type:{capture_type}",
            label=_title_case(capture_type),
            kind="type",
            tone="outline",
        )
    ]
    if capture.status == "applied":
        badges.append(
            CaptureBadgeOut(
                key="status:applied",
                label="Applied",
                kind="status",
                tone="secondary",
            )
        )
    if capture.status == "archived":
        badges.append(
            CaptureBadgeOut(
                key="status:archived",
                label="Archived",
                kind="status",
                tone="outline",
            )
        )
    if isinstance(category, str) and category.strip():
        badges.append(
            CaptureBadgeOut(
                key=f"category:{category}",
                label=_title_case(category),
                kind="category",
                tone="secondary",
            )
        )
    actor = actor if actor in {"user", "sync", "system"} else "user"
    badges.append(
        CaptureBadgeOut(
            key=f"actor:{actor}",
            label=_title_case(actor),
            kind="actor",
            tone="outline",
        )
    )
    for tag in tags[:3]:
        clean = tag.strip()
        if not clean:
            continue
        badges.append(
            CaptureBadgeOut(
                key=f"tag:{clean.lower()}",
                label=clean,
                kind="tag",
                tone="outline",
            )
        )
    return badges


def _read_ai_preferences(member: WorkspaceMember) -> tuple[str, float, int]:
    mode = DEFAULT_AI_MODE
    threshold = DEFAULT_AUTO_APPLY_THRESHOLD
    max_actions = DEFAULT_MAX_ACTIONS

    if isinstance(member.preferences, dict):
        ai_prefs = member.preferences.get("ai")
        if isinstance(ai_prefs, dict):
            value = ai_prefs.get("mode")
            if value in {"proposal_only", "auto_apply"}:
                mode = value
            raw_threshold = ai_prefs.get("auto_apply_threshold")
            if isinstance(raw_threshold, (int, float)):
                threshold = max(0.0, min(1.0, float(raw_threshold)))
            raw_max = ai_prefs.get("max_actions_per_capture")
            if isinstance(raw_max, int):
                max_actions = max(1, min(3, raw_max))

    return mode, threshold, max_actions


def _capture_source_type(capture: InboxCapture) -> str:
    if isinstance(capture.meta, dict):
        meta_value = capture.meta.get("source_type")
        if isinstance(meta_value, str) and meta_value.strip():
            return meta_value.strip()
    value = str(getattr(capture, "capture_type", "text") or "text").strip()
    return value if value else "text"


def _capture_is_note_intent(
    *,
    capture_type: str,
    source: str | None,
    metadata: dict[str, Any] | None,
) -> bool:
    if capture_type != "text":
        return False
    meta = metadata or {}
    source_value = str(source or "").strip().lower()
    intent_value = str(meta.get("intent", "")).strip().lower()
    channel_value = str(meta.get("channel", "")).strip().lower()
    return (
        source_value == "note"
        or intent_value == "note"
        or channel_value == "note"
        or meta.get("note_intent") is True
    )


def _resolved_capture_title(capture: InboxCapture) -> str | None:
    meta = capture.meta if isinstance(capture.meta, dict) else {}
    manual_title = _normalize_capture_title(meta.get("manual_title") if isinstance(meta.get("manual_title"), str) else None)
    if manual_title:
        return manual_title
    ai_title = _normalize_capture_title(meta.get("ai_title") if isinstance(meta.get("ai_title"), str) else None)
    if ai_title:
        return ai_title
    return None


def _extract_blocks_text(node: Any) -> str:
    if isinstance(node, list) and node and all(
        isinstance(entry, dict)
        and isinstance(entry.get("type"), str)
        and entry.get("type") in BUSINESS_BLOCK_TYPES
        and isinstance(entry.get("payload"), dict)
        for entry in node
    ):
        parts: list[str] = []
        for entry in node:
            payload = entry.get("payload") if isinstance(entry, dict) else None
            if not isinstance(payload, dict):
                continue
            block_type = str(entry.get("type"))
            if block_type == "text_block":
                text_value = str(payload.get("text") or "").strip()
                if text_value:
                    parts.append(text_value)
            elif block_type == "checklist_block":
                items = payload.get("items")
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict) and isinstance(item.get("text"), str):
                            parts.append(item["text"])
            elif block_type == "table_block":
                rows = payload.get("rows")
                if isinstance(rows, list):
                    for row in rows:
                        if isinstance(row, list):
                            parts.append(" ".join(str(cell) for cell in row))
            elif block_type == "set_block":
                exercise_name = str(payload.get("exercise_name") or "").strip()
                if exercise_name:
                    parts.append(exercise_name)
            elif block_type == "inbox_block":
                refs = payload.get("capture_refs")
                if isinstance(refs, list):
                    for ref in refs:
                        if isinstance(ref, dict):
                            ref_title = str(ref.get("title") or "").strip()
                            if ref_title:
                                parts.append(ref_title)
            else:
                parts.append(_extract_blocks_text(payload))
        return " ".join(part for part in parts if part).strip()
    if isinstance(node, list):
        return " ".join(_extract_blocks_text(item) for item in node).strip()
    if not isinstance(node, dict):
        return ""
    own_text = str(node.get("text")).strip() if isinstance(node.get("text"), str) else ""
    content = node.get("content")
    children = _extract_blocks_text(content) if isinstance(content, list) else ""
    return " ".join(part for part in [own_text, children] if part).strip()


def _note_source_text(item: Item | None) -> str:
    if item is None or not isinstance(item.blocks, list):
        return ""
    compact = _extract_blocks_text(item.blocks)
    return " ".join(compact.split()).strip()


def _treated_bucket_for_capture(capture: InboxCapture) -> str:
    if capture.deleted_at is not None:
        return "treated"
    if capture.status in {"applied", "archived"}:
        return "treated"
    return "untreated"


async def _find_source_item(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    capture_id: UUID,
) -> Item | None:
    result = await db.execute(
        select(Item)
        .where(
            Item.workspace_id == workspace_id,
            Item.source_capture_id == capture_id,
            Item.deleted_at.is_(None),
        )
        .order_by(Item.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _derive_item_kind_from_capture(capture_type: str) -> str:
    if capture_type in {"link", "photo", "file"}:
        return "resource"
    if capture_type in {"voice"}:
        return "task"
    return "note"


def _derive_item_title(capture: InboxCapture) -> str:
    resolved = _resolved_capture_title(capture)
    if resolved:
        return resolved[:140]
    if capture.raw_content.strip():
        return capture.raw_content.strip().splitlines()[0][:140]
    return f"{capture.capture_type.capitalize()} capture"


def _map_capture_status_to_item_status(capture_status: str) -> str:
    if capture_status in {"queued", "processing"}:
        return "processing"
    if capture_status in {"ready", "applied"}:
        return "ready"
    if capture_status == "archived":
        return "archived"
    return "captured"


async def _ensure_source_item_for_capture(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    capture: InboxCapture,
) -> Item:
    existing = await _find_source_item(db, workspace_id=workspace_id, capture_id=capture.id)
    if existing is not None:
        return existing

    capture_meta = capture.meta if isinstance(capture.meta, dict) else {}
    item = Item(
        workspace_id=workspace_id,
        title=_derive_item_title(capture),
        kind=_derive_item_kind_from_capture(capture.capture_type),  # type: ignore[arg-type]
        status=_map_capture_status_to_item_status(capture.status),  # type: ignore[arg-type]
        meta={
            **capture_meta,
            "source_type": _capture_source_type(capture),
            "capture_id": str(capture.id),
        },
        source_capture_id=capture.id,
        blocks=[],
    )
    db.add(item)
    await db.flush()
    return item


async def _sync_source_item_from_capture(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    capture: InboxCapture,
) -> Item | None:
    item = await _find_source_item(db, workspace_id=workspace_id, capture_id=capture.id)
    if item is None:
        return None
    capture_meta = capture.meta if isinstance(capture.meta, dict) else {}
    item.status = _map_capture_status_to_item_status(capture.status)  # type: ignore[assignment]
    if not item.title.strip():
        item.title = _derive_item_title(capture)
    item.meta = {
        **item.meta,
        **capture_meta,
        "source_type": _capture_source_type(capture),
        "capture_id": str(capture.id),
    }
    await db.flush()
    return item


def _to_action_out(row: CaptureActionSuggestion) -> CaptureActionSuggestionOut:
    return CaptureActionSuggestionOut(
        key=row.action_key,
        label=row.label,
        type=row.action_type,  # type: ignore[arg-type]
        confidence=row.confidence,
        requires_confirm=row.requires_confirm,
        preview_payload=row.payload_json,
        is_primary=row.is_primary,
    )


def _filter_disabled_actions(
    suggestions: list[CaptureActionSuggestion],
) -> list[CaptureActionSuggestion]:
    return [row for row in suggestions if row.action_type in SUPPORTED_CAPTURE_ACTION_TYPES]


def _to_capture_out(
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    item_id: UUID | None = None,
    tags: list[str] | None = None,
    max_actions: int = DEFAULT_MAX_ACTIONS,
) -> InboxCaptureOut:
    actionable_suggestions = _filter_disabled_actions(suggestions)
    actions = [_to_action_out(row) for row in actionable_suggestions][:max_actions]
    primary = next((item for item in actions if item.is_primary), actions[0] if actions else None)
    archived = capture.deleted_at is not None or capture.status == "archived"
    archived_reason: str | None = None
    if capture.deleted_at is not None:
        archived_reason = "deleted"
    elif capture.status == "archived":
        archived_reason = "archived"

    safe_tags = [item.strip() for item in (tags or []) if isinstance(item, str) and item.strip()]
    raw_actor = getattr(capture, "actor", None)
    raw_category = getattr(capture, "category", None)
    actor = raw_actor if raw_actor in {"user", "sync", "system"} else "user"
    category = (
        raw_category
        if raw_category
        in {
            "finance",
            "communication",
            "schedule",
            "document",
            "travel",
            "personal",
            "general",
        }
        else None
    )
    badges = _build_capture_badges(capture, safe_tags)

    return InboxCaptureOut.model_validate(
        {
            "id": capture.id,
            "item_id": item_id,
            "title": _resolved_capture_title(capture),
            "raw_content": capture.raw_content,
            "source": capture.source,
            "source_type": _capture_source_type(capture),
            "capture_type": capture.capture_type,
            "status": capture.status,
            "pipeline_state": capture.status,
            "treated_bucket": _treated_bucket_for_capture(capture),
            "agent_hint": (
                capture.meta.get("agent_hint")
                if isinstance(capture.meta, dict) and isinstance(capture.meta.get("agent_hint"), str)
                else None
            ),
            "coming_soon_capabilities": list(COMING_SOON_CAPABILITIES),
            "meta": capture.meta,
            "suggested_actions": actions,
            "primary_action": primary,
            "requires_review": (primary.type == "review" or primary.requires_confirm)
            if primary
            else False,
            "archived": archived,
            "archived_reason": archived_reason,
            "deleted_at": capture.deleted_at,
            "category": category,
            "actor": actor,
            "tags": safe_tags,
            "badges": badges,
            "created_at": capture.created_at,
        }
    )


def _suggest_from_capture(
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    requested_action_key: str | None = None,
) -> CapturePreviewResponse:
    actionable_suggestions = _filter_disabled_actions(suggestions)
    selected: CaptureActionSuggestion | None = None
    if requested_action_key:
        selected = next(
            (item for item in actionable_suggestions if item.action_key == requested_action_key),
            None,
        )
    if selected is None and actionable_suggestions:
        selected = next(
            (item for item in actionable_suggestions if item.is_primary),
            actionable_suggestions[0],
        )

    if selected is not None:
        payload = selected.payload_json if isinstance(selected.payload_json, dict) else {}
        title = (
            payload.get("title")
            if isinstance(payload.get("title"), str)
            else capture.raw_content.splitlines()[0][:80]
            if capture.raw_content.strip()
            else selected.label
        )
        kind = "task" if selected.action_type in {"create_event", "create_task"} else "note"
        return CapturePreviewResponse(
            capture_id=capture.id,
            action_key=selected.action_key,
            action_type=selected.action_type,  # type: ignore[arg-type]
            suggested_title=title or "Review capture",
            suggested_kind=kind,  # type: ignore[arg-type]
            confidence=selected.confidence,
            reason=f"Suggestion generated for action {selected.action_type}",
            preview_payload=payload,
            missing_fields=[],
        )

    raw = (capture.raw_content or "").strip()
    title = raw.splitlines()[0][:80] if raw else f"{capture.capture_type.capitalize()} capture"
    kind = "resource" if capture.capture_type in {"link", "photo", "file"} else "note"
    return CapturePreviewResponse(
        capture_id=capture.id,
        suggested_title=title or "New item",
        suggested_kind=kind,  # type: ignore[arg-type]
        confidence=0.55,
        reason="Fallback preview derived from current capture payload",
        preview_payload={},
        missing_fields=[],
    )


def _capture_semantic_text(
    capture: InboxCapture,
    artifacts: list[CaptureArtifact],
) -> str:
    chunks: list[str] = []
    if capture.raw_content.strip():
        chunks.append(capture.raw_content.strip())
    for artifact in artifacts:
        if artifact.artifact_type not in {
            "summary",
            "preprocess_summary",
            "transcript",
            "extracted_text",
            "vlm_analysis",
            "capture_analysis",
        }:
            continue
        if not isinstance(artifact.content_json, dict):
            continue
        text_value = artifact.content_json.get("text")
        if isinstance(text_value, str) and text_value.strip():
            chunks.append(text_value.strip())
    return "\n".join(chunks).strip()


def _selected_action_for_preview(
    *,
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    requested_action_key: str | None,
) -> dict[str, Any] | None:
    actionable = _filter_disabled_actions(suggestions)
    selected: CaptureActionSuggestion | None = None
    if requested_action_key:
        selected = next((item for item in actionable if item.action_key == requested_action_key), None)
    if selected is None and actionable:
        selected = next((item for item in actionable if item.is_primary), actionable[0])
    if selected is None:
        return None
    payload = selected.payload_json if isinstance(selected.payload_json, dict) else {}
    return {
        "key": selected.action_key,
        "type": selected.action_type,
        "label": selected.label,
        "confidence": selected.confidence,
        "requires_confirm": selected.requires_confirm,
        "payload": payload,
        "capture_id": str(capture.id),
    }


async def _load_assets(db: AsyncSession, capture_id: UUID) -> list[CaptureAsset]:
    result = await db.execute(
        select(CaptureAsset)
        .where(
            CaptureAsset.capture_id == capture_id,
            CaptureAsset.deleted_at.is_(None),
        )
        .order_by(CaptureAsset.created_at.asc())
    )
    return list(result.scalars().all())


def _preview_kind_for_asset(asset: CaptureAsset) -> str:
    kind = (asset.kind or "").lower()
    mime = (asset.mime_type or "").lower()
    if kind == "voice" or mime.startswith("audio/"):
        return "audio"
    if kind == "photo" or mime.startswith("image/"):
        return "image"
    if mime == "application/pdf":
        return "pdf"
    if mime.startswith("text/"):
        return "text"
    return "binary"


def _file_name_for_asset(asset: CaptureAsset) -> str:
    if isinstance(asset.meta, dict):
        value = asset.meta.get("file_name")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return Path(asset.storage_key).name or "file"


def _to_asset_out(asset: CaptureAsset, capture_id: UUID) -> CaptureAssetOut:
    data = {
        "id": asset.id,
        "kind": asset.kind,
        "storage_key": asset.storage_key,
        "mime_type": asset.mime_type,
        "size_bytes": asset.size_bytes,
        "duration_ms": getattr(asset, "duration_ms", None),
        "checksum": getattr(asset, "checksum", None),
        "meta": asset.meta if isinstance(asset.meta, dict) else {},
        "created_at": asset.created_at,
        "preview_kind": _preview_kind_for_asset(asset),
        "file_name": _file_name_for_asset(asset),
        "content_path": f"/api/v1/inbox/{capture_id}/assets/{asset.id}/content",
    }
    return CaptureAssetOut.model_validate(data)


async def _load_artifacts(db: AsyncSession, capture_id: UUID) -> list[CaptureArtifact]:
    result = await db.execute(
        select(CaptureArtifact)
        .where(
            CaptureArtifact.capture_id == capture_id,
            CaptureArtifact.deleted_at.is_(None),
        )
        .order_by(CaptureArtifact.created_at.asc())
    )
    return list(result.scalars().all())


async def _load_jobs(db: AsyncSession, capture_id: UUID) -> list[CaptureJob]:
    result = await db.execute(
        select(CaptureJob)
        .where(
            CaptureJob.capture_id == capture_id,
            CaptureJob.deleted_at.is_(None),
        )
        .order_by(CaptureJob.created_at.asc())
    )
    return list(result.scalars().all())


def _parse_datetime(value: str | None) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


async def _apply_selected_action(
    *,
    db: AsyncSession,
    workspace: WorkspaceMember,
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    action_key: str | None,
    title: str | None = None,
    kind: str | None = None,
    metadata: dict | None = None,
) -> tuple[Item, Event | None, str | None]:
    actionable_suggestions = _filter_disabled_actions(suggestions)
    selected: CaptureActionSuggestion | None = None
    if action_key is not None:
        selected = next(
            (item for item in actionable_suggestions if item.action_key == action_key),
            None,
        )
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action suggestion not found",
            )
    elif actionable_suggestions:
        selected = next(
            (item for item in actionable_suggestions if item.is_primary),
            actionable_suggestions[0],
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="no_suggested_actions",
        )

    payload = selected.payload_json if selected and isinstance(selected.payload_json, dict) else {}
    merged_metadata = {
        **(capture.meta if isinstance(capture.meta, dict) else {}),
        **(metadata or {}),
    }
    if selected is not None:
        merged_metadata["action_type"] = selected.action_type
        merged_metadata["action_key"] = selected.action_key

    event: Event | None = None
    source_item = await _find_source_item(
        db,
        workspace_id=workspace.workspace_id,
        capture_id=capture.id,
    )

    if selected and selected.action_type == "create_event":
        resolved_title = (
            title
            or (payload.get("title") if isinstance(payload.get("title"), str) else None)
            or "Scheduled event"
        )
        location = payload.get("location") if isinstance(payload.get("location"), str) else None
        travel = payload.get("travel") if isinstance(payload.get("travel"), dict) else None
        if location:
            merged_metadata["location"] = location
        if travel:
            merged_metadata["travel"] = travel

        if source_item is None:
            source_item = Item(
                workspace_id=workspace.workspace_id,
                title=resolved_title,
                kind="task",
                status="ready",
                meta=merged_metadata,
                source_capture_id=capture.id,
                blocks=[],
            )
            db.add(source_item)
            await db.flush()
        else:
            source_item.title = resolved_title
            source_item.kind = "task"
            source_item.status = "ready"
            source_item.meta = {
                **source_item.meta,
                **merged_metadata,
            }
            await db.flush()

        now = datetime.now(UTC)
        start_at = _parse_datetime(
            payload.get("start_at") if isinstance(payload, dict) else None
        ) or (now + timedelta(hours=1))
        end_at = _parse_datetime(payload.get("end_at") if isinstance(payload, dict) else None) or (
            start_at + timedelta(hours=1)
        )
        if end_at <= start_at:
            end_at = start_at + timedelta(hours=1)

        event = Event(
            workspace_id=workspace.workspace_id,
            item_id=source_item.id,
            start_at=start_at,
            end_at=end_at,
            estimated_time_seconds=int((end_at - start_at).total_seconds()),
            actual_time_acc_seconds=0,
            is_tracking=False,
            color="sky",
        )
        db.add(event)
        await db.flush()
    else:
        preview = _suggest_from_capture(capture, actionable_suggestions, action_key)
        resolved_title = title or preview.suggested_title
        resolved_kind = kind or preview.suggested_kind
        if source_item is None:
            source_item = Item(
                workspace_id=workspace.workspace_id,
                title=resolved_title,
                kind=resolved_kind,
                status="ready",
                meta=merged_metadata,
                source_capture_id=capture.id,
                blocks=[],
            )
            db.add(source_item)
            await db.flush()
        else:
            source_item.title = resolved_title
            source_item.kind = resolved_kind
            source_item.status = "ready"
            source_item.meta = {
                **source_item.meta,
                **merged_metadata,
            }
            await db.flush()

    capture.status = "applied"
    capture_meta = capture.meta if isinstance(capture.meta, dict) else {}
    capture.meta = {
        **capture_meta,
        "applied_at": datetime.now(UTC).isoformat(),
        "applied_action_key": selected.action_key if selected else action_key,
    }
    await db.flush()
    if source_item is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_apply_missing_source_item",
        )
    return source_item, event, selected.action_key if selected else action_key


def _select_auto_apply_candidate(
    *,
    mode: str,
    threshold: float,
    suggestions: list[CaptureActionSuggestion],
) -> CaptureActionSuggestion | None:
    if mode != "auto_apply":
        return None
    if not suggestions:
        return None
    primary = next((item for item in suggestions if item.is_primary), suggestions[0])
    if primary.confidence < threshold:
        return None
    if primary.requires_confirm:
        return None
    if primary.action_type not in SAFE_AUTO_APPLY_ACTIONS:
        return None
    return primary


async def _maybe_auto_apply_capture(
    *,
    db: AsyncSession,
    workspace: WorkspaceMember,
    capture: InboxCapture,
) -> None:
    if not settings.CAPTURE_AUTO_APPLY_ENABLED:
        return

    mode, threshold, _ = _read_ai_preferences(workspace)
    suggestion_map = await _load_capture_suggestions(db, [capture.id])
    suggestions = suggestion_map.get(capture.id, [])
    candidate = _select_auto_apply_candidate(
        mode=mode,
        threshold=threshold,
        suggestions=suggestions,
    )
    if candidate is None:
        return

    await _apply_selected_action(
        db=db,
        workspace=workspace,
        capture=capture,
        suggestions=suggestions,
        action_key=candidate.action_key,
        metadata={"auto_applied": True},
    )
    logger.info(
        "capture.auto_apply capture_id=%s action_key=%s confidence=%.3f threshold=%.3f",
        str(capture.id),
        candidate.action_key,
        candidate.confidence,
        threshold,
    )


async def _run_capture_pipeline_inline(
    *,
    db: AsyncSession,
    workspace: WorkspaceMember,
    capture: InboxCapture,
    run_id: uuid.UUID,
    queue_name: str,
) -> None:
    await enqueue_default_jobs(
        db,
        capture,
        run_id=run_id,
        queue_name=queue_name,
    )
    await process_capture_jobs(
        db,
        capture,
        run_id=run_id,
    )
    await _maybe_auto_apply_capture(db=db, workspace=workspace, capture=capture)
    await _sync_source_item_from_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )


async def _run_capture_pipeline_async(
    *,
    db: AsyncSession,
    workspace: WorkspaceMember,
    capture: InboxCapture,
    run_id: uuid.UUID,
    trigger: str,
) -> tuple[str, str]:
    tier = await resolve_workspace_billing_tier(db, workspace.workspace_id)
    scheduled = await schedule_capture_pipeline_outbox_event(
        db,
        capture=capture,
        trigger=trigger,
        tier=tier,
        run_id=run_id,
    )
    update_capture_queue_meta(
        capture,
        run_id=scheduled.run_id,
        queue_name=scheduled.queue_name,
        queue_state="not_enqueued",
        trigger=trigger,
    )
    await _sync_source_item_from_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )
    await db.commit()

    task_id = await publish_capture_outbox_event_by_id(
        db,
        outbox_event_id=scheduled.outbox_event_id,
    )
    if not task_id:
        capture.status = "failed"
        update_capture_queue_meta(
            capture,
            run_id=scheduled.run_id,
            queue_name=scheduled.queue_name,
            queue_state="not_enqueued",
            trigger=trigger,
            error_code="queue_enqueue_failed",
        )
        await _sync_source_item_from_capture(
            db,
            workspace_id=workspace.workspace_id,
            capture=capture,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="queue_enqueue_failed",
        )

    update_capture_queue_meta(
        capture,
        run_id=scheduled.run_id,
        queue_name=scheduled.queue_name,
        queue_state="enqueued",
        trigger=trigger,
        task_id=task_id,
    )
    try:
        await relay_pending_capture_outbox_events(db, limit=20)
    except Exception:
        logger.exception(
            "capture.outbox.relay_pending_failed capture_id=%s run_id=%s",
            str(capture.id),
            str(scheduled.run_id),
        )
    await db.commit()
    return task_id, scheduled.queue_name


@router.get("", response_model=InboxListResponse)
async def list_inbox(
    bucket: str = Query(default="all"),
    include_archived: bool = Query(default=False),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> InboxListResponse:
    if bucket not in {"all", "untreated", "treated"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="bucket must be one of all|untreated|treated",
        )

    clauses = [InboxCapture.workspace_id == workspace.workspace_id]
    if not include_archived:
        clauses.append(InboxCapture.deleted_at.is_(None))

    result = await db.execute(
        select(InboxCapture).where(*clauses).order_by(InboxCapture.created_at.desc())
    )
    captures = list(result.scalars().all())
    if bucket != "all":
        captures = [
            capture
            for capture in captures
            if _treated_bucket_for_capture(capture) == bucket
        ]
    capture_ids = [capture.id for capture in captures]
    suggestion_map = await _load_capture_suggestions(db, capture_ids)
    tag_map = await _load_capture_tags(db, capture_ids)
    item_map = await _load_source_items(
        db,
        workspace_id=workspace.workspace_id,
        capture_ids=capture_ids,
    )
    _, _, max_actions = _read_ai_preferences(workspace)
    rows = [
        _to_capture_out(
            capture,
            suggestion_map.get(capture.id, []),
            item_id=item_map.get(capture.id).id if capture.id in item_map else None,
            tags=tag_map.get(capture.id, []),
            max_actions=max_actions,
        )
        for capture in captures
    ]
    return InboxListResponse(captures=rows, entries=rows)


@router.get("/search", response_model=InboxSearchResponse)
async def search_inbox(
    q: str = Query(default="", min_length=0),
    limit: int = Query(default=10, ge=1, le=50),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> InboxSearchResponse:
    search_term = q.strip()
    if not search_term:
        return InboxSearchResponse(captures=[])

    result = await db.execute(
        select(InboxCapture)
        .where(
            InboxCapture.workspace_id == workspace.workspace_id,
            InboxCapture.deleted_at.is_(None),
            InboxCapture.raw_content.ilike(f"%{search_term}%"),
        )
        .order_by(InboxCapture.created_at.desc())
        .limit(limit)
    )
    captures = list(result.scalars().all())
    rows = [
        InboxSearchEntryOut(
            id=capture.id,
            title=_derive_item_title(capture),
            capture_type=capture.capture_type,  # type: ignore[arg-type]
            status=capture.status,  # type: ignore[arg-type]
            created_at=capture.created_at,
        )
        for capture in captures
    ]
    return InboxSearchResponse(captures=rows)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_capture(
    body: CreateCaptureRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.capture_type in {"voice", "photo", "file"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Use /api/v1/inbox/upload for voice/photo/file captures",
        )

    raw_content = body.raw_content
    if body.capture_type == "link":
        raw_content = _validate_link_content(body.raw_content)

    capture_meta = dict(body.metadata or {})
    capture_meta.setdefault("source_type", body.capture_type)
    is_note_intent = _capture_is_note_intent(
        capture_type=body.capture_type,
        source=body.source,
        metadata=capture_meta,
    )
    capture_status = "ready" if is_note_intent else body.status
    if is_note_intent:
        capture_meta["note_intent"] = True

    capture = InboxCapture(
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        raw_content=raw_content,
        source=body.source,
        capture_type=body.capture_type,
        status=capture_status,
        actor="user",
        meta=capture_meta,
    )
    db.add(capture)
    await db.flush()
    source_item = await _ensure_source_item_for_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )

    run_id: uuid.UUID | None = None
    task_id: str | None = None
    queue_state: str | None = None
    queue_name: str | None = None
    if capture.status in {"captured", "queued"}:
        capture.status = "queued"
        run_id = create_capture_run_id()
        tier = await resolve_workspace_billing_tier(db, workspace.workspace_id)
        queue_name = queue_name_for_tier(tier)
        if _use_async_capture_worker("create_capture"):
            task_id, queue_name = await _run_capture_pipeline_async(
                db=db,
                workspace=workspace,
                capture=capture,
                run_id=run_id,
                trigger="create_capture",
            )
            queue_state = "enqueued"
            await db.refresh(capture)
        else:
            await _run_capture_pipeline_inline(
                db=db,
                workspace=workspace,
                capture=capture,
                run_id=run_id,
                queue_name=queue_name,
            )
            update_capture_queue_meta(
                capture,
                run_id=run_id,
                queue_name=queue_name,  # type: ignore[arg-type]
                queue_state="not_enqueued",
                trigger="create_capture",
            )
            queue_state = "not_enqueued"
            await db.commit()
            await db.refresh(capture)
    else:
        await db.commit()
        await db.refresh(capture)

    return {
        "id": str(capture.id),
        "item_id": str(source_item.id),
        "task_id": task_id,
        "run_id": str(run_id) if run_id else None,
        "queue_state": queue_state,
        "queue_name": queue_name,
    }


@router.post("/upload", response_model=CaptureUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_capture(
    request: Request,
    capture_type: str = Form(...),
    source: str = Form("manual"),
    metadata: str = Form("{}"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureUploadResponse:
    if not settings.CAPTURE_UPLOAD_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Capture upload is disabled",
        )

    if capture_type not in {"voice", "photo", "file"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="capture_type must be one of voice|photo|file",
        )

    request_id = _request_id_from_request(request)
    logger.info(
        "capture.upload_received request_id=%s capture_type=%s source=%s file_name=%s mime_type=%s",
        request_id,
        capture_type,
        source,
        file.filename or "",
        file.content_type or "",
    )

    try:
        parsed_metadata = json.loads(metadata or "{}")
        if not isinstance(parsed_metadata, dict):
            raise ValueError("metadata must be an object")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid metadata payload: {exc}",
        ) from exc

    source_item: Item | None = None
    try:
        capture = InboxCapture(
            workspace_id=workspace.workspace_id,
            user_id=current_user.id,
            raw_content=f"{capture_type.capitalize()} capture: {file.filename or 'file'}",
            source=source,
            capture_type=capture_type,
            status="queued",
            actor="user",
            meta={
                **parsed_metadata,
                "source_type": capture_type,
            },
        )
        db.add(capture)
        await db.flush()
        source_item = await _ensure_source_item_for_capture(
            db,
            workspace_id=workspace.workspace_id,
            capture=capture,
        )
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s code=capture_upload_db_error step=create_capture",
            request_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_db_error",
        ) from exc
    except Exception as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s code=capture_upload_db_error step=create_capture_unhandled",
            request_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_db_error",
        ) from exc

    upload_started = perf_counter()
    try:
        await store_upload_asset(
            db=db,
            storage_dir=settings.CAPTURE_STORAGE_DIR,
            workspace_id=workspace.workspace_id,
            capture=capture,
            upload=file,
            kind=capture_type,
            max_upload_bytes=settings.CAPTURE_MAX_UPLOAD_BYTES,
        )
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except OSError as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s capture_id=%s code=capture_upload_storage_error step=store_asset",
            request_id,
            str(capture.id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_storage_error",
        ) from exc
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s capture_id=%s code=capture_upload_db_error step=store_asset",
            request_id,
            str(capture.id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_db_error",
        ) from exc
    except Exception as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s capture_id=%s code=capture_upload_storage_error step=store_asset_unhandled",
            request_id,
            str(capture.id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_storage_error",
        ) from exc

    logger.info(
        "capture.asset_persisted request_id=%s capture_id=%s capture_type=%s",
        request_id,
        str(capture.id),
        capture.capture_type,
    )

    run_id = create_capture_run_id()
    task_id: str | None = None
    queue_state: str | None = None
    queue_name: str | None = None
    try:
        tier = await resolve_workspace_billing_tier(db, workspace.workspace_id)
        queue_name = queue_name_for_tier(tier)
        force_inline_processing = source == "sync_attachment"
        if _use_async_capture_worker("upload_capture") and not force_inline_processing:
            task_id, queue_name = await _run_capture_pipeline_async(
                db=db,
                workspace=workspace,
                capture=capture,
                run_id=run_id,
                trigger="upload_capture",
            )
            queue_state = "enqueued"
        else:
            await _run_capture_pipeline_inline(
                db=db,
                workspace=workspace,
                capture=capture,
                run_id=run_id,
                queue_name=queue_name,
            )
            update_capture_queue_meta(
                capture,
                run_id=run_id,
                queue_name=queue_name,  # type: ignore[arg-type]
                queue_state="not_enqueued",
                trigger="upload_capture",
            )
            queue_state = "not_enqueued"
        logger.info(
            "capture.jobs_enqueued request_id=%s capture_id=%s run_id=%s queue_name=%s queue_state=%s",
            request_id,
            str(capture.id),
            str(run_id),
            queue_name,
            queue_state,
        )
    except HTTPException:
        raise
    except Exception as exc:
        current_meta = capture.meta if isinstance(capture.meta, dict) else {}
        capture.status = "failed"
        capture.meta = {
            **current_meta,
            "last_error_code": "capture_pipeline_error",
            "last_error_at": datetime.now(UTC).isoformat(),
        }
        await _sync_source_item_from_capture(
            db,
            workspace_id=workspace.workspace_id,
            capture=capture,
        )
        try:
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()
        logger.exception(
            "capture.pipeline_failed request_id=%s capture_id=%s code=capture_pipeline_error error=%s",
            request_id,
            str(capture.id),
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_pipeline_error",
        ) from exc

    upload_duration_ms = round((perf_counter() - upload_started) * 1000, 2)
    current_meta = capture.meta if isinstance(capture.meta, dict) else {}
    current_metrics = (
        current_meta.get("metrics") if isinstance(current_meta.get("metrics"), dict) else {}
    )
    capture.meta = {
        **current_meta,
        "metrics": {
            **current_metrics,
            "upload_duration_ms": upload_duration_ms,
        },
    }
    logger.info(
        "capture.pipeline_completed request_id=%s capture_id=%s capture_type=%s duration_ms=%s",
        request_id,
        str(capture.id),
        capture.capture_type,
        upload_duration_ms,
    )

    try:
        await db.commit()
        await db.refresh(capture)
        if source_item is not None:
            await db.refresh(source_item)
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception(
            "capture.upload_failed request_id=%s capture_id=%s code=capture_upload_db_error step=commit",
            request_id,
            str(capture.id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="capture_upload_db_error",
        ) from exc

    return CaptureUploadResponse(
        id=capture.id,
        status=capture.status,  # type: ignore[arg-type]
        task_id=task_id,
        run_id=run_id,
        queue_state=queue_state,  # type: ignore[arg-type]
        queue_name=queue_name,
    )


@router.get("/{capture_id}/assets/{asset_id}/content")
async def get_asset_content(
    capture_id: UUID,
    asset_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    capture = await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    result = await db.execute(
        select(CaptureAsset).where(
            CaptureAsset.id == asset_id,
            CaptureAsset.capture_id == capture_id,
            CaptureAsset.workspace_id == workspace.workspace_id,
            CaptureAsset.deleted_at.is_(None),
        )
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    storage_dir = settings.CAPTURE_STORAGE_DIR
    file_path = Path(storage_dir) / asset.storage_key
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset file not found",
        )
    return FileResponse(
        path=str(file_path),
        media_type=asset.mime_type or "application/octet-stream",
        headers={
            "Content-Length": str(asset.size_bytes),
            **({"ETag": f'"{asset.checksum}"'} if asset.checksum else {}),
        },
    )


@router.get("/{capture_id}/links", response_model=CaptureLinksResponse)
async def get_capture_links(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureLinksResponse:
    await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    result = await db.execute(
        select(EntityLink)
        .where(
            EntityLink.workspace_id == workspace.workspace_id,
            EntityLink.deleted_at.is_(None),
            or_(
                (EntityLink.from_entity_type == "capture")
                & (EntityLink.from_entity_id == capture_id),
                (EntityLink.to_entity_type == "capture")
                & (EntityLink.to_entity_id == capture_id),
            ),
        )
        .order_by(EntityLink.created_at.desc())
    )
    links = list(result.scalars().all())
    return CaptureLinksResponse(links=[EntityLinkOut.model_validate(link) for link in links])


@router.get("/{capture_id}", response_model=CaptureDetailResponse)
async def get_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureDetailResponse:
    capture = await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    suggestion_map = await _load_capture_suggestions(db, [capture.id])
    tag_map = await _load_capture_tags(db, [capture.id])
    source_item = await _find_source_item(
        db,
        workspace_id=workspace.workspace_id,
        capture_id=capture.id,
    )
    _, _, max_actions = _read_ai_preferences(workspace)
    capture_out = _to_capture_out(
        capture,
        suggestion_map.get(capture.id, []),
        item_id=source_item.id if source_item else None,
        tags=tag_map.get(capture.id, []),
        max_actions=max_actions,
    )
    assets = [_to_asset_out(item, capture.id) for item in await _load_assets(db, capture.id)]
    artifacts = [
        CaptureArtifactOut.model_validate(item) for item in await _load_artifacts(db, capture.id)
    ]
    jobs = [CaptureJobOut.model_validate(item) for item in await _load_jobs(db, capture.id)]
    pipeline_trace_raw = (
        capture.meta.get("pipeline_trace") if isinstance(capture.meta, dict) else None
    )
    pipeline_trace = pipeline_trace_raw if isinstance(pipeline_trace_raw, list) else []
    artifacts_summary_raw = (
        capture.meta.get("artifacts_summary") if isinstance(capture.meta, dict) else None
    )
    artifacts_summary = artifacts_summary_raw if isinstance(artifacts_summary_raw, dict) else {}
    return CaptureDetailResponse(
        capture=capture_out,
        assets=assets,
        artifacts=artifacts,
        jobs=jobs,
        pipeline_trace=[item for item in pipeline_trace if isinstance(item, dict)],
        artifacts_summary=artifacts_summary,
    )


@router.patch("/{capture_id}", response_model=CaptureActionResponse)
async def update_capture(
    capture_id: UUID,
    body: UpdateCaptureRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    if capture.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="capture_deleted",
        )
    if capture.status == "archived":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="capture_archived",
        )

    current_meta = capture.meta if isinstance(capture.meta, dict) else {}
    next_meta = dict(current_meta)
    normalized_title = _normalize_capture_title(body.title)
    if normalized_title:
        next_meta["manual_title"] = normalized_title
        next_meta["title_locked"] = True
    else:
        next_meta.pop("manual_title", None)
        next_meta["title_locked"] = False
    capture.meta = next_meta

    source_item = await _find_source_item(
        db,
        workspace_id=workspace.workspace_id,
        capture_id=capture.id,
    )
    if source_item is not None:
        source_item.title = _derive_item_title(capture)

    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status=capture.status)


@router.post("/{capture_id}/note-summary/refresh", response_model=NoteSummaryRefreshResponse)
async def refresh_note_summary(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> NoteSummaryRefreshResponse:
    capture = await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    if capture.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="capture_deleted",
        )
    if capture.status == "archived":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="capture_archived",
        )
    capture_meta = capture.meta if isinstance(capture.meta, dict) else {}
    if not _capture_is_note_intent(
        capture_type=capture.capture_type,
        source=capture.source,
        metadata=capture_meta,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="not_note_capture",
        )

    source_item = await _find_source_item(
        db,
        workspace_id=workspace.workspace_id,
        capture_id=capture.id,
    )
    if source_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="linked_note_not_found",
        )

    note_text = _note_source_text(source_item)
    if len(note_text) < settings.NOTE_SUMMARY_MIN_CHARS:
        return NoteSummaryRefreshResponse(
            capture_id=capture.id,
            status="skipped_too_short",
            summary_updated=False,
            source_hash=None,
        )

    source_hash = sha256(note_text.encode("utf-8")).hexdigest()
    artifacts_summary = (
        capture_meta.get("artifacts_summary")
        if isinstance(capture_meta.get("artifacts_summary"), dict)
        else {}
    )
    existing_summary = (
        str(artifacts_summary.get("summary")).strip()
        if isinstance(artifacts_summary, dict) and isinstance(artifacts_summary.get("summary"), str)
        else ""
    )
    if source_hash == capture_meta.get("note_summary_source_hash") and existing_summary:
        return NoteSummaryRefreshResponse(
            capture_id=capture.id,
            status="unchanged",
            summary_updated=False,
            source_hash=source_hash,
        )

    try:
        summary_payload = await generate_capture_summary_with_subagent(
            db=db,
            capture=capture,
            semantic_text=note_text,
            capture_type=capture.capture_type,
            metadata={**capture_meta, "note_intent": True, "summary_source": "item_blocks"},
        )
    except Exception as exc:
        compact_note = " ".join(note_text.split()).strip()
        fallback_summary = compact_note[:240] if compact_note else "Note capture"
        summary_payload = {
            "text": fallback_summary,
            "description": compact_note[:1200] if compact_note else fallback_summary,
            "key_points": [],
            "title": None,
            "fallback_used": True,
        }
        logger.warning(
            "capture.note_summary.refresh_fallback capture_id=%s error=%s",
            str(capture.id),
            str(exc),
        )
    key_points_raw = summary_payload.get("key_points")
    key_points = (
        [str(item).strip() for item in key_points_raw if str(item).strip()]
        if isinstance(key_points_raw, list)
        else []
    )
    summary_text = str(summary_payload.get("text") or "").strip()
    updated_meta = dict(capture_meta)
    updated_meta["artifacts_summary"] = {
        **(artifacts_summary if isinstance(artifacts_summary, dict) else {}),
        "summary": summary_text[:320],
        "headline": summary_text[:100],
        "key_clauses": key_points[:6],
    }
    updated_meta["note_summary_source_hash"] = source_hash
    updated_meta["note_summary_generated_at"] = datetime.now(UTC).isoformat()
    if updated_meta.get("title_locked") is not True:
        model_title = _normalize_capture_title(summary_payload.get("title") if isinstance(summary_payload.get("title"), str) else None)
        if model_title:
            updated_meta["ai_title"] = model_title
    capture.meta = updated_meta

    if source_item is not None:
        source_item.title = _derive_item_title(capture)

    await db.commit()
    return NoteSummaryRefreshResponse(
        capture_id=capture.id,
        status="generated",
        summary_updated=True,
        source_hash=source_hash,
    )


@router.get("/{capture_id}/artifacts", response_model=CaptureArtifactsResponse)
async def get_capture_artifacts(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureArtifactsResponse:
    await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    artifacts = [
        CaptureArtifactOut.model_validate(item) for item in await _load_artifacts(db, capture_id)
    ]
    return CaptureArtifactsResponse(artifacts=artifacts)


@router.post("/{capture_id}/reprocess", response_model=CaptureActionResponse)
async def reprocess_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    now = datetime.now(UTC)
    current_meta = capture.meta if isinstance(capture.meta, dict) else {}
    next_meta = dict(current_meta)
    for key in (
        "artifacts_summary",
        "pipeline_trace",
        "last_error_code",
        "last_error_at",
        "agent_trace",
        "agent_hint",
    ):
        next_meta.pop(key, None)
    next_meta["reprocessed_at"] = now.isoformat()
    capture.meta = next_meta

    artifact_result = await db.execute(
        select(CaptureArtifact).where(
            CaptureArtifact.capture_id == capture.id,
            CaptureArtifact.deleted_at.is_(None),
        )
    )
    for row in artifact_result.scalars().all():
        row.deleted_at = now

    suggestion_result = await db.execute(
        select(CaptureActionSuggestion).where(
            CaptureActionSuggestion.capture_id == capture.id,
            CaptureActionSuggestion.deleted_at.is_(None),
        )
    )
    for row in suggestion_result.scalars().all():
        row.deleted_at = now

    jobs_result = await db.execute(
        select(CaptureJob).where(
            CaptureJob.capture_id == capture.id,
            CaptureJob.deleted_at.is_(None),
        )
    )
    for row in jobs_result.scalars().all():
        row.deleted_at = now

    capture.status = "queued"
    run_id = create_capture_run_id()
    tier = await resolve_workspace_billing_tier(db, workspace.workspace_id)
    queue_name = queue_name_for_tier(tier)
    task_id: str | None = None
    if _use_async_capture_worker("reprocess_capture"):
        task_id, queue_name = await _run_capture_pipeline_async(
            db=db,
            workspace=workspace,
            capture=capture,
            run_id=run_id,
            trigger="reprocess_capture",
        )
        queue_state = "enqueued"
        await db.refresh(capture)
    else:
        await _run_capture_pipeline_inline(
            db=db,
            workspace=workspace,
            capture=capture,
            run_id=run_id,
            queue_name=queue_name,
        )
        update_capture_queue_meta(
            capture,
            run_id=run_id,
            queue_name=queue_name,  # type: ignore[arg-type]
            queue_state="not_enqueued",
            trigger="reprocess_capture",
        )
        queue_state = "not_enqueued"
        await db.commit()

    return CaptureActionResponse(
        capture_id=capture.id,
        status=capture.status,
        task_id=task_id,
        run_id=run_id,
        queue_state=queue_state,  # type: ignore[arg-type]
        queue_name=queue_name,
    )


@router.post("/{capture_id}/preview", response_model=CapturePreviewResponse)
async def preview_capture(
    capture_id: UUID,
    body: CapturePreviewRequest | None = None,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CapturePreviewResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    suggestion_map = await _load_capture_suggestions(db, [capture.id])
    suggestions = suggestion_map.get(capture.id, [])
    actionable_suggestions = _filter_disabled_actions(suggestions)
    if not actionable_suggestions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="no_suggested_actions",
        )
    artifacts = await _load_artifacts(db, capture.id)
    semantic_text = _capture_semantic_text(capture, artifacts)
    selected_action = _selected_action_for_preview(
        capture=capture,
        suggestions=suggestions,
        requested_action_key=body.action_key if body else None,
    )
    preview_payload = await build_capture_preview_plan_with_subagent(
        db=db,
        capture=capture,
        semantic_text=semantic_text,
        capture_type=capture.capture_type,
        selected_action=selected_action,
        metadata=capture.meta if isinstance(capture.meta, dict) else {},
    )
    fallback_preview = build_capture_preview_plan_fallback(
        capture=capture,
        selected_action=selected_action,
    )

    artifact_payload = {
        "text": json.dumps(
            {
                "action_type": preview_payload.get("action_type"),
                "reason": preview_payload.get("reason"),
                "missing_fields": preview_payload.get("missing_fields", []),
            },
            ensure_ascii=False,
        ),
        "agent_id": preview_payload.get("agent_id"),
        "agent_name": preview_payload.get("agent_name"),
        "mode": preview_payload.get("mode"),
        "modules": preview_payload.get("modules"),
        "toolset_snapshot": preview_payload.get("toolset_snapshot"),
        "retrieval_snapshot": preview_payload.get("retrieval_snapshot"),
        "prompt_snapshot": preview_payload.get("prompt_snapshot"),
        "error_code": preview_payload.get("error_code"),
        "preview_payload": preview_payload.get("preview_payload"),
    }
    db.add(
        CaptureArtifact(
            workspace_id=capture.workspace_id,
            capture_id=capture.id,
            artifact_type="capture_preview_plan",
            content_json=artifact_payload,
            provider=str(preview_payload.get("provider", "sync")),
            model=str(preview_payload.get("model", settings.SYNC_MODEL_BALANCED)),
            confidence=(
                float(preview_payload.get("confidence"))
                if isinstance(preview_payload.get("confidence"), (int, float))
                else float(fallback_preview["confidence"])
            ),
        )
    )
    await db.commit()

    return CapturePreviewResponse(
        capture_id=capture.id,
        action_key=(
            str(preview_payload.get("action_key")).strip()
            if isinstance(preview_payload.get("action_key"), str) and str(preview_payload.get("action_key")).strip()
            else fallback_preview["action_key"]
        ),
        action_type=(
            str(preview_payload.get("action_type")).strip()
            if (
                isinstance(preview_payload.get("action_type"), str)
                and str(preview_payload.get("action_type")).strip() in SUPPORTED_CAPTURE_ACTION_TYPES
            )
            else fallback_preview["action_type"]
        ),
        suggested_title=(
            str(preview_payload.get("suggested_title")).strip()
            if isinstance(preview_payload.get("suggested_title"), str) and str(preview_payload.get("suggested_title")).strip()
            else fallback_preview["suggested_title"]
        ),
        suggested_kind=(
            str(preview_payload.get("suggested_kind")).strip()
            if (
                isinstance(preview_payload.get("suggested_kind"), str)
                and str(preview_payload.get("suggested_kind")).strip() in {"note", "objective", "task", "resource"}
            )
            else fallback_preview["suggested_kind"]
        ),
        confidence=(
            max(0.0, min(1.0, float(preview_payload.get("confidence"))))
            if isinstance(preview_payload.get("confidence"), (int, float))
            else float(fallback_preview["confidence"])
        ),
        reason=(
            str(preview_payload.get("reason")).strip()
            if isinstance(preview_payload.get("reason"), str) and str(preview_payload.get("reason")).strip()
            else str(fallback_preview["reason"])
        ),
        preview_payload=(
            preview_payload.get("preview_payload")
            if isinstance(preview_payload.get("preview_payload"), dict)
            else fallback_preview["preview_payload"]
        ),
        missing_fields=(
            [str(item).strip() for item in preview_payload.get("missing_fields", []) if str(item).strip()]
            if isinstance(preview_payload.get("missing_fields"), list)
            else []
        ),
    )


@router.post("/{capture_id}/apply", response_model=ApplyCaptureResponse)
async def apply_capture(
    capture_id: UUID,
    body: ApplyCaptureRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ApplyCaptureResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    suggestion_map = await _load_capture_suggestions(db, [capture.id])
    suggestions = suggestion_map.get(capture.id, [])
    actionable_suggestions = _filter_disabled_actions(suggestions)
    if body.action_key is None and not actionable_suggestions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="no_suggested_actions",
        )
    item, event, applied_action_key = await _apply_selected_action(
        db=db,
        workspace=workspace,
        capture=capture,
        suggestions=suggestions,
        action_key=body.action_key,
        title=body.title,
        kind=body.kind,
        metadata=body.metadata,
    )
    await db.commit()

    return ApplyCaptureResponse(
        capture_id=capture.id,
        item_id=item.id,
        event_id=event.id if event else None,
        applied_action_key=applied_action_key,
    )


@router.post("/{capture_id}/process")
async def process_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _ = workspace
    _ = db
    _ = capture_id
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="deprecated_process_flow",
    )


@router.post("/{capture_id}/archive", response_model=CaptureActionResponse)
async def archive_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    capture.status = "archived"
    capture_meta = capture.meta if isinstance(capture.meta, dict) else {}
    capture.meta = {
        **capture_meta,
        "archived_at": datetime.now(UTC).isoformat(),
    }
    await _sync_source_item_from_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )
    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status="archived")


@router.delete("/{capture_id}", response_model=CaptureActionResponse)
async def delete_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    capture.deleted_at = datetime.now(UTC)
    capture.status = "archived"
    await _sync_source_item_from_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )
    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status="deleted")


@router.post("/{capture_id}/restore")
async def restore_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _ = capture_id
    _ = workspace
    _ = db
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="restore_disabled",
    )
