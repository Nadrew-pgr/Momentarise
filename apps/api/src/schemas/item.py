import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ItemKind = Literal["note", "objective", "task", "resource"]
LifecycleStatus = Literal[
    "draft",
    "captured",
    "processing",
    "ready",
    "applied",
    "archived",
]
EntityType = Literal["capture", "item", "event", "plan", "block"]
LinkRelationType = Literal[
    "derived_from",
    "supports_goal",
    "planned_as",
    "references",
    "part_of_sequence",
]


class ProseMirrorNode(BaseModel):
    """Minimal validation for ProseMirror/BlockNote block nodes."""

    type: str
    block_id: str | None = None
    content: list["ProseMirrorNode"] | None = None
    attrs: dict[str, Any] | None = None
    text: str | None = None
    marks: list[dict[str, Any]] | None = None


ProseMirrorNode.model_rebuild()


class ItemOut(BaseModel):
    id: uuid.UUID
    title: str
    kind: ItemKind
    status: LifecycleStatus
    metadata: dict[str, Any] = Field(
        alias="meta",
        serialization_alias="metadata",
    )
    source_capture_id: uuid.UUID | None = None
    blocks: list[ProseMirrorNode]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ItemCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    kind: ItemKind = "note"
    status: LifecycleStatus = "draft"
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_capture_id: uuid.UUID | None = None
    blocks: list[ProseMirrorNode] = Field(default_factory=list)


class UpdateItemRequest(BaseModel):
    blocks: list[ProseMirrorNode] | None = None
    title: str | None = None
    kind: ItemKind | None = None
    status: LifecycleStatus | None = None
    metadata: dict[str, Any] | None = None


class ItemListItemOut(BaseModel):
    id: uuid.UUID
    title: str
    kind: ItemKind
    status: LifecycleStatus
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ItemListResponse(BaseModel):
    items: list[ItemListItemOut]


class ItemActionResponse(BaseModel):
    item_id: uuid.UUID
    status: str


class EntityLinkOut(BaseModel):
    id: uuid.UUID
    from_entity_type: EntityType
    from_entity_id: uuid.UUID
    to_entity_type: EntityType
    to_entity_id: uuid.UUID
    relation_type: LinkRelationType
    metadata: dict[str, Any] = Field(
        alias="meta",
        serialization_alias="metadata",
    )
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ItemLinksResponse(BaseModel):
    links: list[EntityLinkOut]


class CreateEntityLinkRequest(BaseModel):
    to_entity_type: EntityType
    to_entity_id: uuid.UUID
    relation_type: LinkRelationType
    metadata: dict[str, Any] = Field(default_factory=dict)
