import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class AIToolCall(BaseMixin, Base):
    __tablename__ = "ai_tool_calls"
    __table_args__ = (UniqueConstraint("run_id", "seq"),)

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_runs.id"), nullable=False
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    tool_name: Mapped[str] = mapped_column(Text, nullable=False)
    args_json: Mapped[dict] = mapped_column(
        MutableDict.as_mutable(JSONB), nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    result_json: Mapped[dict | None] = mapped_column(MutableDict.as_mutable(JSONB), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="started", server_default="started")
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_confirmation: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    run: Mapped["AIRun"] = relationship(back_populates="tool_calls")  # noqa: F821
