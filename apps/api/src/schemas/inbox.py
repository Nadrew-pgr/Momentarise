import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CaptureType = Literal["text", "voice", "photo", "link", "share", "deeplink"]
CaptureStatus = Literal["draft", "captured", "processing", "ready", "applied"]
ItemKind = Literal["note", "objective", "task", "resource"]


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


class ProcessCaptureRequest(BaseModel):
    title: str


class ProcessCaptureResponse(BaseModel):
    item_id: uuid.UUID


class CapturePreviewResponse(BaseModel):
    capture_id: uuid.UUID
    suggested_title: str
    suggested_kind: ItemKind
    confidence: float
    reason: str


class ApplyCaptureRequest(BaseModel):
    title: str | None = None
    kind: ItemKind | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ApplyCaptureResponse(BaseModel):
    capture_id: uuid.UUID
    item_id: uuid.UUID


class CaptureActionResponse(BaseModel):
    capture_id: uuid.UUID
    status: str
