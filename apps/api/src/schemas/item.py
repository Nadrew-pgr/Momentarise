import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProseMirrorNode(BaseModel):
    """Minimal validation for ProseMirror/BlockNote block nodes."""

    type: str
    content: list["ProseMirrorNode"] | None = None
    attrs: dict[str, Any] | None = None
    text: str | None = None
    marks: list[dict[str, Any]] | None = None


ProseMirrorNode.model_rebuild()


class ItemOut(BaseModel):
    id: uuid.UUID
    title: str
    blocks: list[ProseMirrorNode]

    model_config = {"from_attributes": True}


class UpdateItemRequest(BaseModel):
    blocks: list[ProseMirrorNode] | None = None
    title: str | None = None


class ItemListItemOut(BaseModel):
    id: uuid.UUID
    title: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemListResponse(BaseModel):
    items: list[ItemListItemOut]
