import os
import unittest
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.api.v1.preferences import _default_sync_channel_preferences
from src.api.v1.preferences import _merge_sync_channel_preferences
from src.api.v1.preferences import _read_ai_preferences


def _member(preferences: dict) -> SimpleNamespace:
    return SimpleNamespace(preferences=preferences, updated_at=None)


class PreferencesAiChannelsTests(unittest.TestCase):
    def test_defaults_when_channel_block_is_absent(self) -> None:
        values = _read_ai_preferences(_member({"ai": {"mode": "proposal_only"}}))
        sync_channel_preferences = values[-1]
        self.assertEqual(sync_channel_preferences, _default_sync_channel_preferences())

    def test_partial_merge_is_non_destructive(self) -> None:
        existing = _merge_sync_channel_preferences(
            {
                "preferred_channel": "email",
                "available_channels": ["email", "in_app"],
                "channel_by_output_type": {
                    "sync_response": "in_app",
                    "alert": "email",
                    "digest": "email",
                    "reminder": "email",
                },
                "input_channel": "web",
                "output_channel": "email",
            }
        )
        merged = _merge_sync_channel_preferences(
            {
                "output_channel": "push",
            },
            existing,
        )

        self.assertEqual(merged["preferred_channel"], "email")
        self.assertEqual(merged["available_channels"], ["email", "in_app"])
        self.assertEqual(merged["input_channel"], "web")
        self.assertEqual(merged["output_channel"], "push")
        self.assertEqual(merged["channel_by_output_type"]["alert"], "email")

    def test_invalid_values_fallback_to_safe_shape(self) -> None:
        merged = _merge_sync_channel_preferences(
            {
                "preferred_channel": "sms",
                "available_channels": ["sms", "in_app", "in_app"],
                "channel_by_output_type": {
                    "sync_response": "fax",
                    "alert": "email",
                },
                "input_channel": "pager",
                "output_channel": "telegram",
            }
        )

        self.assertEqual(merged["preferred_channel"], "in_app")
        self.assertEqual(merged["available_channels"], ["in_app"])
        self.assertEqual(merged["channel_by_output_type"]["sync_response"], "in_app")
        self.assertEqual(merged["channel_by_output_type"]["alert"], "email")
        self.assertEqual(merged["channel_by_output_type"]["digest"], "in_app")
        self.assertEqual(merged["input_channel"], "in_app")
        self.assertEqual(merged["output_channel"], "telegram")

    def test_legacy_ai_payload_keeps_channel_defaults(self) -> None:
        values = _read_ai_preferences(
            _member(
                {
                    "ai": {
                        "mode": "auto_apply",
                        "auto_apply_threshold": 0.2,
                        "max_actions_per_capture": 2,
                    }
                }
            )
        )

        self.assertEqual(values[0], "auto_apply")
        self.assertEqual(values[1], 0.2)
        self.assertEqual(values[2], 2)
        self.assertEqual(values[-1], _default_sync_channel_preferences())


if __name__ == "__main__":
    unittest.main()
