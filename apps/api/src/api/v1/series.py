import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.series import Series
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.series import SeriesCreateRequest, SeriesOut, SeriesUpdateRequest

router = APIRouter()


@router.post("", response_model=SeriesOut, status_code=status.HTTP_201_CREATED)
async def create_series(
    request: SeriesCreateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    series = Series(
        workspace_id=workspace.workspace_id,
        project_id=request.project_id,
        title=request.title,
        rrule_template=request.rrule_template,
    )
    db.add(series)
    await db.commit()
    await db.refresh(series)
    return series


@router.get("", response_model=list[SeriesOut])
async def list_series(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    project_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Series).where(Series.workspace_id == workspace.workspace_id)
    if project_id:
        query = query.where(Series.project_id == project_id)
        
    result = await db.execute(query)
    series_list = result.scalars().all()
    return list(series_list)


@router.patch("/{series_id}", response_model=SeriesOut)
async def update_series(
    series_id: uuid.UUID,
    request: SeriesUpdateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Series).where(
        Series.id == series_id, Series.workspace_id == workspace.workspace_id
    )
    result = await db.execute(query)
    series = result.scalar_one_or_none()
    if not series:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Series not found"
        )

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(series, field, value)

    await db.commit()
    await db.refresh(series)
    return series


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_series(
    series_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Series).where(
        Series.id == series_id, Series.workspace_id == workspace.workspace_id
    )
    result = await db.execute(query)
    series = result.scalar_one_or_none()
    if not series:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Series not found"
        )
    
    await db.delete(series)
    await db.commit()
