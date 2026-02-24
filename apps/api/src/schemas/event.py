import uuid
from datetime import datetime

from pydantic import BaseModel


class StartTrackingResponse(BaseModel):
    event_id: uuid.UUID
    is_tracking: bool = True
    tracking_started_at: datetime


class StopTrackingResponse(BaseModel):
    """actual_time_acc: accumulated time in seconds (DB: actual_time_acc_seconds)."""

    event_id: uuid.UUID
    is_tracking: bool = False
    actual_time_acc: int  # seconds, from actual_time_acc_seconds
