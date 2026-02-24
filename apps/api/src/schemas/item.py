import uuid
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
    blocks: list[dict[str, Any]]  # ProseMirror JSON; validated as list of dicts in API

    model_config = {"from_attributes": True}


class UpdateItemRequest(BaseModel):
    blocks: list[dict[str, Any]] | None = None
    title: str | None = None
