from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.event import Event
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.today import (
    EventSummaryOut,
    PriorityItemOut,
    TodayResponse,
)

router = APIRouter(prefix="/today", tags=["today"])


@router.get("", response_model=TodayResponse)
async def get_today(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> TodayResponse:
    ws_id = workspace.workspace_id

    # Priorities: items with priority_order, sorted, limit 3
    priorities_result = await db.execute(
        select(Item)
        .where(
            Item.workspace_id == ws_id,
            Item.deleted_at.is_(None),
            Item.priority_order.isnot(None),
        )
        .order_by(Item.priority_order.asc())
        .limit(3)
    )
    priority_items = list(priorities_result.scalars().all())
    priorities = [PriorityItemOut.model_validate(i) for i in priority_items]

    # Next action: first priority item (same as priorities[0] if any)
    next_action = PriorityItemOut.model_validate(priority_items[0]) if priority_items else None

    # Today in UTC (start and end of day)
    today_utc = datetime.now(timezone.utc).date()
    start_of_day = datetime.combine(today_utc, time.min, tzinfo=timezone.utc)
    end_of_day = datetime.combine(today_utc, time.max, tzinfo=timezone.utc)

    # Next event: first event of the day (start_at ASC), limit 1, with item for title
    next_event_result = await db.execute(
        select(Event)
        .where(
            Event.workspace_id == ws_id,
            Event.deleted_at.is_(None),
            Event.start_at >= start_of_day,
            Event.start_at <= end_of_day,
        )
        .options(selectinload(Event.item))
        .order_by(Event.start_at.asc())
        .limit(1)
    )
    next_event_row = next_event_result.scalar_one_or_none()
    if next_event_row and next_event_row.item:
        next_event = EventSummaryOut(
            id=next_event_row.id,
            item_id=next_event_row.item_id,
            title=next_event_row.item.title,
            start_at=next_event_row.start_at,
            end_at=next_event_row.end_at,
        )
    else:
        next_event = None

    return TodayResponse(
        priorities=priorities,
        next_event=next_event,
        next_action=next_action,
    )
