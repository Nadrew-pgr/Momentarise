import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime
    all_day: bool
    location: str | None
    estimated_time_seconds: int
    actual_time_acc_seconds: int
    is_tracking: bool
    color: str
    tracking_started_at: datetime | None
    updated_at: datetime
    rrule: str | None = None
    parent_event_id: uuid.UUID | None = None
    series_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    events: list[EventOut]
