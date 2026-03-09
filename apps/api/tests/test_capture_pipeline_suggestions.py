import os
import unittest
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.services.capture_pipeline import (
    _build_artifacts_summary,
    _build_action_suggestions,
    _derive_category_and_tags,
    _should_run_ocr_for_asset,
    job_types_for_capture,
)


def build_capture(*, capture_type: str = "file", meta: dict | None = None):
    return SimpleNamespace(
        capture_type=capture_type,
        meta=meta or {},
        raw_content="",
    )


class CapturePipelineSuggestionTests(unittest.TestCase):
    def test_warranty_capture_adds_reminder_task(self) -> None:
        capture = build_capture(capture_type="file")
        suggestions = _build_action_suggestions(
            capture,
            (
                "Invoice #402. Warranty valid for 12 months starting Oct 1. "
                "Amount due: 450 EUR."
            ),
        )
        action_types = [item.type for item in suggestions]
        self.assertIn("pay_invoice", action_types)
        self.assertIn("create_task", action_types)
        self.assertLessEqual(len(suggestions), 3)

        task = next((item for item in suggestions if item.type == "create_task"), None)
        self.assertIsNotNone(task)
        if task is not None:
            self.assertEqual(task.payload.get("reason"), "warranty_expiration")
            self.assertIn("due_at", task.payload)

    def test_trial_capture_adds_cancellation_reminder(self) -> None:
        capture = build_capture(capture_type="link")
        suggestions = _build_action_suggestions(
            capture,
            (
                "Perplexity Pro free trial for 12 months paid with PayPal. "
                "Remember cancellation before renewal."
            ),
        )
        task = next((item for item in suggestions if item.label == "Set cancellation reminder"), None)
        self.assertIsNotNone(task)
        if task is not None:
            self.assertEqual(task.type, "create_task")
            self.assertEqual(task.payload.get("reason"), "trial_renewal")
            self.assertEqual(task.payload.get("payment_method"), "PayPal")
        self.assertNotIn("summarize", [item.type for item in suggestions])

    def test_returns_empty_when_no_action_is_detected(self) -> None:
        capture = build_capture(capture_type="text")
        suggestions = _build_action_suggestions(capture, "Random text with no actionable marker.")
        self.assertEqual(suggestions, [])

    def test_derives_finance_category_and_tags_from_invoice_text(self) -> None:
        capture = build_capture(capture_type="file")
        suggestions = _build_action_suggestions(
            capture,
            "Invoice from PayPal with warranty clause and annual trial subscription.",
        )
        category, tags = _derive_category_and_tags(
            capture,  # type: ignore[arg-type]
            "Invoice from PayPal with warranty clause and annual trial subscription.",
            suggestions,
        )
        self.assertEqual(category, "finance")
        self.assertIn("invoice", tags)
        self.assertIn("subscription", tags)

    def test_media_capture_does_not_emit_summarize_action(self) -> None:
        capture = build_capture(capture_type="photo")
        suggestions = _build_action_suggestions(
            capture,
            "Photo of invoice and warranty card with due date.",
        )
        self.assertNotIn("summarize", [item.type for item in suggestions])

    def test_photo_ocr_is_skipped_without_document_hints(self) -> None:
        capture = build_capture(capture_type="photo", meta={"channel": "camera"})
        asset = SimpleNamespace(
            mime_type="image/jpeg",
            meta={"file_name": "IMG_0012.jpg"},
            storage_key="captures/IMG_0012.jpg",
        )
        self.assertFalse(_should_run_ocr_for_asset(capture, asset))  # type: ignore[arg-type]

    def test_photo_ocr_runs_with_scan_hint(self) -> None:
        capture = build_capture(capture_type="photo", meta={"intent": "scan_receipt"})
        asset = SimpleNamespace(
            mime_type="image/jpeg",
            meta={"file_name": "receipt.jpg"},
            storage_key="captures/receipt.jpg",
        )
        self.assertTrue(_should_run_ocr_for_asset(capture, asset))  # type: ignore[arg-type]

    def test_photo_ocr_runs_when_vlm_detects_text(self) -> None:
        capture = build_capture(capture_type="photo", meta={"channel": "camera"})
        asset = SimpleNamespace(
            mime_type="image/jpeg",
            meta={"file_name": "IMG_0012.jpg"},
            storage_key="captures/IMG_0012.jpg",
        )
        self.assertTrue(
            _should_run_ocr_for_asset(
                capture,  # type: ignore[arg-type]
                asset,  # type: ignore[arg-type]
                vlm_hint_text="The image shows a document with visible text and a signature.",
            )
        )

    def test_photo_pipeline_runs_vlm_before_ocr(self) -> None:
        self.assertEqual(
            job_types_for_capture("photo"),
            ["ingest", "vlm_enrich", "transcribe_or_extract", "preprocess", "suggest_actions"],
        )

    def test_artifacts_summary_prefers_key_points_over_transcript(self) -> None:
        capture = build_capture(capture_type="voice")
        now = datetime.now(UTC)
        artifacts = [
            SimpleNamespace(
                artifact_type="transcript",
                content_json={"text": "Transcribed from voice-123.webm.", "fallback_used": True},
                created_at=now - timedelta(seconds=2),
            ),
            SimpleNamespace(
                artifact_type="summary",
                content_json={
                    "text": "Client asks for contract renegotiation.",
                    "key_points": ["Renegotiate rates", "Need legal review"],
                },
                created_at=now - timedelta(seconds=1),
            ),
        ]
        summary = _build_artifacts_summary(
            capture=capture,  # type: ignore[arg-type]
            semantic_text="",
            artifacts=artifacts,  # type: ignore[arg-type]
            analysis=None,
        )
        self.assertEqual(summary["summary"], "Client asks for contract renegotiation.")
        self.assertEqual(
            summary["key_clauses"],
            ["Renegotiate rates", "Need legal review"],
        )

    def test_artifacts_summary_uses_real_transcript_when_available(self) -> None:
        capture = build_capture(capture_type="voice")
        now = datetime.now(UTC)
        artifacts = [
            SimpleNamespace(
                artifact_type="transcript",
                content_json={"text": "Discussed delivery timeline and budget constraints."},
                created_at=now,
            ),
        ]
        summary = _build_artifacts_summary(
            capture=capture,  # type: ignore[arg-type]
            semantic_text="",
            artifacts=artifacts,  # type: ignore[arg-type]
            analysis=None,
        )
        self.assertEqual(
            summary["key_clauses"],
            ["Discussed delivery timeline and budget constraints."],
        )


if __name__ == "__main__":
    unittest.main()
