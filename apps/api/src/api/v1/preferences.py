from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.agent_profile import AgentProfile
from src.models.workspace import Workspace
from src.models.workspace import WorkspaceMember
from src.schemas.preferences import (
    AiPreferencesResponse,
    AiPreferencesUpdateRequest,
    CalendarPreferencesResponse,
    CalendarPreferencesUpdateRequest,
)

router = APIRouter(tags=["preferences"])

DEFAULT_START_HOUR = 8
DEFAULT_END_HOUR = 24
DEFAULT_AI_MODE = "proposal_only"
DEFAULT_AUTO_APPLY_THRESHOLD = 0.90
DEFAULT_MAX_ACTIONS = 3
DEFAULT_CAPTURE_RESEARCH_POLICY = "proposal_only"


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


def _read_ai_preferences(
    member: WorkspaceMember,
    workspace_defaults: dict | None = None,
) -> tuple[str, float, int, dict, UUID | None, dict, UUID | None, dict, str, str, str | None]:
    mode = DEFAULT_AI_MODE
    threshold = DEFAULT_AUTO_APPLY_THRESHOLD
    max_actions = DEFAULT_MAX_ACTIONS
    provider_preferences = _merge_provider_preferences(None, workspace_defaults)
    capture_default_agent_id: UUID | None = None
    capture_agent_routing_rules: dict = {}
    editor_default_agent_id: UUID | None = None
    editor_agent_routing_rules: dict = {}
    capture_research_policy = DEFAULT_CAPTURE_RESEARCH_POLICY
    sync_model = "auto"
    sync_reasoning_level: str | None = None

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
            raw_default_agent = ai_prefs.get("capture_default_agent_id")
            if isinstance(raw_default_agent, str) and raw_default_agent.strip():
                try:
                    capture_default_agent_id = UUID(raw_default_agent.strip())
                except ValueError:
                    capture_default_agent_id = None
            raw_routing_rules = ai_prefs.get("capture_agent_routing_rules")
            if isinstance(raw_routing_rules, dict):
                capture_agent_routing_rules = raw_routing_rules
            raw_editor_default_agent = ai_prefs.get("editor_default_agent_id")
            if isinstance(raw_editor_default_agent, str) and raw_editor_default_agent.strip():
                try:
                    editor_default_agent_id = UUID(raw_editor_default_agent.strip())
                except ValueError:
                    editor_default_agent_id = None
            raw_editor_routing_rules = ai_prefs.get("editor_agent_routing_rules")
            if isinstance(raw_editor_routing_rules, dict):
                editor_agent_routing_rules = raw_editor_routing_rules
            raw_research_policy = ai_prefs.get("capture_research_policy")
            if raw_research_policy in {"proposal_only", "auto_if_safe"}:
                capture_research_policy = raw_research_policy
            raw_sync_model = ai_prefs.get("sync_model")
            if isinstance(raw_sync_model, str) and raw_sync_model.strip():
                sync_model = raw_sync_model.strip()
            raw_reasoning = ai_prefs.get("sync_reasoning_level")
            if isinstance(raw_reasoning, str) and raw_reasoning.strip():
                sync_reasoning_level = raw_reasoning.strip()

    return (
        mode,
        threshold,
        max_actions,
        provider_preferences,
        capture_default_agent_id,
        capture_agent_routing_rules,
        editor_default_agent_id,
        editor_agent_routing_rules,
        capture_research_policy,
        sync_model,
        sync_reasoning_level,
    )


