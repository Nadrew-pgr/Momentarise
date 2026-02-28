import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.capture_action_suggestion import CaptureActionSuggestion
from src.models.capture_artifact import CaptureArtifact
from src.models.capture_asset import CaptureAsset
from src.models.capture_job import CaptureJob
from src.models.inbox_capture import InboxCapture

CaptureActionType = Literal[
    "create_event",
    "create_task",
    "create_item",
    "draft_reply",
    "pay_invoice",
    "summarize",
    "review",
]


@dataclass(slots=True)
class ActionSuggestionInput:
    type: CaptureActionType
    label: str
    confidence: float
    requires_confirm: bool
    payload: dict


def _build_event_datetime(text: str) -> datetime:
    now = datetime.now(UTC)
    hour_match = re.search(r"\b([01]?\d|2[0-3])(?:h|:)?([0-5]\d)?\b", text.lower())
    hour = 13
    minute = 0
    if hour_match:
        hour = int(hour_match.group(1))
        minute = int(hour_match.group(2) or 0)
    start = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if start <= now:
        start = start + timedelta(days=1)
    # "lundi"/"monday" basic support.
    lowered = text.lower()
    weekday_map = {
        "lundi": 0,
        "monday": 0,
        "mardi": 1,
        "tuesday": 1,
        "mercredi": 2,
        "wednesday": 2,
        "jeudi": 3,
        "thursday": 3,
        "vendredi": 4,
        "friday": 4,
        "samedi": 5,
        "saturday": 5,
        "dimanche": 6,
        "sunday": 6,
    }
    for token, weekday in weekday_map.items():
        if token in lowered:
            days_ahead = (weekday - start.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            start = start + timedelta(days=days_ahead)
            break
    return start


def _extract_location(text: str) -> str | None:
    # "a|à <location>" heuristic.
    match = re.search(r"\b(?:a|à)\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9\-\s']{3,80})", text, flags=re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip(" .,-")


def _build_action_suggestions(capture: InboxCapture, semantic_text: str) -> list[ActionSuggestionInput]:
    text = semantic_text.strip()
    lowered = text.lower()
    suggestions: list[ActionSuggestionInput] = []

    if any(token in lowered for token in ["invoice", "facture", "amount due", "paiement"]):
        suggestions.append(
            ActionSuggestionInput(
                type="pay_invoice",
                label="Pay invoice",
                confidence=0.92,
                requires_confirm=True,
                payload={"source": "invoice", "cta": "pay"},
            )
        )

    has_meeting_keyword = any(
        token in lowered for token in ["meeting", "réunion", "reunion", "rdv", "appointment"]
    )
    has_time = bool(re.search(r"\b([01]?\d|2[0-3])(?:h|:)?([0-5]\d)?\b", lowered))
    if has_meeting_keyword and has_time:
        start_at = _build_event_datetime(text)
        location = _extract_location(text)
        payload = {
            "title": text.splitlines()[0][:120] or "Meeting",
            "start_at": start_at.isoformat(),
            "end_at": (start_at + timedelta(hours=1)).isoformat(),
            "location": location,
            "travel": {
                "provider": "google_maps",
                "mode": "driving",
                "estimated_duration_minutes": 25,
                "buffer_minutes": 10,
            },
        }
        suggestions.append(
            ActionSuggestionInput(
                type="create_event",
                label="Schedule meeting",
                confidence=0.93,
                requires_confirm=True,
                payload=payload,
            )
        )

    if capture.capture_type in {"voice", "photo", "file", "link"}:
        suggestions.append(
            ActionSuggestionInput(
                type="summarize",
                label="Summarize",
                confidence=0.75,
                requires_confirm=False,
                payload={"source_text": text[:4000]},
            )
        )

    if any(token in lowered for token in ["message", "reply", "répondre", "respond"]):
        suggestions.append(
            ActionSuggestionInput(
                type="draft_reply",
                label="Draft reply",
                confidence=0.74,
                requires_confirm=True,
                payload={"tone": "neutral"},
            )
        )

    if any(token in lowered for token in ["todo", "task", "à faire", "a faire"]):
        suggestions.append(
            ActionSuggestionInput(
                type="create_task",
                label="Create task",
                confidence=0.78,
                requires_confirm=True,
                payload={"title": text.splitlines()[0][:120] or "New task"},
            )
        )

    if not suggestions:
        suggestions.append(
            ActionSuggestionInput(
                type="review",
                label="Review",
                confidence=1.0,
                requires_confirm=False,
                payload={"reason": "No high-confidence automation found"},
            )
        )

    # Stable ordering: highest confidence first and max 3.
    suggestions.sort(key=lambda s: s.confidence, reverse=True)
    selected = suggestions[:3]
    # Ensure Review fallback exists if every action is weak.
    if selected and selected[0].confidence < 0.6:
        selected = [
            ActionSuggestionInput(
                type="review",
                label="Review",
                confidence=1.0,
                requires_confirm=False,
                payload={"reason": "Low-confidence suggestions"},
            )
        ] + selected[:2]
    return selected[:3]


def _storage_path(storage_dir: str, key: str) -> Path:
    base = Path(storage_dir)
    base.mkdir(parents=True, exist_ok=True)
    return base / key


async def store_upload_asset(
    *,
    db: AsyncSession,
    storage_dir: str,
    workspace_id: uuid.UUID,
    capture: InboxCapture,
    upload: UploadFile,
    kind: str,
) -> CaptureAsset:
    data = await upload.read()
    checksum = hashlib.sha256(data).hexdigest()
    ext = Path(upload.filename or "").suffix
    storage_key = f"{capture.id}/{uuid.uuid4().hex}{ext}"
    path = _storage_path(storage_dir, storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

    asset = CaptureAsset(
        workspace_id=workspace_id,
        capture_id=capture.id,
        kind=kind,
        storage_key=storage_key,
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=len(data),
        checksum=checksum,
        meta={
            "file_name": upload.filename,
            "content_type": upload.content_type,
        },
    )
    db.add(asset)
    await db.flush()
    return asset


def job_types_for_capture(capture_type: str) -> list[str]:
    if capture_type == "voice":
        return ["transcribe", "summarize", "suggest_actions"]
    if capture_type in {"photo", "file"}:
        return ["extract", "summarize", "suggest_actions"]
    return ["summarize", "suggest_actions"]


async def enqueue_default_jobs(db: AsyncSession, capture: InboxCapture) -> list[CaptureJob]:
    jobs: list[CaptureJob] = []
    for job_type in job_types_for_capture(capture.capture_type):
        job = CaptureJob(
            workspace_id=capture.workspace_id,
            capture_id=capture.id,
            job_type=job_type,
            status="queued",
            scheduled_at=datetime.now(UTC),
        )
        db.add(job)
        jobs.append(job)
    await db.flush()
    return jobs


async def _active_assets(db: AsyncSession, capture: InboxCapture) -> list[CaptureAsset]:
    result = await db.execute(
        select(CaptureAsset).where(
            CaptureAsset.capture_id == capture.id,
            CaptureAsset.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


async def _active_artifacts(db: AsyncSession, capture: InboxCapture) -> list[CaptureArtifact]:
    result = await db.execute(
        select(CaptureArtifact).where(
            CaptureArtifact.capture_id == capture.id,
            CaptureArtifact.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


def _semantic_text(capture: InboxCapture, artifacts: list[CaptureArtifact]) -> str:
    chunks: list[str] = []
    if capture.raw_content:
        chunks.append(capture.raw_content)
    for artifact in artifacts:
        if artifact.artifact_type in {"transcript", "extracted_text", "summary"}:
            value = artifact.content_json.get("text") if isinstance(artifact.content_json, dict) else None
            if isinstance(value, str) and value.strip():
                chunks.append(value.strip())
    return "\n".join(chunks).strip()


async def _upsert_suggestions(
    db: AsyncSession,
    capture: InboxCapture,
    suggestions: list[ActionSuggestionInput],
) -> list[CaptureActionSuggestion]:
    now = datetime.now(UTC)
    result = await db.execute(
        select(CaptureActionSuggestion).where(
            CaptureActionSuggestion.capture_id == capture.id,
            CaptureActionSuggestion.deleted_at.is_(None),
        )
    )
    for current in result.scalars().all():
        current.deleted_at = now

    rows: list[CaptureActionSuggestion] = []
    for idx, suggestion in enumerate(suggestions):
        row = CaptureActionSuggestion(
            workspace_id=capture.workspace_id,
            capture_id=capture.id,
            action_key=f"{suggestion.type}_{idx}",
            action_type=suggestion.type,
            label=suggestion.label,
            confidence=suggestion.confidence,
            requires_confirm=suggestion.requires_confirm,
            is_primary=(idx == 0),
            payload_json=suggestion.payload,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    return rows


async def process_capture_jobs(db: AsyncSession, capture: InboxCapture) -> None:
    result = await db.execute(
        select(CaptureJob).where(
            CaptureJob.capture_id == capture.id,
            CaptureJob.deleted_at.is_(None),
            CaptureJob.status.in_(["queued", "failed"]),
        )
    )
    jobs = list(result.scalars().all())
    if not jobs:
        capture.status = "ready"
        return

    capture.status = "processing"
    assets = await _active_assets(db, capture)
    now = datetime.now(UTC)
    had_failure = False

    for job in jobs:
        try:
            job.status = "processing"
            job.started_at = now
            job.attempt_count = (job.attempt_count or 0) + 1

            if job.job_type == "transcribe":
                transcript = "Transcribed audio content."
                if assets and assets[0].meta.get("file_name"):
                    transcript = f"Transcribed from {assets[0].meta.get('file_name')}."
                db.add(
                    CaptureArtifact(
                        workspace_id=capture.workspace_id,
                        capture_id=capture.id,
                        artifact_type="transcript",
                        content_json={"text": transcript},
                        provider="heuristic",
                        model="v0",
                        confidence=0.72,
                    )
                )
            elif job.job_type == "extract":
                extracted = "Extracted text from document/image."
                if assets and assets[0].meta.get("file_name"):
                    extracted = f"Extracted text from {assets[0].meta.get('file_name')}."
                db.add(
                    CaptureArtifact(
                        workspace_id=capture.workspace_id,
                        capture_id=capture.id,
                        artifact_type="extracted_text",
                        content_json={"text": extracted},
                        provider="heuristic",
                        model="v0",
                        confidence=0.68,
                    )
                )
            elif job.job_type == "summarize":
                artifacts = await _active_artifacts(db, capture)
                semantic_text = _semantic_text(capture, artifacts)
                summary = semantic_text.splitlines()[0][:240] if semantic_text else "Review this capture."
                db.add(
                    CaptureArtifact(
                        workspace_id=capture.workspace_id,
                        capture_id=capture.id,
                        artifact_type="summary",
                        content_json={"text": summary},
                        provider="heuristic",
                        model="v0",
                        confidence=0.65,
                    )
                )
            elif job.job_type == "suggest_actions":
                artifacts = await _active_artifacts(db, capture)
                semantic_text = _semantic_text(capture, artifacts)
                suggestions = _build_action_suggestions(capture, semantic_text)
                await _upsert_suggestions(db, capture, suggestions)

            job.status = "completed"
            job.finished_at = datetime.now(UTC)
            job.last_error = None
        except Exception as exc:  # pragma: no cover - safety net
            had_failure = True
            job.status = "failed"
            job.finished_at = datetime.now(UTC)
            job.last_error = str(exc)[:500]

    capture.status = "failed" if had_failure else "ready"
