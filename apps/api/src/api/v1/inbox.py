import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.capture_action_suggestion import CaptureActionSuggestion
from src.models.capture_artifact import CaptureArtifact
from src.models.capture_asset import CaptureAsset
from src.models.capture_job import CaptureJob
from src.models.event import Event
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.inbox import (
    ApplyCaptureRequest,
    ApplyCaptureResponse,
    CaptureActionResponse,
    CaptureActionSuggestionOut,
    CaptureArtifactOut,
    CaptureArtifactsResponse,
    CaptureAssetOut,
    CaptureDetailResponse,
    CaptureJobOut,
    CapturePreviewRequest,
    CapturePreviewResponse,
    CaptureUploadResponse,
    CreateCaptureRequest,
    InboxCaptureOut,
    InboxListResponse,
    ProcessCaptureRequest,
    ProcessCaptureResponse,
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
SAFE_AUTO_APPLY_ACTIONS = {"create_item", "create_task", "summarize"}


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


def _fallback_review_action() -> CaptureActionSuggestionOut:
    return CaptureActionSuggestionOut(
        key="review_0",
        label="Review",
        type="review",
        confidence=1.0,
        requires_confirm=False,
        preview_payload={"reason": "No action suggestion available"},
        is_primary=True,
    )


def _to_capture_out(
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    max_actions: int = DEFAULT_MAX_ACTIONS,
) -> InboxCaptureOut:
    actions = [_to_action_out(row) for row in suggestions][:max_actions]
    if not actions:
        actions = [_fallback_review_action()]
    primary = next((item for item in actions if item.is_primary), actions[0] if actions else None)
    return InboxCaptureOut.model_validate(
        {
            "id": capture.id,
            "raw_content": capture.raw_content,
            "source": capture.source,
            "capture_type": capture.capture_type,
            "status": capture.status,
            "meta": capture.meta,
            "suggested_actions": actions,
            "primary_action": primary,
            "requires_review": (primary.type == "review" or primary.requires_confirm) if primary else True,
            "created_at": capture.created_at,
        }
    )


def _suggest_from_capture(
    capture: InboxCapture,
    suggestions: list[CaptureActionSuggestion],
    requested_action_key: str | None = None,
) -> CapturePreviewResponse:
    selected: CaptureActionSuggestion | None = None
    if requested_action_key:
        selected = next(
            (item for item in suggestions if item.action_key == requested_action_key),
            None,
        )
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action suggestion not found",
            )
    elif suggestions:
        selected = next((item for item in suggestions if item.is_primary), suggestions[0])

    if selected is not None:
        payload = selected.payload_json if isinstance(selected.payload_json, dict) else {}
        title = (
            payload.get("title")
            if isinstance(payload.get("title"), str)
            else capture.raw_content.splitlines()[0][:80] if capture.raw_content.strip() else selected.label
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
        )

    raw = (capture.raw_content or "").strip()
    title = raw.splitlines()[0][:80] if raw else f"{capture.capture_type.capitalize()} capture"
    kind = "resource" if capture.capture_type in {"link", "photo", "file"} else "note"
    return CapturePreviewResponse(
        capture_id=capture.id,
        suggested_title=title or "New item",
        suggested_kind=kind,  # type: ignore[arg-type]
        confidence=0.55,
        reason="Heuristic preview based on capture_type and raw_content",
        preview_payload={},
    )


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
    selected: CaptureActionSuggestion | None = None
    if action_key is not None:
        selected = next((item for item in suggestions if item.action_key == action_key), None)
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action suggestion not found",
            )
    elif suggestions:
        selected = next((item for item in suggestions if item.is_primary), suggestions[0])

    payload = selected.payload_json if selected and isinstance(selected.payload_json, dict) else {}
    merged_metadata = {**capture.meta, **(metadata or {})}
    if selected is not None:
        merged_metadata["action_type"] = selected.action_type
        merged_metadata["action_key"] = selected.action_key

    event: Event | None = None

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

        item = Item(
            workspace_id=workspace.workspace_id,
            title=resolved_title,
            kind="task",
            status="ready",
            meta=merged_metadata,
            source_capture_id=capture.id,
            blocks=[],
        )
        db.add(item)
        await db.flush()

        now = datetime.now(UTC)
        start_at = _parse_datetime(payload.get("start_at") if isinstance(payload, dict) else None) or (
            now + timedelta(hours=1)
        )
        end_at = _parse_datetime(payload.get("end_at") if isinstance(payload, dict) else None) or (
            start_at + timedelta(hours=1)
        )
        if end_at <= start_at:
            end_at = start_at + timedelta(hours=1)

        event = Event(
            workspace_id=workspace.workspace_id,
            item_id=item.id,
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
        preview = _suggest_from_capture(capture, suggestions, action_key)
        item = Item(
            workspace_id=workspace.workspace_id,
            title=title or preview.suggested_title,
            kind=kind or preview.suggested_kind,
            status="ready",
            meta=merged_metadata,
            source_capture_id=capture.id,
            blocks=[],
        )
        db.add(item)
        await db.flush()

    capture.status = "applied"
    capture.deleted_at = datetime.now(UTC)
    return item, event, selected.action_key if selected else action_key


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


@router.get("", response_model=InboxListResponse)
async def list_inbox(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> InboxListResponse:
    result = await db.execute(
        select(InboxCapture)
        .where(
            InboxCapture.workspace_id == workspace.workspace_id,
            InboxCapture.deleted_at.is_(None),
        )
        .order_by(InboxCapture.created_at.desc())
    )
    captures = list(result.scalars().all())
    capture_ids = [capture.id for capture in captures]
    suggestion_map = await _load_capture_suggestions(db, capture_ids)
    _, _, max_actions = _read_ai_preferences(workspace)
    rows = [
        _to_capture_out(
            capture,
            suggestion_map.get(capture.id, []),
            max_actions=max_actions,
        )
        for capture in captures
    ]
    return InboxListResponse(captures=rows)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_capture(
    body: CreateCaptureRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    capture = InboxCapture(
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        raw_content=body.raw_content,
        source=body.source,
        capture_type=body.capture_type,
        status=body.status,
        meta=body.metadata,
    )
    db.add(capture)
    await db.flush()

    if capture.status in {"captured", "queued"}:
        capture.status = "queued"
        await enqueue_default_jobs(db, capture)
        await process_capture_jobs(db, capture)
        await _maybe_auto_apply_capture(db=db, workspace=workspace, capture=capture)

    await db.commit()
    await db.refresh(capture)
    return {"id": str(capture.id)}


@router.post("/upload", response_model=CaptureUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_capture(
    capture_type: str = Form(...),
    source: str = Form("manual"),
    metadata: str = Form("{}"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureUploadResponse:
    if capture_type not in {"voice", "photo", "file"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="capture_type must be one of voice|photo|file",
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

    capture = InboxCapture(
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        raw_content=f"{capture_type.capitalize()} capture: {file.filename or 'file'}",
        source=source,
        capture_type=capture_type,
        status="queued",
        meta=parsed_metadata,
    )
    db.add(capture)
    await db.flush()

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
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    await enqueue_default_jobs(db, capture)
    await process_capture_jobs(db, capture)
    await _maybe_auto_apply_capture(db=db, workspace=workspace, capture=capture)

    await db.commit()
    await db.refresh(capture)
    return CaptureUploadResponse(id=capture.id, status=capture.status)  # type: ignore[arg-type]


@router.get("/{capture_id}", response_model=CaptureDetailResponse)
async def get_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureDetailResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    suggestion_map = await _load_capture_suggestions(db, [capture.id])
    _, _, max_actions = _read_ai_preferences(workspace)
    capture_out = _to_capture_out(
        capture,
        suggestion_map.get(capture.id, []),
        max_actions=max_actions,
    )
    assets = [CaptureAssetOut.model_validate(item) for item in await _load_assets(db, capture.id)]
    artifacts = [
        CaptureArtifactOut.model_validate(item)
        for item in await _load_artifacts(db, capture.id)
    ]
    jobs = [CaptureJobOut.model_validate(item) for item in await _load_jobs(db, capture.id)]
    return CaptureDetailResponse(
        capture=capture_out,
        assets=assets,
        artifacts=artifacts,
        jobs=jobs,
    )


@router.get("/{capture_id}/artifacts", response_model=CaptureArtifactsResponse)
async def get_capture_artifacts(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureArtifactsResponse:
    await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    artifacts = [
        CaptureArtifactOut.model_validate(item)
        for item in await _load_artifacts(db, capture_id)
    ]
    return CaptureArtifactsResponse(artifacts=artifacts)


@router.post("/{capture_id}/reprocess", response_model=CaptureActionResponse)
async def reprocess_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    capture.status = "queued"
    await enqueue_default_jobs(db, capture)
    await process_capture_jobs(db, capture)
    await _maybe_auto_apply_capture(db=db, workspace=workspace, capture=capture)
    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status=capture.status)


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
    return _suggest_from_capture(
        capture,
        suggestions,
        requested_action_key=body.action_key if body else None,
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


@router.post("/{capture_id}/process", response_model=ProcessCaptureResponse)
async def process_capture(
    capture_id: UUID,
    body: ProcessCaptureRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ProcessCaptureResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    item = Item(
        workspace_id=workspace.workspace_id,
        title=body.title,
        kind="note",
        status="ready",
        meta=capture.meta,
        source_capture_id=capture.id,
        blocks=[],
    )
    db.add(item)
    capture.status = "applied"
    capture.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(item)
    return ProcessCaptureResponse(item_id=item.id)


@router.delete("/{capture_id}", response_model=CaptureActionResponse)
async def delete_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    capture.deleted_at = datetime.now(UTC)
    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status="deleted")


@router.post("/{capture_id}/restore", response_model=CaptureActionResponse)
async def restore_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureActionResponse:
    capture = await _get_capture_or_404(
        db,
        workspace.workspace_id,
        capture_id,
        include_deleted=True,
    )
    if capture.deleted_at is None:
        return CaptureActionResponse(capture_id=capture.id, status="active")
    capture.deleted_at = None
    await db.commit()
    return CaptureActionResponse(capture_id=capture.id, status="restored")
