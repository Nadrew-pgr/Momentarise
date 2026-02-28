import os
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.api.v1.events import _event_to_out
from src.schemas.event import EventCreateRequest, EventUpdateRequest


class EventContractsTests(unittest.TestCase):
    def test_event_create_request_accepts_new_fields(self) -> None:
        payload = EventCreateRequest(
            title="Deep work",
            description="Focus block",
            start_at=datetime(2026, 3, 1, 9, 0, tzinfo=UTC),
            end_at=datetime(2026, 3, 1, 10, 0, tzinfo=UTC),
            all_day=True,
            location="Office",
        )
        self.assertEqual(payload.description, "Focus block")
        self.assertTrue(payload.all_day)
        self.assertEqual(payload.location, "Office")

    def test_event_create_request_defaults_all_day_to_false(self) -> None:
        payload = EventCreateRequest(
            title="Routine",
            start_at=datetime(2026, 3, 1, 9, 0, tzinfo=UTC),
            end_at=datetime(2026, 3, 1, 10, 0, tzinfo=UTC),
        )
        self.assertFalse(payload.all_day)

    def test_event_update_request_allows_null_description_and_location(self) -> None:
        payload = EventUpdateRequest(
            description=None,
            location=None,
            all_day=False,
        )
        self.assertIsNone(payload.description)
        self.assertIsNone(payload.location)
        self.assertFalse(payload.all_day)

    def test_event_to_out_includes_description_location_and_all_day(self) -> None:
        now = datetime.now(UTC)
        event = SimpleNamespace(
            id=uuid.uuid4(),
            item_id=uuid.uuid4(),
            item=SimpleNamespace(title="Planning"),
            description="Weekly planning",
            start_at=now,
            end_at=now + timedelta(hours=1),
            all_day=False,
            location="Home",
            estimated_time_seconds=3600,
            actual_time_acc_seconds=0,
            is_tracking=False,
            color="sky",
            tracking_started_at=None,
            updated_at=now,
        )
        out = _event_to_out(event)
        self.assertEqual(out.title, "Planning")
        self.assertEqual(out.description, "Weekly planning")
        self.assertFalse(out.all_day)
        self.assertEqual(out.location, "Home")


if __name__ == "__main__":
    unittest.main()
