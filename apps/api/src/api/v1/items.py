from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_workspace
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.item import ItemOut, UpdateItemRequest

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.workspace_id == workspace.workspace_id,
            Item.deleted_at.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    return ItemOut.model_validate(item)


@router.patch("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: UUID,
    body: UpdateItemRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.workspace_id == workspace.workspace_id,
            Item.deleted_at.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    if body.blocks is not None:
        item.blocks = body.blocks
    if body.title is not None:
        item.title = body.title
    await db.commit()
    await db.refresh(item)
    return ItemOut.model_validate(item)
