from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.workspace import Workspace
from src.models.workspace import WorkspaceMember
from src.schemas.preferences import (
    AiPreferencesResponse,
    AiPreferencesUpdateRequest,
    CalendarPreferencesResponse,
    CalendarPreferencesUpdateRequest,
)

router = APIRouter(prefix="/preferences", tags=["preferences"])

DEFAULT_START_HOUR = 8
DEFAULT_END_HOUR = 24
DEFAULT_AI_MODE = "proposal_only"
DEFAULT_AUTO_APPLY_THRESHOLD = 0.90
DEFAULT_MAX_ACTIONS = 3


def _default_capture_provider_preferences() -> dict:
    return {
        "transcription": {
            "provider": settings.CAPTURE_TRANSCRIPTION_PROVIDER
            if settings.CAPTURE_TRANSCRIPTION_PROVIDER in {"mistral", "openai", "heuristic"}
            else "mistral",
            "model": settings.CAPTURE_TRANSCRIPTION_MODEL,
            "language": "auto",
            "fallback_enabled": True,
        },
        "ocr": {
            "provider": settings.CAPTURE_OCR_PROVIDER
            if settings.CAPTURE_OCR_PROVIDER in {"mistral", "openai", "heuristic"}
            else "mistral",
            "model": settings.CAPTURE_OCR_MODEL,
            "language": None,
            "fallback_enabled": True,
        },
        "vlm": {
            "provider": settings.CAPTURE_VLM_PROVIDER
            if settings.CAPTURE_VLM_PROVIDER in {"mistral", "openai", "heuristic"}
            else "mistral",
            "model": settings.CAPTURE_VLM_MODEL,
            "language": None,
            "fallback_enabled": True,
        },
    }


def _merge_provider_setting(raw: object, fallback: dict, *, allow_language: bool) -> dict:
    if not isinstance(raw, dict):
        return dict(fallback)
    provider = raw.get("provider")
    model = raw.get("model")
    language = raw.get("language")
    fallback_enabled = raw.get("fallback_enabled")
    return {
        "provider": provider if provider in {"mistral", "openai", "heuristic"} else fallback["provider"],
        "model": str(model).strip() if isinstance(model, str) and model.strip() else fallback["model"],
        "language": (
            (str(language).strip() if isinstance(language, str) and str(language).strip() else fallback.get("language"))
            if allow_language
            else None
        ),
        "fallback_enabled": (
            bool(fallback_enabled)
            if isinstance(fallback_enabled, bool)
            else bool(fallback.get("fallback_enabled", True))
        ),
    }


def _merge_provider_preferences(raw: object, fallback: dict | None = None) -> dict:
    base = dict(fallback or _default_capture_provider_preferences())
    return {
        "transcription": _merge_provider_setting(
            raw.get("transcription") if isinstance(raw, dict) else None,
            base["transcription"],
            allow_language=True,
        ),
        "ocr": _merge_provider_setting(
            raw.get("ocr") if isinstance(raw, dict) else None,
            base["ocr"],
            allow_language=False,
        ),
        "vlm": _merge_provider_setting(
            raw.get("vlm") if isinstance(raw, dict) else None,
            base["vlm"],
            allow_language=False,
        ),
    }


async def _read_workspace_provider_defaults(db: AsyncSession, workspace_id) -> dict:
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
    )
    workspace = result.scalar_one_or_none()
    fallback = _default_capture_provider_preferences()
    if workspace is None or not isinstance(workspace.preferences, dict):
        return fallback
    ai_defaults = workspace.preferences.get("ai")
    if not isinstance(ai_defaults, dict):
        return fallback
    return _merge_provider_preferences(ai_defaults.get("capture_provider_preferences"), fallback)


def _read_calendar_preferences(member: WorkspaceMember) -> tuple[int, int]:
    start_hour = DEFAULT_START_HOUR
    end_hour = DEFAULT_END_HOUR

    if isinstance(member.preferences, dict):
        calendar = member.preferences.get("calendar")
        if isinstance(calendar, dict):
            start = calendar.get("start_hour")
            end = calendar.get("end_hour")
            if isinstance(start, int) and 0 <= start <= 23:
                start_hour = start
            if isinstance(end, int) and 1 <= end <= 24:
                end_hour = end

    if end_hour <= start_hour:
        start_hour = DEFAULT_START_HOUR
        end_hour = DEFAULT_END_HOUR

    return start_hour, end_hour


