from __future__ import annotations

import logging

from src.core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency during local dev/tests
    from celery import Celery
except Exception:  # pragma: no cover - import guard
    Celery = None  # type: ignore[assignment]


def _build_celery_app() -> Celery | None:
    broker_url = settings.CELERY_BROKER_URL
    if Celery is None or not broker_url:
        return None

    app = Celery(
        "momentarise",
        broker=broker_url,
        include=[
            "src.worker.tasks.capture_tasks",
            "src.worker.tasks.sync_backfill_events",
        ],
    )
    app.conf.update(
        task_default_queue="capture_default",
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_ignore_result=True,
        worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        broker_connection_retry_on_startup=True,
        task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT_SECONDS,
        task_time_limit=settings.CELERY_TASK_TIME_LIMIT_SECONDS,
        task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
        timezone="UTC",
        task_routes={
            "capture.run_pipeline": {"queue": "capture_default"},
            "sync.backfill_events": {"queue": "capture_default"},
        },
    )
    return app


celery_app = _build_celery_app()

if celery_app is None:
    logger.warning("worker.celery.disabled reason=missing_broker_or_dependency")
