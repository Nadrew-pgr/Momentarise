import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.entity_link import EntityLink
from src.models.event import Event
from src.models.event_content_snapshot import EventContentSnapshot
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.business_block import BUSINESS_BLOCK_SCHEMA_VERSION, BUSINESS_BLOCK_TYPES
from src.schemas.event import (
    EventAnalyticsMetrics,
    EventAnalyticsResponse,
    EventCreateRequest,
    EventContentResponse,
    EventContentUpdateRequest,
    EventDeleteResponse,
    EventsRangeResponse,
    EventUpdateRequest,
    StartTrackingResponse,
    StopTrackingResponse,
)
from src.schemas.timeline import EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _event_to_out(event: Event) -> EventOut:
    return EventOut(
        id=event.id,
        item_id=event.item_id,
        title=event.item.title if event.item else "",
        description=event.description,
        start_at=event.start_at,
        end_at=event.end_at,
        all_day=event.all_day,
        location=event.location,
        estimated_time_seconds=event.estimated_time_seconds,
        actual_time_acc_seconds=event.actual_time_acc_seconds,
        is_tracking=event.is_tracking,
        color=event.color,
        tracking_started_at=event.tracking_started_at,
        updated_at=event.updated_at,
        rrule=event.rrule,
        parent_event_id=event.parent_event_id,
        series_id=event.series_id,
        project_id=event.project_id,
    )


def _extract_legacy_text(node: object) -> str:
    if isinstance(node, list):
        return " ".join(_extract_legacy_text(item) for item in node).strip()
    if not isinstance(node, dict):
        return ""
    own_text = str(node.get("text")).strip() if isinstance(node.get("text"), str) else ""
    content = node.get("content")
    children = _extract_legacy_text(content) if isinstance(content, list) else ""
    return " ".join(part for part in [own_text, children] if part).strip()


