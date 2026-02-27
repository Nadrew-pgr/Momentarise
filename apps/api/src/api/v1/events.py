import uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.event import Event
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.event import (
    EventCreateRequest,
    EventDeleteResponse,
    EventsRangeResponse,
    EventUpdateRequest,
    StartTrackingResponse,
    StopTrackingResponse,
)
from src.schemas.timeline import EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _event_to_out(event: Event) -> EventOut:
    return EventOut(
        id=event.id,
        item_id=event.item_id,
        title=event.item.title if event.item else "",
        start_at=event.start_at,
        end_at=event.end_at,
        estimated_time_seconds=event.estimated_time_seconds,
        actual_time_acc_seconds=event.actual_time_acc_seconds,
        is_tracking=event.is_tracking,
        tracking_started_at=event.tracking_started_at,
        updated_at=event.updated_at,
    )


def _resolve_estimated_time_seconds(
    start_at: datetime,
    end_at: datetime,
    estimated_time_seconds: int | None,
) -> int:
    if estimated_time_seconds is not None:
        return estimated_time_seconds
    return max(0, int((end_at - start_at).total_seconds()))


def _validate_date_order(start_at: datetime, end_at: datetime) -> None:
    if end_at <= start_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_at must be greater than start_at",
        )


async def _get_item(
    item_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> Item | None:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.workspace_id == workspace_id,
            Item.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _get_event(
    event_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
    include_deleted: bool = False,
) -> Event | None:
    clauses = [Event.id == event_id, Event.workspace_id == workspace_id]
    if not include_deleted:
        clauses.append(Event.deleted_at.is_(None))

    result = await db.execute(select(Event).where(*clauses).options(selectinload(Event.item)))
    return result.scalar_one_or_none()


@router.get("", response_model=EventsRangeResponse)
async def list_events(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
    from_date: date = Query(..., alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., alias="to", description="End date (YYYY-MM-DD)"),
) -> EventsRangeResponse:
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'to' must be greater than or equal to 'from'",
        )

    range_start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
    range_end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
    result = await db.execute(
        select(Event)
        .where(
            Event.workspace_id == workspace.workspace_id,
            Event.deleted_at.is_(None),
            Event.start_at >= range_start,
            Event.start_at <= range_end,
        )
        .options(selectinload(Event.item))
        .order_by(Event.start_at.asc())
    )
    events = list(result.scalars().all())
    return EventsRangeResponse(events=[_event_to_out(event) for event in events])


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventOut:
    _validate_date_order(body.start_at, body.end_at)

    if body.item_id is not None:
        item = await _get_item(body.item_id, workspace.workspace_id, db)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if item.title != body.title:
            item.title = body.title
    else:
        item = Item(
            workspace_id=workspace.workspace_id,
            title=body.title,
            kind="task",
            status="ready",
            meta={"source": "timeline"},
            blocks=[],
        )
        db.add(item)
        await db.flush()

    event = Event(
        workspace_id=workspace.workspace_id,
        item_id=item.id,
        start_at=body.start_at,
        end_at=body.end_at,
        estimated_time_seconds=_resolve_estimated_time_seconds(
            body.start_at,
            body.end_at,
            body.estimated_time_seconds,
        ),
    )
    db.add(event)
    await db.commit()

    reloaded = await _get_event(event.id, workspace.workspace_id, db)
    if reloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_to_out(reloaded)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: uuid.UUID,
    body: EventUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventOut:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if (
        body.last_known_updated_at is not None
        and event.updated_at is not None
        and event.updated_at != body.last_known_updated_at
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict: event was modified on another device",
        )

    next_start_at = body.start_at or event.start_at
    next_end_at = body.end_at or event.end_at
    _validate_date_order(next_start_at, next_end_at)

    event.start_at = next_start_at
    event.end_at = next_end_at
    if body.estimated_time_seconds is not None:
        event.estimated_time_seconds = body.estimated_time_seconds
    if body.title is not None and event.item is not None:
        event.item.title = body.title

    await db.commit()
    reloaded = await _get_event(event.id, workspace.workspace_id, db)
    if reloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_to_out(reloaded)


@router.delete("/{event_id}", response_model=EventDeleteResponse)
async def delete_event(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventDeleteResponse:
    event = await _get_event(event_id, workspace.workspace_id, db, include_deleted=True)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.deleted_at is not None:
        return EventDeleteResponse(id=event.id, deleted=True)

    event.deleted_at = datetime.now(timezone.utc)
    event.is_tracking = False
    event.tracking_started_at = None
    await db.commit()
    return EventDeleteResponse(id=event.id, deleted=True)


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
