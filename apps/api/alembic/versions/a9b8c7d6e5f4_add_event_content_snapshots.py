"""add_event_content_snapshots

Revision ID: a9b8c7d6e5f4
Revises: e8b7c9d0f1a2
Create Date: 2026-03-06 19:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a9b8c7d6e5f4"
down_revision: Union[str, Sequence[str], None] = "e8b7c9d0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_content_snapshots",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column("item_id", sa.UUID(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("completion_rate", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("effort_seconds", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("training_volume", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("energy_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("inbox_refs_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("block_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "metrics",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "event_id",
            "snapshot_date",
            name="uq_event_content_snapshot_day",
        ),
    )
    op.create_index(
        "ix_event_content_snapshots_workspace_event_date",
        "event_content_snapshots",
        ["workspace_id", "event_id", "snapshot_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_event_content_snapshots_workspace_event_date",
        table_name="event_content_snapshots",
    )
    op.drop_table("event_content_snapshots")

