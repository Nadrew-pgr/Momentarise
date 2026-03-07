from __future__ import annotations

import argparse
import asyncio
import json
import logging
import uuid
from types import SimpleNamespace
from typing import Any

from sqlalchemy import select

from src.core.database import async_session
from src.models.ai_event import AIEvent
from src.models.ai_run import AIRun
from src.sync.orchestrator import SyncOrchestrator
from src.worker.celery_app import celery_app

logger = logging.getLogger(__name__)
_worker_loop: asyncio.AbstractEventLoop | None = None


def _run_async_in_worker_loop(coro: Any) -> dict[str, Any]:
    global _worker_loop
    loop = _worker_loop
    if loop is None or loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        _worker_loop = loop
    return loop.run_until_complete(coro)


async def _backfill_sync_events(
    *,
    run_id: str | None = None,
    workspace_id: str | None = None,
    dry_run: bool = True,
    limit_runs: int | None = None,
) -> dict[str, Any]:
    run_uuid = uuid.UUID(run_id) if run_id else None
    workspace_uuid = uuid.UUID(workspace_id) if workspace_id else None

    scanned_runs = 0
    scanned_events = 0
    updated_events = 0
    skipped_runs = 0

    async with async_session() as db:
        run_query = (
            select(AIRun.id, AIRun.workspace_id)
            .join(AIEvent, AIEvent.run_id == AIRun.id)
            .where(
                AIRun.deleted_at.is_(None),
                AIEvent.deleted_at.is_(None),
                AIEvent.type.in_(("applied", "undone")),
            )
            .distinct()
            .order_by(AIRun.id.asc())
        )
        if run_uuid is not None:
            run_query = run_query.where(AIRun.id == run_uuid)
        if workspace_uuid is not None:
            run_query = run_query.where(AIRun.workspace_id == workspace_uuid)
        if isinstance(limit_runs, int) and limit_runs > 0:
            run_query = run_query.limit(limit_runs)

        run_rows = list((await db.execute(run_query)).all())

        for run_row in run_rows:
            scanned_runs += 1
            run_ns = SimpleNamespace(id=run_row.id)
            orchestrator = SyncOrchestrator(
                db=db,
                workspace_id=run_row.workspace_id,
                user_id=uuid.UUID(int=0),
            )
            try:
                replayed = await orchestrator.replay_events(run_ns, 0)  # type: ignore[arg-type]
            except Exception:
                skipped_runs += 1
                logger.exception("sync.backfill_events.run_failed run_id=%s", run_row.id)
                continue

            normalized_by_seq = {
                event.seq: event.payload
                for event in replayed
                if event.type in {"applied", "undone"} and isinstance(event.payload, dict)
            }

            events_result = await db.execute(
                select(AIEvent).where(
                    AIEvent.run_id == run_row.id,
                    AIEvent.type.in_(("applied", "undone")),
                    AIEvent.deleted_at.is_(None),
                )
            )
            run_events = list(events_result.scalars().all())
            scanned_events += len(run_events)

            for event_row in run_events:
                normalized_payload = normalized_by_seq.get(event_row.seq)
                if not isinstance(normalized_payload, dict):
                    continue
                current_payload = event_row.payload_json if isinstance(event_row.payload_json, dict) else {}
                if current_payload == normalized_payload:
                    continue
                updated_events += 1
                if not dry_run:
                    event_row.payload_json = normalized_payload

            if not dry_run:
                await db.commit()

    summary = {
        "dry_run": dry_run,
        "scanned_runs": scanned_runs,
        "scanned_events": scanned_events,
        "updated_events": updated_events,
        "skipped_runs": skipped_runs,
        "run_id": run_id,
        "workspace_id": workspace_id,
    }
    logger.info("sync.backfill_events.summary %s", summary)
    return summary


if celery_app is not None:

    @celery_app.task(  # type: ignore[misc]
        bind=True,
        name="sync.backfill_events",
        ignore_result=False,
    )
    def backfill_sync_events_task(
        self,
        *,
        run_id: str | None = None,
        workspace_id: str | None = None,
        dry_run: bool = True,
        limit_runs: int | None = None,
    ) -> dict[str, Any]:
        return _run_async_in_worker_loop(
            _backfill_sync_events(
                run_id=run_id,
                workspace_id=workspace_id,
                dry_run=dry_run,
                limit_runs=limit_runs,
            )
        )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill legacy Sync applied/undone event payloads.")
    parser.add_argument("--run-id", dest="run_id", default=None)
    parser.add_argument("--workspace-id", dest="workspace_id", default=None)
    parser.add_argument("--limit-runs", dest="limit_runs", type=int, default=None)
    parser.add_argument("--apply", action="store_true", help="Persist changes (default: dry-run).")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    result = asyncio.run(
        _backfill_sync_events(
            run_id=args.run_id,
            workspace_id=args.workspace_id,
            dry_run=not args.apply,
            limit_runs=args.limit_runs,
        )
    )
    print(json.dumps(result, ensure_ascii=True, indent=2))
