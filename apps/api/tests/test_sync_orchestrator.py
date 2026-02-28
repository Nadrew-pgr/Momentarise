import os
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.models.ai_change import AIChange
from src.core.config import settings
from src.schemas.sync import SyncEventEnvelope
from src.sync.orchestrator import SyncOrchestrator
from src.sync.sync_mutation_engine import MutationApplyResult


class FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class FakeDB:
    def __init__(self, execute_values: list[object | None] | None = None) -> None:
        self._execute_values = list(execute_values or [])
        self.added: list[object] = []
        self.flush_count = 0
        self.commit_count = 0

    async def execute(self, *args, **kwargs):  # noqa: ANN002, ANN003
        value = self._execute_values.pop(0) if self._execute_values else None
        return FakeResult(value)

    def add(self, obj: object) -> None:
        if hasattr(obj, "id") and getattr(obj, "id") is None:
            setattr(obj, "id", uuid.uuid4())
        if hasattr(obj, "created_at") and getattr(obj, "created_at") is None:
            setattr(obj, "created_at", datetime.now(UTC))
        self.added.append(obj)

    async def flush(self) -> None:
        self.flush_count += 1

    async def commit(self) -> None:
        self.commit_count += 1


class StreamTestOrchestrator(SyncOrchestrator):
    async def _get_agent_profile(self, agent_id):  # noqa: ANN001
        return None

    async def replay_events(self, run, from_seq):  # noqa: ANN001
        return []

    async def _build_llm_messages(self, *, run, system_prompt):  # noqa: ANN001
        return [{"role": "system", "content": system_prompt}]

    async def _next_seq(self, run):  # noqa: ANN001
        run.last_seq += 1
        return run.last_seq

    async def _record_plain_event(self, *, run, type_, payload):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=datetime.now(UTC),
            trace_id=None,
            type=type_,
            payload=payload,
        )

    async def _create_message(
        self,
        *,
        run,
        role,
        content_json,
        provider=None,
        model=None,
        usage_json=None,
    ):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SimpleNamespace(
            id=uuid.uuid4(),
            run_id=run.id,
            seq=seq,
            role=role,
            content_json=content_json,
            provider=provider,
            model=model,
            usage_json=usage_json,
            error_code=None,
            created_at=datetime.now(UTC),
        )

    async def _record_message_event(self, *, run, message):  # noqa: ANN001
        payload = {
            "id": str(message.id),
            "run_id": str(message.run_id),
            "seq": message.seq,
            "role": message.role,
            "content_json": message.content_json,
            "provider": message.provider,
            "model": message.model,
            "usage_json": message.usage_json,
            "error_code": message.error_code,
            "created_at": message.created_at.isoformat(),
        }
        return SyncEventEnvelope(
            seq=message.seq,
            run_id=run.id,
            ts=message.created_at,
            trace_id=None,
            type="message",
            payload=payload,
        )

    async def _create_usage_event(self, *, run, provider, model, usage):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SimpleNamespace(
            seq=seq,
            created_at=datetime.now(UTC),
            provider=provider,
            model=model,
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            total_tokens=int(usage.get("total_tokens", 0)),
            cost_usd=usage.get("cost_usd"),
        )

    async def _record_usage_event(self, *, run, usage):  # noqa: ANN001
        return SyncEventEnvelope(
            seq=usage.seq,
            run_id=run.id,
            ts=usage.created_at,
            trace_id=None,
            type="usage",
            payload={
                "provider": usage.provider,
                "model": usage.model,
                "usage": {
                    "input_tokens": usage.input_tokens,
                    "output_tokens": usage.output_tokens,
                    "total_tokens": usage.total_tokens,
                    "cost_usd": usage.cost_usd,
                },
            },
        )

    async def _create_draft(
        self,
        *,
        run,
        kind,
        title,
        body_json,
        summary,
        entity_type=None,
        action=None,
        expires_at=None,
        undoable=True,
    ):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SimpleNamespace(
            id=uuid.uuid4(),
            run_id=run.id,
            seq=seq,
            kind=kind,
            title=title,
            body_json=body_json,
            summary=summary,
            entity_type=entity_type,
            entity_id=None,
            action=action,
            expires_at=expires_at,
            undoable=undoable,
            created_at=datetime.now(UTC),
        )

    async def _record_draft_event(self, *, run, draft):  # noqa: ANN001
        return SyncEventEnvelope(
            seq=draft.seq,
            run_id=run.id,
            ts=draft.created_at,
            trace_id=None,
            type="draft",
            payload={
                "id": str(draft.id),
                "run_id": str(draft.run_id),
                "seq": draft.seq,
                "title": draft.title,
                "body_json": draft.body_json,
                "summary": draft.summary,
                "created_at": draft.created_at.isoformat(),
            },
        )

    async def _record_preview_event(self, *, run, preview):  # noqa: ANN001
        return SyncEventEnvelope(
            seq=preview.seq,
            run_id=run.id,
            ts=preview.created_at,
            trace_id=None,
            type="preview",
            payload={
                "id": str(preview.id),
                "run_id": str(preview.run_id),
                "seq": preview.seq,
                "entity_type": preview.entity_type or "item",
                "entity_id": str(preview.entity_id) if preview.entity_id else None,
                "action": preview.action or "item.create",
                "diff_json": preview.body_json,
                "expires_at": preview.expires_at.isoformat() if preview.expires_at else None,
                "undoable": preview.undoable,
                "created_at": preview.created_at.isoformat(),
            },
        )

    async def _create_tool_call(self, *, run, tool_name, args_json, requires_confirmation):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SimpleNamespace(
            id=uuid.uuid4(),
            run_id=run.id,
            seq=seq,
            tool_name=tool_name,
            args_json=args_json,
            status="started",
            requires_confirmation=requires_confirmation,
            result_json=None,
            error_code=None,
            created_at=datetime.now(UTC),
        )

    async def _record_tool_call_event(self, *, run, tool_call, status):  # noqa: ANN001
        return SyncEventEnvelope(
            seq=tool_call.seq,
            run_id=run.id,
            ts=tool_call.created_at,
            trace_id=None,
            type="tool_call",
            payload={
                "tool_call_id": str(tool_call.id),
                "tool_name": tool_call.tool_name,
                "args_json": tool_call.args_json,
                "requires_confirm": tool_call.requires_confirmation,
                "status": status,
            },
        )

    async def _record_tool_result_event(self, *, run, tool_call, status, summary):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=datetime.now(UTC),
            trace_id=None,
            type="tool_result",
            payload={
                "tool_call_id": str(tool_call.id),
                "status": status,
                "summary": summary,
                "result_json": tool_call.result_json,
            },
        )

    async def _record_tool_call_status_event(self, *, run, tool_call, status):  # noqa: ANN001
        return await self._record_plain_event(
            run=run,
            type_="tool_call",
            payload={
                "tool_call_id": str(tool_call.id),
                "tool_name": tool_call.tool_name,
                "args_json": tool_call.args_json,
                "requires_confirm": tool_call.requires_confirmation,
                "status": status,
            },
        )


