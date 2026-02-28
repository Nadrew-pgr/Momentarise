"""add_capture_pipeline_and_ai_preferences

Revision ID: d4f1e9a7c3b2
Revises: b8c1d2e3f4a5
Create Date: 2026-02-28 18:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d4f1e9a7c3b2"
down_revision: Union[str, Sequence[str], None] = "b8c1d2e3f4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "capture_assets",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("checksum", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["capture_id"], ["inbox_captures.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_capture_assets_workspace_capture_deleted",
        "capture_assets",
        ["workspace_id", "capture_id", "deleted_at"],
        unique=False,
    )

    op.create_table(
        "capture_artifacts",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("artifact_type", sa.Text(), nullable=False),
        sa.Column(
            "content_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("provider", sa.Text(), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
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
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_capture_artifacts_workspace_status_deleted",
        "capture_artifacts",
        ["workspace_id", "artifact_type", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_capture_artifacts_workspace_capture_deleted",
        "capture_artifacts",
        ["workspace_id", "capture_id", "deleted_at"],
        unique=False,
    )

    op.create_table(
        "capture_jobs",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("job_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_capture_jobs_workspace_status_deleted",
        "capture_jobs",
        ["workspace_id", "status", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_capture_jobs_workspace_capture_deleted",
        "capture_jobs",
        ["workspace_id", "capture_id", "deleted_at"],
        unique=False,
    )

    op.create_table(
        "capture_action_suggestions",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("action_key", sa.Text(), nullable=False),
        sa.Column("action_type", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("requires_confirm", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "payload_json",
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
        sa.ForeignKeyConstraint(["capture_id"], ["inbox_captures.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("capture_id", "action_key"),
    )
    op.create_index(
        "ix_capture_action_suggestions_workspace_capture_deleted",
        "capture_action_suggestions",
        ["workspace_id", "capture_id", "deleted_at"],
        unique=False,
    )

    op.create_index(
        "ix_inbox_captures_workspace_status_deleted",
        "inbox_captures",
        ["workspace_id", "status", "deleted_at"],
        unique=False,
    )

    # Normalize legacy rows.
    op.execute("UPDATE inbox_captures SET source = 'manual' WHERE source IS NULL")
    op.execute("UPDATE inbox_captures SET capture_type = 'text' WHERE capture_type IS NULL")
    op.execute("UPDATE inbox_captures SET status = 'captured' WHERE status IS NULL")
    op.execute("UPDATE inbox_captures SET metadata = '{}'::jsonb WHERE metadata IS NULL")
    op.execute(
        """
        UPDATE inbox_captures
        SET metadata = jsonb_set(metadata, '{channel}', to_jsonb(COALESCE(metadata->>'channel', capture_type)))
        WHERE deleted_at IS NULL
        """
    )
    op.execute(
        """
        UPDATE inbox_captures
        SET metadata = jsonb_set(metadata, '{origin}', to_jsonb(COALESCE(metadata->>'origin', source, 'manual')))
        WHERE deleted_at IS NULL
        """
    )
    op.execute(
        """
        UPDATE inbox_captures
        SET metadata = jsonb_set(metadata, '{auto_process}', 'false'::jsonb, true)
        WHERE deleted_at IS NULL
          AND NOT (metadata ? 'auto_process')
        """
    )

    # Initialize AI preferences defaults if missing.
    op.execute(
        """
        UPDATE workspace_members
        SET preferences = jsonb_set(
            jsonb_set(
                jsonb_set(COALESCE(preferences, '{}'::jsonb), '{ai,mode}', '\"proposal_only\"'::jsonb, true),
                '{ai,auto_apply_threshold}',
                '0.9'::jsonb,
                true
            ),
            '{ai,max_actions_per_capture}',
            '3'::jsonb,
            true
        )
        WHERE preferences->'ai' IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_capture_action_suggestions_workspace_capture_deleted", table_name="capture_action_suggestions")
    op.drop_table("capture_action_suggestions")

    op.drop_index("ix_capture_jobs_workspace_capture_deleted", table_name="capture_jobs")
    op.drop_index("ix_capture_jobs_workspace_status_deleted", table_name="capture_jobs")
    op.drop_table("capture_jobs")

    op.drop_index("ix_capture_artifacts_workspace_capture_deleted", table_name="capture_artifacts")
    op.drop_index("ix_capture_artifacts_workspace_status_deleted", table_name="capture_artifacts")
    op.drop_table("capture_artifacts")

    op.drop_index("ix_capture_assets_workspace_capture_deleted", table_name="capture_assets")
    op.drop_table("capture_assets")

    op.drop_index("ix_inbox_captures_workspace_status_deleted", table_name="inbox_captures")
