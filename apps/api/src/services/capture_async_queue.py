import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.capture_job import CaptureJob
from src.models.inbox_capture import InboxCapture
from src.models.queue_outbox_event import QueueOutboxEvent
from src.models.workspace import Workspace
from src.services.capture_pipeline import enqueue_default_jobs
from src.worker.celery_app import celery_app

CaptureQueueName = Literal["capture_high", "capture_default", "capture_free"]
CaptureQueueState = Literal["enqueued", "not_enqueued"]

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CaptureRunSchedule:
    run_id: uuid.UUID
    queue_name: CaptureQueueName
    tier: str
    outbox_event_id: uuid.UUID


def create_capture_run_id() -> uuid.UUID:
    return uuid.uuid4()


def capture_async_worker_unavailable_reason() -> str | None:
    if celery_app is None:
        return "celery_not_configured"
    return None


def is_capture_async_worker_available() -> bool:
    return capture_async_worker_unavailable_reason() is None


def _normalize_billing_tier(value: object) -> str:
    if not isinstance(value, str):
        return "free"
    clean = value.strip().lower()
    if clean in {"free", "default", "pro", "ultra"}:
        return clean
    return "free"


def queue_name_for_tier(tier: str) -> CaptureQueueName:
    normalized = _normalize_billing_tier(tier)
    if normalized in {"pro", "ultra"}:
        return "capture_high"
    if normalized == "default":
        return "capture_default"
    return "capture_free"


async def resolve_workspace_billing_tier(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
    )
    workspace = result.scalar_one_or_none()
    if workspace is None or not isinstance(workspace.preferences, dict):
        return "free"
    billing = workspace.preferences.get("billing")
    if not isinstance(billing, dict):
        return "free"
    return _normalize_billing_tier(billing.get("tier"))


def _next_retry_after_seconds(attempts: int) -> int:
    # Cap retry delay to keep outbox replay responsive while avoiding hot loops.
    return min(2 ** max(1, attempts), 60)


def _parse_event_payload(payload: dict[str, Any]) -> tuple[uuid.UUID, uuid.UUID, str]:
    capture_id_raw = payload.get("capture_id")
    run_id_raw = payload.get("run_id")
    trigger = str(payload.get("trigger", "api"))
    if not isinstance(capture_id_raw, str) or not capture_id_raw.strip():
        raise ValueError("invalid_capture_id")
    if not isinstance(run_id_raw, str) or not run_id_raw.strip():
        raise ValueError("invalid_run_id")
    return uuid.UUID(capture_id_raw), uuid.UUID(run_id_raw), trigger


def _dispatch_capture_pipeline_task(
    *,
    capture_id: uuid.UUID,
    run_id: uuid.UUID,
    queue_name: CaptureQueueName,
    trigger: str,
) -> str:
    if celery_app is None:
        raise RuntimeError("celery_not_configured")
    task = celery_app.send_task(
        "capture.run_pipeline",
        kwargs={
            "capture_id": str(capture_id),
            "run_id": str(run_id),
            "trigger": trigger,
            "queue_name": queue_name,
        },
        queue=queue_name,
    )
    if task is None or not getattr(task, "id", None):
        raise RuntimeError("celery_enqueue_failed")
    return str(task.id)


