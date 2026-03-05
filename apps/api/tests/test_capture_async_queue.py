import os
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.services.capture_async_queue import (
    capture_async_worker_unavailable_reason,
    create_capture_run_id,
    is_capture_async_worker_available,
    queue_name_for_tier,
    update_capture_queue_meta,
)


class CaptureAsyncQueueTests(unittest.TestCase):
    def test_queue_name_mapping_by_tier(self) -> None:
        self.assertEqual(queue_name_for_tier("ultra"), "capture_high")
        self.assertEqual(queue_name_for_tier("pro"), "capture_high")
        self.assertEqual(queue_name_for_tier("default"), "capture_default")
        self.assertEqual(queue_name_for_tier("free"), "capture_free")
        self.assertEqual(queue_name_for_tier("unknown"), "capture_free")

    def test_run_id_is_uuid(self) -> None:
        run_id = create_capture_run_id()
        self.assertIsInstance(run_id, uuid.UUID)

    def test_update_capture_queue_meta_sets_fields(self) -> None:
        capture = SimpleNamespace(meta={})
        run_id = uuid.uuid4()
        update_capture_queue_meta(
            capture,  # type: ignore[arg-type]
            run_id=run_id,
            queue_name="capture_default",
            queue_state="enqueued",
            trigger="unit_test",
            task_id="task-123",
        )
        queue = capture.meta.get("queue")
        self.assertIsInstance(queue, dict)
        if isinstance(queue, dict):
            self.assertEqual(queue.get("run_id"), str(run_id))
            self.assertEqual(queue.get("queue_name"), "capture_default")
            self.assertEqual(queue.get("queue_state"), "enqueued")
            self.assertEqual(queue.get("task_id"), "task-123")

    def test_update_capture_queue_meta_records_error(self) -> None:
        capture = SimpleNamespace(meta={})
        run_id = uuid.uuid4()
        update_capture_queue_meta(
            capture,  # type: ignore[arg-type]
            run_id=run_id,
            queue_name="capture_free",
            queue_state="not_enqueued",
            trigger="unit_test",
            error_code="queue_enqueue_failed",
        )
        self.assertEqual(capture.meta.get("last_error_code"), "queue_enqueue_failed")
        self.assertTrue(isinstance(capture.meta.get("last_error_at"), str))

    def test_async_worker_availability_helpers(self) -> None:
        with patch("src.services.capture_async_queue.celery_app", None):
            self.assertFalse(is_capture_async_worker_available())
            self.assertEqual(capture_async_worker_unavailable_reason(), "celery_not_configured")


if __name__ == "__main__":
    unittest.main()
