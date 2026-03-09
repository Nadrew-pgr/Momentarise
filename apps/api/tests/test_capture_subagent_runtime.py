import os
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.services.capture_subagent_runtime import CaptureSubAgentRuntime


class CaptureSubAgentRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_routing_priority_parse_order(self) -> None:
        runtime = CaptureSubAgentRuntime(
            db=AsyncMock(),
            capture=SimpleNamespace(
                workspace_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                capture_type="photo",
                source="manual",
            ),
            metadata={},
        )
        ai_preferences = {
            "capture_default_agent_id": "33333333-3333-4333-8333-333333333333",
            "capture_agent_routing_rules": {
                "by_capture_type": {"photo": "11111111-1111-4111-8111-111111111111"},
                "by_source": {"manual": "22222222-2222-4222-8222-222222222222"},
            },
        }

        parsed_values: list[object] = []

        def fake_parse(value: object) -> uuid.UUID | None:
            parsed_values.append(value)
            return None

        with patch.object(runtime, "_parse_uuid", side_effect=fake_parse):
            resolved = await runtime._resolve_agent_from_preferences(ai_preferences)

        self.assertIsNone(resolved)
        self.assertEqual(
            parsed_values,
            [
                "11111111-1111-4111-8111-111111111111",
                "22222222-2222-4222-8222-222222222222",
                "33333333-3333-4333-8333-333333333333",
            ],
        )

    def test_preview_mode_uses_sync_tool_names(self) -> None:
        tools = CaptureSubAgentRuntime._build_allowed_tools("preview_plan")
        names = {tool["name"] for tool in tools}
        self.assertIn("memory_search", names)
        self.assertIn("event_preview", names)
        self.assertIn("inbox_transform_preview", names)
        self.assertNotIn("memory.search", names)
        self.assertNotIn("event.preview", names)

    def test_mode_specific_extra_prompt(self) -> None:
        summary_prompt = CaptureSubAgentRuntime._build_extra_system_prompt(
            {"capture_research_policy": "proposal_only"},
            mode="summary_generation",
        )
        preview_prompt = CaptureSubAgentRuntime._build_extra_system_prompt(
            {"capture_research_policy": "auto_if_safe"},
            mode="preview_plan",
        )
        self.assertIn("summary", summary_prompt)
        self.assertIn("missing_fields", summary_prompt)
        self.assertIn("preview_payload", preview_prompt)
        self.assertIn("Research policy=auto_if_safe", preview_prompt)


if __name__ == "__main__":
    unittest.main()