def _is_business_block_entry(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    block_type = value.get("type")
    payload = value.get("payload")
    return isinstance(block_type, str) and block_type in BUSINESS_BLOCK_TYPES and isinstance(payload, dict)


def _legacy_blocks_to_business_blocks(raw_blocks: list[object]) -> list[dict]:
    if not raw_blocks:
        return []
    compact = " ".join(_extract_legacy_text(raw_blocks).split()).strip()
    return [
        {
            "id": "legacy-text-1",
            "type": "text_block",
            "label": "Legacy",
            "payload": {
                "text": compact,
                "editor_doc": raw_blocks if isinstance(raw_blocks, list) else [],
            },
        }
    ]


def _normalize_to_business_blocks(raw_blocks: list[object]) -> list[dict]:
    if raw_blocks and all(_is_business_block_entry(entry) for entry in raw_blocks):
        return [dict(entry) for entry in raw_blocks if isinstance(entry, dict)]
    return _legacy_blocks_to_business_blocks(raw_blocks)


def _extract_text_from_business_block(block: dict) -> str:
    payload = block.get("payload")
    if not isinstance(payload, dict):
        return ""

    block_type = str(block.get("type") or "")
    if block_type == "text_block":
        text = str(payload.get("text") or "").strip()
        if text:
            return text
        editor_doc = payload.get("editor_doc")
        if isinstance(editor_doc, list):
            return _extract_legacy_text(editor_doc)
        return ""
    if block_type == "checklist_block":
        items = payload.get("items")
        if isinstance(items, list):
            texts = []
            for item in items:
                if isinstance(item, dict) and isinstance(item.get("text"), str):
                    texts.append(item["text"])
            return " ".join(texts).strip()
    if block_type == "table_block":
        rows = payload.get("rows")
        if isinstance(rows, list):
            texts = []
            for row in rows:
                if isinstance(row, list):
                    texts.append(" ".join(str(cell) for cell in row))
            return " ".join(texts).strip()
    if block_type == "key_value_block":
        pairs = payload.get("pairs")
        if isinstance(pairs, list):
            texts = []
            for pair in pairs:
                if isinstance(pair, dict):
                    k = str(pair.get("key") or "").strip()
                    v = str(pair.get("value") or "").strip()
                    if k or v:
                        texts.append(f"{k} {v}".strip())
            return " ".join(texts).strip()
    if block_type == "set_block":
        exercise = str(payload.get("exercise_name") or "").strip()
        sets = payload.get("sets")
        if not isinstance(sets, list):
            return exercise
        parts = [exercise] if exercise else []
        for set_item in sets:
            if not isinstance(set_item, dict):
                continue
            reps = set_item.get("reps")
            load = set_item.get("load")
            rpe = set_item.get("rpe")
            part = " ".join(
                piece
                for piece in [
                    f"{reps} reps" if reps is not None else "",
                    f"{load} load" if load is not None else "",
                    f"RPE {rpe}" if rpe is not None else "",
                ]
                if piece
            ).strip()
            if part:
                parts.append(part)
        return " ".join(parts).strip()
    if block_type == "inbox_block":
        refs = payload.get("capture_refs")
        if isinstance(refs, list):
            parts = []
            for ref in refs:
                if not isinstance(ref, dict):
                    continue
                title = str(ref.get("title") or "").strip()
                capture_id = str(ref.get("capture_id") or "").strip()
                if title:
                    parts.append(title)
                elif capture_id:
                    parts.append(capture_id)
            return " ".join(parts).strip()
    return _extract_legacy_text(payload)


def _extract_blocks_text(raw_blocks: list[object]) -> str:
    business_blocks = _normalize_to_business_blocks(raw_blocks)
    return " ".join(
        part for part in (_extract_text_from_business_block(block) for block in business_blocks) if part
    ).strip()


def _collect_inbox_ref_ids(blocks: list[dict]) -> set[uuid.UUID]:
    ids: set[uuid.UUID] = set()
    for block in blocks:
        if str(block.get("type") or "") != "inbox_block":
            continue
        payload = block.get("payload")
        if not isinstance(payload, dict):
            continue
        refs = payload.get("capture_refs")
        if not isinstance(refs, list):
            continue
        for ref in refs:
            if not isinstance(ref, dict):
                continue
            capture_id_raw = ref.get("capture_id")
            if not isinstance(capture_id_raw, str):
                continue
            try:
                ids.add(uuid.UUID(capture_id_raw))
            except ValueError:
                continue
    return ids


async def _sync_inbox_links_for_item(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    item_id: uuid.UUID,
    blocks: list[dict],
) -> None:
    target_capture_ids = _collect_inbox_ref_ids(blocks)

    existing_capture_ids: set[uuid.UUID] = set()
    if target_capture_ids:
        existing_capture_rows = await db.execute(
            select(InboxCapture.id).where(
                InboxCapture.workspace_id == workspace_id,
                InboxCapture.deleted_at.is_(None),
                InboxCapture.id.in_(target_capture_ids),
            )
        )
        existing_capture_ids = set(existing_capture_rows.scalars().all())
    valid_target_ids = target_capture_ids.intersection(existing_capture_ids)

    links_result = await db.execute(
        select(EntityLink).where(
            EntityLink.workspace_id == workspace_id,
            EntityLink.deleted_at.is_(None),
            EntityLink.from_entity_type == "item",
            EntityLink.from_entity_id == item_id,
            EntityLink.relation_type == "references",
            EntityLink.to_entity_type == "capture",
        )
    )
    existing_links = list(links_result.scalars().all())
    existing_map = {link.to_entity_id: link for link in existing_links}
    existing_ids = set(existing_map.keys())

    for capture_id in valid_target_ids - existing_ids:
        db.add(
            EntityLink(
                workspace_id=workspace_id,
                from_entity_type="item",
                from_entity_id=item_id,
                to_entity_type="capture",
                to_entity_id=capture_id,
                relation_type="references",
                meta={"source": "inbox_block"},
            )
        )

    now = datetime.now(timezone.utc)
    for stale_id in existing_ids - valid_target_ids:
        stale_link = existing_map.get(stale_id)
        if stale_link is not None:
            stale_link.deleted_at = now


def _to_metrics_payload(blocks: list[dict]) -> dict[str, float | int]:
    completion_done = 0
    completion_total = 0
    effort_seconds = 0
    training_volume = 0.0
    energy_values: list[float] = []
    inbox_refs_count = 0

    for block in blocks:
        block_type = str(block.get("type") or "")
        payload = block.get("payload")
        if not isinstance(payload, dict):
            continue

        if block_type == "checklist_block":
            items = payload.get("items")
            if isinstance(items, list):
                completion_total += len(items)
                completion_done += sum(
                    1
                    for item in items
                    if isinstance(item, dict) and bool(item.get("done"))
                )
        elif block_type == "task_block":
            completion_total += 1
            status_value = str(payload.get("status") or "").lower()
            if status_value in {"done", "completed", "complete"}:
                completion_done += 1
        elif block_type == "set_block":
            sets = payload.get("sets")
            if isinstance(sets, list):
                completion_total += len(sets)
                completion_done += sum(
                    1
                    for item in sets
                    if isinstance(item, dict) and bool(item.get("done"))
                )
                for item in sets:
                    if not isinstance(item, dict):
                        continue
                    reps_value = item.get("reps")
                    load_value = item.get("load")
                    try:
                        reps = float(reps_value) if reps_value is not None else 0.0
                        load = float(load_value) if load_value is not None else 0.0
                    except (TypeError, ValueError):
                        reps = 0.0
                        load = 0.0
                    training_volume += reps * load
        elif block_type == "timer_block":
            elapsed = payload.get("elapsed_sec")
            try:
                effort_seconds += int(elapsed) if elapsed is not None else 0
            except (TypeError, ValueError):
                pass
        elif block_type == "scale_block":
            value = payload.get("value")
            try:
                if value is not None:
                    energy_values.append(float(value))
            except (TypeError, ValueError):
                pass
        elif block_type == "inbox_block":
            refs = payload.get("capture_refs")
            if isinstance(refs, list):
                inbox_refs_count += len(refs)

    completion_rate = (completion_done / completion_total) if completion_total > 0 else 0.0
    energy_score = sum(energy_values) / len(energy_values) if energy_values else 0.0
    block_count = len(blocks)
    return {
        "completion_rate": completion_rate,
        "effort_seconds": max(0, int(effort_seconds)),
        "training_volume": float(training_volume),
        "energy_score": float(energy_score),
        "inbox_refs_count": max(0, int(inbox_refs_count)),
        "block_count": max(0, int(block_count)),
    }


def _metrics_to_model(payload: dict[str, float | int]) -> EventAnalyticsMetrics:
    return EventAnalyticsMetrics(
        completion_rate=float(payload.get("completion_rate", 0.0)),
        effort_seconds=int(payload.get("effort_seconds", 0)),
        training_volume=float(payload.get("training_volume", 0.0)),
        energy_score=float(payload.get("energy_score", 0.0)),
        inbox_refs_count=int(payload.get("inbox_refs_count", 0)),
        block_count=int(payload.get("block_count", 0)),
    )


async def _upsert_today_snapshot(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    event_id: uuid.UUID,
    item_id: uuid.UUID,
    metrics: dict[str, float | int],
) -> None:
    today = date.today()
    result = await db.execute(
        select(EventContentSnapshot).where(
            EventContentSnapshot.workspace_id == workspace_id,
            EventContentSnapshot.event_id == event_id,
            EventContentSnapshot.snapshot_date == today,
            EventContentSnapshot.deleted_at.is_(None),
        )
    )
    snapshot = result.scalar_one_or_none()
    if snapshot is None:
        snapshot = EventContentSnapshot(
            workspace_id=workspace_id,
            event_id=event_id,
            item_id=item_id,
            snapshot_date=today,
        )
        db.add(snapshot)

    snapshot.item_id = item_id
    snapshot.completion_rate = float(metrics.get("completion_rate", 0.0))
    snapshot.effort_seconds = int(metrics.get("effort_seconds", 0))
    snapshot.training_volume = float(metrics.get("training_volume", 0.0))
    snapshot.energy_score = float(metrics.get("energy_score", 0.0))
    snapshot.inbox_refs_count = int(metrics.get("inbox_refs_count", 0))
    snapshot.block_count = int(metrics.get("block_count", 0))
    snapshot.metrics_json = metrics


async def _aggregate_snapshot_metrics(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    event_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> dict[str, float | int]:
    result = await db.execute(
        select(EventContentSnapshot).where(
            EventContentSnapshot.workspace_id == workspace_id,
            EventContentSnapshot.event_id == event_id,
            EventContentSnapshot.deleted_at.is_(None),
            EventContentSnapshot.snapshot_date >= start_date,
            EventContentSnapshot.snapshot_date <= end_date,
        )
    )
    rows = list(result.scalars().all())
    if not rows:
        return {
            "completion_rate": 0.0,
            "effort_seconds": 0,
            "training_volume": 0.0,
            "energy_score": 0.0,
            "inbox_refs_count": 0,
            "block_count": 0,
        }

    return {
        "completion_rate": float(
            sum(row.completion_rate for row in rows) / len(rows)
        ),
        "effort_seconds": int(sum(row.effort_seconds for row in rows)),
        "training_volume": float(sum(row.training_volume for row in rows)),
        "energy_score": float(sum(row.energy_score for row in rows) / len(rows)),
        "inbox_refs_count": int(sum(row.inbox_refs_count for row in rows)),
        "block_count": int(round(sum(row.block_count for row in rows) / len(rows))),
    }


def _resolve_period_ranges(period: str, today: date) -> tuple[date, date, date, date]:
    if period == "week":
        current_start = today - timedelta(days=6)
        current_end = today
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=6)
        return current_start, current_end, previous_start, previous_end
    if period == "month":
        current_start = today - timedelta(days=29)
        current_end = today
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=29)
        return current_start, current_end, previous_start, previous_end
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="period must be one of week|month",
    )


