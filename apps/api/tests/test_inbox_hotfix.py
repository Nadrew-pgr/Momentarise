import os
import unittest
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.api.v1.inbox import _request_id_from_request, _to_capture_out


def build_capture(*, status: str, deleted_at: datetime | None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        raw_content="Sample capture",
        source="manual",
        capture_type="text",
        status=status,
        meta={},
        deleted_at=deleted_at,
        created_at=datetime.now(UTC),
    )


class InboxHotfixTests(unittest.TestCase):
    def test_to_capture_out_marks_applied_as_archived(self) -> None:
        capture = build_capture(status="applied", deleted_at=None)
        out = _to_capture_out(capture, suggestions=[])
        self.assertTrue(out.archived)
        self.assertEqual(out.archived_reason, "applied")
        self.assertEqual(out.suggested_actions[0].type, "review")

    def test_to_capture_out_marks_deleted_as_archived(self) -> None:
        capture = build_capture(status="ready", deleted_at=datetime.now(UTC))
        out = _to_capture_out(capture, suggestions=[])
        self.assertTrue(out.archived)
        self.assertEqual(out.archived_reason, "deleted")

    def test_to_capture_out_prefers_applied_reason_when_both_flags_present(self) -> None:
        capture = build_capture(status="applied", deleted_at=datetime.now(UTC))
        out = _to_capture_out(capture, suggestions=[])
        self.assertTrue(out.archived)
        self.assertEqual(out.archived_reason, "applied")

    def test_to_capture_out_keeps_active_capture_unarchived(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        out = _to_capture_out(capture, suggestions=[])
        self.assertFalse(out.archived)
        self.assertIsNone(out.archived_reason)
        self.assertGreaterEqual(len(out.badges), 1)

    def test_request_id_helper_reads_middleware_value(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace(request_id="req_123"))
        self.assertEqual(_request_id_from_request(request), "req_123")

    def test_request_id_helper_falls_back_to_unknown(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace())
        self.assertEqual(_request_id_from_request(request), "unknown")

    def test_request_id_helper_strips_blank_values(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace(request_id="   "))
        self.assertEqual(_request_id_from_request(request), "unknown")


if __name__ == "__main__":
    unittest.main()
