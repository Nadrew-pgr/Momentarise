import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CaptureType = Literal["text", "voice", "photo", "link", "file", "share", "deeplink"]
CaptureStatus = Literal["draft", "captured", "queued", "processing", "ready", "failed", "applied"]
CaptureActionType = Literal[
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
    "summarize",
    "review",
]
CaptureCategory = Literal[
    "finance",
    "communication",
    "schedule",
    "document",
    "travel",
    "personal",
    "general",
]
CaptureActor = Literal["user", "sync", "system"]
CaptureBadgeKind = Literal["type", "category", "actor", "tag", "status"]
ItemKind = Literal["note", "objective", "task", "resource"]


class CaptureActionSuggestionOut(BaseModel):
    key: str
    label: str
    type: CaptureActionType
    confidence: float
    requires_confirm: bool
    preview_payload: dict[str, Any] = Field(default_factory=dict)
    is_primary: bool = False


class CaptureBadgeOut(BaseModel):
    key: str
    label: str
    kind: CaptureBadgeKind
    tone: Literal["default", "secondary", "outline"] = "outline"


class InboxCaptureOut(BaseModel):
    id: uuid.UUID
    raw_content: str
    source: str | None = None
    capture_type: CaptureType
    status: CaptureStatus
    metadata: dict[str, Any] = Field(
        alias="meta",
        serialization_alias="metadata",
    )
    suggested_actions: list[CaptureActionSuggestionOut] = Field(default_factory=list)
    primary_action: CaptureActionSuggestionOut | None = None
    requires_review: bool = False
    archived: bool = False
    archived_reason: Literal["applied", "deleted"] | None = None
    deleted_at: datetime | None = None
    category: CaptureCategory | None = None
    actor: CaptureActor = "user"
    tags: list[str] = Field(default_factory=list)
    badges: list[CaptureBadgeOut] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class InboxListResponse(BaseModel):
    captures: list[InboxCaptureOut]


class CreateCaptureRequest(BaseModel):
    raw_content: str = ""
    source: str | None = "manual"
    capture_type: CaptureType = "text"
    status: CaptureStatus = "captured"
    metadata: dict[str, Any] = Field(default_factory=dict)


class CaptureUploadResponse(BaseModel):
    id: uuid.UUID
    status: CaptureStatus


class CaptureAssetOut(BaseModel):
    id: uuid.UUID
    kind: str
    storage_key: str
    mime_type: str
    size_bytes: int
    duration_ms: int | None = None
    checksum: str | None = None
    metadata: dict[str, Any] = Field(
        alias="meta",
        serialization_alias="metadata",
    )
    created_at: datetime
    preview_kind: Literal["audio", "image", "pdf", "text", "binary"] = "binary"
    file_name: str = ""
    content_path: str = ""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CaptureArtifactOut(BaseModel):
    id: uuid.UUID
    artifact_type: str
    content_json: dict[str, Any]
    provider: str | None = None
    model: str | None = None
    confidence: float | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CaptureJobOut(BaseModel):
    id: uuid.UUID
    job_type: str
    status: str
    attempt_count: int
    last_error: str | None = None
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CaptureDetailResponse(BaseModel):
    capture: InboxCaptureOut
    assets: list[CaptureAssetOut]
    artifacts: list[CaptureArtifactOut]
    jobs: list[CaptureJobOut]
    pipeline_trace: list[dict[str, Any]] = Field(default_factory=list)
    artifacts_summary: dict[str, Any] = Field(default_factory=dict)


class CaptureArtifactsResponse(BaseModel):
    artifacts: list[CaptureArtifactOut]


class ProcessCaptureRequest(BaseModel):
    title: str


class ProcessCaptureResponse(BaseModel):
    item_id: uuid.UUID


class CapturePreviewRequest(BaseModel):
    action_key: str | None = None


class CapturePreviewResponse(BaseModel):
    capture_id: uuid.UUID
    action_key: str | None = None
    action_type: CaptureActionType | None = None
    suggested_title: str
    suggested_kind: ItemKind
    confidence: float
    reason: str
    preview_payload: dict[str, Any] = Field(default_factory=dict)


class ApplyCaptureRequest(BaseModel):
    title: str | None = None
    kind: ItemKind | None = None
    action_key: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ApplyCaptureResponse(BaseModel):
    capture_id: uuid.UUID
    item_id: uuid.UUID
    event_id: uuid.UUID | None = None
    applied_action_key: str | None = None


class CaptureActionResponse(BaseModel):
    capture_id: uuid.UUID
    status: str


class ExternalCaptureRequest(BaseModel):
    raw_content: str = ""
    source: str | None = "extension"
    capture_type: CaptureType = "text"
    metadata: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None
