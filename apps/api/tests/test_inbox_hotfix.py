import os
import unittest
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from fastapi import HTTPException

from src.api.v1.inbox import (
    _get_capture_or_404,
    _request_id_from_request,
    _suggest_from_capture,
    _to_capture_out,
)


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
    def test_to_capture_out_marks_applied_as_treated_not_archived(self) -> None:
        capture = build_capture(status="applied", deleted_at=None)
        out = _to_capture_out(capture, suggestions=[])
        self.assertFalse(out.archived)
        self.assertIsNone(out.archived_reason)
        self.assertEqual(out.treated_bucket, "treated")
        self.assertEqual(out.suggested_actions[0].type, "review")

    def test_to_capture_out_marks_deleted_as_archived(self) -> None:
        capture = build_capture(status="ready", deleted_at=datetime.now(UTC))
        out = _to_capture_out(capture, suggestions=[])
        self.assertTrue(out.archived)
        self.assertEqual(out.archived_reason, "deleted")
        self.assertEqual(out.treated_bucket, "treated")

    def test_to_capture_out_prefers_deleted_reason_when_both_flags_present(self) -> None:
        capture = build_capture(status="applied", deleted_at=datetime.now(UTC))
        out = _to_capture_out(capture, suggestions=[])
        self.assertTrue(out.archived)
        self.assertEqual(out.archived_reason, "deleted")

    def test_to_capture_out_keeps_active_capture_unarchived(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        out = _to_capture_out(capture, suggestions=[])
        self.assertFalse(out.archived)
        self.assertIsNone(out.archived_reason)
        self.assertGreaterEqual(len(out.badges), 1)
        self.assertEqual(out.treated_bucket, "untreated")
        self.assertEqual(out.source_type, "text")
        self.assertEqual(out.pipeline_state, "ready")

    def test_to_capture_out_filters_summarize_actions(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        summarize = SimpleNamespace(
            action_key="summ_1",
            label="Summarize",
            action_type="summarize",
            confidence=0.91,
            requires_confirm=False,
            payload_json={},
            is_primary=True,
        )
        create_task = SimpleNamespace(
            action_key="task_1",
            label="Create task",
            action_type="create_task",
            confidence=0.86,
            requires_confirm=False,
            payload_json={},
            is_primary=False,
        )
        out = _to_capture_out(capture, suggestions=[summarize, create_task])
        self.assertNotIn("summarize", [item.type for item in out.suggested_actions])
        self.assertEqual(out.primary_action.type, "create_task")

    def test_request_id_helper_reads_middleware_value(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace(request_id="req_123"))
        self.assertEqual(_request_id_from_request(request), "req_123")

    def test_request_id_helper_falls_back_to_unknown(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace())
        self.assertEqual(_request_id_from_request(request), "unknown")

    def test_request_id_helper_strips_blank_values(self) -> None:
        request = SimpleNamespace(state=SimpleNamespace(request_id="   "))
        self.assertEqual(_request_id_from_request(request), "unknown")

    def test_preview_falls_back_when_requested_action_is_disabled(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        disabled = SimpleNamespace(
            action_key="summarize_0",
            label="Summarize",
            action_type="summarize",
            confidence=0.93,
            requires_confirm=False,
            is_primary=True,
            payload_json={},
        )
        preview = _suggest_from_capture(
            capture,  # type: ignore[arg-type]
            [disabled],  # type: ignore[arg-type]
            requested_action_key="summarize_0",
        )
        self.assertEqual(preview.capture_id, capture.id)
        self.assertTrue(bool(preview.suggested_title))


class InboxLookupCompatibilityTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_capture_or_404_accepts_item_id_lookup(self) -> None:
        workspace_id = uuid.uuid4()
        item_id = uuid.uuid4()
        capture_id = uuid.uuid4()

        capture = build_capture(status="ready", deleted_at=None)
        capture.id = capture_id
        item = SimpleNamespace(
            id=item_id,
            workspace_id=workspace_id,
            source_capture_id=capture_id,
            deleted_at=None,
        )

        result_capture = MagicMock()
        result_capture.scalar_one_or_none.return_value = None
        result_item = MagicMock()
        result_item.scalar_one_or_none.return_value = item
        result_resolved_capture = MagicMock()
        result_resolved_capture.scalar_one_or_none.return_value = capture

        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[result_capture, result_item, result_resolved_capture]
        )

        resolved = await _get_capture_or_404(db, workspace_id, item_id)
        self.assertIs(resolved, capture)
        self.assertEqual(db.execute.await_count, 3)

    async def test_get_capture_or_404_raises_when_item_has_no_source_capture(self) -> None:
        workspace_id = uuid.uuid4()
        item_id = uuid.uuid4()

        item = SimpleNamespace(
            id=item_id,
            workspace_id=workspace_id,
            source_capture_id=None,
            deleted_at=None,
        )

        result_capture = MagicMock()
        result_capture.scalar_one_or_none.return_value = None
        result_item = MagicMock()
        result_item.scalar_one_or_none.return_value = item

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[result_capture, result_item])

        with self.assertRaises(HTTPException) as exc:
            await _get_capture_or_404(db, workspace_id, item_id)
        self.assertEqual(exc.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
