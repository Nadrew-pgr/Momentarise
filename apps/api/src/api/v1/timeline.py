from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.event import Event
from src.models.workspace import WorkspaceMember
from src.schemas.timeline import EventOut, TimelineResponse

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("", response_model=TimelineResponse)
async def get_timeline(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
    date: str | None = Query(None, description="Date in YYYY-MM-DD (default: today UTC)"),
) -> TimelineResponse:
    ws_id = workspace.workspace_id

    if date is None:
        day = datetime.now(timezone.utc).date()
        date = day.strftime("%Y-%m-%d")
    else:
        try:
            day = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid date format, use YYYY-MM-DD",
            )

    start_of_day = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end_of_day = datetime.combine(day, time.max, tzinfo=timezone.utc)

    result = await db.execute(
        select(Event)
        .where(
            Event.workspace_id == ws_id,
            Event.deleted_at.is_(None),
            Event.end_at >= start_of_day,
            Event.start_at <= end_of_day,
        )
        .options(selectinload(Event.item))
        .order_by(Event.start_at.asc())
    )
    events = list(result.scalars().all())

    event_outs = [
        EventOut(
            id=e.id,
            item_id=e.item_id,
            title=e.item.title if e.item else "",
            start_at=e.start_at,
            end_at=e.end_at,
            estimated_time_seconds=e.estimated_time_seconds,
            actual_time_acc_seconds=e.actual_time_acc_seconds,
            is_tracking=e.is_tracking,
            color=e.color,
            tracking_started_at=e.tracking_started_at,
            updated_at=e.updated_at,
        )
        for e in events
    ]

    return TimelineResponse(date=date, events=event_outs)
