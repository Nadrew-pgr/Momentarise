"""events_defaults_and_constraints

Revision ID: d1e8a2b3c4f5
Revises: cf948fc7bfb0
Create Date: 2026-02-23

Add server defaults and check constraints on events table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e8a2b3c4f5"
down_revision: Union[str, Sequence[str], None] = "cf948fc7bfb0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "events",
        "actual_time_acc_seconds",
        existing_type=sa.Integer(),
        server_default=sa.text("0"),
    )
    op.alter_column(
        "events",
        "is_tracking",
        existing_type=sa.Boolean(),
        server_default=sa.text("false"),
    )
    op.create_check_constraint(
        "events_actual_time_acc_seconds_non_negative",
        "events",
        "actual_time_acc_seconds >= 0",
    )
    op.create_check_constraint(
        "events_estimated_time_seconds_non_negative",
        "events",
        "estimated_time_seconds >= 0",
    )
    op.create_index(
        "ix_items_workspace_id_priority_order",
        "items",
        ["workspace_id", "priority_order"],
        unique=False,
    )
    op.create_index(
        "ix_events_workspace_id_start_at",
        "events",
        ["workspace_id", "start_at"],
        unique=False,
    )
    op.create_index(
        "ix_events_workspace_id_is_tracking",
        "events",
        ["workspace_id", "is_tracking"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_events_workspace_id_is_tracking", table_name="events")
    op.drop_index("ix_events_workspace_id_start_at", table_name="events")
    op.drop_index("ix_items_workspace_id_priority_order", table_name="items")
    op.drop_constraint(
        "events_estimated_time_seconds_non_negative",
        "events",
        type_="check",
    )
    op.drop_constraint(
        "events_actual_time_acc_seconds_non_negative",
        "events",
        type_="check",
    )
    op.alter_column(
        "events",
        "is_tracking",
        existing_type=sa.Boolean(),
        server_default=None,
    )
    op.alter_column(
        "events",
        "actual_time_acc_seconds",
        existing_type=sa.Integer(),
        server_default=None,
    )