class ApplyUndoOrchestrator(SyncOrchestrator):
    async def _next_seq(self, run):  # noqa: ANN001
        run.last_seq += 1
        return run.last_seq

    async def _record_plain_event(self, *, run, type_, payload):  # noqa: ANN001
        seq = await self._next_seq(run)
        return SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=datetime.now(UTC),
            trace_id=None,
            type=type_,
            payload=payload,
        )


def make_run() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        agent_id=None,
        mode="guided",
        status="pending",
        selected_model="mistral-medium-latest",
        title=None,
        context_json={},
        prompt_version=None,
        prompt_mode="full",
        system_prompt_snapshot=None,
        toolset_snapshot=[],
        retrieval_snapshot=[],
        last_seq=0,
    )


class SyncOrchestratorTests(unittest.IsolatedAsyncioTestCase):
    def test_available_models_respects_provider(self) -> None:
        previous_provider = settings.SYNC_LLM_PROVIDER
        previous_small = settings.SYNC_MODEL_SMALL
        previous_balanced = settings.SYNC_MODEL_BALANCED
        previous_quality = settings.SYNC_MODEL_QUALITY
        try:
            settings.SYNC_LLM_PROVIDER = "openai"
            settings.SYNC_MODEL_SMALL = "gpt-4.1-mini"
            settings.SYNC_MODEL_BALANCED = "gpt-4.1"
            settings.SYNC_MODEL_QUALITY = "o3"

            models = SyncOrchestrator.available_models()

            self.assertEqual(models[0]["provider"], "openai")
            self.assertEqual(models[0]["id"], "gpt-4.1-mini")
            self.assertEqual(models[1]["label"], "Balanced")

            settings.SYNC_LLM_PROVIDER = "gemini"
            settings.SYNC_MODEL_SMALL = "gemini-2.5-flash-lite"
            settings.SYNC_MODEL_BALANCED = "gemini-2.5-flash"
            settings.SYNC_MODEL_QUALITY = "gemini-2.5-pro"
            models = SyncOrchestrator.available_models()
            self.assertEqual(models[0]["provider"], "gemini")
            self.assertEqual(models[1]["id"], "gemini-2.5-flash")
        finally:
            settings.SYNC_LLM_PROVIDER = previous_provider
            settings.SYNC_MODEL_SMALL = previous_small
            settings.SYNC_MODEL_BALANCED = previous_balanced
            settings.SYNC_MODEL_QUALITY = previous_quality

    async def test_stream_run_simple_final_answer(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()

        with (
            patch("src.sync.orchestrator.RetrievalService.search", new=AsyncMock(return_value=[])),
            patch(
                "src.sync.orchestrator.LiteLLMClient.complete",
                new=AsyncMock(
                    return_value={
                        "content": "Hello from Sync",
                        "provider": "mistral",
                        "model": "mistral-medium-latest",
                        "usage": {"input_tokens": 5, "output_tokens": 6, "total_tokens": 11, "cost_usd": None},
                        "tool_calls": [],
                        "warning": None,
                    }
                ),
            ),
        ):
            events = await orchestrator.stream_run(run=run, message="hello")

        event_types = [event.type for event in events]
        self.assertIn("message", event_types)
        self.assertIn("usage", event_types)
        self.assertIn("token", event_types)
        self.assertEqual(events[-1].type, "done")
        self.assertEqual(events[-1].payload["status"], "done")
        self.assertEqual(run.status, "done")

    async def test_stream_run_iter_emits_ordered_events(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()

        with (
            patch("src.sync.orchestrator.RetrievalService.search", new=AsyncMock(return_value=[])),
            patch(
                "src.sync.orchestrator.LiteLLMClient.complete",
                new=AsyncMock(
                    return_value={
                        "content": "Streaming order test",
                        "provider": "mistral",
                        "model": "mistral-medium-latest",
                        "usage": {"input_tokens": 4, "output_tokens": 5, "total_tokens": 9, "cost_usd": None},
                        "tool_calls": [],
                        "warning": None,
                    }
                ),
            ),
        ):
            events: list[SyncEventEnvelope] = []
            async for event in orchestrator.stream_run_iter(run=run, message="hello"):
                events.append(event)

        self.assertGreater(len(events), 0)
        self.assertEqual(events[0].type, "message")
        self.assertEqual(events[0].payload["role"], "user")
        self.assertEqual(events[-1].type, "done")

    async def test_stream_run_blank_message_skips_llm(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()

        with patch(
            "src.sync.orchestrator.LiteLLMClient.complete",
            new=AsyncMock(),
        ) as mocked_complete:
            events = await orchestrator.stream_run(run=run, message="   ")

        self.assertEqual(events, [])
        mocked_complete.assert_not_awaited()

    async def test_stream_run_tool_call_loop_emits_preview_and_ready_to_apply(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()

        with (
            patch("src.sync.orchestrator.RetrievalService.search", new=AsyncMock(return_value=[])),
            patch(
                "src.sync.orchestrator.LiteLLMClient.complete",
                new=AsyncMock(
                    side_effect=[
                        {
                            "content": "",
                            "provider": "mistral",
                            "model": "mistral-medium-latest",
                            "usage": {"input_tokens": 8, "output_tokens": 2, "total_tokens": 10, "cost_usd": None},
                            "tool_calls": [
                                {
                                    "id": "call_1",
                                    "name": "item.preview",
                                    "arguments": {"title": "Write project recap"},
                                }
                            ],
                            "warning": None,
                        },
                        {
                            "content": "Preview ready, review and apply.",
                            "provider": "mistral",
                            "model": "mistral-medium-latest",
                            "usage": {"input_tokens": 7, "output_tokens": 7, "total_tokens": 14, "cost_usd": None},
                            "tool_calls": [],
                            "warning": None,
                        },
                    ]
                ),
            ),
        ):
            events = await orchestrator.stream_run(run=run, message="create a recap item")

        event_types = [event.type for event in events]
        self.assertIn("tool_call", event_types)
        self.assertIn("tool_result", event_types)
        self.assertIn("task", event_types)
        self.assertIn("queue", event_types)
        self.assertIn("preview", event_types)
        self.assertEqual(events[-1].type, "done")
        self.assertEqual(events[-1].payload["status"], "ready_to_apply")
        self.assertEqual(run.status, "ready_to_apply")

    async def test_stream_run_emits_reasoning_and_sources_when_available(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()

        snippets = [
            {
                "doc_id": str(uuid.uuid4()),
                "chunk_id": str(uuid.uuid4()),
                "chunk_text": "Planning context snippet",
                "metadata": {"title": "Planning notes"},
            }
        ]

        with (
            patch("src.sync.orchestrator.RetrievalService.search", new=AsyncMock(return_value=snippets)),
            patch(
                "src.sync.orchestrator.LiteLLMClient.complete",
                new=AsyncMock(
                    return_value={
                        "content": "Ready",
                        "provider": "mistral",
                        "model": "mistral-medium-latest",
                        "usage": {"input_tokens": 4, "output_tokens": 4, "total_tokens": 8, "cost_usd": None},
                        "tool_calls": [],
                        "warning": None,
                        "reasoning": {"summary": "Reasoning summary", "content": "Reasoning body", "duration_ms": 1200},
                        "sources": [
                            {
                                "id": "web-1",
                                "title": "Source title",
                                "url": "https://example.com/source",
                                "snippet": "Useful source",
                            }
                        ],
                    }
                ),
            ),
        ):
            events = await orchestrator.stream_run(run=run, message="plan this")

        event_types = [event.type for event in events]
        self.assertIn("sources", event_types)
        self.assertIn("reasoning", event_types)

    async def test_apply_preview_and_undo_use_mutation_engine(self) -> None:
        run = make_run()
        run.status = "ready_to_apply"
        preview_id = uuid.uuid4()
        preview = SimpleNamespace(
            id=preview_id,
            run_id=run.id,
            kind="preview",
            body_json={"mutation": {"kind": "item.update", "args": {"item_id": str(uuid.uuid4()), "changes": {}}}},
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
            undoable=True,
            applied_change_id=None,
        )

        db = FakeDB(execute_values=[None, preview])
        orchestrator = ApplyUndoOrchestrator(
            db=db,
            workspace_id=run.workspace_id,
            user_id=run.created_by_user_id,
        )

        mutation_entity_id = uuid.uuid4()
        with patch(
            "src.sync.orchestrator.SyncMutationEngine.apply_preview_payload",
            new=AsyncMock(
                return_value=MutationApplyResult(
                    entity_type="item",
                    entity_id=mutation_entity_id,
                    action="item.update",
                    before_payload={"item": {"id": str(mutation_entity_id), "title": "before"}},
                    after_payload={"item": {"id": str(mutation_entity_id), "title": "after"}},
                    undoable=True,
                )
            ),
        ):
            apply_out = await orchestrator.apply_preview(
                run=run,
                preview_id=preview_id,
                idempotency_key="idem-1",
            )

        self.assertEqual(apply_out.preview_id, preview_id)
        self.assertEqual(run.status, "applied")
        self.assertIsNotNone(preview.applied_change_id)

        applied_change = next(
            obj for obj in db.added if isinstance(obj, AIChange) and obj.reason == "sync_apply:idem-1"
        )

        db._execute_values = [applied_change, None]
        run.status = "applied"

        with patch(
            "src.sync.orchestrator.SyncMutationEngine.undo_change",
            new=AsyncMock(
                return_value=MutationApplyResult(
                    entity_type="item",
                    entity_id=mutation_entity_id,
                    action="undo:item.update",
                    before_payload=applied_change.after_payload,
                    after_payload=applied_change.before_payload,
                    undoable=False,
                )
            ),
        ):
            undo_out = await orchestrator.undo_change(
                run=run,
                change_id=applied_change.id,
                idempotency_key="undo-1",
            )

        self.assertTrue(undo_out.undone)
        self.assertEqual(run.status, "done")

    async def test_apply_preview_idempotency_returns_existing_change(self) -> None:
        run = make_run()
        preview_id = uuid.uuid4()
        existing_change = AIChange(
            id=uuid.uuid4(),
            workspace_id=run.workspace_id,
            actor_user_id=run.created_by_user_id,
            run_id=run.id,
            entity_type="item",
            entity_id=uuid.uuid4(),
            action="item.update",
            reason="sync_apply:idem-1",
            before_payload={},
            after_payload={},
            undoable=True,
        )
        existing_change.created_at = datetime.now(UTC)

        db = FakeDB(execute_values=[existing_change])
        orchestrator = ApplyUndoOrchestrator(
            db=db,
            workspace_id=run.workspace_id,
            user_id=run.created_by_user_id,
        )

        with patch(
            "src.sync.orchestrator.SyncMutationEngine.apply_preview_payload",
            new=AsyncMock(),
        ) as mocked_apply:
            out = await orchestrator.apply_preview(
                run=run,
                preview_id=preview_id,
                idempotency_key="idem-1",
            )

        self.assertEqual(out.change_id, existing_change.id)
        mocked_apply.assert_not_awaited()

    async def test_undo_change_idempotency_returns_existing_undo(self) -> None:
        run = make_run()
        source_change = AIChange(
            id=uuid.uuid4(),
            workspace_id=run.workspace_id,
            actor_user_id=run.created_by_user_id,
            run_id=run.id,
            entity_type="item",
            entity_id=uuid.uuid4(),
            action="item.update",
            reason="sync_apply:idem-1",
            before_payload={},
            after_payload={},
            undoable=True,
        )
        existing_undo = AIChange(
            id=uuid.uuid4(),
            workspace_id=run.workspace_id,
            actor_user_id=run.created_by_user_id,
            run_id=run.id,
            entity_type="item",
            entity_id=source_change.entity_id,
            action="undo:item.update",
            reason=f"sync_undo:{source_change.id}:undo-1",
            before_payload={},
            after_payload={},
            undoable=False,
        )
        existing_undo.created_at = datetime.now(UTC)

        db = FakeDB(execute_values=[source_change, existing_undo])
        orchestrator = ApplyUndoOrchestrator(
            db=db,
            workspace_id=run.workspace_id,
            user_id=run.created_by_user_id,
        )

        with patch(
            "src.sync.orchestrator.SyncMutationEngine.undo_change",
            new=AsyncMock(),
        ) as mocked_undo:
            out = await orchestrator.undo_change(
                run=run,
                change_id=source_change.id,
                idempotency_key="undo-1",
            )

        self.assertTrue(out.undone)
        self.assertEqual(out.undone_at, existing_undo.created_at)
        mocked_undo.assert_not_awaited()
