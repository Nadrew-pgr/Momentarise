"""add_capture_queue_outbox_and_run_id

Revision ID: e8b7c9d0f1a2
Revises: d471c08500f9
Create Date: 2026-03-05 11:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e8b7c9d0f1a2"
down_revision: Union[str, Sequence[str], None] = "d471c08500f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("capture_jobs", sa.Column("run_id", sa.UUID(), nullable=True))
    op.add_column("capture_jobs", sa.Column("queue_name", sa.Text(), nullable=True))
    op.add_column("capture_jobs", sa.Column("task_id", sa.Text(), nullable=True))
    op.create_index(
        "ix_capture_jobs_capture_run_status",
        "capture_jobs",
        ["capture_id", "run_id", "status"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_capture_jobs_capture_run_job",
        "capture_jobs",
        ["capture_id", "run_id", "job_type"],
    )

    op.create_table(
        "queue_outbox_events",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("capture_id", sa.UUID(), nullable=False),
        sa.Column("run_id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("queue_name", sa.Text(), nullable=False),
        sa.Column("dedupe_key", sa.Text(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("enqueue_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("task_id", sa.Text(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("enqueued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("dedupe_key", name="uq_queue_outbox_events_dedupe_key"),
    )
    op.create_index(
        "ix_queue_outbox_events_workspace_status_created",
        "queue_outbox_events",
        ["workspace_id", "status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_queue_outbox_events_capture_run_status",
        "queue_outbox_events",
        ["capture_id", "run_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_queue_outbox_events_status_retry",
        "queue_outbox_events",
        ["status", "next_retry_at", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_queue_outbox_events_status_retry", table_name="queue_outbox_events")
    op.drop_index("ix_queue_outbox_events_capture_run_status", table_name="queue_outbox_events")
    op.drop_index("ix_queue_outbox_events_workspace_status_created", table_name="queue_outbox_events")
    op.drop_table("queue_outbox_events")

    op.drop_constraint("uq_capture_jobs_capture_run_job", "capture_jobs", type_="unique")
    op.drop_index("ix_capture_jobs_capture_run_status", table_name="capture_jobs")
    op.drop_column("capture_jobs", "task_id")
    op.drop_column("capture_jobs", "queue_name")
    op.drop_column("capture_jobs", "run_id")
