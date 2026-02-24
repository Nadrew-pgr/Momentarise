import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class Event(BaseMixin, Base):
    __tablename__ = "events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estimated_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_time_acc_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_tracking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tracking_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="events")  # noqa: F821
    item: Mapped["Item"] = relationship(back_populates="events")  # noqa: F821
