"""add_event_details_fields

Revision ID: 3c9a7b1e8d42
Revises: f2a4c6d8e9b0
Create Date: 2026-02-28 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c9a7b1e8d42"
down_revision: Union[str, Sequence[str], None] = "f2a4c6d8e9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("location", sa.Text(), nullable=True))
    op.add_column(
        "events",
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("events", "all_day")
    op.drop_column("events", "location")
    op.drop_column("events", "description")
