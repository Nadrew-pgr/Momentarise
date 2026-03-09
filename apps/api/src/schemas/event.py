import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from src.schemas.business_block import BUSINESS_BLOCK_SCHEMA_VERSION, BusinessBlock

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


class EventContentResponse(BaseModel):
    event_id: uuid.UUID
    item_id: uuid.UUID
    schema_version: Literal[BUSINESS_BLOCK_SCHEMA_VERSION] = BUSINESS_BLOCK_SCHEMA_VERSION
    blocks: list[BusinessBlock]


class EventContentUpdateRequest(BaseModel):
    schema_version: Literal[BUSINESS_BLOCK_SCHEMA_VERSION] = BUSINESS_BLOCK_SCHEMA_VERSION
    blocks: list[BusinessBlock]


class EventAnalyticsMetrics(BaseModel):
    completion_rate: float = 0
    effort_seconds: int = 0
    training_volume: float = 0
    energy_score: float = 0
    inbox_refs_count: int = 0
    block_count: int = 0


class EventAnalyticsResponse(BaseModel):
    event_id: uuid.UUID
    period: Literal["week", "month"]
    compare: Literal["previous"] = "previous"
    current: EventAnalyticsMetrics
    previous: EventAnalyticsMetrics
    delta: EventAnalyticsMetrics
    current_start: date
    current_end: date
    previous_start: date
    previous_end: date
