from datetime import datetime

from pydantic import BaseModel, Field
from typing import Literal


class CalendarPreferencesResponse(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)
    updated_at: datetime


class CalendarPreferencesUpdateRequest(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)
    last_known_updated_at: datetime | None = None


AiMode = Literal["proposal_only", "auto_apply"]


class AiPreferencesResponse(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    updated_at: datetime


class AiPreferencesUpdateRequest(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    last_known_updated_at: datetime | None = None
