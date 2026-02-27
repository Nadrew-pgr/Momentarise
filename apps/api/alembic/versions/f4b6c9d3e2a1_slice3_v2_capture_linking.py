"""slice3_v2_capture_linking

Revision ID: f4b6c9d3e2a1
Revises: 9e6b8caa1f2d
Create Date: 2026-02-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f4b6c9d3e2a1"
down_revision: Union[str, Sequence[str], None] = "9e6b8caa1f2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inbox_captures",
        sa.Column("capture_type", sa.Text(), nullable=False, server_default=sa.text("'text'")),
    )
    op.add_column(
        "inbox_captures",
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'captured'")),
    )
    op.add_column(
        "inbox_captures",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.create_index(
        "ix_inbox_captures_workspace_id_status",
        "inbox_captures",
        ["workspace_id", "status"],
        unique=False,
    )

    op.add_column(
        "items",
        sa.Column("kind", sa.Text(), nullable=False, server_default=sa.text("'note'")),
    )
    op.add_column(
        "items",
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'draft'")),
    )
    op.add_column(
        "items",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "items",
        sa.Column("source_capture_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_items_source_capture_id_inbox_captures",
        "items",
        "inbox_captures",
        ["source_capture_id"],
        ["id"],
    )
    op.create_index(
        "ix_items_workspace_id_status",
        "items",
        ["workspace_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_items_workspace_id_kind",
        "items",
        ["workspace_id", "kind"],
        unique=False,
    )

    op.create_table(
        "entity_links",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("from_entity_type", sa.Text(), nullable=False),
        sa.Column("from_entity_id", sa.UUID(), nullable=False),
        sa.Column("to_entity_type", sa.Text(), nullable=False),
        sa.Column("to_entity_id", sa.UUID(), nullable=False),
        sa.Column("relation_type", sa.Text(), nullable=False),
        sa.Column(
            "metadata",
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
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_entity_links_workspace_from",
        "entity_links",
        ["workspace_id", "from_entity_type", "from_entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_entity_links_workspace_to",
        "entity_links",
        ["workspace_id", "to_entity_type", "to_entity_id"],
        unique=False,
    )

    op.create_table(
        "ai_changes",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=True),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("before_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("undoable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_changes_workspace_entity",
        "ai_changes",
        ["workspace_id", "entity_type", "entity_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_changes_workspace_entity", table_name="ai_changes")
    op.drop_table("ai_changes")

    op.drop_index("ix_entity_links_workspace_to", table_name="entity_links")
    op.drop_index("ix_entity_links_workspace_from", table_name="entity_links")
    op.drop_table("entity_links")

    op.drop_index("ix_items_workspace_id_kind", table_name="items")
    op.drop_index("ix_items_workspace_id_status", table_name="items")
    op.drop_constraint("fk_items_source_capture_id_inbox_captures", "items", type_="foreignkey")
    op.drop_column("items", "source_capture_id")
    op.drop_column("items", "metadata")
    op.drop_column("items", "status")
    op.drop_column("items", "kind")

    op.drop_index("ix_inbox_captures_workspace_id_status", table_name="inbox_captures")
    op.drop_column("inbox_captures", "metadata")
    op.drop_column("inbox_captures", "status")
    op.drop_column("inbox_captures", "capture_type")
