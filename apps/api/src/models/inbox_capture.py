import uuid

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class InboxCapture(BaseMixin, Base):
    __tablename__ = "inbox_captures"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(
        Text, nullable=True, default="manual", server_default="manual"
    )
    capture_type: Mapped[str] = mapped_column(
        Text, nullable=False, default="text", server_default="text"
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="captured", server_default="captured"
    )
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="user",
        server_default="user",
    )
    meta: Mapped[dict] = mapped_column(
        "metadata",
        MutableDict.as_mutable(JSONB),
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="inbox_captures")  # noqa: F821
    user: Mapped["User"] = relationship(back_populates="inbox_captures")  # noqa: F821
    derived_items: Mapped[list["Item"]] = relationship(back_populates="source_capture")  # noqa: F821
    assets: Mapped[list["CaptureAsset"]] = relationship(back_populates="capture")  # noqa: F821
    artifacts: Mapped[list["CaptureArtifact"]] = relationship(back_populates="capture")  # noqa: F821
    jobs: Mapped[list["CaptureJob"]] = relationship(back_populates="capture")  # noqa: F821
    action_suggestions: Mapped[list["CaptureActionSuggestion"]] = relationship(back_populates="capture")  # noqa: F821
    tag_links: Mapped[list["CaptureTagLink"]] = relationship(back_populates="capture")  # noqa: F821
    queue_outbox_events: Mapped[list["QueueOutboxEvent"]] = relationship(back_populates="capture")  # noqa: F821
