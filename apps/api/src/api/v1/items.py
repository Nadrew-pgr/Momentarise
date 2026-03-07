from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.ai_change import AIChange
from src.models.entity_link import EntityLink
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.item import (
    CreateEntityLinkRequest,
    EntityLinkOut,
    ItemActionResponse,
    ItemCreateRequest,
    ItemLinksResponse,
    ItemListItemOut,
    ItemListResponse,
    ItemOut,
    UpdateItemRequest,
)

router = APIRouter(tags=["items"])


async def _get_item_or_404(
    db: AsyncSession,
    workspace_id: UUID,
    item_id: UUID,
    include_deleted: bool = False,
) -> Item:
    clauses = [Item.id == item_id, Item.workspace_id == workspace_id]
    if not include_deleted:
        clauses.append(Item.deleted_at.is_(None))
    result = await db.execute(select(Item).where(*clauses))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    return item


@router.get("", response_model=ItemListResponse)
async def list_items(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemListResponse:
    result = await db.execute(
        select(Item)
        .where(
            Item.workspace_id == workspace.workspace_id,
            Item.deleted_at.is_(None),
        )
        .order_by(Item.updated_at.desc())
    )
    items = list(result.scalars().all())
    return ItemListResponse(items=[ItemListItemOut.model_validate(item) for item in items])


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    body: ItemCreateRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    if body.source_capture_id is not None:
        result = await db.execute(
            select(InboxCapture).where(
                InboxCapture.id == body.source_capture_id,
                InboxCapture.workspace_id == workspace.workspace_id,
                InboxCapture.deleted_at.is_(None),
            )
        )
        capture = result.scalar_one_or_none()
        if capture is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source capture not found",
            )

    item = Item(
        workspace_id=workspace.workspace_id,
        title=body.title,
        kind=body.kind,
        status=body.status,
        meta=body.metadata,
        source_capture_id=body.source_capture_id,
        blocks=body.blocks,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ItemOut.model_validate(item)


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    item = await _get_item_or_404(db, workspace.workspace_id, item_id)
    return ItemOut.model_validate(item)


@router.patch("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: UUID,
    body: UpdateItemRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    item = await _get_item_or_404(db, workspace.workspace_id, item_id)
    if body.blocks is not None:
        item.blocks = body.blocks
    if body.title is not None:
        item.title = body.title
    if body.kind is not None:
        item.kind = body.kind
    if body.status is not None:
        item.status = body.status
    if body.metadata is not None:
        item.meta = body.metadata
    await db.commit()
    await db.refresh(item)
    return ItemOut.model_validate(item)


@router.delete("/{item_id}", response_model=ItemActionResponse)
async def delete_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemActionResponse:
    item = await _get_item_or_404(db, workspace.workspace_id, item_id)
    before_payload = ItemOut.model_validate(item).model_dump(mode="json")

    item.deleted_at = datetime.now(timezone.utc)
    item.status = "archived"
    db.add(
        AIChange(
            workspace_id=workspace.workspace_id,
            actor_user_id=current_user.id,
            entity_type="item",
            entity_id=item.id,
            action="delete_item",
            reason="User requested deletion",
            before_payload=before_payload,
            after_payload={"deleted_at": item.deleted_at.isoformat()},
            undoable=True,
        )
    )
    await db.commit()
    return ItemActionResponse(item_id=item.id, status="deleted")


@router.post("/{item_id}/restore", response_model=ItemActionResponse)
async def restore_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemActionResponse:
    item = await _get_item_or_404(
        db,
        workspace.workspace_id,
        item_id,
        include_deleted=True,
    )
    if item.deleted_at is None:
        return ItemActionResponse(item_id=item.id, status="active")

    item.deleted_at = None
    if item.status == "archived":
        item.status = "ready"
    db.add(
        AIChange(
            workspace_id=workspace.workspace_id,
            actor_user_id=current_user.id,
            entity_type="item",
            entity_id=item.id,
            action="restore_item",
            reason="User undo delete",
            before_payload={"deleted": True},
            after_payload={"deleted": False},
            undoable=False,
        )
    )
    await db.commit()
    return ItemActionResponse(item_id=item.id, status="restored")


@router.get("/{item_id}/links", response_model=ItemLinksResponse)
async def get_item_links(
    item_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemLinksResponse:
    await _get_item_or_404(db, workspace.workspace_id, item_id)
    result = await db.execute(
        select(EntityLink).where(
            EntityLink.workspace_id == workspace.workspace_id,
            EntityLink.deleted_at.is_(None),
            or_(
                (EntityLink.from_entity_type == "item")
                & (EntityLink.from_entity_id == item_id),
                (EntityLink.to_entity_type == "item")
                & (EntityLink.to_entity_id == item_id),
            ),
        ).order_by(EntityLink.created_at.desc())
    )
    links = list(result.scalars().all())
    return ItemLinksResponse(links=[EntityLinkOut.model_validate(link) for link in links])


@router.post("/{item_id}/links", response_model=EntityLinkOut, status_code=status.HTTP_201_CREATED)
async def create_item_link(
    item_id: UUID,
    body: CreateEntityLinkRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EntityLinkOut:
    await _get_item_or_404(db, workspace.workspace_id, item_id)
    if body.to_entity_type == "item":
        await _get_item_or_404(db, workspace.workspace_id, body.to_entity_id)

    link = EntityLink(
        workspace_id=workspace.workspace_id,
        from_entity_type="item",
        from_entity_id=item_id,
        to_entity_type=body.to_entity_type,
        to_entity_id=body.to_entity_id,
        relation_type=body.relation_type,
        meta=body.metadata,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return EntityLinkOut.model_validate(link)


@router.delete("/{item_id}/links/{link_id}", response_model=ItemActionResponse)
async def delete_item_link(
    item_id: UUID,
    link_id: UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> ItemActionResponse:
    await _get_item_or_404(db, workspace.workspace_id, item_id)

    result = await db.execute(
        select(EntityLink).where(
            EntityLink.id == link_id,
            EntityLink.workspace_id == workspace.workspace_id,
            EntityLink.deleted_at.is_(None),
            or_(
                (EntityLink.from_entity_type == "item")
                & (EntityLink.from_entity_id == item_id),
                (EntityLink.to_entity_type == "item")
                & (EntityLink.to_entity_id == item_id),
            ),
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found",
        )

    link.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return ItemActionResponse(item_id=item_id, status="link_deleted")
