import hashlib
import json
import logging
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from time import perf_counter
from typing import Any, Literal

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.capture_tag import CaptureTag, CaptureTagLink
from src.models.capture_action_suggestion import CaptureActionSuggestion
from src.models.capture_artifact import CaptureArtifact
from src.models.capture_asset import CaptureAsset
from src.models.capture_job import CaptureJob
from src.models.inbox_capture import InboxCapture
from src.models.workspace import Workspace, WorkspaceMember
from src.services.capture_ai_service import analyze_capture_with_sync_agent
from src.services.maps_provider import estimate_travel_minutes
from src.services.ocr_provider import extract_text_from_file
from src.services.provider_config import (
    load_ocr_provider_config,
    load_summarization_provider_config,
    load_transcription_provider_config,
    load_vlm_provider_config,
)
from src.services.summarization_provider import summarize_text
from src.services.transcription_provider import transcribe_audio_file
from src.services.vlm_provider import analyze_visual_file

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


logger = logging.getLogger(__name__)


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


def _extract_month_count(text: str) -> int | None:
    match = re.search(r"\b(\d{1,2})\s*(?:months?|mois|ans?|years?)\b", text, flags=re.IGNORECASE)
    if not match:
        return None
    value = int(match.group(1))
    return value if value > 0 else None


def _extract_reference_start(text: str) -> datetime | None:
    now = datetime.now(UTC)

    numeric_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", text)
    if numeric_match:
        day = int(numeric_match.group(1))
        month = int(numeric_match.group(2))
        year = int(numeric_match.group(3)) if numeric_match.group(3) else now.year
        if year < 100:
            year += 2000
        try:
            parsed = datetime(year=year, month=month, day=day, tzinfo=UTC)
            if parsed < now - timedelta(days=366):
                parsed = parsed.replace(year=now.year)
            return parsed
        except ValueError:
            return None

    month_pattern = re.compile(
        r"\b(?:starting|start|from|since|à partir du|depuis)?\s*"
        r"(jan(?:uary|vier)?|feb(?:ruary|vrier)?|mar(?:ch|s)?|apr(?:il|il)?|may|mai|"
        r"jun(?:e|i?n)?|jul(?:y|let)?|aug(?:ust|out)?|sep(?:t(?:ember)?|tembre)?|"
        r"oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember|embre)?)\s+(\d{1,2})",
        flags=re.IGNORECASE,
    )
    named_match = month_pattern.search(text)
    if not named_match:
        return None

    month_token = named_match.group(1).lower()
    day = int(named_match.group(2))
    month_map = {
        "jan": 1,
        "january": 1,
        "janvier": 1,
        "feb": 2,
        "february": 2,
        "fevrier": 2,
        "vrier": 2,
        "mar": 3,
        "march": 3,
        "mars": 3,
        "apr": 4,
        "april": 4,
        "avril": 4,
        "may": 5,
        "mai": 5,
        "jun": 6,
        "june": 6,
        "juin": 6,
        "jul": 7,
        "july": 7,
        "juillet": 7,
        "aug": 8,
        "august": 8,
        "aout": 8,
        "out": 8,
        "sep": 9,
        "sept": 9,
        "september": 9,
        "septembre": 9,
        "oct": 10,
        "october": 10,
        "octobre": 10,
        "nov": 11,
        "november": 11,
        "novembre": 11,
        "dec": 12,
        "december": 12,
        "decembre": 12,
    }
    month = month_map.get(month_token)
    if month is None:
        for key, value in month_map.items():
            if month_token.startswith(key):
                month = value
                break
    if month is None:
        return None

    year = now.year
    try:
        parsed = datetime(year=year, month=month, day=day, tzinfo=UTC)
    except ValueError:
        return None
    if parsed < now - timedelta(days=7):
        parsed = parsed.replace(year=year + 1)
    return parsed


