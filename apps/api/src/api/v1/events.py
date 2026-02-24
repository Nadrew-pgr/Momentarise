import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.event import Event
from src.models.workspace import WorkspaceMember
from src.schemas.event import StartTrackingResponse, StopTrackingResponse

router = APIRouter(prefix="/events", tags=["events"])


async def _get_event(
    event_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> Event | None:
    result = await db.execute(
        select(Event).where(
            Event.id == event_id,
            Event.workspace_id == workspace_id,
            Event.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


@router.post("/{event_id}/start", response_model=StartTrackingResponse)
async def start_tracking(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> StartTrackingResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    now = datetime.now(timezone.utc)
    if event.is_tracking:
        return StartTrackingResponse(
            event_id=event.id,
            is_tracking=True,
            tracking_started_at=event.tracking_started_at or now,
        )

    event.is_tracking = True
    event.tracking_started_at = now
    await db.commit()
    await db.refresh(event)

    return StartTrackingResponse(
        event_id=event.id,
        is_tracking=True,
        tracking_started_at=event.tracking_started_at,
    )


@router.post("/{event_id}/stop", response_model=StopTrackingResponse)
async def stop_tracking(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> StopTrackingResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not event.is_tracking:
        return StopTrackingResponse(
            event_id=event.id,
            is_tracking=False,
            actual_time_acc=event.actual_time_acc_seconds,
        )

    now = datetime.now(timezone.utc)
    elapsed = int((now - (event.tracking_started_at or now)).total_seconds())
    event.actual_time_acc_seconds += max(0, elapsed)
    event.is_tracking = False
    event.tracking_started_at = None
    await db.commit()
    await db.refresh(event)

    return StopTrackingResponse(
        event_id=event.id,
        is_tracking=False,
        actual_time_acc=event.actual_time_acc_seconds,
    )
