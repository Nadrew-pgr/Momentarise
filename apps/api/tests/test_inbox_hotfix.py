import os
import unittest
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from fastapi import HTTPException

from src.api.v1.inbox import (
    apply_capture,
    _get_capture_or_404,
    _request_id_from_request,
    _suggest_from_capture,
    _to_capture_out,
    preview_capture,
    process_capture,
    refresh_note_summary,
    reprocess_capture,
    restore_capture,
    update_capture,
)
from src.schemas.inbox import ApplyCaptureRequest, UpdateCaptureRequest


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
        self.assertEqual(out.suggested_actions, [])
        self.assertIsNone(out.primary_action)

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
        self.assertEqual(out.suggested_actions, [])
        self.assertIsNone(out.primary_action)

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

    def test_to_capture_out_title_prefers_manual_then_ai(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        capture.meta = {"manual_title": "Titre Manuel", "ai_title": "Titre IA"}
        out = _to_capture_out(capture, suggestions=[])
        self.assertEqual(out.title, "Titre Manuel")
        capture.meta = {"ai_title": "Titre IA"}
        out = _to_capture_out(capture, suggestions=[])
        self.assertEqual(out.title, "Titre IA")


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


class InboxApiContractTests(unittest.IsolatedAsyncioTestCase):
    async def test_process_endpoint_is_gone(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            await process_capture(
                capture_id=uuid.uuid4(),
                workspace=SimpleNamespace(),
                db=AsyncMock(),
            )
        self.assertEqual(exc.exception.status_code, 410)
        self.assertEqual(exc.exception.detail, "deprecated_process_flow")

    async def test_restore_endpoint_is_gone(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            await restore_capture(
                capture_id=uuid.uuid4(),
                workspace=SimpleNamespace(),
                db=AsyncMock(),
            )
        self.assertEqual(exc.exception.status_code, 410)
        self.assertEqual(exc.exception.detail, "restore_disabled")

    async def test_preview_returns_422_when_no_suggested_actions(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        db = AsyncMock()
        workspace = SimpleNamespace(workspace_id=uuid.uuid4())
        with (
            patch("src.api.v1.inbox._get_capture_or_404", new=AsyncMock(return_value=capture)),
            patch("src.api.v1.inbox._load_capture_suggestions", new=AsyncMock(return_value={capture.id: []})),
        ):
            with self.assertRaises(HTTPException) as exc:
                await preview_capture(
                    capture_id=capture.id,
                    body=None,
                    workspace=workspace,
                    db=db,
                )
        self.assertEqual(exc.exception.status_code, 422)
        self.assertEqual(exc.exception.detail, "no_suggested_actions")

    async def test_apply_returns_422_when_no_suggested_actions(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        db = AsyncMock()
        workspace = SimpleNamespace(workspace_id=uuid.uuid4())
        with (
            patch("src.api.v1.inbox._get_capture_or_404", new=AsyncMock(return_value=capture)),
            patch("src.api.v1.inbox._load_capture_suggestions", new=AsyncMock(return_value={capture.id: []})),
        ):
            with self.assertRaises(HTTPException) as exc:
                await apply_capture(
                    capture_id=capture.id,
                    body=ApplyCaptureRequest(),
                    workspace=workspace,
                    db=db,
                )
        self.assertEqual(exc.exception.status_code, 422)
        self.assertEqual(exc.exception.detail, "no_suggested_actions")

    async def test_reprocess_soft_deletes_previous_results_and_resets_meta(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        capture.meta = {
            "artifacts_summary": {"summary": "old"},
            "pipeline_trace": [{"stage": "old"}],
            "last_error_code": "old_error",
            "custom": "keep",
        }
        artifact_row = SimpleNamespace(deleted_at=None)
        suggestion_row = SimpleNamespace(deleted_at=None)
        job_row = SimpleNamespace(deleted_at=None)

        artifact_result = MagicMock()
        artifact_result.scalars.return_value.all.return_value = [artifact_row]
        suggestion_result = MagicMock()
        suggestion_result.scalars.return_value.all.return_value = [suggestion_row]
        jobs_result = MagicMock()
        jobs_result.scalars.return_value.all.return_value = [job_row]

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[artifact_result, suggestion_result, jobs_result])
        workspace = SimpleNamespace(workspace_id=uuid.uuid4())

        with (
            patch("src.api.v1.inbox._get_capture_or_404", new=AsyncMock(return_value=capture)),
            patch("src.api.v1.inbox.resolve_workspace_billing_tier", new=AsyncMock(return_value="free")),
            patch("src.api.v1.inbox.enqueue_default_jobs", new=AsyncMock(return_value=[])),
            patch("src.api.v1.inbox.process_capture_jobs", new=AsyncMock(return_value=None)),
            patch("src.api.v1.inbox._maybe_auto_apply_capture", new=AsyncMock(return_value=None)),
            patch("src.api.v1.inbox._sync_source_item_from_capture", new=AsyncMock(return_value=None)),
        ):
            response = await reprocess_capture(
                capture_id=capture.id,
                workspace=workspace,
                db=db,
            )

        self.assertEqual(response.status, "queued")
        self.assertIsNotNone(artifact_row.deleted_at)
        self.assertIsNotNone(suggestion_row.deleted_at)
        self.assertIsNotNone(job_row.deleted_at)
        self.assertNotIn("artifacts_summary", capture.meta)
        self.assertNotIn("pipeline_trace", capture.meta)
        self.assertEqual(capture.meta.get("custom"), "keep")
        self.assertIn("reprocessed_at", capture.meta)
        db.commit.assert_awaited_once()

    async def test_update_capture_sets_manual_title_lock(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        capture.meta = {}
        workspace = SimpleNamespace(workspace_id=uuid.uuid4())
        with (
            patch("src.api.v1.inbox._get_capture_or_404", new=AsyncMock(return_value=capture)),
            patch("src.api.v1.inbox._find_source_item", new=AsyncMock(return_value=None)),
        ):
            response = await update_capture(
                capture_id=capture.id,
                body=UpdateCaptureRequest(title="Titre test"),
                workspace=workspace,
                db=AsyncMock(),
            )
        self.assertEqual(response.capture_id, capture.id)
        self.assertEqual(capture.meta.get("manual_title"), "Titre test")
        self.assertTrue(capture.meta.get("title_locked"))

    async def test_refresh_note_summary_skips_when_too_short(self) -> None:
        capture = build_capture(status="ready", deleted_at=None)
        capture.capture_type = "text"
        capture.source = "note"
        capture.meta = {"note_intent": True}
        item = SimpleNamespace(blocks=[{"type": "paragraph", "content": [{"type": "text", "text": "court"}]}])
        workspace = SimpleNamespace(workspace_id=uuid.uuid4())
        with (
            patch("src.api.v1.inbox._get_capture_or_404", new=AsyncMock(return_value=capture)),
            patch("src.api.v1.inbox._find_source_item", new=AsyncMock(return_value=item)),
            patch("src.api.v1.inbox.settings", new=SimpleNamespace(NOTE_SUMMARY_MIN_CHARS=180)),
        ):
            response = await refresh_note_summary(
                capture_id=capture.id,
                workspace=workspace,
                db=AsyncMock(),
            )
        self.assertEqual(response.status, "skipped_too_short")


if __name__ == "__main__":
    unittest.main()
