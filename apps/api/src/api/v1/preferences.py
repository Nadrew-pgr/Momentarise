from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.workspace import WorkspaceMember
from src.schemas.preferences import (
    CalendarPreferencesResponse,
    CalendarPreferencesUpdateRequest,
)

router = APIRouter(prefix="/preferences", tags=["preferences"])

DEFAULT_START_HOUR = 8
DEFAULT_END_HOUR = 24


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
