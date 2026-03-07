import os
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.models.ai_change import AIChange
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
    def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
        super().__init__(*args, **kwargs)
        self.recorded_plain_events: list[SyncEventEnvelope] = []

    async def _next_seq(self, run):  # noqa: ANN001
        run.last_seq += 1
        return run.last_seq

    async def _record_plain_event(self, *, run, type_, payload):  # noqa: ANN001
        seq = await self._next_seq(run)
        envelope = SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=datetime.now(UTC),
            trace_id=None,
            type=type_,
            payload=payload,
        )
        self.recorded_plain_events.append(envelope)
        return envelope


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
        mocked_models = [
            {"id": "gpt-5-mini", "provider": "openai", "label": "GPT-5 Mini"},
            {"id": "gemini/gemini-3-flash", "provider": "gemini", "label": "Gemini 3 Flash"},
        ]

        with (
            patch("src.sync.orchestrator._registry_get_models", return_value=mocked_models.copy()),
            patch("src.sync.orchestrator.resolve_auto_model", return_value="gpt-5-mini"),
        ):
            models = SyncOrchestrator.available_models()

        self.assertEqual(models[0]["provider"], "openai")
        self.assertEqual(models[1]["provider"], "gemini")
        self.assertTrue(models[0]["is_default"])
        self.assertFalse(models[1]["is_default"])

    def test_preview_gating_mutation_intent_heuristic(self) -> None:
        self.assertTrue(SyncOrchestrator._is_explicit_mutation_intent("Crée un moment demain à 9h"))
        self.assertTrue(SyncOrchestrator._is_explicit_mutation_intent("Please update this item title"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Résume cette pièce jointe"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Brainstormons sur ce document"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Explique-moi ce plan"))

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

    async def test_stream_run_rejects_attachment_still_processing(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()
        capture_id = uuid.uuid4()
        capture = SimpleNamespace(
            id=capture_id,
            status="processing",
            capture_type="file",
            raw_content="",
            meta={},
        )

        with patch.object(
            orchestrator,
            "_load_capture_for_workspace",
            new=AsyncMock(return_value=capture),
        ):
            events = await orchestrator.stream_run(
                run=run,
                message="use this attachment",
                attachments=[{"capture_id": str(capture_id), "source": "upload"}],
            )

        self.assertEqual(run.status, "failed")
        self.assertEqual([event.type for event in events], ["error", "done"])
        self.assertEqual(events[0].payload["code"], "validation_error")
        self.assertIn("attachment", events[0].payload["message"].lower())

    async def test_stream_run_with_item_reference_emits_metadata_and_sources(self) -> None:
        db = FakeDB()
        orchestrator = StreamTestOrchestrator(
            db=db,
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )
        run = make_run()
        item_id = uuid.uuid4()
        item = SimpleNamespace(
            id=item_id,
            title="Referenced Item",
            kind="task",
            status="active",
            blocks=[{"type": "paragraph", "content": [{"text": "Item context"}]}],
        )

        with (
            patch.object(
                orchestrator,
                "_load_item_for_workspace",
                new=AsyncMock(return_value=item),
            ),
            patch.object(
                orchestrator,
                "_item_exists_any_workspace",
                new=AsyncMock(return_value=False),
            ),
            patch("src.sync.orchestrator.RetrievalService.search", new=AsyncMock(return_value=[])),
            patch(
                "src.sync.orchestrator.LiteLLMClient.complete",
                new=AsyncMock(
                    return_value={
                        "content": "I used the reference.",
                        "provider": "mistral",
                        "model": "mistral-medium-latest",
                        "usage": {"input_tokens": 3, "output_tokens": 5, "total_tokens": 8, "cost_usd": None},
                        "tool_calls": [],
                        "warning": None,
                    }
                ),
            ),
        ):
            events = await orchestrator.stream_run(
                run=run,
                message="plan based on this",
                references=[{"kind": "item", "id": str(item_id), "label": "Backlog item"}],
            )

        event_types = [event.type for event in events]
        self.assertIn("sources", event_types)
        user_message_event = next(
            event
            for event in events
            if event.type == "message" and event.payload.get("role") == "user"
        )
        metadata = (
            user_message_event.payload.get("content_json", {})
            .get("metadata", {})
            .get("sync_context", {})
        )
        resolved = metadata.get("resolved", [])
        self.assertEqual(len(resolved), 1)
        self.assertEqual(resolved[0]["kind"], "item")
        self.assertEqual(resolved[0]["id"], str(item_id))

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
                                    "name": "item_preview",
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
        self.assertEqual(apply_out.open_target_kind, "item")
        self.assertEqual(apply_out.open_target_id, mutation_entity_id)
        self.assertIsNone(apply_out.open_target_date)
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
        self.assertFalse(applied_change.undoable)
        event_types = [event.type for event in orchestrator.recorded_plain_events]
        self.assertIn("undone", event_types)
        self.assertIn("done", event_types)
        undone_event = next(
            event for event in orchestrator.recorded_plain_events if event.type == "undone"
        )
        self.assertEqual(undone_event.payload["source_change_id"], str(applied_change.id))
        self.assertEqual(undone_event.payload["open_target_kind"], "item")

    async def test_apply_preview_returns_open_target_metadata_for_item_event_and_transform(self) -> None:
        run = make_run()
        run.status = "ready_to_apply"

        cases = [
            {
                "name": "item",
                "mutation": MutationApplyResult(
                    entity_type="item",
                    entity_id=uuid.uuid4(),
                    action="item.update",
                    before_payload={"item": {"id": str(uuid.uuid4()), "title": "before"}},
                    after_payload={"item": {"id": None, "title": "after"}},
                    undoable=True,
                ),
                "expected_kind": "item",
                "expected_date": None,
            },
            {
                "name": "event",
                "mutation": MutationApplyResult(
                    entity_type="event",
                    entity_id=uuid.uuid4(),
                    action="event.update",
                    before_payload={},
                    after_payload={
                        "event": {
                            "id": None,
                            "start_at": "2026-02-16T09:30:00+00:00",
                        }
                    },
                    undoable=True,
                ),
                "expected_kind": "event",
                "expected_date": "2026-02-16",
            },
            {
                "name": "event-before-fallback",
                "mutation": MutationApplyResult(
                    entity_type="event",
                    entity_id=uuid.uuid4(),
                    action="event.update",
                    before_payload={
                        "event": {
                            "id": None,
                            "start_at": "2026-03-01T10:00:00+00:00",
                        }
                    },
                    after_payload={"event": {"id": None}},
                    undoable=True,
                ),
                "expected_kind": "event",
                "expected_date": "2026-03-01",
            },
            {
                "name": "inbox-transform-item",
                "mutation": MutationApplyResult(
                    entity_type="capture",
                    entity_id=uuid.uuid4(),
                    action="inbox.transform",
                    before_payload={},
                    after_payload={"item": {"id": str(uuid.uuid4())}, "event": None},
                    undoable=True,
                ),
                "expected_kind": "item",
                "expected_date": None,
            },
            {
                "name": "inbox-transform-event",
                "mutation": MutationApplyResult(
                    entity_type="capture",
                    entity_id=uuid.uuid4(),
                    action="inbox.transform",
                    before_payload={},
                    after_payload={
                        "item": {"id": str(uuid.uuid4())},
                        "event": {
                            "id": str(uuid.uuid4()),
                            "start_at": "2026-02-17T14:00:00+00:00",
                        },
                    },
                    undoable=True,
                ),
                "expected_kind": "event",
                "expected_date": "2026-02-17",
            },
        ]

        for case in cases:
            preview_id = uuid.uuid4()
            preview = SimpleNamespace(
                id=preview_id,
                run_id=run.id,
                kind="preview",
                body_json={"mutation": {"kind": "item.update", "args": {}}},
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
            mutation = case["mutation"]
            # Keep entity ids stable across expected assertions.
            if mutation.entity_type == "item":
                mutation.after_payload = {
                    "item": {
                        "id": str(mutation.entity_id),
                        "title": "after",
                    }
                }
            if case["name"] == "event":
                mutation.after_payload = {
                    "event": {
                        "id": str(mutation.entity_id),
                        "start_at": "2026-02-16T09:30:00+00:00",
                    }
                }

            with self.subTest(case=case["name"]):
                with patch(
                    "src.sync.orchestrator.SyncMutationEngine.apply_preview_payload",
                    new=AsyncMock(return_value=mutation),
                ):
                    out = await orchestrator.apply_preview(
                        run=run,
                        preview_id=preview_id,
                        idempotency_key=f"idem-{case['name']}",
                    )

                self.assertEqual(out.open_target_kind, case["expected_kind"])
                self.assertEqual(out.entity_type, mutation.entity_type)
                if case["expected_kind"] == "item":
                    item_id = mutation.after_payload["item"]["id"]  # type: ignore[index]
                    self.assertEqual(out.open_target_id, uuid.UUID(str(item_id)))
                if case["expected_kind"] == "event":
                    after_event = (
                        mutation.after_payload.get("event")
                        if isinstance(mutation.after_payload, dict)
                        else None
                    )
                    before_event = (
                        mutation.before_payload.get("event")
                        if isinstance(mutation.before_payload, dict)
                        else None
                    )
                    expected_event_id = None
                    if isinstance(after_event, dict):
                        expected_event_id = after_event.get("id")
                    if not expected_event_id and isinstance(before_event, dict):
                        expected_event_id = before_event.get("id")
                    if not expected_event_id:
                        expected_event_id = mutation.entity_id
                    self.assertEqual(out.open_target_id, uuid.UUID(str(expected_event_id)))
                expected_date = case["expected_date"]
                if expected_date is None:
                    self.assertIsNone(out.open_target_date)
                else:
                    self.assertEqual(out.open_target_date.isoformat(), expected_date)

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
        self.assertFalse(source_change.undoable)
        mocked_undo.assert_not_awaited()
