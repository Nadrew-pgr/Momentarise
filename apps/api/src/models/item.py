import uuid

from sqlalchemy import ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class Item(BaseMixin, Base):
    __tablename__ = "items"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    priority_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kind: Mapped[str] = mapped_column(Text, nullable=False, default="note", server_default="note")
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="draft", server_default="draft"
    )
    meta: Mapped[dict] = mapped_column(
        "metadata",
        MutableDict.as_mutable(JSONB),
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    source_capture_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inbox_captures.id"), nullable=True
    )
    blocks: Mapped[list] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="items")  # noqa: F821
    events: Mapped[list["Event"]] = relationship(  # noqa: F821
        back_populates="item", order_by="Event.start_at"
    )
    source_capture: Mapped["InboxCapture | None"] = relationship(  # noqa: F821
        back_populates="derived_items",
        foreign_keys=[source_capture_id],
    )
