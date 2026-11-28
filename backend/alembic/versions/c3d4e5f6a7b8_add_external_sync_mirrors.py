"""add_external_sync_mirrors

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-28 16:25:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

json_type = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")


def upgrade() -> None:
    op.create_table(
        "sync_sources",
        sa.Column("source_system", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="idle"),
        sa.Column("last_poll_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_backfill_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reconcile_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_acked_seq", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("pending_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("source_system"),
    )

    op.create_table(
        "sync_processed_events",
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False),
        sa.Column("source_table", sa.String(length=64), nullable=False),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("event_seq", sa.BigInteger(), nullable=False),
        sa.Column("record_version", sa.BigInteger(), nullable=False),
        sa.Column("operation", sa.String(length=16), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index("ix_sync_processed_events_source_system", "sync_processed_events", ["source_system"])
    op.create_index(
        "ix_sync_processed_events_lookup",
        "sync_processed_events",
        ["source_system", "source_table", "source_pk"],
    )

    op.create_table(
        "sync_failed_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False),
        sa.Column("source_table", sa.String(length=64), nullable=False),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("event_seq", sa.BigInteger(), nullable=False),
        sa.Column("record_version", sa.BigInteger(), nullable=False),
        sa.Column("operation", sa.String(length=16), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payload", json_type, nullable=False),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="failed"),
        sa.Column("first_failed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_failed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index("ix_sync_failed_events_source_system", "sync_failed_events", ["source_system"])
    op.create_index(
        "ix_sync_failed_events_status_source", "sync_failed_events", ["status", "source_system"]
    )

    op.create_table(
        "external_id_mappings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False),
        sa.Column("source_table", sa.String(length=64), nullable=False),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("avora_entity_type", sa.String(length=64), nullable=True),
        sa.Column("avora_entity_id", sa.Uuid(), nullable=True),
        sa.Column("match_status", sa.String(length=32), nullable=False, server_default="unmapped"),
        sa.Column("match_reason", sa.String(length=255), nullable=True),
        sa.Column("source_label", sa.String(length=255), nullable=True),
        sa.Column("candidate_ids", json_type, nullable=True),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_table", "source_pk", name="uq_external_mapping_source_key"),
    )
    op.create_index("ix_external_id_mappings_status", "external_id_mappings", ["match_status"])
    op.create_index(
        "ix_external_id_mappings_avora_entity",
        "external_id_mappings",
        ["avora_entity_type", "avora_entity_id"],
    )

    op.create_table(
        "sync_staff_directory",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=True),
        sa.Column("role", sa.String(length=64), nullable=True),
        sa.Column("specialization", sa.String(length=100), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("source_status", sa.String(length=32), nullable=True),
        sa.Column("reports_to_source_pk", sa.String(length=128), nullable=True),
        sa.Column("employee_code", sa.String(length=64), nullable=True),
        sa.Column("designation", sa.String(length=120), nullable=True),
        sa.Column("employment_type", sa.String(length=64), nullable=True),
        sa.Column("work_shift", sa.String(length=64), nullable=True),
        sa.Column("work_location", sa.String(length=120), nullable=True),
        sa.Column("reporting_manager", sa.String(length=150), nullable=True),
        sa.Column("joining_date", sa.Date(), nullable=True),
        sa.Column("avora_user_id", sa.Uuid(), nullable=True),
        sa.Column("identity_status", sa.String(length=32), nullable=False, server_default="unmapped"),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("profile_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["avora_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_staff_source_key"),
    )
    op.create_index("ix_sync_staff_directory_email", "sync_staff_directory", ["email"])
    op.create_index("ix_sync_staff_directory_deleted", "sync_staff_directory", ["is_deleted"])

    op.create_table(
        "sync_enquiries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("sl_no", sa.Integer(), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("sub_category", sa.String(length=150), nullable=True),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("client_phone", sa.String(length=64), nullable=True),
        sa.Column("client_email", sa.String(length=255), nullable=True),
        sa.Column("site_location", sa.String(length=255), nullable=True),
        sa.Column("reference", sa.String(length=255), nullable=True),
        sa.Column("designer_source_pk", sa.String(length=128), nullable=True),
        sa.Column("designer_name", sa.String(length=150), nullable=True),
        sa.Column("site_supervisor_source_pk", sa.String(length=128), nullable=True),
        sa.Column("site_supervisor_name", sa.String(length=150), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("design_assigned_date", sa.Date(), nullable=True),
        sa.Column("design_approved_date", sa.Date(), nullable=True),
        sa.Column("site_visit_date", sa.Date(), nullable=True),
        sa.Column("quote_done_date", sa.Date(), nullable=True),
        sa.Column("job_card_date", sa.Date(), nullable=True),
        sa.Column("design_advance_status", sa.String(length=64), nullable=True),
        sa.Column("design_advance_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("is_quote_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("quotation_number", sa.String(length=100), nullable=True),
        sa.Column("quotation_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("execution_advance_status", sa.String(length=64), nullable=True),
        sa.Column("execution_advance_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("final_balance_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("job_card_no", sa.String(length=100), nullable=True),
        sa.Column("source_status", sa.String(length=64), nullable=True),
        sa.Column("workflow_stage", sa.String(length=64), nullable=True),
        sa.Column("priority", sa.String(length=32), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("linked_task_source_pk", sa.String(length=128), nullable=True),
        sa.Column("linked_task_title", sa.String(length=255), nullable=True),
        sa.Column("linked_quotation_source_pk", sa.String(length=128), nullable=True),
        sa.Column("linked_work_confirmed_source_pk", sa.String(length=128), nullable=True),
        sa.Column("avora_customer_id", sa.Uuid(), nullable=True),
        sa.Column("customer_match_status", sa.String(length=32), nullable=False, server_default="unmapped"),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["avora_customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_enquiries_source_key"),
    )
    op.create_index("ix_sync_enquiries_deleted_status", "sync_enquiries", ["is_deleted", "source_status"])
    op.create_index("ix_sync_enquiries_sl_no", "sync_enquiries", ["sl_no"])
    op.create_index("ix_sync_enquiries_linked_task", "sync_enquiries", ["linked_task_source_pk"])

    op.create_table(
        "sync_design_tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("assignee_source_pk", sa.String(length=128), nullable=True),
        sa.Column("assigned_by_source_pk", sa.String(length=128), nullable=True),
        sa.Column("delegated_by_source_pk", sa.String(length=128), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=32), nullable=True),
        sa.Column("task_date", sa.Date(), nullable=True),
        sa.Column("source_status", sa.String(length=64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("is_midday", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_break", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("timer_status", sa.String(length=32), nullable=True),
        sa.Column("total_active_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_design_tasks_source_key"),
    )
    op.create_index("ix_sync_design_tasks_assignee", "sync_design_tasks", ["assignee_source_pk"])
    op.create_index("ix_sync_design_tasks_deleted_status", "sync_design_tasks", ["is_deleted", "source_status"])

    op.create_table(
        "sync_quotations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="quotation_management"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("quote_id", sa.String(length=100), nullable=True),
        sa.Column("quote_no", sa.String(length=100), nullable=True),
        sa.Column("quote_version", sa.Integer(), nullable=True),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("contact_number", sa.String(length=64), nullable=True),
        sa.Column("site_address", sa.Text(), nullable=True),
        sa.Column("place", sa.String(length=150), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("category_ref_no", sa.String(length=100), nullable=True),
        sa.Column("designer_name", sa.String(length=150), nullable=True),
        sa.Column("estimator_name", sa.String(length=150), nullable=True),
        sa.Column("quote_date", sa.Date(), nullable=True),
        sa.Column("source_status", sa.String(length=64), nullable=True),
        sa.Column("approval_status", sa.String(length=64), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.String(length=150), nullable=True),
        sa.Column("approval_notes", sa.Text(), nullable=True),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=150), nullable=True),
        sa.Column("saved_to_vault", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("active_option_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("selected_option_label", sa.String(length=100), nullable=True),
        sa.Column("ms_rate_mode", sa.String(length=32), nullable=True),
        sa.Column("include_tax", sa.Boolean(), nullable=True),
        sa.Column("source_subtotal", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_profit_percent", sa.Numeric(8, 2), nullable=True),
        sa.Column("source_profit_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_pre_tax_total", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_tax_percent", sa.Numeric(8, 2), nullable=True),
        sa.Column("source_tax_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_rounded_total", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_grand_total", sa.Numeric(14, 2), nullable=True),
        sa.Column("selected_option_items", json_type, nullable=True),
        sa.Column("all_options_snapshot", json_type, nullable=True),
        sa.Column("line_items_snapshot", json_type, nullable=True),
        sa.Column("specification", sa.Text(), nullable=True),
        sa.Column("work_description", sa.Text(), nullable=True),
        sa.Column("avora_customer_id", sa.Uuid(), nullable=True),
        sa.Column("customer_match_status", sa.String(length=32), nullable=False, server_default="unmapped"),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["avora_customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_quotations_source_key"),
    )
    op.create_index("ix_sync_quotations_quote_id", "sync_quotations", ["quote_id"])
    op.create_index("ix_sync_quotations_quote_no", "sync_quotations", ["quote_no"])
    op.create_index("ix_sync_quotations_quote_id_ver", "sync_quotations", ["quote_id", "quote_version"])
    op.create_index(
        "ix_sync_quotations_deleted_status",
        "sync_quotations",
        ["is_deleted", "source_status", "approval_status"],
    )

    op.create_table(
        "sync_work_confirmed",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("client_phone", sa.String(length=64), nullable=True),
        sa.Column("client_email", sa.String(length=255), nullable=True),
        sa.Column("project_category", sa.String(length=100), nullable=True),
        sa.Column("confirmed_quotation_no", sa.String(length=100), nullable=True),
        sa.Column("quotation_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("advance_received", sa.Numeric(14, 2), nullable=True),
        sa.Column("balance_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("billing_status", sa.String(length=64), nullable=True),
        sa.Column("designer_assigned", sa.String(length=150), nullable=True),
        sa.Column("production_status", sa.String(length=64), nullable=True),
        sa.Column("job_card_no", sa.String(length=100), nullable=True),
        sa.Column("job_card_date", sa.Date(), nullable=True),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_work_confirmed_source_key"),
    )
    op.create_index("ix_sync_work_confirmed_quote_no", "sync_work_confirmed", ["confirmed_quotation_no"])
    op.create_index("ix_sync_work_confirmed_job_card_no", "sync_work_confirmed", ["job_card_no"])
    op.create_index("ix_sync_work_confirmed_deleted", "sync_work_confirmed", ["is_deleted", "production_status"])

    op.create_table(
        "sync_complaints",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("sl_no", sa.Integer(), nullable=True),
        sa.Column("complaint_date", sa.Date(), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("client_phone", sa.String(length=64), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("complaint_details", sa.Text(), nullable=True),
        sa.Column("delayed_date", sa.Date(), nullable=True),
        sa.Column("rectified_date", sa.Date(), nullable=True),
        sa.Column("rectified_by", sa.String(length=150), nullable=True),
        sa.Column("billing_warranty_type", sa.String(length=64), nullable=True),
        sa.Column("bill_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("bill_reference", sa.String(length=100), nullable=True),
        sa.Column("warranty_details", sa.Text(), nullable=True),
        sa.Column("source_status", sa.String(length=64), nullable=True),
        sa.Column("linked_task_source_pk", sa.String(length=128), nullable=True),
        sa.Column("linked_task_title", sa.String(length=255), nullable=True),
        sa.Column("assigned_to_source_pk", sa.String(length=128), nullable=True),
        sa.Column("assigned_to_name", sa.String(length=150), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=32), nullable=True),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_complaints_source_key"),
    )
    op.create_index("ix_sync_complaints_deleted_status", "sync_complaints", ["is_deleted", "source_status"])

    op.create_table(
        "sync_scheduler_quotation_refs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False, server_default="designer_task_scheduler"),
        sa.Column("source_pk", sa.String(length=128), nullable=False),
        sa.Column("quotation_no", sa.String(length=100), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("client_phone", sa.String(length=64), nullable=True),
        sa.Column("project_title", sa.String(length=255), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("estimated_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("source_status", sa.String(length=64), nullable=True),
        sa.Column("quotation_date", sa.Date(), nullable=True),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("prepared_by", sa.String(length=150), nullable=True),
        sa.Column("is_commercial_quote", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_record_version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_system", "source_pk", name="uq_sync_sched_qref_source_key"),
    )
    op.create_index(
        "ix_sync_sched_qref_quotation_no", "sync_scheduler_quotation_refs", ["quotation_no"]
    )


def downgrade() -> None:
    op.drop_index("ix_sync_sched_qref_quotation_no", table_name="sync_scheduler_quotation_refs")
    op.drop_table("sync_scheduler_quotation_refs")

    op.drop_index("ix_sync_complaints_deleted_status", table_name="sync_complaints")
    op.drop_table("sync_complaints")

    op.drop_index("ix_sync_work_confirmed_deleted", table_name="sync_work_confirmed")
    op.drop_index("ix_sync_work_confirmed_job_card_no", table_name="sync_work_confirmed")
    op.drop_index("ix_sync_work_confirmed_quote_no", table_name="sync_work_confirmed")
    op.drop_table("sync_work_confirmed")

    op.drop_index("ix_sync_quotations_deleted_status", table_name="sync_quotations")
    op.drop_index("ix_sync_quotations_quote_id_ver", table_name="sync_quotations")
    op.drop_index("ix_sync_quotations_quote_no", table_name="sync_quotations")
    op.drop_index("ix_sync_quotations_quote_id", table_name="sync_quotations")
    op.drop_table("sync_quotations")

    op.drop_index("ix_sync_design_tasks_deleted_status", table_name="sync_design_tasks")
    op.drop_index("ix_sync_design_tasks_assignee", table_name="sync_design_tasks")
    op.drop_table("sync_design_tasks")

    op.drop_index("ix_sync_enquiries_linked_task", table_name="sync_enquiries")
    op.drop_index("ix_sync_enquiries_sl_no", table_name="sync_enquiries")
    op.drop_index("ix_sync_enquiries_deleted_status", table_name="sync_enquiries")
    op.drop_table("sync_enquiries")

    op.drop_index("ix_sync_staff_directory_deleted", table_name="sync_staff_directory")
    op.drop_index("ix_sync_staff_directory_email", table_name="sync_staff_directory")
    op.drop_table("sync_staff_directory")

    op.drop_index("ix_external_id_mappings_avora_entity", table_name="external_id_mappings")
    op.drop_index("ix_external_id_mappings_status", table_name="external_id_mappings")
    op.drop_table("external_id_mappings")

    op.drop_index("ix_sync_failed_events_status_source", table_name="sync_failed_events")
    op.drop_index("ix_sync_failed_events_source_system", table_name="sync_failed_events")
    op.drop_table("sync_failed_events")

    op.drop_index("ix_sync_processed_events_lookup", table_name="sync_processed_events")
    op.drop_index("ix_sync_processed_events_source_system", table_name="sync_processed_events")
    op.drop_table("sync_processed_events")

    op.drop_table("sync_sources")
