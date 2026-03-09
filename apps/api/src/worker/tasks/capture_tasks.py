from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select

from src.core.config import settings
from src.core.database import async_session
from src.models.inbox_capture import InboxCapture
from src.models.workspace import WorkspaceMember
from src.services.capture_async_queue import update_capture_queue_meta
from src.services.capture_pipeline import process_capture_jobs
from src.worker.celery_app import celery_app

logger = logging.getLogger(__name__)
_worker_loop: asyncio.AbstractEventLoop | None = None


def _run_async_in_worker_loop(coro: Any) -> dict[str, Any]:
    global _worker_loop
    loop = _worker_loop
    if loop is None or loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        _worker_loop = loop
    return loop.run_until_complete(coro)


async def _run_capture_pipeline(
    *,
    capture_id: str,
    run_id: str,
    trigger: str,
    queue_name: str,
    task_id: str | None,
) -> dict[str, Any]:
    capture_uuid = uuid.UUID(capture_id)
    run_uuid = uuid.UUID(run_id)
    now_iso = datetime.now(UTC).isoformat()

    async with async_session() as db:
        result = await db.execute(
            select(InboxCapture).where(
                InboxCapture.id == capture_uuid,
                InboxCapture.deleted_at.is_(None),
            )
        )
        capture = result.scalar_one_or_none()
        if capture is None:
            logger.warning(
                "worker.capture.skipped reason=capture_not_found capture_id=%s run_id=%s task_id=%s",
                capture_id,
                run_id,
                task_id or "",
            )
            return {"status": "capture_not_found", "at": now_iso}

        queue_meta = capture.meta.get("queue") if isinstance(capture.meta, dict) else None
        queued_run_id = queue_meta.get("run_id") if isinstance(queue_meta, dict) else None
        if isinstance(queued_run_id, str) and queued_run_id.strip() and queued_run_id != run_id:
            logger.info(
                "worker.capture.stale_run capture_id=%s requested_run_id=%s queued_run_id=%s task_id=%s",
                capture_id,
                run_id,
                queued_run_id,
                task_id or "",
            )
            return {
                "status": "stale_run",
                "capture_id": capture_id,
                "requested_run_id": run_id,
                "queued_run_id": queued_run_id,
            }

        capture.status = "processing"
        update_capture_queue_meta(
            capture,
            run_id=run_uuid,
            queue_name=queue_name,  # type: ignore[arg-type]
            queue_state="enqueued",
            trigger=trigger,
            task_id=task_id,
        )
        await db.flush()

        try:
            await process_capture_jobs(db, capture, run_id=run_uuid)

            if settings.CAPTURE_AUTO_APPLY_ENABLED:
                from src.api.v1.inbox import _maybe_auto_apply_capture  # noqa: PLC0415

                member_result = await db.execute(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == capture.workspace_id,
                        WorkspaceMember.user_id == capture.user_id,
                        WorkspaceMember.deleted_at.is_(None),
                    )
                )
                member = member_result.scalar_one_or_none()
                if member is not None:
                    await _maybe_auto_apply_capture(
                        db=db,
                        workspace=member,
                        capture=capture,
                    )

            from src.api.v1.inbox import _sync_source_item_from_capture  # noqa: PLC0415

            await _sync_source_item_from_capture(
                db,
                workspace_id=capture.workspace_id,
                capture=capture,
            )
            current_meta = capture.meta if isinstance(capture.meta, dict) else {}
            queue_meta = current_meta.get("queue") if isinstance(current_meta.get("queue"), dict) else {}
            capture.meta = {
                **current_meta,
                "queue": {
                    **queue_meta,
                    "finished_at": datetime.now(UTC).isoformat(),
                },
            }
            await db.commit()
            return {
                "status": capture.status,
                "capture_id": capture_id,
                "run_id": run_id,
                "task_id": task_id,
            }
        except Exception as exc:
            await db.rollback()
            result = await db.execute(
                select(InboxCapture).where(
                    InboxCapture.id == capture_uuid,
                    InboxCapture.deleted_at.is_(None),
                )
            )
            capture = result.scalar_one_or_none()
            if capture is not None:
                capture.status = "failed"
                update_capture_queue_meta(
                    capture,
                    run_id=run_uuid,
                    queue_name=queue_name,  # type: ignore[arg-type]
                    queue_state="not_enqueued",
                    trigger=trigger,
                    task_id=task_id,
                    error_code="queue_worker_failure",
                )
                await db.commit()
            logger.exception(
                "worker.capture.failed capture_id=%s run_id=%s task_id=%s error=%s",
                capture_id,
                run_id,
                task_id or "",
                str(exc),
            )
            raise


if celery_app is not None:

    @celery_app.task(  # type: ignore[misc]
        bind=True,
        name="capture.run_pipeline",
        autoretry_for=(Exception,),
        retry_backoff=True,
        retry_jitter=True,
        retry_kwargs={"max_retries": settings.CELERY_TASK_MAX_RETRIES},
    )
    def run_capture_pipeline(
        self,
        *,
        capture_id: str,
        run_id: str,
        trigger: str = "api",
        queue_name: str = "capture_default",
    ) -> dict[str, Any]:
        return _run_async_in_worker_loop(
            _run_capture_pipeline(
                capture_id=capture_id,
                run_id=run_id,
                trigger=trigger,
                queue_name=queue_name,
                task_id=str(getattr(self.request, "id", "")) or None,
            )
        )

else:

    def run_capture_pipeline(  # pragma: no cover - used only when celery unavailable
        *,
        capture_id: str,
        run_id: str,
        trigger: str = "api",
        queue_name: str = "capture_default",
    ) -> dict[str, Any]:
        raise RuntimeError(
            "capture.run_pipeline is unavailable because celery is not configured"
        )
