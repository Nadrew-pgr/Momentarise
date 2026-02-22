from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.core.security import create_access_token, hash_password, verify_password
from src.models.enums import WorkspaceRole
from src.models.user import User, UserIdentity
from src.models.workspace import Workspace, WorkspaceMember
from src.schemas.auth import (
    ActiveWorkspaceOut,
    LoginRequest,
    MeResponse,
    SignupRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "password",
            UserIdentity.provider_subject == body.email.lower(),
        )
    )
    identity = result.scalar_one_or_none()

    if identity is None or identity.hashed_password is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(body.password, identity.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_result = await db.execute(
        select(User).where(User.id == identity.user_id, User.deleted_at.is_(None))
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()

    existing = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "password",
            UserIdentity.provider_subject == email,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(email=email)
    db.add(user)
    await db.flush()

    identity = UserIdentity(
        user_id=user.id,
        provider="password",
        provider_subject=email,
        hashed_password=hash_password(body.password),
    )
    db.add(identity)

    workspace = Workspace(name="My Workspace", owner_id=user.id)
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceRole.ADMIN,
    )
    db.add(member)
    await db.commit()

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.deleted_at.is_(None),
        )
        .order_by(WorkspaceMember.created_at.asc())
    )
    membership = result.scalars().first()

    active_ws = None
    if membership is not None:
        from src.models.workspace import Workspace

        ws_result = await db.execute(
            select(Workspace).where(
                Workspace.id == membership.workspace_id, Workspace.deleted_at.is_(None)
            )
        )
        workspace = ws_result.scalar_one_or_none()
        if workspace is not None:
            active_ws = ActiveWorkspaceOut(
                id=workspace.id, name=workspace.name, role=membership.role.value
            )

    return MeResponse(
        user=UserOut(id=current_user.id, email=current_user.email),
        active_workspace=active_ws,
    )
