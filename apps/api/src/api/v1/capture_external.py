from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.api.v1.inbox import _maybe_auto_apply_capture
from src.models.inbox_capture import InboxCapture
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.inbox import CaptureUploadResponse, ExternalCaptureRequest
from src.services.capture_pipeline import enqueue_default_jobs, process_capture_jobs

router = APIRouter(prefix="/capture", tags=["capture"])


async def _find_idempotent_capture(
    db: AsyncSession,
    workspace_id: UUID,
    user_id: UUID,
    idempotency_key: str,
) -> InboxCapture | None:
    result = await db.execute(
        select(InboxCapture)
        .where(
            InboxCapture.workspace_id == workspace_id,
            InboxCapture.user_id == user_id,
            InboxCapture.deleted_at.is_(None),
        )
        .order_by(InboxCapture.created_at.desc())
        .limit(200)
    )
    for capture in result.scalars().all():
        ext_meta = capture.meta.get("external") if isinstance(capture.meta, dict) else None
        if isinstance(ext_meta, dict) and ext_meta.get("idempotency_key") == idempotency_key:
            return capture
    return None


@router.post("/external", response_model=CaptureUploadResponse, status_code=status.HTTP_201_CREATED)
async def create_external_capture(
    body: ExternalCaptureRequest,
    x_capture_token: str | None = Header(default=None, alias="X-Capture-Token"),
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CaptureUploadResponse:
    expected_token = settings.CAPTURE_EXTERNAL_TOKEN
    if expected_token and x_capture_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid capture token",
        )

    if body.capture_type not in {"text", "voice", "photo", "link", "file", "share", "deeplink"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported capture_type",
        )

    if body.idempotency_key:
        existing = await _find_idempotent_capture(
            db=db,
            workspace_id=workspace.workspace_id,
            user_id=current_user.id,
            idempotency_key=body.idempotency_key,
        )
        if existing is not None:
            return CaptureUploadResponse(id=existing.id, status=existing.status)  # type: ignore[arg-type]

    capture = InboxCapture(
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        raw_content=body.raw_content,
        source=body.source or "extension",
        capture_type=body.capture_type,
        status="queued",
        actor="sync" if (body.source or "").strip().lower() in {"sync", "agent", "automation"} else "user",
        meta={
            **body.metadata,
            "external": {
                "idempotency_key": body.idempotency_key,
                "ingested_at": "api",
            },
        },
    )
    db.add(capture)
    await db.flush()

    await enqueue_default_jobs(db, capture)
    await process_capture_jobs(db, capture)
    await _maybe_auto_apply_capture(db=db, workspace=workspace, capture=capture)

    await db.commit()
    await db.refresh(capture)
    return CaptureUploadResponse(id=capture.id, status=capture.status)  # type: ignore[arg-type]
