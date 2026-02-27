"""add_event_color_and_calendar_preferences

Revision ID: 7a9c5b4d1e2f
Revises: c6d5f7a1b2c3
Create Date: 2026-02-27 23:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7a9c5b4d1e2f"
down_revision: Union[str, Sequence[str], None] = "c6d5f7a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("color", sa.Text(), nullable=False, server_default=sa.text("'sky'")),
    )
    op.execute(
        "UPDATE events SET color = CASE WHEN is_tracking THEN 'emerald' ELSE 'sky' END"
    )
    op.create_check_constraint(
        "events_color_allowed",
        "events",
        "color IN ('sky','amber','violet','rose','emerald','orange')",
    )

    op.add_column(
        "workspace_members",
        sa.Column(
            "preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("workspace_members", "preferences")
    op.drop_constraint("events_color_allowed", "events", type_="check")
    op.drop_column("events", "color")