def _to_response(member: WorkspaceMember) -> CalendarPreferencesResponse:
    start_hour, end_hour = _read_calendar_preferences(member)
    return CalendarPreferencesResponse(
        start_hour=start_hour,
        end_hour=end_hour,
        updated_at=member.updated_at,
    )


def _read_ai_preferences(member: WorkspaceMember, workspace_defaults: dict | None = None) -> tuple[str, float, int, dict]:
    mode = DEFAULT_AI_MODE
    threshold = DEFAULT_AUTO_APPLY_THRESHOLD
    max_actions = DEFAULT_MAX_ACTIONS
    provider_preferences = _merge_provider_preferences(None, workspace_defaults)

    if isinstance(member.preferences, dict):
        ai_prefs = member.preferences.get("ai")
        if isinstance(ai_prefs, dict):
            value = ai_prefs.get("mode")
            if value in {"proposal_only", "auto_apply"}:
                mode = value
            raw_threshold = ai_prefs.get("auto_apply_threshold")
            if isinstance(raw_threshold, (int, float)):
                threshold = max(0.0, min(1.0, float(raw_threshold)))
            raw_max = ai_prefs.get("max_actions_per_capture")
            if isinstance(raw_max, int):
                max_actions = max(1, min(3, raw_max))
            provider_preferences = _merge_provider_preferences(
                ai_prefs.get("capture_provider_preferences"),
                provider_preferences,
            )

    return mode, threshold, max_actions, provider_preferences


def _to_ai_response(member: WorkspaceMember, workspace_defaults: dict | None = None) -> AiPreferencesResponse:
    mode, threshold, max_actions, provider_preferences = _read_ai_preferences(
        member,
        workspace_defaults,
    )
    return AiPreferencesResponse(
        mode=mode,  # type: ignore[arg-type]
        auto_apply_threshold=threshold,
        max_actions_per_capture=max_actions,
        capture_provider_preferences=provider_preferences,  # type: ignore[arg-type]
        updated_at=member.updated_at,
    )


@router.get("/calendar", response_model=CalendarPreferencesResponse)
async def get_calendar_preferences(
    workspace: WorkspaceMember = Depends(get_current_workspace),
) -> CalendarPreferencesResponse:
    return _to_response(workspace)


@router.patch("/calendar", response_model=CalendarPreferencesResponse)
async def update_calendar_preferences(
    body: CalendarPreferencesUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> CalendarPreferencesResponse:
    if body.end_hour <= body.start_hour:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_hour must be greater than start_hour",
        )

    if (
        body.last_known_updated_at is not None
        and workspace.updated_at is not None
        and workspace.updated_at != body.last_known_updated_at
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict: preferences were modified on another device",
        )

    preferences = dict(workspace.preferences or {})
    calendar_preferences = dict(preferences.get("calendar") or {})
    calendar_preferences["start_hour"] = body.start_hour
    calendar_preferences["end_hour"] = body.end_hour
    preferences["calendar"] = calendar_preferences

    workspace.preferences = preferences
    await db.commit()
    await db.refresh(workspace)
    return _to_response(workspace)


@router.get("/ai", response_model=AiPreferencesResponse)
async def get_ai_preferences(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> AiPreferencesResponse:
    workspace_defaults = await _read_workspace_provider_defaults(db, workspace.workspace_id)
    return _to_ai_response(workspace, workspace_defaults)


@router.patch("/ai", response_model=AiPreferencesResponse)
async def update_ai_preferences(
    body: AiPreferencesUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> AiPreferencesResponse:
    if (
        body.last_known_updated_at is not None
        and workspace.updated_at is not None
        and workspace.updated_at != body.last_known_updated_at
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict: preferences were modified on another device",
        )

    preferences = dict(workspace.preferences or {})
    ai_preferences = dict(preferences.get("ai") or {})
    ai_preferences["mode"] = body.mode
    ai_preferences["auto_apply_threshold"] = body.auto_apply_threshold
    ai_preferences["max_actions_per_capture"] = body.max_actions_per_capture
    workspace_defaults = await _read_workspace_provider_defaults(db, workspace.workspace_id)
    _, _, _, current_provider_preferences = _read_ai_preferences(workspace, workspace_defaults)
    ai_preferences["capture_provider_preferences"] = (
        body.capture_provider_preferences.model_dump(mode="json")
        if body.capture_provider_preferences is not None
        else current_provider_preferences
    )
    preferences["ai"] = ai_preferences

    workspace.preferences = preferences
    await db.commit()
    await db.refresh(workspace)
    return _to_ai_response(workspace, workspace_defaults)
