import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, BaseMixin


class User(BaseMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    revenuecat_app_user_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    identities: Mapped[list["UserIdentity"]] = relationship(back_populates="user", lazy="selectin")
    owned_workspaces: Mapped[list["Workspace"]] = relationship(back_populates="owner")  # noqa: F821
    memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="user")  # noqa: F821
    inbox_captures: Mapped[list["InboxCapture"]] = relationship(back_populates="user")  # noqa: F821


class UserIdentity(BaseMixin, Base):
    __tablename__ = "user_identities"
    __table_args__ = (UniqueConstraint("provider", "provider_subject"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_subject: Mapped[str] = mapped_column(Text, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="identities")
