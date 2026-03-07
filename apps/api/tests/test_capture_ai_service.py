import os
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.services.capture_ai_service import (
    build_capture_preview_plan_fallback,
    build_capture_preview_plan_with_subagent,
    generate_capture_summary_with_subagent,
)
from src.services.capture_subagent_runtime import CaptureSubAgentContext


class CaptureAiServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_preview_fallback_uses_selected_payload(self) -> None:
        capture = SimpleNamespace(raw_content="Document capture")
        payload = build_capture_preview_plan_fallback(
            capture=capture,  # type: ignore[arg-type]
            selected_action={
                "key": "create_event_0",
                "type": "create_event",
                "confidence": 0.88,
                "payload": {"title": "Planifier rendez-vous"},
            },
        )
        self.assertEqual(payload["action_type"], "create_event")
        self.assertEqual(payload["suggested_kind"], "task")
        self.assertEqual(payload["suggested_title"], "Planifier rendez-vous")
        self.assertEqual(payload["missing_fields"], [])

    async def test_generate_summary_returns_ai_payload(self) -> None:
        capture = SimpleNamespace(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            raw_content="Facture à payer avant vendredi.",
        )
        context = CaptureSubAgentContext(
            agent_id=None,
            agent_name="Sync Capture Analyst",
            mode="summary_generation",
            prompt_mode="capture_analysis",
            prompt_instructions=None,
            modules=["intent", "policy"],
            allowed_tools=[],
            user_timezone="Europe/Paris",
            locale="fr-FR",
            extra_system_prompt="",
        )
        with (
            patch(
                "src.services.capture_ai_service._compose_prompt_context",
                new=AsyncMock(
                    return_value=(
                        context,
                        "SYSTEM_PROMPT",
                        [{"chunk_id": "x"}],
                        ["memory_search"],
                    )
                ),
            ),
            patch(
                "src.services.capture_ai_service._complete_json_with_fallback_models",
                new=AsyncMock(
                    return_value=(
                        {
                            "summary": "Payer la facture avant vendredi.",
                            "description": "Facture détectée avec échéance proche.",
                            "missing_fields": ["montant exact"],
                        },
                        {"provider": "mistral", "model": "mistral-small-latest"},
                    )
                ),
            ),
        ):
            out = await generate_capture_summary_with_subagent(
                db=AsyncMock(),
                capture=capture,  # type: ignore[arg-type]
                semantic_text="Facture à payer avant vendredi.",
                capture_type="photo",
                metadata={},
            )

        self.assertEqual(out["provider"], "mistral")
        self.assertEqual(out["model"], "mistral-small-latest")
        self.assertEqual(out["text"], "Payer la facture avant vendredi.")
        self.assertIn("montant exact", out["missing_fields"])
        self.assertFalse(out["fallback_used"])

    async def test_generate_summary_uses_deterministic_fallback_when_model_summary_empty(self) -> None:
        capture = SimpleNamespace(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            raw_content="",
        )
        context = CaptureSubAgentContext(
            agent_id=None,
            agent_name="Sync Capture Analyst",
            mode="summary_generation",
            prompt_mode="capture_analysis",
            prompt_instructions=None,
            modules=["intent"],
            allowed_tools=[],
            user_timezone="Europe/Paris",
            locale="fr-FR",
            extra_system_prompt="",
        )
        with (
            patch(
                "src.services.capture_ai_service._compose_prompt_context",
                new=AsyncMock(return_value=(context, "SYSTEM_PROMPT", [], [])),
            ),
            patch(
                "src.services.capture_ai_service._complete_json_with_fallback_models",
                new=AsyncMock(
                    return_value=(
                        {"summary": "", "description": "", "key_points": []},
                        {"provider": "mistral", "model": "mistral-small-latest"},
                    )
                ),
            ),
        ):
            out = await generate_capture_summary_with_subagent(
                db=AsyncMock(),
                capture=capture,  # type: ignore[arg-type]
                semantic_text="Prendre rendez-vous avec le notaire cette semaine",
                capture_type="text",
                metadata={},
            )

        self.assertTrue(out["fallback_used"])
        self.assertTrue(isinstance(out["text"], str) and len(out["text"]) > 0)
        self.assertTrue(isinstance(out["description"], str) and len(out["description"]) > 0)

    async def test_preview_plan_returns_deterministic_fallback_on_model_error(self) -> None:
        capture = SimpleNamespace(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            raw_content="Réunion produit demain à 9h",
        )
        context = CaptureSubAgentContext(
            agent_id=None,
            agent_name="Sync Capture Analyst",
            mode="preview_plan",
            prompt_mode="capture_analysis",
            prompt_instructions=None,
            modules=["intent", "preview"],
            allowed_tools=[],
            user_timezone="Europe/Paris",
            locale="fr-FR",
            extra_system_prompt="",
        )
        with (
            patch(
                "src.services.capture_ai_service._compose_prompt_context",
                new=AsyncMock(return_value=(context, "SYSTEM_PROMPT", [], ["event_preview"])),
            ),
            patch(
                "src.services.capture_ai_service._complete_json_with_fallback_models",
                new=AsyncMock(side_effect=RuntimeError("model_failure")),
            ),
        ):
            out = await build_capture_preview_plan_with_subagent(
                db=AsyncMock(),
                capture=capture,  # type: ignore[arg-type]
                semantic_text="Réunion produit demain à 9h",
                capture_type="photo",
                selected_action={
                    "key": "create_event_0",
                    "type": "create_event",
                    "confidence": 0.9,
                    "payload": {"title": "Réunion produit"},
                },
                metadata={},
            )
        self.assertEqual(out["error_code"], "capture_preview_plan_generation_failed")
        self.assertEqual(out["action_type"], "create_event")
        self.assertEqual(out["suggested_title"], "Réunion produit")
        self.assertIn("toolset_snapshot", out)


if __name__ == "__main__":
    unittest.main()
