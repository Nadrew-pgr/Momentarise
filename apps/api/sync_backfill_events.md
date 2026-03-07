# Sync Legacy Event Backfill

This task backfills historical `ai_events` payloads for Sync event types:

- `applied`
- `undone`

It normalizes legacy payloads to the current canonical shape used by web/mobile history hydration.

## Dry-run (default)

```bash
cd apps/api
PYTHONPATH=. uv run python -m src.worker.tasks.sync_backfill_events
```

## Apply changes

```bash
cd apps/api
PYTHONPATH=. uv run python -m src.worker.tasks.sync_backfill_events --apply
```

## Scope options

- Single run:

```bash
PYTHONPATH=. uv run python -m src.worker.tasks.sync_backfill_events --run-id <RUN_UUID>
```

- Single workspace:

```bash
PYTHONPATH=. uv run python -m src.worker.tasks.sync_backfill_events --workspace-id <WORKSPACE_UUID>
```

- Limit number of scanned runs:

```bash
PYTHONPATH=. uv run python -m src.worker.tasks.sync_backfill_events --limit-runs 100
```

## Celery task

Task name: `sync.backfill_events`

Queued on `capture_default` by default in `src/worker/celery_app.py`.
