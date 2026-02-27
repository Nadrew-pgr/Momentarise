import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    start_at: datetime
    end_at: datetime
    estimated_time_seconds: int
    actual_time_acc_seconds: int
    is_tracking: bool
    tracking_started_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    events: list[EventOut]
