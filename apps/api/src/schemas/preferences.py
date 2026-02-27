from datetime import datetime

from pydantic import BaseModel, Field


class CalendarPreferencesResponse(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)
    updated_at: datetime


class CalendarPreferencesUpdateRequest(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)
    last_known_updated_at: datetime | None = None