def _add_months(source: datetime, months: int) -> datetime:
    if months <= 0:
        return source
    month_index = (source.month - 1) + months
    year = source.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source.day, 28)
    return source.replace(year=year, month=month, day=day)


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

    has_contextual_task = False

    has_warranty_keyword = any(token in lowered for token in ["warranty", "garantie"])
    if has_warranty_keyword:
        duration_months = _extract_month_count(lowered) or 12
        reference_start = _extract_reference_start(text) or datetime.now(UTC)
        warranty_end_at = _add_months(reference_start, duration_months)
        reminder_at = warranty_end_at - timedelta(days=30)
        suggestions.append(
            ActionSuggestionInput(
                type="create_task",
                label="Set warranty reminder",
                confidence=0.88,
                requires_confirm=True,
                payload={
                    "title": "Review warranty before expiration",
                    "due_at": reminder_at.isoformat(),
                    "warranty_end_at": warranty_end_at.isoformat(),
                    "reminder_offset_days": 30,
                    "reason": "warranty_expiration",
                },
            )
        )
        has_contextual_task = True

    has_trial_keyword = any(
        token in lowered
        for token in [
            "free trial",
            "essai gratuit",
            "trial",
            "subscription",
            "abonnement",
            "renouvellement",
            "renewal",
        ]
    )
    if has_trial_keyword:
        duration_months = _extract_month_count(lowered) or 1
        trial_start = _extract_reference_start(text) or datetime.now(UTC)
        renewal_at = _add_months(trial_start, duration_months)
        reminder_offset = 14 if duration_months >= 6 else 7
        reminder_at = renewal_at - timedelta(days=reminder_offset)
        provider_label = "Perplexity Pro" if "perplexity" in lowered else "Subscription"
        payment_method = "PayPal" if "paypal" in lowered else None
        suggestions.append(
            ActionSuggestionInput(
                type="create_task",
                label="Set cancellation reminder",
                confidence=0.91,
                requires_confirm=True,
                payload={
                    "title": f"Cancel {provider_label} before renewal",
                    "due_at": reminder_at.isoformat(),
                    "renewal_at": renewal_at.isoformat(),
                    "payment_method": payment_method,
                    "reason": "trial_renewal",
                },
            )
        )
        has_contextual_task = True

    has_meeting_keyword = any(
        token in lowered for token in ["meeting", "réunion", "reunion", "rdv", "appointment"]
    )
    has_time = bool(re.search(r"\b([01]?\d|2[0-3])(?:h|:)?([0-5]\d)?\b", lowered))
    if has_meeting_keyword and has_time:
        start_at = _build_event_datetime(text)
        location = _extract_location(text)
        origin = None
        preferred_mode = settings.MAPS_DEFAULT_TRAVEL_MODE
        if isinstance(capture.meta, dict):
            if isinstance(capture.meta.get("home_location"), str):
                origin = str(capture.meta["home_location"])
            elif isinstance(capture.meta.get("current_location"), str):
                origin = str(capture.meta["current_location"])
            elif isinstance(capture.meta.get("habit_origin"), str):
                origin = str(capture.meta["habit_origin"])
            if isinstance(capture.meta.get("preferred_travel_mode"), str):
                preferred_mode = str(capture.meta["preferred_travel_mode"])

        travel = estimate_travel_minutes(
            destination=location,
            origin=origin,
            preferred_mode=preferred_mode,
        )
        payload = {
            "title": text.splitlines()[0][:120] or "Meeting",
            "start_at": start_at.isoformat(),
            "end_at": (start_at + timedelta(hours=1)).isoformat(),
            "location": location,
            "travel": {
                "provider": travel["provider"],
                "mode": travel["mode"],
                "estimated_duration_minutes": travel["estimated_duration_minutes"],
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

    if (not has_contextual_task) and any(token in lowered for token in ["todo", "task", "à faire", "a faire"]):
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

    # Stable ordering: highest confidence first and max 3, with dedupe.
    suggestions.sort(key=lambda s: s.confidence, reverse=True)
    deduped: list[ActionSuggestionInput] = []
    seen: set[str] = set()
    for suggestion in suggestions:
        signature = f"{suggestion.type}:{suggestion.label.strip().lower()}"
        if signature in seen:
            continue
        seen.add(signature)
        deduped.append(suggestion)

    selected = deduped[:3]
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


def _derive_category_and_tags(
    capture: InboxCapture,
    semantic_text: str,
    suggestions: list[ActionSuggestionInput],
) -> tuple[str, list[str]]:
    lowered = semantic_text.lower()
    tags: list[str] = []

    keyword_tags = {
        "invoice": "invoice",
        "facture": "invoice",
        "warranty": "warranty",
        "garantie": "warranty",
        "trial": "trial",
        "essai gratuit": "trial",
        "paypal": "paypal",
        "meeting": "meeting",
        "réunion": "meeting",
        "reunion": "meeting",
        "rdv": "meeting",
        "travel": "travel",
        "trajet": "travel",
        "subscription": "subscription",
        "abonnement": "subscription",
        "contract": "contract",
        "sla": "contract",
    }
    for token, tag in keyword_tags.items():
        if token in lowered and tag not in tags:
            tags.append(tag)

    for suggestion in suggestions:
        action_tag = suggestion.type.replace("create_", "")
        if action_tag not in tags:
            tags.append(action_tag)

    capture_type_tag = capture.capture_type.strip().lower()
    if capture_type_tag and capture_type_tag not in tags:
        tags.append(capture_type_tag)

    category = "general"
    if any(token in lowered for token in ["invoice", "facture", "payment", "paypal", "finance"]):
        category = "finance"
    elif any(token in lowered for token in ["meeting", "réunion", "reunion", "calendar", "agenda", "rdv"]):
        category = "schedule"
    elif any(token in lowered for token in ["email", "message", "reply", "répondre", "mail"]):
        category = "communication"
    elif any(token in lowered for token in ["travel", "trajet", "route", "maps", "location"]):
        category = "travel"
    elif capture.capture_type in {"photo", "file", "link"}:
        category = "document"
    elif capture.capture_type == "voice":
        category = "personal"

    return category, tags[:8]


def _append_pipeline_trace(
    capture: InboxCapture,
    *,
    stage: str,
    status: str,
    provider: str | None = None,
    model: str | None = None,
    duration_ms: float | None = None,
    fallback_used: bool | None = None,
    detail: str | None = None,
) -> None:
    current_meta = capture.meta if isinstance(capture.meta, dict) else {}
    trace = current_meta.get("pipeline_trace")
    if not isinstance(trace, list):
        trace = []
    trace.append(
        {
            "stage": stage,
            "status": status,
            "provider": provider,
            "model": model,
            "duration_ms": round(duration_ms or 0.0, 2) if duration_ms is not None else None,
            "fallback_used": fallback_used,
            "detail": detail,
            "at": datetime.now(UTC).isoformat(),
        }
    )
    capture.meta = {
        **current_meta,
        "pipeline_trace": trace[-40:],
    }


def _provider_overrides_from_raw(raw: object) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    out: dict[str, Any] = {}
    for key in ("transcription", "ocr", "vlm", "summarization"):
        value = raw.get(key)
        if isinstance(value, dict):
            out[key] = value
    return out


async def _resolve_capture_provider_overrides(
    db: AsyncSession,
    capture: InboxCapture,
) -> dict[str, Any]:
    workspace_defaults: dict[str, Any] = {}
    workspace_result = await db.execute(
        select(Workspace).where(
            Workspace.id == capture.workspace_id,
            Workspace.deleted_at.is_(None),
        )
    )
    workspace = workspace_result.scalar_one_or_none()
    if workspace is not None and isinstance(workspace.preferences, dict):
        ai_settings = workspace.preferences.get("ai")
        if isinstance(ai_settings, dict):
            workspace_defaults = _provider_overrides_from_raw(ai_settings.get("capture_provider_preferences"))

    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == capture.workspace_id,
            WorkspaceMember.user_id == capture.user_id,
            WorkspaceMember.deleted_at.is_(None),
        )
    )
    member = member_result.scalar_one_or_none()
    if member is None or not isinstance(member.preferences, dict):
        return workspace_defaults

    ai_preferences = member.preferences.get("ai")
    if not isinstance(ai_preferences, dict):
        return workspace_defaults

    user_overrides = _provider_overrides_from_raw(ai_preferences.get("capture_provider_preferences"))
    merged = dict(workspace_defaults)
    merged.update(user_overrides)
    return merged


