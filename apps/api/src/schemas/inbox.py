import uuid
from datetime import datetime

from pydantic import BaseModel


class InboxCaptureOut(BaseModel):
    id: uuid.UUID
    raw_content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InboxListResponse(BaseModel):
    captures: list[InboxCaptureOut]


class CreateCaptureRequest(BaseModel):
    raw_content: str


class ProcessCaptureRequest(BaseModel):
    title: str


class ProcessCaptureResponse(BaseModel):
    item_id: uuid.UUID