def _to_ai_response(member: WorkspaceMember, workspace_defaults: dict | None = None) -> AiPreferencesResponse:
    (
        mode,
        threshold,
        max_actions,
        provider_preferences,
        capture_default_agent_id,
        capture_agent_routing_rules,
        editor_default_agent_id,
        editor_agent_routing_rules,
        capture_research_policy,
        sync_model,
        sync_reasoning_level,
    ) = _read_ai_preferences(
        member,
        workspace_defaults,
    )
    return AiPreferencesResponse(
        mode=mode,  # type: ignore[arg-type]
        auto_apply_threshold=threshold,
        max_actions_per_capture=max_actions,
        capture_provider_preferences=provider_preferences,  # type: ignore[arg-type]
        capture_default_agent_id=capture_default_agent_id,
        capture_agent_routing_rules=capture_agent_routing_rules,
        editor_default_agent_id=editor_default_agent_id,
        editor_agent_routing_rules=editor_agent_routing_rules,
        capture_research_policy=capture_research_policy,  # type: ignore[arg-type]
        sync_model=sync_model,
        sync_reasoning_level=sync_reasoning_level,
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
    (
        _,
        _,
        _,
        current_provider_preferences,
        current_default_agent_id,
        current_routing_rules,
        current_editor_default_agent_id,
        current_editor_routing_rules,
        current_research_policy,
        _,  # sync_model — handled separately below
        _,  # sync_reasoning_level — handled separately below
    ) = _read_ai_preferences(workspace, workspace_defaults)
    ai_preferences["capture_provider_preferences"] = (
        body.capture_provider_preferences.model_dump(mode="json")
        if body.capture_provider_preferences is not None
        else current_provider_preferences
    )

    if "capture_default_agent_id" in body.model_fields_set:
        default_agent_id = body.capture_default_agent_id
    else:
        default_agent_id = current_default_agent_id
    if default_agent_id is not None:
        result = await db.execute(
            select(AgentProfile).where(
                AgentProfile.id == default_agent_id,
                AgentProfile.workspace_id == workspace.workspace_id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_active.is_(True),
            )
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="capture_default_agent_id must reference an active workspace agent",
            )
    ai_preferences["capture_default_agent_id"] = (
        str(default_agent_id) if default_agent_id is not None else None
    )

    if "editor_default_agent_id" in body.model_fields_set:
        editor_default_agent_id = body.editor_default_agent_id
    else:
        editor_default_agent_id = current_editor_default_agent_id
    if editor_default_agent_id is not None:
        result = await db.execute(
            select(AgentProfile).where(
                AgentProfile.id == editor_default_agent_id,
                AgentProfile.workspace_id == workspace.workspace_id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_active.is_(True),
            )
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="editor_default_agent_id must reference an active workspace agent",
            )
    ai_preferences["editor_default_agent_id"] = (
        str(editor_default_agent_id) if editor_default_agent_id is not None else None
    )

    if "capture_agent_routing_rules" in body.model_fields_set:
        ai_preferences["capture_agent_routing_rules"] = (
            body.capture_agent_routing_rules
            if isinstance(body.capture_agent_routing_rules, dict)
            else {}
        )
    else:
        ai_preferences["capture_agent_routing_rules"] = current_routing_rules

    if "editor_agent_routing_rules" in body.model_fields_set:
        ai_preferences["editor_agent_routing_rules"] = (
            body.editor_agent_routing_rules
            if isinstance(body.editor_agent_routing_rules, dict)
            else {}
        )
    else:
        ai_preferences["editor_agent_routing_rules"] = current_editor_routing_rules

    if "capture_research_policy" in body.model_fields_set:
        ai_preferences["capture_research_policy"] = (
            body.capture_research_policy
            if body.capture_research_policy is not None
            else DEFAULT_CAPTURE_RESEARCH_POLICY
        )
    else:
        ai_preferences["capture_research_policy"] = current_research_policy

    if "sync_model" in body.model_fields_set and body.sync_model is not None:
        ai_preferences["sync_model"] = body.sync_model.strip() or "auto"
    if "sync_reasoning_level" in body.model_fields_set:
        ai_preferences["sync_reasoning_level"] = body.sync_reasoning_level

    preferences["ai"] = ai_preferences

    workspace.preferences = preferences
    await db.commit()
    await db.refresh(workspace)
    return _to_ai_response(workspace, workspace_defaults)
