import uuid
from datetime import datetime

from pydantic import BaseModel


class PriorityItemOut(BaseModel):
    id: uuid.UUID
    title: str
    priority_order: int

    model_config = {"from_attributes": True}


class EventSummaryOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    start_at: datetime
    end_at: datetime

    model_config = {"from_attributes": True}


class TodayResponse(BaseModel):
    priorities: list[PriorityItemOut]
    next_event: EventSummaryOut | None
    next_action: PriorityItemOut | None
