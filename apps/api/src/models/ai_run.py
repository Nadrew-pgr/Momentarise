import uuid

from sqlalchemy import ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class AIRun(BaseMixin, Base):
    __tablename__ = "ai_runs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_profiles.id"), nullable=True
    )
    mode: Mapped[str] = mapped_column(Text, nullable=False, default="guided", server_default="guided")
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="pending", server_default="pending"
    )
    selected_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_json: Mapped[dict] = mapped_column(
        MutableDict.as_mutable(JSONB), nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    prompt_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_mode: Mapped[str] = mapped_column(Text, nullable=False, default="full", server_default="full")
    system_prompt_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    toolset_snapshot: Mapped[list] = mapped_column(
        MutableList.as_mutable(JSONB), nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    retrieval_snapshot: Mapped[list] = mapped_column(
        MutableList.as_mutable(JSONB), nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    last_seq: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )

    messages: Mapped[list["AIMessage"]] = relationship(  # noqa: F821
        back_populates="run",
        order_by="AIMessage.seq",
    )
    usage_events: Mapped[list["AIUsageEvent"]] = relationship(  # noqa: F821
        back_populates="run",
        order_by="AIUsageEvent.seq",
    )
    questions: Mapped[list["AIQuestion"]] = relationship(  # noqa: F821
        back_populates="run",
        order_by="AIQuestion.seq",
    )
    drafts: Mapped[list["AIDraft"]] = relationship(  # noqa: F821
        back_populates="run",
        order_by="AIDraft.seq",
    )
    tool_calls: Mapped[list["AIToolCall"]] = relationship(  # noqa: F821
        back_populates="run",
        order_by="AIToolCall.seq",
    )
