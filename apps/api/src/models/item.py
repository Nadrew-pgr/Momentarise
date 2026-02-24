import uuid

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class Item(BaseMixin, Base):
    __tablename__ = "items"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    priority_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="items")  # noqa: F821
    events: Mapped[list["Event"]] = relationship(  # noqa: F821
        back_populates="item", order_by="Event.start_at"
    )
