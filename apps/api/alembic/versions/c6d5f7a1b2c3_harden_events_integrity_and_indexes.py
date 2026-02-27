"""harden_events_integrity_and_indexes

Revision ID: c6d5f7a1b2c3
Revises: f4b6c9d3e2a1
Create Date: 2026-02-27 12:40:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c6d5f7a1b2c3"
down_revision: Union[str, Sequence[str], None] = "f4b6c9d3e2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "events_end_at_gt_start_at",
        "events",
        "end_at > start_at",
    )
    op.create_index(
        "ix_events_workspace_id_start_at_deleted_at",
        "events",
        ["workspace_id", "start_at", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_events_workspace_id_item_id_deleted_at",
        "events",
        ["workspace_id", "item_id", "deleted_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_events_workspace_id_item_id_deleted_at", table_name="events")
    op.drop_index("ix_events_workspace_id_start_at_deleted_at", table_name="events")
    op.drop_constraint("events_end_at_gt_start_at", "events", type_="check")
