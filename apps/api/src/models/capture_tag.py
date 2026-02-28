import uuid

from sqlalchemy import Float, ForeignKey, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class CaptureTag(BaseMixin, Base):
    __tablename__ = "capture_tags"
    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_capture_tags_workspace_name"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_actor: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="sync",
        server_default="sync",
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="capture_tags")  # noqa: F821
    links: Mapped[list["CaptureTagLink"]] = relationship(back_populates="tag")  # noqa: F821


class CaptureTagLink(BaseMixin, Base):
    __tablename__ = "capture_tag_links"
    __table_args__ = (UniqueConstraint("capture_id", "tag_id", name="uq_capture_tag_links_capture_tag"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    capture_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inbox_captures.id"), nullable=False
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("capture_tags.id"), nullable=False
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        server_default=text("1"),
    )
    source: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="sync",
        server_default="sync",
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="capture_tag_links")  # noqa: F821
    capture: Mapped["InboxCapture"] = relationship(back_populates="tag_links")  # noqa: F821
    tag: Mapped["CaptureTag"] = relationship(back_populates="links")