def _resolve_estimated_time_seconds(
    start_at: datetime,
    end_at: datetime,
    estimated_time_seconds: int | None,
) -> int:
    if estimated_time_seconds is not None:
        return estimated_time_seconds
    return max(0, int((end_at - start_at).total_seconds()))


def _validate_date_order(start_at: datetime, end_at: datetime) -> None:
    if end_at <= start_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_at must be greater than start_at",
        )


async def _get_item(
    item_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> Item | None:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.workspace_id == workspace_id,
            Item.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _get_event(
    event_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
    include_deleted: bool = False,
) -> Event | None:
    clauses = [Event.id == event_id, Event.workspace_id == workspace_id]
    if not include_deleted:
        clauses.append(Event.deleted_at.is_(None))

    result = await db.execute(select(Event).where(*clauses).options(selectinload(Event.item)))
    return result.scalar_one_or_none()


@router.get("", response_model=EventsRangeResponse)
async def list_events(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
    from_date: date = Query(..., alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., alias="to", description="End date (YYYY-MM-DD)"),
) -> EventsRangeResponse:
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'to' must be greater than or equal to 'from'",
        )

    range_start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
    range_end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
    result = await db.execute(
        select(Event)
        .where(
            Event.workspace_id == workspace.workspace_id,
            Event.deleted_at.is_(None),
            Event.end_at >= range_start,
            Event.start_at <= range_end,
        )
        .options(selectinload(Event.item))
        .order_by(Event.start_at.asc())
    )
    events = list(result.scalars().all())
    return EventsRangeResponse(events=[_event_to_out(event) for event in events])


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventOut:
    _validate_date_order(body.start_at, body.end_at)

    if body.item_id is not None:
        item = await _get_item(body.item_id, workspace.workspace_id, db)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if item.title != body.title:
            item.title = body.title
    else:
        item = Item(
            workspace_id=workspace.workspace_id,
            title=body.title,
            kind="task",
            status="ready",
            meta={"source": "timeline"},
            blocks=[],
        )
        db.add(item)
        await db.flush()

    event = Event(
        workspace_id=workspace.workspace_id,
        item_id=item.id,
        description=body.description,
        start_at=body.start_at,
        end_at=body.end_at,
        all_day=body.all_day,
        location=body.location,
        color=body.color or "sky",
        estimated_time_seconds=_resolve_estimated_time_seconds(
            body.start_at,
            body.end_at,
            body.estimated_time_seconds,
        ),
        rrule=body.rrule,
        series_id=body.series_id,
        project_id=body.project_id,
    )
    db.add(event)
    await db.commit()

    reloaded = await _get_event(event.id, workspace.workspace_id, db)
    if reloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_to_out(reloaded)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: uuid.UUID,
    body: EventUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventOut:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if (
        body.last_known_updated_at is not None
        and event.updated_at is not None
        and event.updated_at != body.last_known_updated_at
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict: event was modified on another device",
        )

    next_start_at = body.start_at or event.start_at
    next_end_at = body.end_at or event.end_at
    _validate_date_order(next_start_at, next_end_at)

    event.start_at = next_start_at
    event.end_at = next_end_at
    if body.estimated_time_seconds is not None:
        event.estimated_time_seconds = body.estimated_time_seconds
    if body.title is not None and event.item is not None:
        event.item.title = body.title
    if "description" in body.model_fields_set:
        event.description = body.description
    if body.all_day is not None:
        event.all_day = body.all_day
    if "location" in body.model_fields_set:
        event.location = body.location
    if body.color is not None:
        event.color = body.color
    if "rrule" in body.model_fields_set:
        event.rrule = body.rrule
    if "series_id" in body.model_fields_set:
        event.series_id = body.series_id
    if "project_id" in body.model_fields_set:
        event.project_id = body.project_id

    await db.commit()
    reloaded = await _get_event(event.id, workspace.workspace_id, db)
    if reloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_to_out(reloaded)


