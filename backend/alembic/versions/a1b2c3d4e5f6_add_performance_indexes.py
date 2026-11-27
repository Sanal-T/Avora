"""add_performance_indexes

Revision ID: a1b2c3d4e5f6
Revises: 3dfa1dded28e
Create Date: 2026-11-27 10:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "3dfa1dded28e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEX_SPECS = [
    ("ix_enquiries_deleted_created", "enquiries", ["is_deleted", "created_at"]),
    ("ix_enquiries_deleted_status", "enquiries", ["is_deleted", "status"]),
    ("ix_designs_deleted_created", "designs", ["is_deleted", "created_at"]),
    ("ix_designs_deleted_status", "designs", ["is_deleted", "status"]),
    ("ix_quotations_deleted_created", "quotations", ["is_deleted", "created_at"]),
    ("ix_quotations_deleted_status", "quotations", ["is_deleted", "status"]),
    ("ix_work_orders_deleted_created", "work_orders", ["is_deleted", "created_at"]),
    ("ix_work_orders_deleted_status", "work_orders", ["is_deleted", "status"]),
    ("ix_feedback_deleted_created", "feedback", ["is_deleted", "created_at"]),
    ("ix_projects_deleted_created", "projects", ["is_deleted", "created_at"]),
    ("ix_accounts_records_deleted_created", "accounts_records", ["is_deleted", "created_at"]),
    ("ix_communications_created_at", "communications", ["created_at"]),
    ("ix_customers_deleted_created", "customers", ["is_deleted", "created_at"]),
    ("ix_notifications_recipient_created", "notifications", ["recipient_id", "created_at"]),
    ("ix_notifications_recipient_read", "notifications", ["recipient_id", "is_read"]),
    ("ix_attachments_entity_lookup", "attachments", ["entity_type", "entity_id", "created_at"]),
]


def upgrade() -> None:
    for idx_name, table_name, columns in INDEX_SPECS:
        op.create_index(idx_name, table_name, columns, unique=False, if_not_exists=True)


def downgrade() -> None:
    for idx_name, table_name, _ in reversed(INDEX_SPECS):
        op.drop_index(idx_name, table_name=table_name, if_exists=True)