async def _upsert_capture_tags(
    db: AsyncSession,
    capture: InboxCapture,
    *,
    tags: list[str],
    source: str,
) -> None:
    now = datetime.now(UTC)
    existing_links_result = await db.execute(
        select(CaptureTagLink).where(CaptureTagLink.capture_id == capture.id)
    )
    existing_links = list(existing_links_result.scalars().all())
    for link in existing_links:
        link.deleted_at = now

    if not tags:
        await db.flush()
        return

    normalized = []
    for item in tags:
        clean = item.strip().lower()
        if not clean or clean in normalized:
            continue
        normalized.append(clean)

    tag_rows: dict[str, CaptureTag] = {}
    if normalized:
        existing_tags_result = await db.execute(
            select(CaptureTag).where(
                CaptureTag.workspace_id == capture.workspace_id,
                CaptureTag.name.in_(normalized),
            )
        )
        for row in existing_tags_result.scalars().all():
            tag_rows[row.name] = row

    for tag_name in normalized:
        tag_row = tag_rows.get(tag_name)
        if tag_row is None:
            tag_row = CaptureTag(
                workspace_id=capture.workspace_id,
                name=tag_name,
                created_by_actor="sync" if source == "sync" else "user",
            )
            db.add(tag_row)
            await db.flush()
            tag_rows[tag_name] = tag_row
        elif tag_row.deleted_at is not None:
            tag_row.deleted_at = None

        existing_link = next((row for row in existing_links if row.tag_id == tag_row.id), None)
        if existing_link is not None:
            existing_link.deleted_at = None
            existing_link.confidence = 0.9 if source == "sync" else 1.0
            existing_link.source = source
        else:
            db.add(
                CaptureTagLink(
                    workspace_id=capture.workspace_id,
                    capture_id=capture.id,
                    tag_id=tag_row.id,
                    confidence=0.9 if source == "sync" else 1.0,
                    source=source,
                )
            )

    await db.flush()


