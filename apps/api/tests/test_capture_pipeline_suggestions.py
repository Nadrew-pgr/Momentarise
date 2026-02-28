import os
import unittest
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.services.capture_pipeline import _build_action_suggestions, _derive_category_and_tags


def build_capture(*, capture_type: str = "file", meta: dict | None = None):
    return SimpleNamespace(
        capture_type=capture_type,
        meta=meta or {},
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

    def test_returns_review_when_no_action_is_detected(self) -> None:
        capture = build_capture(capture_type="text")
        suggestions = _build_action_suggestions(capture, "Random text with no actionable marker.")
        self.assertGreaterEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].type, "review")

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


if __name__ == "__main__":
    unittest.main()
