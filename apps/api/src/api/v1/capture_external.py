from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.api.v1.inbox import (
    _ensure_source_item_for_capture,
    _run_capture_pipeline_async,
    _run_capture_pipeline_inline,
    _use_async_capture_worker,
)
from src.models.inbox_capture import InboxCapture
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.inbox import CaptureUploadResponse, ExternalCaptureRequest
from src.services.capture_async_queue import (
    create_capture_run_id,
    queue_name_for_tier,
    resolve_workspace_billing_tier,
    update_capture_queue_meta,
)

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
            queue_meta = existing.meta.get("queue") if isinstance(existing.meta, dict) else None
            run_id_value: UUID | None = None
            task_id_value: str | None = None
            queue_state_value: str | None = None
            queue_name_value: str | None = None
            if isinstance(queue_meta, dict):
                raw_run_id = queue_meta.get("run_id")
                if isinstance(raw_run_id, str) and raw_run_id.strip():
                    try:
                        run_id_value = UUID(raw_run_id)
                    except ValueError:
                        run_id_value = None
                raw_task_id = queue_meta.get("task_id")
                if isinstance(raw_task_id, str) and raw_task_id.strip():
                    task_id_value = raw_task_id.strip()
                raw_queue_state = queue_meta.get("queue_state")
                if raw_queue_state in {"enqueued", "not_enqueued"}:
                    queue_state_value = raw_queue_state
                raw_queue_name = queue_meta.get("queue_name")
                if isinstance(raw_queue_name, str) and raw_queue_name.strip():
                    queue_name_value = raw_queue_name.strip()
            return CaptureUploadResponse(
                id=existing.id,
                status=existing.status,  # type: ignore[arg-type]
                task_id=task_id_value,
                run_id=run_id_value,
                queue_state=queue_state_value,  # type: ignore[arg-type]
                queue_name=queue_name_value,
            )

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
            "source_type": body.capture_type,
            "external": {
                "idempotency_key": body.idempotency_key,
                "ingested_at": "api",
            },
        },
    )
    db.add(capture)
    await db.flush()
    await _ensure_source_item_for_capture(
        db,
        workspace_id=workspace.workspace_id,
        capture=capture,
    )

    run_id = create_capture_run_id()
    tier = await resolve_workspace_billing_tier(db, workspace.workspace_id)
    queue_name = queue_name_for_tier(tier)
    task_id: str | None = None
    queue_state = "not_enqueued"
    if _use_async_capture_worker("capture_external"):
        task_id, queue_name = await _run_capture_pipeline_async(
            db=db,
            workspace=workspace,
            capture=capture,
            run_id=run_id,
            trigger="capture_external",
        )
        queue_state = "enqueued"
    else:
        await _run_capture_pipeline_inline(
            db=db,
            workspace=workspace,
            capture=capture,
            run_id=run_id,
            queue_name=queue_name,
        )
        update_capture_queue_meta(
            capture,
            run_id=run_id,
            queue_name=queue_name,  # type: ignore[arg-type]
            queue_state="not_enqueued",
            trigger="capture_external",
        )
        await db.commit()

    await db.refresh(capture)
    return CaptureUploadResponse(
        id=capture.id,
        status=capture.status,  # type: ignore[arg-type]
        task_id=task_id,
        run_id=run_id,
        queue_state=queue_state,  # type: ignore[arg-type]
        queue_name=queue_name,
    )