def _build_artifacts_summary(
    *,
    capture: InboxCapture,
    semantic_text: str,
    artifacts: list[CaptureArtifact],
    analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    summary_text = ""
    risks: list[str] = []
    key_clauses: list[str] = []
    for artifact in artifacts:
        if not isinstance(artifact.content_json, dict):
            continue
        text_value = artifact.content_json.get("text")
        if isinstance(text_value, str) and text_value.strip():
            if artifact.artifact_type == "summary":
                summary_text = text_value.strip()
            if artifact.artifact_type in {"extracted_text", "transcript"}:
                snippet = text_value.strip().splitlines()[0][:180]
                if snippet and snippet not in key_clauses:
                    key_clauses.append(snippet)
        if artifact.artifact_type == "vlm_analysis":
            vlm_text = artifact.content_json.get("text")
            if isinstance(vlm_text, str) and "risk" in vlm_text.lower():
                risks.append(vlm_text.strip()[:180])

    if not summary_text:
        summary_text = semantic_text[:240] if semantic_text else (capture.raw_content or "")[:240]

    payload = {
        "headline": summary_text[:100],
        "summary": summary_text[:320],
        "key_clauses": key_clauses[:4],
        "potential_risks": risks[:3],
        "normalized_facts": {},
        "questions_if_needed": [],
    }
    if isinstance(analysis, dict):
        normalized_facts = analysis.get("normalized_facts")
        if isinstance(normalized_facts, dict):
            payload["normalized_facts"] = normalized_facts
        questions = analysis.get("questions_if_needed")
        if isinstance(questions, list):
            payload["questions_if_needed"] = [str(item).strip() for item in questions if str(item).strip()]
    return payload


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
    max_upload_bytes: int | None = None,
) -> CaptureAsset:
    data = await upload.read()
    if max_upload_bytes is not None and len(data) > max_upload_bytes:
        raise ValueError(
            f"Upload exceeds maximum allowed size ({max_upload_bytes} bytes)"
        )
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
        return ["ingest", "transcribe_or_extract", "preprocess", "suggest_actions"]
    if capture_type in {"photo", "file"}:
        return ["ingest", "transcribe_or_extract", "vlm_enrich", "preprocess", "suggest_actions"]
    return ["ingest", "preprocess", "suggest_actions"]


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
        if artifact.artifact_type in {
            "transcript",
            "extracted_text",
            "summary",
            "preprocess_summary",
            "preprocess",
            "vlm_analysis",
        }:
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


def _asset_path(asset: CaptureAsset, storage_dir: str) -> Path:
    return Path(storage_dir) / asset.storage_key


def _asset_file_name(asset: CaptureAsset) -> str:
    if isinstance(asset.meta, dict):
        value = asset.meta.get("file_name")
        if isinstance(value, str) and value.strip():
            return value
    return Path(asset.storage_key).name