@router.get("/{event_id}/content", response_model=EventContentResponse)
async def get_event_content(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventContentResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    item = event.item or await _get_item(event.item_id, workspace.workspace_id, db)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    raw_blocks = item.blocks if isinstance(item.blocks, list) else []
    blocks_payload = _normalize_to_business_blocks(raw_blocks)
    return EventContentResponse(
        event_id=event.id,
        item_id=item.id,
        schema_version=BUSINESS_BLOCK_SCHEMA_VERSION,
        blocks=blocks_payload,
    )


@router.patch("/{event_id}/content", response_model=EventContentResponse)
async def update_event_content(
    event_id: uuid.UUID,
    body: EventContentUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventContentResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    item = event.item or await _get_item(event.item_id, workspace.workspace_id, db)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    blocks_payload = [block.model_dump(mode="json") for block in body.blocks]
    item.blocks = blocks_payload
    item_meta = dict(item.meta) if isinstance(item.meta, dict) else {}
    item_meta["schema_version"] = BUSINESS_BLOCK_SCHEMA_VERSION
    item.meta = item_meta

    await _sync_inbox_links_for_item(
        db,
        workspace_id=workspace.workspace_id,
        item_id=item.id,
        blocks=blocks_payload,
    )

    metrics_payload = _to_metrics_payload(blocks_payload)
    await _upsert_today_snapshot(
        db,
        workspace_id=workspace.workspace_id,
        event_id=event.id,
        item_id=item.id,
        metrics=metrics_payload,
    )

    await db.commit()
    await db.refresh(item)

    return EventContentResponse(
        event_id=event.id,
        item_id=item.id,
        schema_version=BUSINESS_BLOCK_SCHEMA_VERSION,
        blocks=blocks_payload,
    )


@router.get("/{event_id}/analytics", response_model=EventAnalyticsResponse)
async def get_event_analytics(
    event_id: uuid.UUID,
    period: Literal["week", "month"] = Query(default="week"),
    compare: Literal["previous"] = Query(default="previous"),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventAnalyticsResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    current_start, current_end, previous_start, previous_end = _resolve_period_ranges(
        period=period,
        today=date.today(),
    )
    current_metrics_payload = await _aggregate_snapshot_metrics(
        db,
        workspace_id=workspace.workspace_id,
        event_id=event.id,
        start_date=current_start,
        end_date=current_end,
    )
    previous_metrics_payload = await _aggregate_snapshot_metrics(
        db,
        workspace_id=workspace.workspace_id,
        event_id=event.id,
        start_date=previous_start,
        end_date=previous_end,
    )

    delta_payload: dict[str, float | int] = {
        "completion_rate": float(current_metrics_payload["completion_rate"])
        - float(previous_metrics_payload["completion_rate"]),
        "effort_seconds": int(current_metrics_payload["effort_seconds"])
        - int(previous_metrics_payload["effort_seconds"]),
        "training_volume": float(current_metrics_payload["training_volume"])
        - float(previous_metrics_payload["training_volume"]),
        "energy_score": float(current_metrics_payload["energy_score"])
        - float(previous_metrics_payload["energy_score"]),
        "inbox_refs_count": int(current_metrics_payload["inbox_refs_count"])
        - int(previous_metrics_payload["inbox_refs_count"]),
        "block_count": int(current_metrics_payload["block_count"])
        - int(previous_metrics_payload["block_count"]),
    }

    return EventAnalyticsResponse(
        event_id=event.id,
        period=period,
        compare=compare,
        current=_metrics_to_model(current_metrics_payload),
        previous=_metrics_to_model(previous_metrics_payload),
        delta=_metrics_to_model(delta_payload),
        current_start=current_start,
        current_end=current_end,
        previous_start=previous_start,
        previous_end=previous_end,
    )


@router.delete("/{event_id}", response_model=EventDeleteResponse)
async def delete_event(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EventDeleteResponse:
    event = await _get_event(event_id, workspace.workspace_id, db, include_deleted=True)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.deleted_at is not None:
        return EventDeleteResponse(id=event.id, deleted=True)

    event.deleted_at = datetime.now(timezone.utc)
    event.is_tracking = False
    event.tracking_started_at = None
    await db.commit()
    return EventDeleteResponse(id=event.id, deleted=True)


@router.post("/{event_id}/start", response_model=StartTrackingResponse)
async def start_tracking(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> StartTrackingResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    now = datetime.now(timezone.utc)
    if event.is_tracking:
        return StartTrackingResponse(
            event_id=event.id,
            is_tracking=True,
            tracking_started_at=event.tracking_started_at or now,
        )

    event.is_tracking = True
    event.tracking_started_at = now
    await db.commit()
    await db.refresh(event)

    return StartTrackingResponse(
        event_id=event.id,
        is_tracking=True,
        tracking_started_at=event.tracking_started_at,
    )


@router.post("/{event_id}/stop", response_model=StopTrackingResponse)
async def stop_tracking(
    event_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> StopTrackingResponse:
    event = await _get_event(event_id, workspace.workspace_id, db)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not event.is_tracking:
        return StopTrackingResponse(
            event_id=event.id,
            is_tracking=False,
            actual_time_acc=event.actual_time_acc_seconds,
        )

    now = datetime.now(timezone.utc)
    elapsed = int((now - (event.tracking_started_at or now)).total_seconds())
    event.actual_time_acc_seconds += max(0, elapsed)
    event.is_tracking = False
    event.tracking_started_at = None
    await db.commit()
    await db.refresh(event)

    return StopTrackingResponse(
        event_id=event.id,
        is_tracking=False,
        actual_time_acc=event.actual_time_acc_seconds,
    )
