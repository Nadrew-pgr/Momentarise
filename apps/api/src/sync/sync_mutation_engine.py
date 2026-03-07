from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ai_change import AIChange
from src.models.event import Event
from src.models.inbox_capture import InboxCapture
from src.models.item import Item


class SyncMutationValidationError(Exception):
    pass


class SyncMutationNotFoundError(Exception):
    pass


@dataclass(slots=True)
class MutationApplyResult:
    entity_type: str
    entity_id: uuid.UUID
    action: str
    before_payload: dict[str, Any] | None
    after_payload: dict[str, Any] | None
    undoable: bool


class SyncMutationEngine:
    def __init__(
        self,
        *,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id

    async def apply_preview_payload(self, diff_json: dict[str, Any]) -> MutationApplyResult:
        mutations = self._extract_mutations(diff_json)
        if not mutations:
            raise SyncMutationValidationError("Preview payload is missing mutation object")

        if len(mutations) == 1:
            kind, args = mutations[0]
            return await self._apply_mutation(kind=kind, args=args)

        applied_steps: list[MutationApplyResult] = []
        for mutation_kind, args in mutations:
            applied_steps.append(await self._apply_mutation(kind=mutation_kind, args=args))

        last_step = applied_steps[-1]
        serialized_steps = [
            {
                "action": step.action,
                "entity_type": step.entity_type,
                "entity_id": str(step.entity_id),
                "before_payload": step.before_payload,
                "after_payload": step.after_payload,
            }
            for step in applied_steps
        ]
        return MutationApplyResult(
            entity_type=last_step.entity_type,
            entity_id=last_step.entity_id,
            action=f"batch.apply:{len(applied_steps)}",
            before_payload={"mutations": serialized_steps, "count": len(serialized_steps)},
            after_payload={"mutations": serialized_steps, "count": len(serialized_steps)},
            undoable=all(step.undoable for step in applied_steps),
        )

    @staticmethod
    def _extract_mutations(diff_json: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        mutations = diff_json.get("mutations")
        if isinstance(mutations, list):
            for mutation in mutations:
                if not isinstance(mutation, dict):
                    continue
                kind = mutation.get("kind")
                if not isinstance(kind, str) or not kind.strip():
                    continue
                args = mutation.get("args") if isinstance(mutation.get("args"), dict) else {}
                out.append((kind.strip(), args))
        if out:
            return out

        mutation = diff_json.get("mutation")
        if isinstance(mutation, dict):
            kind = mutation.get("kind")
            if isinstance(kind, str) and kind.strip():
                args = mutation.get("args") if isinstance(mutation.get("args"), dict) else {}
                out.append((kind.strip(), args))
        return out

    async def _apply_mutation(self, *, kind: str, args: dict[str, Any]) -> MutationApplyResult:
        if kind == "item.create":
            return await self._apply_item_create(kind, args)
        if kind == "item.update":
            return await self._apply_item_update(kind, args)
        if kind == "event.create":
            return await self._apply_event_create(kind, args)
        if kind == "event.update":
            return await self._apply_event_update(kind, args)
        if kind == "event.delete":
            return await self._apply_event_delete(kind, args)
        if kind == "inbox.transform":
            return await self._apply_inbox_transform(kind, args)
        raise SyncMutationValidationError(f"Unsupported mutation.kind '{kind}'")

    async def undo_change(self, change: AIChange) -> MutationApplyResult:
        action = (change.action or "").strip()
        before_payload = change.before_payload if isinstance(change.before_payload, dict) else {}
        after_payload = change.after_payload if isinstance(change.after_payload, dict) else {}

        if action.startswith("batch.apply"):
            steps = after_payload.get("mutations") if isinstance(after_payload.get("mutations"), list) else []
            if not steps:
                raise SyncMutationValidationError("Missing mutations payload for batch undo")

            last_undo_result: MutationApplyResult | None = None
            for step in reversed(steps):
                if not isinstance(step, dict):
                    continue
                step_action = str(step.get("action") or "").strip()
                if not step_action or step_action.startswith("batch."):
                    continue
                synthetic_change = SimpleNamespace(
                    action=step_action,
                    before_payload=step.get("before_payload"),
                    after_payload=step.get("after_payload"),
                )
                last_undo_result = await self.undo_change(synthetic_change)  # type: ignore[arg-type]

            if last_undo_result is None:
                raise SyncMutationValidationError("No valid mutation step found for batch undo")

            return MutationApplyResult(
                entity_type=last_undo_result.entity_type,
                entity_id=last_undo_result.entity_id,
                action="undo:batch.apply",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "item.create":
            snapshot = after_payload.get("item") if isinstance(after_payload.get("item"), dict) else None
            item_id = self._require_uuid_from_snapshot(snapshot, "id", "item.create after.item.id")
            item = await self._get_item(item_id, include_deleted=True)
            if item is not None and item.deleted_at is None:
                item.deleted_at = datetime.now(UTC)
                item.status = "archived"
            return MutationApplyResult(
                entity_type="item",
                entity_id=item_id,
                action="undo:item.create",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "item.update":
            snapshot = before_payload.get("item") if isinstance(before_payload.get("item"), dict) else None
            item_id = self._require_uuid_from_snapshot(snapshot, "id", "item.update before.item.id")
            item = await self._get_item(item_id, include_deleted=True)
            if item is None:
                raise SyncMutationNotFoundError("Item not found while undoing item.update")
            self._restore_item(item, snapshot)
            return MutationApplyResult(
                entity_type="item",
                entity_id=item_id,
                action="undo:item.update",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "event.create":
            event_snapshot = after_payload.get("event") if isinstance(after_payload.get("event"), dict) else None
            event_id = self._require_uuid_from_snapshot(event_snapshot, "id", "event.create after.event.id")
            event = await self._get_event(event_id, include_deleted=True)
            if event is not None and event.deleted_at is None:
                event.deleted_at = datetime.now(UTC)
                event.is_tracking = False
                event.tracking_started_at = None

            created_item_snapshot = (
                after_payload.get("created_item")
                if isinstance(after_payload.get("created_item"), dict)
                else None
            )
            if created_item_snapshot is not None:
                created_item_id = self._require_uuid_from_snapshot(
                    created_item_snapshot,
                    "id",
                    "event.create after.created_item.id",
                )
                created_item = await self._get_item(created_item_id, include_deleted=True)
                if created_item is not None and created_item.deleted_at is None:
                    created_item.deleted_at = datetime.now(UTC)
                    created_item.status = "archived"

            return MutationApplyResult(
                entity_type="event",
                entity_id=event_id,
                action="undo:event.create",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "event.update":
            snapshot = before_payload.get("event") if isinstance(before_payload.get("event"), dict) else None
            event_id = self._require_uuid_from_snapshot(snapshot, "id", "event.update before.event.id")
            event = await self._get_event(event_id, include_deleted=True)
            if event is None:
                raise SyncMutationNotFoundError("Event not found while undoing event.update")
            await self._restore_event(event, snapshot)
            return MutationApplyResult(
                entity_type="event",
                entity_id=event_id,
                action="undo:event.update",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "event.delete":
            snapshot = before_payload.get("event") if isinstance(before_payload.get("event"), dict) else None
            event_id = self._require_uuid_from_snapshot(snapshot, "id", "event.delete before.event.id")
            event = await self._get_event(event_id, include_deleted=True)
            if event is None:
                raise SyncMutationNotFoundError("Event not found while undoing event.delete")
            await self._restore_event(event, snapshot)
            return MutationApplyResult(
                entity_type="event",
                entity_id=event_id,
                action="undo:event.delete",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        if action == "inbox.transform":
            before_capture = (
                before_payload.get("capture") if isinstance(before_payload.get("capture"), dict) else None
            )
            capture_id = self._require_uuid_from_snapshot(
                before_capture,
                "id",
                "inbox.transform before.capture.id",
            )
            capture = await self._get_capture(capture_id)
            if capture is None:
                raise SyncMutationNotFoundError("Capture not found while undoing inbox.transform")
            self._restore_capture(capture, before_capture)

            after_item = after_payload.get("item") if isinstance(after_payload.get("item"), dict) else None
            if after_item is not None:
                item_id = self._require_uuid_from_snapshot(after_item, "id", "inbox.transform after.item.id")
                item = await self._get_item(item_id, include_deleted=True)
                if item is not None and item.deleted_at is None:
                    item.deleted_at = datetime.now(UTC)
                    item.status = "archived"

            after_event = after_payload.get("event") if isinstance(after_payload.get("event"), dict) else None
            if after_event is not None:
                event_id = self._require_uuid_from_snapshot(after_event, "id", "inbox.transform after.event.id")
                event = await self._get_event(event_id, include_deleted=True)
                if event is not None and event.deleted_at is None:
                    event.deleted_at = datetime.now(UTC)
                    event.is_tracking = False
                    event.tracking_started_at = None

            return MutationApplyResult(
                entity_type="capture",
                entity_id=capture_id,
                action="undo:inbox.transform",
                before_payload=after_payload,
                after_payload=before_payload,
                undoable=False,
            )

        raise SyncMutationValidationError(f"Unsupported undo action '{action}'")

    async def _apply_item_create(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        title = self._require_string(args.get("title"), "item.create title")
        kind = self._normalize_item_kind(args.get("kind"))
        status = self._normalize_item_status(args.get("status"))
        metadata = args.get("metadata") if isinstance(args.get("metadata"), dict) else {}
        blocks = args.get("blocks") if isinstance(args.get("blocks"), list) else []

        source_capture_id = self._maybe_uuid(args.get("source_capture_id"))
        if source_capture_id is not None:
            capture = await self._get_capture(source_capture_id)
            if capture is None:
                raise SyncMutationNotFoundError("Source capture not found for item.create")

        item = Item(
            workspace_id=self.workspace_id,
            title=title,
            kind=kind,
            status=status,
            meta=metadata,
            source_capture_id=source_capture_id,
            blocks=blocks,
        )
        self.db.add(item)
        await self.db.flush()

        after_item = self._snapshot_item(item)
        return MutationApplyResult(
            entity_type="item",
            entity_id=item.id,
            action=mutation_kind,
            before_payload={"item": None},
            after_payload={"item": after_item},
            undoable=True,
        )

    async def _apply_item_update(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        item_id = self._require_uuid(args.get("item_id"), "item.update item_id")
        item = await self._get_item(item_id, include_deleted=False)
        if item is None:
            raise SyncMutationNotFoundError("Item not found for item.update")

        before_item = self._snapshot_item(item)

        changes = args.get("changes") if isinstance(args.get("changes"), dict) else {}
        if "title" in changes and isinstance(changes.get("title"), str):
            item.title = changes["title"].strip() or item.title
        if "kind" in changes:
            item.kind = self._normalize_item_kind(changes.get("kind"))
        if "status" in changes:
            item.status = self._normalize_item_status(changes.get("status"))
        if "metadata" in changes and isinstance(changes.get("metadata"), dict):
            item.meta = changes["metadata"]
        if "blocks" in changes and isinstance(changes.get("blocks"), list):
            item.blocks = changes["blocks"]

        await self.db.flush()

        after_item = self._snapshot_item(item)
        return MutationApplyResult(
            entity_type="item",
            entity_id=item.id,
            action=mutation_kind,
            before_payload={"item": before_item},
            after_payload={"item": after_item},
            undoable=True,
        )

    async def _apply_event_create(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        title = self._require_string(args.get("title"), "event.create title")
        item_id = self._maybe_uuid(args.get("item_id"))
        description = args.get("description")

        created_item: Item | None = None
        if item_id is not None:
            item = await self._get_item(item_id, include_deleted=False)
            if item is None:
                raise SyncMutationNotFoundError("Item not found for event.create")
            # Description for event.create is now stored in item.meta["description"]
            # instead of being written into blocks for this specific mutation.
            if isinstance(description, str) and description.strip():
                meta = dict(item.meta or {})
                meta.setdefault("source", "sync")
                meta["description"] = description.strip()
                item.meta = meta
        else:
            meta: dict[str, Any] = {"source": "sync"}
            if isinstance(description, str) and description.strip():
                meta["description"] = description.strip()
            created_item = Item(
                workspace_id=self.workspace_id,
                title=title,
                kind="task",
                status="ready",
                meta=meta,
                # blocks reserved for future rich-text usage on event.create
                # blocks=blocks,
            )
            self.db.add(created_item)
            await self.db.flush()
            item = created_item

        start_at = self._parse_datetime(args.get("start_at")) or datetime.now(UTC)
        end_at = self._parse_datetime(args.get("end_at")) or (start_at + timedelta(minutes=30))
        start_at, end_at = self._ensure_time_window(start_at, end_at)

        estimated_time_seconds = self._maybe_int(args.get("estimated_time_seconds"))
        if estimated_time_seconds is None:
            estimated_time_seconds = max(0, int((end_at - start_at).total_seconds()))

        color = self._normalize_event_color(args.get("color"))

        event = Event(
            workspace_id=self.workspace_id,
            item_id=item.id,
            description=description.strip() if isinstance(description, str) and description.strip() else None,
            start_at=start_at,
            end_at=end_at,
            estimated_time_seconds=estimated_time_seconds,
            color=color,
            is_tracking=False,
            actual_time_acc_seconds=0,
            tracking_started_at=None,
        )
        self.db.add(event)
        await self.db.flush()

        after_payload = {
            "event": self._snapshot_event(event),
            "created_item": self._snapshot_item(created_item) if created_item is not None else None,
        }

        return MutationApplyResult(
            entity_type="event",
            entity_id=event.id,
            action=mutation_kind,
            before_payload={"event": None, "created_item": None},
            after_payload=after_payload,
            undoable=True,
        )

    async def _apply_event_update(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        event_id = self._require_uuid(args.get("event_id"), "event.update event_id")
        event = await self._get_event(event_id, include_deleted=False)
        if event is None:
            raise SyncMutationNotFoundError("Event not found for event.update")

        before_event = self._snapshot_event(event)

        changes = args.get("changes") if isinstance(args.get("changes"), dict) else {}
        if "start_at" in changes:
            parsed = self._parse_datetime(changes.get("start_at"))
            if parsed is not None:
                event.start_at = parsed
        if "end_at" in changes:
            parsed = self._parse_datetime(changes.get("end_at"))
            if parsed is not None:
                event.end_at = parsed
        if event.end_at <= event.start_at:
            raise SyncMutationValidationError("event.update requires end_at > start_at")
        if "estimated_time_seconds" in changes:
            maybe_est = self._maybe_int(changes.get("estimated_time_seconds"))
            if maybe_est is not None:
                event.estimated_time_seconds = max(0, maybe_est)
        if "color" in changes:
            event.color = self._normalize_event_color(changes.get("color"))

        if "title" in changes and isinstance(changes.get("title"), str):
            item = await self._get_item(event.item_id, include_deleted=True)
            if item is not None and changes["title"].strip():
                item.title = changes["title"].strip()

        if "item_id" in changes:
            new_item_id = self._maybe_uuid(changes.get("item_id"))
            if new_item_id is not None:
                item = await self._get_item(new_item_id, include_deleted=False)
                if item is None:
                    raise SyncMutationNotFoundError("Target item not found for event.update")
                event.item_id = new_item_id

        await self.db.flush()

        return MutationApplyResult(
            entity_type="event",
            entity_id=event.id,
            action=mutation_kind,
            before_payload={"event": before_event},
            after_payload={"event": self._snapshot_event(event)},
            undoable=True,
        )

    async def _apply_event_delete(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        event_id = self._require_uuid(args.get("event_id"), "event.delete event_id")
        event = await self._get_event(event_id, include_deleted=False)
        if event is None:
            raise SyncMutationNotFoundError("Event not found for event.delete")

        before_event = self._snapshot_event(event)
        event.deleted_at = datetime.now(UTC)
        event.is_tracking = False
        event.tracking_started_at = None

        await self.db.flush()

        return MutationApplyResult(
            entity_type="event",
            entity_id=event.id,
            action=mutation_kind,
            before_payload={"event": before_event},
            after_payload={"event": self._snapshot_event(event)},
            undoable=True,
        )

    async def _apply_inbox_transform(self, mutation_kind: str, args: dict[str, Any]) -> MutationApplyResult:
        capture_id = self._require_uuid(args.get("capture_id"), "inbox.transform capture_id")
        capture = await self._get_capture(capture_id)
        if capture is None:
            raise SyncMutationNotFoundError("Capture not found for inbox.transform")

        target = str(args.get("target") or "item").strip().lower()
        if target not in {"item", "event"}:
            raise SyncMutationValidationError("inbox.transform target must be item or event")

        before_capture = self._snapshot_capture(capture)

        title = self._require_string(args.get("title") or capture.raw_content[:80], "inbox.transform title")
        kind = self._normalize_item_kind(args.get("kind"))
        metadata = args.get("metadata") if isinstance(args.get("metadata"), dict) else {}

        item = Item(
            workspace_id=self.workspace_id,
            title=title,
            kind="task" if target == "event" else kind,
            status="ready",
            meta={**capture.meta, **metadata, "source": "sync_transform"},
            source_capture_id=capture.id,
            blocks=[],
        )
        self.db.add(item)
        await self.db.flush()

        event: Event | None = None
        if target == "event":
            start_at = self._parse_datetime(args.get("start_at")) or datetime.now(UTC)
            end_at = self._parse_datetime(args.get("end_at")) or (start_at + timedelta(minutes=30))
            start_at, end_at = self._ensure_time_window(start_at, end_at)

            event = Event(
                workspace_id=self.workspace_id,
                item_id=item.id,
                start_at=start_at,
                end_at=end_at,
                estimated_time_seconds=max(0, int((end_at - start_at).total_seconds())),
                color=self._normalize_event_color(args.get("color")),
                is_tracking=False,
                actual_time_acc_seconds=0,
                tracking_started_at=None,
            )
            self.db.add(event)
            await self.db.flush()

        capture.status = "applied"
        capture.meta = {
            **capture.meta,
            "transformed_by": "sync",
            "transformed_item_id": str(item.id),
            "transformed_event_id": str(event.id) if event is not None else None,
        }

        await self.db.flush()

        return MutationApplyResult(
            entity_type="capture",
            entity_id=capture.id,
            action=mutation_kind,
            before_payload={"capture": before_capture, "item": None, "event": None},
            after_payload={
                "capture": self._snapshot_capture(capture),
                "item": self._snapshot_item(item),
                "event": self._snapshot_event(event) if event is not None else None,
            },
            undoable=True,
        )

    async def _restore_event(self, event: Event, snapshot: dict[str, Any]) -> None:
        event.item_id = self._require_uuid(snapshot.get("item_id"), "event snapshot item_id")
        start_at = self._parse_datetime(snapshot.get("start_at"))
        end_at = self._parse_datetime(snapshot.get("end_at"))
        if start_at is None or end_at is None:
            raise SyncMutationValidationError("Invalid event snapshot timestamps")

        event.start_at = start_at
        event.end_at = end_at
        event.estimated_time_seconds = int(snapshot.get("estimated_time_seconds") or 0)
        event.actual_time_acc_seconds = int(snapshot.get("actual_time_acc_seconds") or 0)
        event.is_tracking = bool(snapshot.get("is_tracking"))
        event.color = self._normalize_event_color(snapshot.get("color"))
        event.tracking_started_at = self._parse_datetime(snapshot.get("tracking_started_at"))
        event.deleted_at = self._parse_datetime(snapshot.get("deleted_at"))

    def _restore_item(self, item: Item, snapshot: dict[str, Any]) -> None:
        item.title = self._require_string(snapshot.get("title"), "item snapshot title")
        item.kind = self._normalize_item_kind(snapshot.get("kind"))
        item.status = self._normalize_item_status(snapshot.get("status"))
        item.meta = snapshot.get("meta") if isinstance(snapshot.get("meta"), dict) else {}
        item.source_capture_id = self._maybe_uuid(snapshot.get("source_capture_id"))
        item.blocks = snapshot.get("blocks") if isinstance(snapshot.get("blocks"), list) else []
        item.deleted_at = self._parse_datetime(snapshot.get("deleted_at"))

    def _restore_capture(self, capture: InboxCapture, snapshot: dict[str, Any]) -> None:
        capture.raw_content = self._require_string(snapshot.get("raw_content"), "capture snapshot raw_content")
        capture.source = self._maybe_string(snapshot.get("source")) or "manual"
        capture.capture_type = self._maybe_string(snapshot.get("capture_type")) or "text"
        capture.status = self._maybe_string(snapshot.get("status")) or "captured"
        capture.meta = snapshot.get("meta") if isinstance(snapshot.get("meta"), dict) else {}
        capture.deleted_at = self._parse_datetime(snapshot.get("deleted_at"))

    async def _get_item(self, item_id: uuid.UUID, *, include_deleted: bool) -> Item | None:
        query = select(Item).where(Item.id == item_id, Item.workspace_id == self.workspace_id)
        if not include_deleted:
            query = query.where(Item.deleted_at.is_(None))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_event(self, event_id: uuid.UUID, *, include_deleted: bool) -> Event | None:
        query = select(Event).where(Event.id == event_id, Event.workspace_id == self.workspace_id)
        if not include_deleted:
            query = query.where(Event.deleted_at.is_(None))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_capture(self, capture_id: uuid.UUID) -> InboxCapture | None:
        result = await self.db.execute(
            select(InboxCapture).where(
                InboxCapture.id == capture_id,
                InboxCapture.workspace_id == self.workspace_id,
                InboxCapture.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _snapshot_item(item: Item | None) -> dict[str, Any] | None:
        if item is None:
            return None
        return {
            "id": str(item.id),
            "title": item.title,
            "kind": item.kind,
            "status": item.status,
            "meta": item.meta,
            "source_capture_id": str(item.source_capture_id) if item.source_capture_id else None,
            "blocks": item.blocks,
            "deleted_at": item.deleted_at.isoformat() if item.deleted_at else None,
        }

    @staticmethod
    def _snapshot_event(event: Event | None) -> dict[str, Any] | None:
        if event is None:
            return None
        return {
            "id": str(event.id),
            "item_id": str(event.item_id),
            "start_at": event.start_at.isoformat(),
            "end_at": event.end_at.isoformat(),
            "estimated_time_seconds": event.estimated_time_seconds,
            "actual_time_acc_seconds": event.actual_time_acc_seconds,
            "is_tracking": event.is_tracking,
            "color": event.color,
            "tracking_started_at": event.tracking_started_at.isoformat() if event.tracking_started_at else None,
            "deleted_at": event.deleted_at.isoformat() if event.deleted_at else None,
        }

    @staticmethod
    def _snapshot_capture(capture: InboxCapture | None) -> dict[str, Any] | None:
        if capture is None:
            return None
        return {
            "id": str(capture.id),
            "raw_content": capture.raw_content,
            "source": capture.source,
            "capture_type": capture.capture_type,
            "status": capture.status,
            "meta": capture.meta,
            "deleted_at": capture.deleted_at.isoformat() if capture.deleted_at else None,
        }

    @staticmethod
    def _require_string(value: Any, field_name: str) -> str:
        if isinstance(value, str) and value.strip():
            return value.strip()
        raise SyncMutationValidationError(f"Missing or invalid {field_name}")

    @staticmethod
    def _maybe_string(value: Any) -> str | None:
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

    @staticmethod
    def _require_uuid(value: Any, field_name: str) -> uuid.UUID:
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError as exc:
                raise SyncMutationValidationError(f"Invalid UUID for {field_name}") from exc
        raise SyncMutationValidationError(f"Missing UUID for {field_name}")

    @classmethod
    def _require_uuid_from_snapshot(
        cls,
        snapshot: dict[str, Any] | None,
        key: str,
        field_name: str,
    ) -> uuid.UUID:
        if snapshot is None:
            raise SyncMutationValidationError(f"Missing snapshot for {field_name}")
        return cls._require_uuid(snapshot.get(key), field_name)

    @staticmethod
    def _maybe_uuid(value: Any) -> uuid.UUID | None:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str) and value.strip():
            try:
                return uuid.UUID(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _maybe_int(value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            parsed = value if value.tzinfo else value.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        if isinstance(value, str) and value.strip():
            raw = value.strip().replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(raw)
            except ValueError:
                return None
            parsed = parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        return None

    @staticmethod
    def _ensure_time_window(start_at: datetime, end_at: datetime) -> tuple[datetime, datetime]:
        if end_at <= start_at:
            return start_at, start_at + timedelta(minutes=30)
        return start_at, end_at

    @staticmethod
    def _normalize_item_kind(value: Any) -> str:
        allowed = {"note", "objective", "task", "resource"}
        raw = str(value).strip().lower() if value is not None else "note"
        return raw if raw in allowed else "note"

    @staticmethod
    def _normalize_item_status(value: Any) -> str:
        allowed = {"draft", "captured", "processing", "ready", "applied", "archived"}
        raw = str(value).strip().lower() if value is not None else "draft"
        return raw if raw in allowed else "draft"

    @staticmethod
    def _normalize_event_color(value: Any) -> str:
        allowed = {"sky", "amber", "violet", "rose", "emerald", "orange"}
        raw = str(value).strip().lower() if value is not None else "sky"
        return raw if raw in allowed else "sky"
