import uuid

from sqlalchemy import Enum, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin
from src.models.enums import WorkspaceRole


class Workspace(BaseMixin, Base):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="owned_workspaces")  # noqa: F821
    members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace")
    items: Mapped[list["Item"]] = relationship(back_populates="workspace")  # noqa: F821
    events: Mapped[list["Event"]] = relationship(back_populates="workspace")  # noqa: F821
    inbox_captures: Mapped[list["InboxCapture"]] = relationship(back_populates="workspace")  # noqa: F821


class WorkspaceMember(BaseMixin, Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(WorkspaceRole, name="workspace_role"), nullable=False
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="memberships")  # noqa: F821
