from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.inbox import (
    ApplyCaptureRequest,
    ApplyCaptureResponse,
    CapturePreviewResponse,
    CreateCaptureRequest,
    InboxCaptureOut,
    InboxListResponse,
    ProcessCaptureRequest,
    ProcessCaptureResponse,
)

router = APIRouter(prefix="/inbox", tags=["inbox"])


async def _get_capture_or_404(
    db: AsyncSession,
    workspace_id: UUID,
    capture_id: UUID,
) -> InboxCapture:
    result = await db.execute(
        select(InboxCapture).where(
            InboxCapture.id == capture_id,
            InboxCapture.workspace_id == workspace_id,
            InboxCapture.deleted_at.is_(None),
        )
    )
    capture = result.scalar_one_or_none()
    if capture is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capture not found",
        )
    return capture


def _suggest_from_capture(capture: InboxCapture) -> CapturePreviewResponse:
    raw = (capture.raw_content or "").strip()
    if raw:
        title = raw.splitlines()[0][:80]
    else:
        title = f"{capture.capture_type.capitalize()} capture"

    kind = "note"
    low = raw.lower()
    if any(token in low for token in ["goal", "objectif", "objective"]):
        kind = "objective"
    elif any(token in low for token in ["todo", "task", "tache", "à faire"]):
        kind = "task"
    elif capture.capture_type in {"link", "photo"}:
        kind = "resource"

    return CapturePreviewResponse(
        capture_id=capture.id,
        suggested_title=title or "New item",
        suggested_kind=kind,  # type: ignore[arg-type]
        confidence=0.55,
        reason="Heuristic preview based on capture_type and raw_content",
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
    return InboxListResponse(captures=[InboxCaptureOut.model_validate(c) for c in captures])


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
    await db.commit()
    await db.refresh(capture)
    return {"id": str(capture.id)}


@router.post("/{capture_id}/preview", response_model=CapturePreviewResponse)
async def preview_capture(
    capture_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CapturePreviewResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    return _suggest_from_capture(capture)


@router.post("/{capture_id}/apply", response_model=ApplyCaptureResponse)
async def apply_capture(
    capture_id: UUID,
    body: ApplyCaptureRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ApplyCaptureResponse:
    capture = await _get_capture_or_404(db, workspace.workspace_id, capture_id)
    preview = _suggest_from_capture(capture)

    item = Item(
        workspace_id=workspace.workspace_id,
        title=body.title or preview.suggested_title,
        kind=body.kind or preview.suggested_kind,
        status="ready",
        meta={**capture.meta, **body.metadata},
        source_capture_id=capture.id,
        blocks=[],
    )
    db.add(item)
    capture.status = "applied"
    capture.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return ApplyCaptureResponse(capture_id=capture.id, item_id=item.id)


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
    capture.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return ProcessCaptureResponse(item_id=item.id)
