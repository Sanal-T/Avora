"""add_production_slots_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-28 12:25:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "production_slots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("work_order_id", sa.Uuid(), nullable=True),
        sa.Column("work_order_code", sa.String(length=50), nullable=True),
        sa.Column("client", sa.String(length=200), nullable=False),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("bay", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(length=10), nullable=False, server_default="08:00"),
        sa.Column("end_time", sa.String(length=10), nullable=False, server_default="17:00"),
        sa.Column("lead_worker", sa.String(length=150), nullable=False, server_default="Unassigned"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="allocated"),
        sa.Column("capacity_hours", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_production_slots_code", "production_slots", ["code"], unique=True)
    op.create_index("ix_production_slots_work_order_id", "production_slots", ["work_order_id"], unique=False)
    op.create_index("ix_production_slots_bay", "production_slots", ["bay"], unique=False)
    op.create_index("ix_production_slots_start_date", "production_slots", ["start_date"], unique=False)
    op.create_index("ix_production_slots_end_date", "production_slots", ["end_date"], unique=False)
    op.create_index("ix_production_slots_status", "production_slots", ["status"], unique=False)
    op.create_index("ix_production_slots_is_deleted", "production_slots", ["is_deleted"], unique=False)
    op.create_index(
        "ix_production_slots_bay_dates",
        "production_slots",
        ["is_deleted", "bay", "start_date", "end_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_production_slots_bay_dates", table_name="production_slots")
    op.drop_index("ix_production_slots_is_deleted", table_name="production_slots")
    op.drop_index("ix_production_slots_status", table_name="production_slots")
    op.drop_index("ix_production_slots_end_date", table_name="production_slots")
    op.drop_index("ix_production_slots_start_date", table_name="production_slots")
    op.drop_index("ix_production_slots_bay", table_name="production_slots")
    op.drop_index("ix_production_slots_work_order_id", table_name="production_slots")
    op.drop_index("ix_production_slots_code", table_name="production_slots")
    op.drop_table("production_slots")
