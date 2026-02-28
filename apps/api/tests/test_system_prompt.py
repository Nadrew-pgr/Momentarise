import os
import unittest

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.sync.system_prompt import SystemPromptParams, build_agent_system_prompt


class SystemPromptTests(unittest.TestCase):
    def test_full_mode_includes_expected_sections(self) -> None:
        prompt = build_agent_system_prompt(
            SystemPromptParams(
                agent_name="Sync",
                prompt_mode="full",
                user_message="Plan my week",
                allowed_tools=[
                    {
                        "name": "item.preview",
                        "description": "Preview item updates",
                        "requires_confirm": False,
                        "is_write": False,
                    }
                ],
                retrieval_snippets=[{"chunk_id": "abc", "chunk_text": "Previous planning notes"}],
                workspace_notes=["Focus on deep work mornings"],
                user_timezone="Europe/Paris",
                runtime_info={
                    "mode": "guided",
                    "status": "streaming",
                    "model": "mistral-medium-latest",
                },
                extra_system_prompt="Keep outputs concise.",
            )
        )

        self.assertIn("## Tooling", prompt)
        self.assertIn("## Safety", prompt)
        self.assertIn("## Autonomous Planning Policy", prompt)
        self.assertIn("## Workspace", prompt)
        self.assertIn("## Memory Recall", prompt)
        self.assertIn("## Runtime", prompt)
        self.assertIn("## Current Time", prompt)
        self.assertIn("## Extra Context", prompt)

    def test_minimal_mode_omits_full_only_sections(self) -> None:
        prompt = build_agent_system_prompt(
            SystemPromptParams(
                agent_name="Sync",
                prompt_mode="minimal",
                user_message="Create a task",
                allowed_tools=[],
                retrieval_snippets=[{"chunk_id": "abc", "chunk_text": "Should not be rendered in minimal"}],
                extra_system_prompt="Should not be rendered in minimal",
                user_timezone="Europe/Paris",
                runtime_info={"mode": "guided"},
            )
        )

        self.assertIn("## Tooling", prompt)
        self.assertIn("## Workspace", prompt)
        self.assertIn("## Runtime", prompt)
        self.assertNotIn("## Safety", prompt)
        self.assertNotIn("## Autonomous Planning Policy", prompt)
        self.assertNotIn("## Memory Recall", prompt)
        self.assertNotIn("## Current Time", prompt)
        self.assertNotIn("## Extra Context", prompt)

    def test_none_mode_returns_identity_only(self) -> None:
        prompt = build_agent_system_prompt(
            SystemPromptParams(
                agent_name="Sync",
                prompt_mode="none",
                user_message="hello",
                allowed_tools=[],
                retrieval_snippets=[],
            )
        )
        self.assertEqual(prompt, "You are Sync, a workspace assistant.")

    def test_invalid_mode_falls_back_to_full(self) -> None:
        prompt = build_agent_system_prompt(
            SystemPromptParams(
                agent_name="Sync",
                prompt_mode="invalid",  # type: ignore[arg-type]
                user_message="hello",
                allowed_tools=[],
                retrieval_snippets=[],
            )
        )
        self.assertIn("## Tooling", prompt)
        self.assertIn("## Safety", prompt)
