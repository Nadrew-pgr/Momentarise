"""add_capture_badges_tags_and_provider_prefs

Revision ID: f2a4c6d8e9b0
Revises: d4f1e9a7c3b2
Create Date: 2026-02-28 21:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f2a4c6d8e9b0"
down_revision: Union[str, Sequence[str], None] = "d4f1e9a7c3b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column(
            "preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )

    op.add_column("inbox_captures", sa.Column("category", sa.Text(), nullable=True))
    op.add_column(
        "inbox_captures",
        sa.Column("actor", sa.Text(), nullable=False, server_default="user"),
    )
    op.execute("UPDATE inbox_captures SET actor = 'user' WHERE actor IS NULL")
    op.create_index(
        "ix_inbox_captures_workspace_category_deleted",
        "inbox_captures",
        ["workspace_id", "category", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_inbox_captures_workspace_actor_deleted",
        "inbox_captures",
        ["workspace_id", "actor", "deleted_at"],
        unique=False,
    )

    op.create_table(
        "capture_tags",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_by_actor", sa.Text(), nullable=False, server_default="sync"),
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
        sa.UniqueConstraint("workspace_id", "name", name="uq_capture_tags_workspace_name"),
    )
    op.create_index(
        "ix_capture_tags_workspace_deleted",
        "capture_tags",
        ["workspace_id", "deleted_at"],
        unique=False,
    )

    op.create_table(
        "capture_tag_links",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("tag_id", sa.UUID(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("1")),
        sa.Column("source", sa.Text(), nullable=False, server_default="sync"),
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
        sa.ForeignKeyConstraint(["capture_id"], ["inbox_captures.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["capture_tags.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("capture_id", "tag_id", name="uq_capture_tag_links_capture_tag"),
    )
    op.create_index(
        "ix_capture_tag_links_workspace_capture_deleted",
        "capture_tag_links",
        ["workspace_id", "capture_id", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_capture_tag_links_workspace_tag_deleted",
        "capture_tag_links",
        ["workspace_id", "tag_id", "deleted_at"],
        unique=False,
    )

    op.execute(
        """
        UPDATE workspace_members
        SET preferences = jsonb_set(
            COALESCE(preferences, '{}'::jsonb),
            '{ai,capture_provider_preferences}',
            jsonb_build_object(
                'transcription', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'voxtral-mini-latest',
                    'language', 'auto',
                    'fallback_enabled', true
                ),
                'ocr', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'mistral-ocr-latest',
                    'fallback_enabled', true
                ),
                'vlm', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'pixtral-12b-latest',
                    'fallback_enabled', true
                )
            ),
            true
        )
        WHERE preferences->'ai' IS NOT NULL
          AND (
            preferences->'ai'->'capture_provider_preferences' IS NULL
          )
        """
    )

    op.execute(
        """
        UPDATE workspaces
        SET preferences = jsonb_set(
            COALESCE(preferences, '{}'::jsonb),
            '{ai,capture_provider_preferences}',
            jsonb_build_object(
                'transcription', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'voxtral-mini-latest',
                    'language', 'auto',
                    'fallback_enabled', true
                ),
                'ocr', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'mistral-ocr-latest',
                    'fallback_enabled', true
                ),
                'vlm', jsonb_build_object(
                    'provider', 'mistral',
                    'model', 'pixtral-12b-latest',
                    'fallback_enabled', true
                )
            ),
            true
        )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_capture_tag_links_workspace_tag_deleted", table_name="capture_tag_links")
    op.drop_index("ix_capture_tag_links_workspace_capture_deleted", table_name="capture_tag_links")
    op.drop_table("capture_tag_links")

    op.drop_index("ix_capture_tags_workspace_deleted", table_name="capture_tags")
    op.drop_table("capture_tags")

    op.drop_index("ix_inbox_captures_workspace_actor_deleted", table_name="inbox_captures")
    op.drop_index("ix_inbox_captures_workspace_category_deleted", table_name="inbox_captures")
    op.drop_column("inbox_captures", "actor")
    op.drop_column("inbox_captures", "category")

    op.drop_column("workspaces", "preferences")
