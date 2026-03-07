import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from src.schemas.item import EntityLinkOut

CaptureType = Literal["text", "voice", "photo", "link", "file", "share", "deeplink"]
CaptureStatus = Literal[
    "draft",
    "captured",
    "queued",
    "processing",
    "ready",
    "failed",
    "applied",
    "archived",
]
CaptureActionType = Literal[
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
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
TreatedBucket = Literal["untreated", "treated"]


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
    item_id: uuid.UUID | None = None
    title: str | None = None
    raw_content: str
    source: str | None = None
    source_type: str = "text"
    capture_type: CaptureType
    status: CaptureStatus
    pipeline_state: CaptureStatus = "captured"
    treated_bucket: TreatedBucket = "untreated"
    agent_hint: str | None = None
    coming_soon_capabilities: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(
        alias="meta",
        serialization_alias="metadata",
    )
    suggested_actions: list[CaptureActionSuggestionOut] = Field(default_factory=list)
    primary_action: CaptureActionSuggestionOut | None = None
    requires_review: bool = False
    archived: bool = False
    archived_reason: Literal["applied", "deleted", "archived"] | None = None
    deleted_at: datetime | None = None
    category: CaptureCategory | None = None
    actor: CaptureActor = "user"
    tags: list[str] = Field(default_factory=list)
    badges: list[CaptureBadgeOut] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class InboxListResponse(BaseModel):
    captures: list[InboxCaptureOut]
    entries: list[InboxCaptureOut] = Field(default_factory=list)


class InboxSearchEntryOut(BaseModel):
    id: uuid.UUID
    title: str
    capture_type: CaptureType
    status: CaptureStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InboxSearchResponse(BaseModel):
    captures: list[InboxSearchEntryOut]


class CaptureLinksResponse(BaseModel):
    links: list[EntityLinkOut]


class CreateCaptureRequest(BaseModel):
    raw_content: str = ""
    source: str | None = "manual"
    capture_type: CaptureType = "text"
    status: CaptureStatus = "captured"
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateCaptureRequest(BaseModel):
    title: str | None = None


class CaptureUploadResponse(BaseModel):
    id: uuid.UUID
    status: CaptureStatus
    task_id: str | None = None
    run_id: uuid.UUID | None = None
    queue_state: Literal["enqueued", "not_enqueued"] | None = None
    queue_name: str | None = None


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
    run_id: uuid.UUID | None = None
    queue_name: str | None = None
    task_id: str | None = None
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
    missing_fields: list[str] = Field(default_factory=list)


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
    task_id: str | None = None
    run_id: uuid.UUID | None = None
    queue_state: Literal["enqueued", "not_enqueued"] | None = None
    queue_name: str | None = None


class NoteSummaryRefreshResponse(BaseModel):
    capture_id: uuid.UUID
    status: Literal["generated", "unchanged", "skipped_too_short"]
    summary_updated: bool = False
    source_hash: str | None = None


class ExternalCaptureRequest(BaseModel):
    raw_content: str = ""
    source: str | None = "extension"
    capture_type: CaptureType = "text"
    metadata: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None