def _new_artifact(
    *,
    capture: InboxCapture,
    artifact_type: str,
    payload: dict[str, Any],
) -> CaptureArtifact:
    raw_confidence = payload.get("confidence")
    confidence = float(raw_confidence) if isinstance(raw_confidence, (int, float)) else None
    return CaptureArtifact(
        workspace_id=capture.workspace_id,
        capture_id=capture.id,
        artifact_type=artifact_type,
        content_json={"text": str(payload.get("text", "")).strip()},
        provider=str(payload.get("provider", "heuristic")),
        model=str(payload.get("model", "v0")),
        confidence=confidence,
    )


async def process_capture_jobs(db: AsyncSession, capture: InboxCapture) -> None:
    result = await db.execute(
        select(CaptureJob).where(
            CaptureJob.capture_id == capture.id,
            CaptureJob.deleted_at.is_(None),
            CaptureJob.status.in_(["queued", "failed"]),
        )
        .order_by(CaptureJob.created_at.asc())
    )
    jobs = list(result.scalars().all())
    if not jobs:
        capture.status = "ready"
        return

    capture.status = "processing"
    assets = await _active_assets(db, capture)
    provider_overrides = await _resolve_capture_provider_overrides(db, capture)
    transcription_cfg = load_transcription_provider_config(provider_overrides)
    ocr_cfg = load_ocr_provider_config(provider_overrides)
    vlm_cfg = load_vlm_provider_config(provider_overrides)
    summarization_cfg = load_summarization_provider_config(provider_overrides)
    had_failure = False

    for job in jobs:
        start = perf_counter()
        job_started_at = datetime.now(UTC)
        provider_name = "heuristic"
        provider_model: str | None = None
        fallback_used: bool | None = None
        try:
            job.status = "processing"
            job.started_at = job_started_at
            job.attempt_count = (job.attempt_count or 0) + 1

            if job.job_type == "ingest":
                if assets and (not capture.raw_content.strip() or capture.raw_content.lower().startswith("capture:")):
                    file_name = _asset_file_name(assets[0])
                    capture.raw_content = f"{capture.capture_type.capitalize()} capture: {file_name}"
                current_meta = capture.meta if isinstance(capture.meta, dict) else {}
                capture.meta = {
                    **current_meta,
                    "ingested_at": datetime.now(UTC).isoformat(),
                }
                provider_name = "internal"
                provider_model = "ingest-v1"
                fallback_used = False
            elif job.job_type in {"transcribe_or_extract", "transcribe"}:
                source_asset = assets[0] if assets else None
                if source_asset is not None and capture.capture_type == "voice":
                    transcript_payload = transcribe_audio_file(
                        file_path=_asset_path(source_asset, settings.CAPTURE_STORAGE_DIR),
                        mime_type=source_asset.mime_type,
                        file_name=_asset_file_name(source_asset),
                        config=transcription_cfg,
                    )
                    provider_name = str(transcript_payload.get("provider", "heuristic"))
                    provider_model = str(transcript_payload.get("model", "v0"))
                    fallback_used = bool(transcript_payload.get("fallback_used", False))
                    db.add(
                        _new_artifact(
                            capture=capture,
                            artifact_type="transcript",
                            payload=transcript_payload,
                        )
                    )
                elif source_asset is not None:
                    extract_payload = extract_text_from_file(
                        file_path=_asset_path(source_asset, settings.CAPTURE_STORAGE_DIR),
                        mime_type=source_asset.mime_type,
                        file_name=_asset_file_name(source_asset),
                        config=ocr_cfg,
                    )
                    provider_name = str(extract_payload.get("provider", "heuristic"))
                    provider_model = str(extract_payload.get("model", "v0"))
                    fallback_used = bool(extract_payload.get("fallback_used", False))
                    db.add(
                        _new_artifact(
                            capture=capture,
                            artifact_type="extracted_text",
                            payload=extract_payload,
                        )
                    )
                else:
                    provider_name = "heuristic"
                    provider_model = "v0"
                    fallback_used = True
                    db.add(
                        _new_artifact(
                            capture=capture,
                            artifact_type="transcript"
                            if capture.capture_type == "voice"
                            else "extracted_text",
                            payload={
                                "text": (
                                    "Transcribed audio content."
                                    if capture.capture_type == "voice"
                                    else "Extracted text from document/image."
                                ),
                                "provider": "heuristic",
                                "model": "v0",
                                "confidence": 0.68,
                                "fallback_used": True,
                            },
                        )
                    )
            elif job.job_type == "extract":
                source_asset = assets[0] if assets else None
                extract_payload = (
                    extract_text_from_file(
                        file_path=_asset_path(source_asset, settings.CAPTURE_STORAGE_DIR),
                        mime_type=source_asset.mime_type if source_asset else None,
                        file_name=_asset_file_name(source_asset) if source_asset else None,
                        config=ocr_cfg,
                    )
                    if source_asset is not None
                    else {
                        "text": "Extracted text from document/image.",
                        "provider": "heuristic",
                        "model": "v0",
                        "confidence": 0.68,
                        "fallback_used": True,
                    }
                )
                provider_name = str(extract_payload.get("provider", "heuristic"))
                provider_model = str(extract_payload.get("model", "v0"))
                fallback_used = bool(extract_payload.get("fallback_used", False))
                db.add(_new_artifact(capture=capture, artifact_type="extracted_text", payload=extract_payload))
            elif job.job_type == "vlm_enrich":
                source_asset = assets[0] if assets else None
                if source_asset is None:
                    provider_name = "heuristic"
                    provider_model = "v0"
                    fallback_used = True
                    db.add(
                        _new_artifact(
                            capture=capture,
                            artifact_type="vlm_analysis",
                            payload={
                                "text": "No visual asset found for VLM enrichment.",
                                "provider": "heuristic",
                                "model": "v0",
                                "confidence": 0.5,
                                "fallback_used": True,
                            },
                        )
                    )
                else:
                    vlm_payload = analyze_visual_file(
                        file_path=_asset_path(source_asset, settings.CAPTURE_STORAGE_DIR),
                        mime_type=source_asset.mime_type,
                        file_name=_asset_file_name(source_asset),
                        config=vlm_cfg,
                    )
                    provider_name = str(vlm_payload.get("provider", "heuristic"))
                    provider_model = str(vlm_payload.get("model", "v0"))
                    fallback_used = bool(vlm_payload.get("fallback_used", False))
                    db.add(_new_artifact(capture=capture, artifact_type="vlm_analysis", payload=vlm_payload))
            elif job.job_type in {"preprocess", "summarize"}:
                artifacts = await _active_artifacts(db, capture)
                semantic_text = _semantic_text(capture, artifacts)
                summary_payload = summarize_text(
                    text=semantic_text,
                    config=summarization_cfg,
                )
                provider_name = str(summary_payload.get("provider", "heuristic"))
                provider_model = str(summary_payload.get("model", "v0"))
                fallback_used = bool(summary_payload.get("fallback_used", False))
                db.add(
                    _new_artifact(
                        capture=capture,
                        artifact_type="summary" if job.job_type == "summarize" else "preprocess_summary",
                        payload=summary_payload,
                    )
                )
            elif job.job_type == "suggest_actions":
                artifacts = await _active_artifacts(db, capture)
                semantic_text = _semantic_text(capture, artifacts)
                analysis: dict[str, Any] | None = None
                if settings.CAPTURE_AI_SUGGESTIONS_ENABLED:
                    suggestions = _build_action_suggestions(capture, semantic_text)
                    provider_name = "heuristic"
                    provider_model = "heuristic-v2"
                    fallback_used = False

                    analysis = await analyze_capture_with_sync_agent(
                        semantic_text=semantic_text,
                        capture_type=capture.capture_type,
                        metadata=capture.meta if isinstance(capture.meta, dict) else {},
                    )
                    if isinstance(analysis, dict):
                        provider_name = str(analysis.get("provider", "sync"))
                        provider_model = str(analysis.get("model", settings.SYNC_MODEL_BALANCED))
                        fallback_used = False
                        ai_candidates_raw = analysis.get("action_candidates")
                        ai_candidates: list[ActionSuggestionInput] = []
                        if isinstance(ai_candidates_raw, list):
                            for idx, candidate in enumerate(ai_candidates_raw):
                                if not isinstance(candidate, dict):
                                    continue
                                action_type = candidate.get("type")
                                label = candidate.get("label")
                                if action_type not in {
                                    "create_event",
                                    "create_task",
                                    "create_item",
                                    "draft_reply",
                                    "pay_invoice",
                                    "summarize",
                                    "review",
                                }:
                                    continue
                                if not isinstance(label, str) or not label.strip():
                                    continue
                                confidence_value = candidate.get("confidence")
                                confidence = (
                                    float(confidence_value)
                                    if isinstance(confidence_value, (int, float))
                                    else 0.7
                                )
                                ai_candidates.append(
                                    ActionSuggestionInput(
                                        type=action_type,  # type: ignore[arg-type]
                                        label=label.strip(),
                                        confidence=max(0.0, min(1.0, confidence)),
                                        requires_confirm=bool(candidate.get("requires_confirm", True)),
                                        payload=(
                                            candidate.get("payload")
                                            if isinstance(candidate.get("payload"), dict)
                                            else {}
                                        ),
                                    )
                                )

                        merged: list[ActionSuggestionInput] = []
                        seen: set[str] = set()
                        for candidate in ai_candidates + suggestions:
                            signature = f"{candidate.type}:{candidate.label.strip().lower()}"
                            if signature in seen:
                                continue
                            seen.add(signature)
                            merged.append(candidate)
                        merged.sort(key=lambda item: item.confidence, reverse=True)
                        suggestions = merged[:3] if merged else suggestions
                        if analysis:
                            db.add(
                                CaptureArtifact(
                                    workspace_id=capture.workspace_id,
                                    capture_id=capture.id,
                                    artifact_type="capture_analysis",
                                    content_json={
                                        "text": json.dumps(
                                            {
                                                "normalized_facts": analysis.get("normalized_facts", {}),
                                                "questions_if_needed": analysis.get("questions_if_needed", []),
                                            },
                                            ensure_ascii=False,
                                        ),
                                    },
                                    provider=str(analysis.get("provider", "sync")),
                                    model=str(analysis.get("model", settings.SYNC_MODEL_BALANCED)),
                                    confidence=0.76,
                                )
                            )
                else:
                    provider_name = "disabled"
                    provider_model = "disabled"
                    fallback_used = False
                    suggestions = [
                        ActionSuggestionInput(
                            type="review",
                            label="Review",
                            confidence=1.0,
                            requires_confirm=False,
                            payload={"reason": "Suggestions disabled by feature flag"},
                        )
                    ]
                await _upsert_suggestions(db, capture, suggestions)
                category, tags = _derive_category_and_tags(capture, semantic_text, suggestions)
                capture.category = category
                await _upsert_capture_tags(
                    db,
                    capture,
                    tags=tags,
                    source="sync",
                )
                current_meta = capture.meta if isinstance(capture.meta, dict) else {}
                capture.meta = {
                    **current_meta,
                    "artifacts_summary": _build_artifacts_summary(
                        capture=capture,
                        semantic_text=semantic_text,
                        artifacts=artifacts,
                        analysis=analysis if settings.CAPTURE_SYNC_SUBAGENT_ENABLED else None,
                    ),
                }
            else:
                provider_name = "internal"
                provider_model = "noop"
                fallback_used = False

            job.status = "completed"
            job.finished_at = datetime.now(UTC)
            job.last_error = None
            duration_ms = round((perf_counter() - start) * 1000, 2)
            _append_pipeline_trace(
                capture,
                stage=job.job_type,
                status="completed",
                provider=provider_name,
                model=provider_model,
                duration_ms=duration_ms,
                fallback_used=fallback_used,
            )
            logger.info(
                "capture.job.completed capture_id=%s job_id=%s job_type=%s provider=%s duration_ms=%s",
                str(capture.id),
                str(job.id),
                job.job_type,
                provider_name,
                duration_ms,
            )
        except Exception as exc:  # pragma: no cover - safety net
            had_failure = True
            job.status = "failed"
            job.finished_at = datetime.now(UTC)
            job.last_error = str(exc)[:500]
            duration_ms = round((perf_counter() - start) * 1000, 2)
            _append_pipeline_trace(
                capture,
                stage=job.job_type,
                status="failed",
                provider=provider_name,
                model=provider_model,
                duration_ms=duration_ms,
                fallback_used=fallback_used,
                detail=job.last_error,
            )
            logger.exception(
                "capture.job.failed capture_id=%s job_id=%s job_type=%s duration_ms=%s error=%s",
                str(capture.id),
                str(job.id),
                job.job_type,
                duration_ms,
                job.last_error,
            )

    capture.status = "failed" if had_failure else "ready"
