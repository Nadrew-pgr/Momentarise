import uuid

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sync_memory_chunk import SyncMemoryChunk


class RetrievalService:
    @staticmethod
    async def search(
        db: AsyncSession,
        *,
        workspace_id: uuid.UUID,
        query: str,
        limit: int = 5,
    ) -> list[dict]:
        q = query.strip()
        if not q:
            return []

        stmt: Select[tuple[SyncMemoryChunk]] = (
            select(SyncMemoryChunk)
            .where(
                SyncMemoryChunk.workspace_id == workspace_id,
                SyncMemoryChunk.deleted_at.is_(None),
                SyncMemoryChunk.chunk_text.ilike(f"%{q}%"),
            )
            .order_by(SyncMemoryChunk.updated_at.desc())
            .limit(limit)
        )
        rows = await db.execute(stmt)
        chunks = list(rows.scalars().all())
        return [
            {
                "doc_id": str(chunk.doc_id),
                "chunk_id": str(chunk.id),
                "chunk_text": chunk.chunk_text,
                "metadata": chunk.meta,
            }
            for chunk in chunks
        ]
