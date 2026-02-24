from datetime import datetime, timezone

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
    CreateCaptureRequest,
    InboxCaptureOut,
    InboxListResponse,
    ProcessCaptureRequest,
    ProcessCaptureResponse,
)

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("", response_model=InboxListResponse)
async def list_inbox(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> InboxListResponse:
    result = await db.execute(
        select(InboxCapture).where(
            InboxCapture.workspace_id == workspace.workspace_id,
            InboxCapture.deleted_at.is_(None),
        ).order_by(InboxCapture.created_at.desc())
    )
    captures = list(result.scalars().all())
    return InboxListResponse(
        captures=[InboxCaptureOut.model_validate(c) for c in captures]
    )


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
        source="manual",
    )
    db.add(capture)
    await db.commit()
    await db.refresh(capture)
    return {"id": str(capture.id)}


@router.post("/{capture_id}/process", response_model=ProcessCaptureResponse)
async def process_capture(
    capture_id: str,
    body: ProcessCaptureRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ProcessCaptureResponse:
    from uuid import UUID
    try:
        cap_uuid = UUID(capture_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid capture id",
        )
    result = await db.execute(
        select(InboxCapture).where(
            InboxCapture.id == cap_uuid,
            InboxCapture.workspace_id == workspace.workspace_id,
            InboxCapture.deleted_at.is_(None),
        )
    )
    capture = result.scalar_one_or_none()
    if capture is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capture not found",
        )
    item = Item(
        workspace_id=workspace.workspace_id,
        title=body.title,
        blocks=[],
    )
    db.add(item)
    capture.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return ProcessCaptureResponse(item_id=item.id)
