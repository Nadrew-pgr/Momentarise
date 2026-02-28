import os
import unittest
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.models.ai_change import AIChange
from src.models.event import Event
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.sync.sync_mutation_engine import SyncMutationEngine, SyncMutationValidationError


class DummySession:
    def __init__(self) -> None:
        self.added: list[object] = []

    def add(self, obj: object) -> None:
        if hasattr(obj, "id") and getattr(obj, "id") is None:
            setattr(obj, "id", uuid.uuid4())
        if hasattr(obj, "created_at") and getattr(obj, "created_at") is None:
            setattr(obj, "created_at", datetime.now(UTC))
        if hasattr(obj, "updated_at") and getattr(obj, "updated_at") is None:
            setattr(obj, "updated_at", datetime.now(UTC))
        self.added.append(obj)

    async def flush(self) -> None:
        return None


class SyncMutationEngineTests(unittest.IsolatedAsyncioTestCase):
    async def test_apply_preview_payload_requires_mutation_object(self) -> None:
        engine = SyncMutationEngine(db=DummySession(), workspace_id=uuid.uuid4(), user_id=uuid.uuid4())
        with self.assertRaises(SyncMutationValidationError):
            await engine.apply_preview_payload({"summary": "missing mutation"})

    async def test_apply_preview_payload_rejects_unsupported_kind(self) -> None:
        engine = SyncMutationEngine(db=DummySession(), workspace_id=uuid.uuid4(), user_id=uuid.uuid4())
        with self.assertRaises(SyncMutationValidationError):
            await engine.apply_preview_payload(
                {"mutation": {"kind": "unknown.operation", "args": {}}}
            )

    async def test_item_update_apply_then_undo(self) -> None:
        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        db = DummySession()
        engine = SyncMutationEngine(db=db, workspace_id=workspace_id, user_id=user_id)

        item = Item(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            title="Old title",
            kind="task",
            status="draft",
            meta={},
            blocks=[],
        )
        engine._get_item = AsyncMock(return_value=item)

        apply_result = await engine.apply_preview_payload(
            {
                "mutation": {
                    "kind": "item.update",
                    "args": {
                        "item_id": str(item.id),
                        "changes": {"title": "New title", "status": "ready"},
                    },
                }
            }
        )
        self.assertEqual(item.title, "New title")
        self.assertEqual(item.status, "ready")

        change = AIChange(
            workspace_id=workspace_id,
            actor_user_id=user_id,
            run_id=uuid.uuid4(),
            entity_type=apply_result.entity_type,
            entity_id=apply_result.entity_id,
            action=apply_result.action,
            before_payload=apply_result.before_payload,
            after_payload=apply_result.after_payload,
            undoable=True,
        )
        engine._get_item = AsyncMock(return_value=item)
        await engine.undo_change(change)

        self.assertEqual(item.title, "Old title")
        self.assertEqual(item.status, "draft")

    async def test_event_create_apply_then_undo(self) -> None:
        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        db = DummySession()
        engine = SyncMutationEngine(db=db, workspace_id=workspace_id, user_id=user_id)

        apply_result = await engine.apply_preview_payload(
            {
                "mutation": {
                    "kind": "event.create",
                    "args": {
                        "title": "Focus block",
                        "start_at": "2026-03-01T09:00:00+00:00",
                        "end_at": "2026-03-01T10:00:00+00:00",
                        "color": "sky",
                    },
                }
            }
        )

        event = next(obj for obj in db.added if isinstance(obj, Event))
        created_item = next(obj for obj in db.added if isinstance(obj, Item))

        self.assertEqual(event.item_id, created_item.id)
        self.assertEqual(apply_result.action, "event.create")

        change = AIChange(
            workspace_id=workspace_id,
            actor_user_id=user_id,
            run_id=uuid.uuid4(),
            entity_type=apply_result.entity_type,
            entity_id=apply_result.entity_id,
            action=apply_result.action,
            before_payload=apply_result.before_payload,
            after_payload=apply_result.after_payload,
            undoable=True,
        )

        engine._get_event = AsyncMock(return_value=event)
        engine._get_item = AsyncMock(return_value=created_item)
        await engine.undo_change(change)

        self.assertIsNotNone(event.deleted_at)
        self.assertIsNotNone(created_item.deleted_at)

    async def test_inbox_transform_apply_then_undo(self) -> None:
        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        db = DummySession()
        engine = SyncMutationEngine(db=db, workspace_id=workspace_id, user_id=user_id)

        capture = InboxCapture(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            user_id=user_id,
            raw_content="Call Alice tomorrow",
            source="manual",
            capture_type="text",
            status="captured",
            meta={},
        )
        engine._get_capture = AsyncMock(return_value=capture)

        apply_result = await engine.apply_preview_payload(
            {
                "mutation": {
                    "kind": "inbox.transform",
                    "args": {
                        "capture_id": str(capture.id),
                        "target": "item",
                        "title": "Call Alice",
                    },
                }
            }
        )

        transformed_item = next(obj for obj in db.added if isinstance(obj, Item))
        self.assertEqual(capture.status, "applied")
        self.assertEqual(apply_result.action, "inbox.transform")

        change = AIChange(
            workspace_id=workspace_id,
            actor_user_id=user_id,
            run_id=uuid.uuid4(),
            entity_type=apply_result.entity_type,
            entity_id=apply_result.entity_id,
            action=apply_result.action,
            before_payload=apply_result.before_payload,
            after_payload=apply_result.after_payload,
            undoable=True,
        )

        engine._get_capture = AsyncMock(return_value=capture)
        engine._get_item = AsyncMock(return_value=transformed_item)
        engine._get_event = AsyncMock(return_value=None)
        await engine.undo_change(change)

        self.assertEqual(capture.status, "captured")
        self.assertIsNotNone(transformed_item.deleted_at)

    async def test_batch_mutations_apply_then_undo(self) -> None:
        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        db = DummySession()
        engine = SyncMutationEngine(db=db, workspace_id=workspace_id, user_id=user_id)

        item = Item(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            title="Initial title",
            kind="task",
            status="draft",
            meta={},
            blocks=[],
        )
        engine._get_item = AsyncMock(return_value=item)

        apply_result = await engine.apply_preview_payload(
            {
                "mutations": [
                    {
                        "kind": "item.update",
                        "args": {"item_id": str(item.id), "changes": {"title": "First title"}},
                    },
                    {
                        "kind": "item.update",
                        "args": {"item_id": str(item.id), "changes": {"status": "ready"}},
                    },
                ],
                "summary": "Batch update",
            }
        )

        self.assertTrue(apply_result.action.startswith("batch.apply"))
        self.assertEqual(item.title, "First title")
        self.assertEqual(item.status, "ready")

        change = AIChange(
            workspace_id=workspace_id,
            actor_user_id=user_id,
            run_id=uuid.uuid4(),
            entity_type=apply_result.entity_type,
            entity_id=apply_result.entity_id,
            action=apply_result.action,
            before_payload=apply_result.before_payload,
            after_payload=apply_result.after_payload,
            undoable=True,
        )

        engine._get_item = AsyncMock(return_value=item)
        undo_result = await engine.undo_change(change)

        self.assertEqual(undo_result.action, "undo:batch.apply")
        self.assertEqual(item.title, "Initial title")
        self.assertEqual(item.status, "draft")
