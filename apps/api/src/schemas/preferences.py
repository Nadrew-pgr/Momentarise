from datetime import datetime
from uuid import UUID

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
CaptureResearchPolicy = Literal["proposal_only", "auto_if_safe"]
CaptureProviderKind = Literal["mistral", "openai", "heuristic"]


class CaptureProviderSetting(BaseModel):
    provider: CaptureProviderKind
    model: str = Field(min_length=1)
    language: str | None = None
    fallback_enabled: bool = True


class CaptureProviderPreferences(BaseModel):
    transcription: CaptureProviderSetting
    ocr: CaptureProviderSetting
    vlm: CaptureProviderSetting


class AiPreferencesResponse(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    capture_provider_preferences: CaptureProviderPreferences
    capture_default_agent_id: UUID | None = None
    capture_agent_routing_rules: dict = Field(default_factory=dict)
    capture_research_policy: CaptureResearchPolicy = "proposal_only"
    sync_model: str = "auto"
    sync_reasoning_level: str | None = None
    updated_at: datetime


class AiPreferencesUpdateRequest(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    capture_provider_preferences: CaptureProviderPreferences | None = None
    capture_default_agent_id: UUID | None = None
    capture_agent_routing_rules: dict | None = None
    capture_research_policy: CaptureResearchPolicy | None = None
    sync_model: str | None = None
    sync_reasoning_level: str | None = None
    last_known_updated_at: datetime | None = None
