import os
import unittest
import uuid
from datetime import UTC, datetime

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.schemas.sync import SyncEventEnvelope


class SyncEventSchemaTests(unittest.TestCase):
    def test_reasoning_event_payload_is_valid(self) -> None:
        envelope = SyncEventEnvelope(
            seq=1,
            run_id=uuid.uuid4(),
            ts=datetime.now(UTC),
            trace_id=None,
            type="reasoning",
            payload={
                "summary": "Reasoning summary",
                "content": "Reasoning content",
                "duration_ms": 1200,
            },
        )
        self.assertEqual(envelope.type, "reasoning")

    def test_sources_event_payload_is_valid(self) -> None:
        envelope = SyncEventEnvelope(
            seq=2,
            run_id=uuid.uuid4(),
            ts=datetime.now(UTC),
            trace_id=None,
            type="sources",
            payload={
                "items": [
                    {
                        "id": "source-1",
                        "title": "Example",
                        "url": "https://example.com",
                        "snippet": "excerpt",
                    }
                ]
            },
        )
        self.assertEqual(envelope.type, "sources")

    def test_task_and_queue_event_payloads_are_valid(self) -> None:
        run_id = uuid.uuid4()
        task_envelope = SyncEventEnvelope(
            seq=3,
            run_id=run_id,
            ts=datetime.now(UTC),
            trace_id=None,
            type="task",
            payload={
                "task_id": "task-1",
                "title": "Tool run",
                "status": "started",
                "detail": "Running",
                "tool_name": "item.preview",
            },
        )
        queue_envelope = SyncEventEnvelope(
            seq=4,
            run_id=run_id,
            ts=datetime.now(UTC),
            trace_id=None,
            type="queue",
            payload={
                "queue_id": "queue-1",
                "label": "item.preview",
                "status": "running",
                "detail": "Running",
            },
        )
        self.assertEqual(task_envelope.type, "task")
        self.assertEqual(queue_envelope.type, "queue")
