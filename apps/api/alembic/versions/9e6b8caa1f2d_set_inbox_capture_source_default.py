"""set_inbox_capture_source_default

Revision ID: 9e6b8caa1f2d
Revises: 4daa52d54088
Create Date: 2026-02-24 23:59:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9e6b8caa1f2d"
down_revision: Union[str, Sequence[str], None] = "4daa52d54088"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "inbox_captures",
        "source",
        existing_type=sa.Text(),
        server_default=sa.text("'manual'"),
        existing_nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "inbox_captures",
        "source",
        existing_type=sa.Text(),
        server_default=None,
        existing_nullable=True,
    )