def update_capture_queue_meta(
    capture: InboxCapture,
    *,
    run_id: uuid.UUID,
    queue_name: CaptureQueueName,
    queue_state: CaptureQueueState,
    trigger: str,
    task_id: str | None = None,
    error_code: str | None = None,
) -> None:
    current_meta = capture.meta if isinstance(capture.meta, dict) else {}
    queue_meta = current_meta.get("queue")
    queue_block = queue_meta if isinstance(queue_meta, dict) else {}
    updated_queue = {
        **queue_block,
        "run_id": str(run_id),
        "queue_name": queue_name,
        "queue_state": queue_state,
        "trigger": trigger,
        "task_id": task_id,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    next_meta: dict[str, Any] = {
        **current_meta,
        "queue": updated_queue,
    }
    if error_code:
        next_meta["last_error_code"] = error_code
        next_meta["last_error_at"] = datetime.now(UTC).isoformat()
    capture.meta = next_meta


async def schedule_capture_pipeline_outbox_event(
    db: AsyncSession,
    *,
    capture: InboxCapture,
    trigger: str,
    tier: str,
    run_id: uuid.UUID | None = None,
) -> CaptureRunSchedule:
    resolved_run_id = run_id or create_capture_run_id()
    queue_name = queue_name_for_tier(tier)
    dedupe_key = f"capture:{capture.id}:run:{resolved_run_id}"

    await enqueue_default_jobs(
        db,
        capture,
        run_id=resolved_run_id,
        queue_name=queue_name,
    )
    outbox_event = QueueOutboxEvent(
        workspace_id=capture.workspace_id,
        capture_id=capture.id,
        run_id=resolved_run_id,
        event_type="capture_pipeline.run",
        queue_name=queue_name,
        dedupe_key=dedupe_key,
        payload={
            "capture_id": str(capture.id),
            "run_id": str(resolved_run_id),
            "trigger": trigger,
            "queue_name": queue_name,
            "tier": _normalize_billing_tier(tier),
        },
        status="pending",
    )
    db.add(outbox_event)
    await db.flush()
    return CaptureRunSchedule(
        run_id=resolved_run_id,
        queue_name=queue_name,
        tier=_normalize_billing_tier(tier),
        outbox_event_id=outbox_event.id,
    )


async def publish_capture_outbox_event(
    db: AsyncSession,
    *,
    outbox_event: QueueOutboxEvent,
) -> str | None:
    now = datetime.now(UTC)
    outbox_event.enqueue_attempts = (outbox_event.enqueue_attempts or 0) + 1
    payload = outbox_event.payload if isinstance(outbox_event.payload, dict) else {}
    try:
        capture_id, run_id, trigger = _parse_event_payload(payload)
        task_id = _dispatch_capture_pipeline_task(
            capture_id=capture_id,
            run_id=run_id,
            queue_name=outbox_event.queue_name,  # type: ignore[arg-type]
            trigger=trigger,
        )
        outbox_event.status = "enqueued"
        outbox_event.task_id = task_id
        outbox_event.enqueued_at = now
        outbox_event.failed_at = None
        outbox_event.last_error = None
        outbox_event.next_retry_at = None

        jobs_result = await db.execute(
            select(CaptureJob).where(
                CaptureJob.capture_id == outbox_event.capture_id,
                CaptureJob.run_id == outbox_event.run_id,
                CaptureJob.deleted_at.is_(None),
            )
        )
        for row in jobs_result.scalars().all():
            row.task_id = task_id
            row.queue_name = outbox_event.queue_name
        await db.flush()
        return task_id
    except Exception as exc:  # pragma: no cover - network/runtime safety
        outbox_event.status = "failed"
        outbox_event.failed_at = now
        outbox_event.last_error = str(exc)[:500]
        outbox_event.next_retry_at = now + timedelta(
            seconds=_next_retry_after_seconds(outbox_event.enqueue_attempts or 1)
        )
        await db.flush()
        logger.exception(
            "capture.outbox.publish_failed outbox_event_id=%s capture_id=%s run_id=%s error=%s",
            str(outbox_event.id),
            str(outbox_event.capture_id),
            str(outbox_event.run_id),
            outbox_event.last_error,
        )
        return None


async def publish_capture_outbox_event_by_id(
    db: AsyncSession,
    *,
    outbox_event_id: uuid.UUID,
) -> str | None:
    result = await db.execute(
        select(QueueOutboxEvent).where(
            QueueOutboxEvent.id == outbox_event_id,
            QueueOutboxEvent.deleted_at.is_(None),
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        return None
    if event.status not in {"pending", "failed"}:
        return event.task_id
    return await publish_capture_outbox_event(db, outbox_event=event)


async def relay_pending_capture_outbox_events(
    db: AsyncSession,
    *,
    limit: int = 100,
) -> int:
    now = datetime.now(UTC)
    result = await db.execute(
        select(QueueOutboxEvent)
        .where(
            QueueOutboxEvent.deleted_at.is_(None),
            QueueOutboxEvent.status.in_(["pending", "failed"]),
            or_(
                QueueOutboxEvent.next_retry_at.is_(None),
                QueueOutboxEvent.next_retry_at <= now,
            ),
        )
        .order_by(QueueOutboxEvent.created_at.asc())
        .limit(max(1, min(limit, 500)))
    )
    events = list(result.scalars().all())
    published = 0
    for event in events:
        task_id = await publish_capture_outbox_event(db, outbox_event=event)
        if task_id:
            published += 1
    return published
