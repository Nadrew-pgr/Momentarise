"""Seed script: creates a dev user + workspace for local testing.

Usage: uv run python -m src.seed
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session
from src.core.security import hash_password
from src.models.enums import WorkspaceRole
from src.models.user import User, UserIdentity
from src.models.workspace import Workspace, WorkspaceMember

DEV_EMAIL = "dev@momentarise.local"
DEV_PASSWORD = "password"
DEV_WORKSPACE_NAME = "Mon Workspace"


async def seed() -> None:
    async with async_session() as session:
        session: AsyncSession

        existing = await session.execute(select(User).where(User.email == DEV_EMAIL))
        if existing.scalar_one_or_none() is not None:
            print(f"Seed user '{DEV_EMAIL}' already exists — skipping.")
            return

        user = User(email=DEV_EMAIL)
        session.add(user)
        await session.flush()

        identity = UserIdentity(
            user_id=user.id,
            provider="password",
            provider_subject=DEV_EMAIL,
            hashed_password=hash_password(DEV_PASSWORD),
        )
        session.add(identity)

        workspace = Workspace(name=DEV_WORKSPACE_NAME, owner_id=user.id)
        session.add(workspace)
        await session.flush()

        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceRole.ADMIN,
        )
        session.add(member)

        await session.commit()
        print(f"Seed complete: user={DEV_EMAIL}, password={DEV_PASSWORD}")
        print(f"  workspace='{DEV_WORKSPACE_NAME}' (id={workspace.id})")


if __name__ == "__main__":
    asyncio.run(seed())
