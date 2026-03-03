import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from src.schemas.timeline import EventOut

EventColor = Literal["sky", "amber", "violet", "rose", "emerald", "orange"]


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    start_at: datetime
    end_at: datetime
    all_day: bool = False
    location: str | None = None
    estimated_time_seconds: int | None = Field(default=None, ge=0)
    item_id: uuid.UUID | None = None
    color: EventColor | None = None
    rrule: str | None = None
    series_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None


class EventUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None
    location: str | None = None
    estimated_time_seconds: int | None = Field(default=None, ge=0)
    last_known_updated_at: datetime | None = None
    color: EventColor | None = None
    rrule: str | None = None
    series_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    update_mode: Literal["single", "future", "all"] | None = None


class EventsRangeResponse(BaseModel):
    events: list[EventOut]


class EventDeleteResponse(BaseModel):
    id: uuid.UUID
    deleted: bool


class StartTrackingResponse(BaseModel):
    event_id: uuid.UUID
    is_tracking: bool = True
    tracking_started_at: datetime


class StopTrackingResponse(BaseModel):
    """actual_time_acc: accumulated time in seconds (DB: actual_time_acc_seconds)."""

    event_id: uuid.UUID
    is_tracking: bool = False
    actual_time_acc: int  # seconds, from actual_time_acc_seconds
