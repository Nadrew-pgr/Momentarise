import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
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

    workspace: Mapped["Workspace"] = relationship(back_populates="inbox_captures")  # noqa: F821
    user: Mapped["User"] = relationship(back_populates="inbox_captures")  # noqa: F821
