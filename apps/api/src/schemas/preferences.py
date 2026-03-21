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
SyncChannelKind = Literal[
    "in_app",
    "push",
    "email",
    "web",
    "mobile",
    "whatsapp",
    "telegram",
    "instagram_business",
    "mobile_share_extension",
    "browser_extension",
]
SyncOutputType = Literal["sync_response", "alert", "digest", "reminder"]


class CaptureProviderSetting(BaseModel):
    provider: CaptureProviderKind
    model: str = Field(min_length=1)
    language: str | None = None
    fallback_enabled: bool = True


class CaptureProviderPreferences(BaseModel):
    transcription: CaptureProviderSetting
    ocr: CaptureProviderSetting
    vlm: CaptureProviderSetting


class SyncChannelByOutputType(BaseModel):
    sync_response: SyncChannelKind = "in_app"
    alert: SyncChannelKind = "in_app"
    digest: SyncChannelKind = "in_app"
    reminder: SyncChannelKind = "in_app"


class SyncChannelByOutputTypeUpdate(BaseModel):
    sync_response: SyncChannelKind | None = None
    alert: SyncChannelKind | None = None
    digest: SyncChannelKind | None = None
    reminder: SyncChannelKind | None = None


class SyncChannelPreferences(BaseModel):
    preferred_channel: SyncChannelKind = "in_app"
    available_channels: list[SyncChannelKind] = Field(
        default_factory=lambda: ["in_app", "web", "mobile"]
    )
    channel_by_output_type: SyncChannelByOutputType = Field(
        default_factory=SyncChannelByOutputType
    )
    input_channel: SyncChannelKind = "in_app"
    output_channel: SyncChannelKind = "in_app"


class SyncChannelPreferencesUpdate(BaseModel):
    preferred_channel: SyncChannelKind | None = None
    available_channels: list[SyncChannelKind] | None = None
    channel_by_output_type: SyncChannelByOutputTypeUpdate | None = None
    input_channel: SyncChannelKind | None = None
    output_channel: SyncChannelKind | None = None


class AiPreferencesResponse(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    capture_provider_preferences: CaptureProviderPreferences
    capture_default_agent_id: UUID | None = None
    capture_agent_routing_rules: dict = Field(default_factory=dict)
    editor_default_agent_id: UUID | None = None
    editor_agent_routing_rules: dict = Field(default_factory=dict)
    capture_research_policy: CaptureResearchPolicy = "proposal_only"
    sync_model: str = "auto"
    sync_reasoning_level: str | None = None
    sync_channel_preferences: SyncChannelPreferences = Field(
        default_factory=SyncChannelPreferences
    )
    updated_at: datetime


class AiPreferencesUpdateRequest(BaseModel):
    mode: AiMode
    auto_apply_threshold: float = Field(ge=0, le=1)
    max_actions_per_capture: int = Field(ge=1, le=3)
    capture_provider_preferences: CaptureProviderPreferences | None = None
    capture_default_agent_id: UUID | None = None
    capture_agent_routing_rules: dict | None = None
    editor_default_agent_id: UUID | None = None
    editor_agent_routing_rules: dict | None = None
    capture_research_policy: CaptureResearchPolicy | None = None
    sync_model: str | None = None
    sync_reasoning_level: str | None = None
    sync_channel_preferences: SyncChannelPreferencesUpdate | None = None
    last_known_updated_at: datetime | None = None
