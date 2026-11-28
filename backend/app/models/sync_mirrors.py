import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base, utc_now

# Use JSONB on PostgreSQL while staying compatible with SQLite in lightweight unit checks.
JSONType = JSON().with_variant(JSONB(), "postgresql")


class SyncSource(Base):
    """Per-source sync health, cursor, and backlog telemetry."""

    __tablename__ = "sync_sources"

    source_system: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="idle")
    last_poll_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_backfill_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reconcile_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_acked_seq: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    pending_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class SyncProcessedEvent(Base):
    """Idempotency ledger committing in the same Avora transaction as mirror mutations."""

    __tablename__ = "sync_processed_events"
    __table_args__ = (
        Index("ix_sync_processed_events_lookup", "source_system", "source_table", "source_pk"),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_table: Mapped[str] = mapped_column(String(64), nullable=False)
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    event_seq: Mapped[int] = mapped_column(BigInteger, nullable=False)
    record_version: Mapped[int] = mapped_column(BigInteger, nullable=False)
    operation: Mapped[str] = mapped_column(String(16), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncFailedEvent(Base):
    """Durable quarantine table for outbox events that fail processing or mapping validation."""

    __tablename__ = "sync_failed_events"
    __table_args__ = (
        Index("ix_sync_failed_events_status_source", "status", "source_system"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, unique=True, index=True)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_table: Mapped[str] = mapped_column(String(64), nullable=False)
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    event_seq: Mapped[int] = mapped_column(BigInteger, nullable=False)
    record_version: Mapped[int] = mapped_column(BigInteger, nullable=False)
    operation: Mapped[str] = mapped_column(String(16), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="failed")
    first_failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExternalIdMapping(Base):
    """Explicit composite-key mapping between external records and native Avora UUIDs."""

    __tablename__ = "external_id_mappings"
    __table_args__ = (
        UniqueConstraint("source_system", "source_table", "source_pk", name="uq_external_mapping_source_key"),
        Index("ix_external_id_mappings_status", "match_status"),
        Index("ix_external_id_mappings_avora_entity", "avora_entity_type", "avora_entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)
    source_table: Mapped[str] = mapped_column(String(64), nullable=False)
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    avora_entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    avora_entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    match_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unmapped")
    match_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    candidate_ids: Mapped[list[str] | None] = mapped_column(JSONType, nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class SyncStaffDirectory(Base):
    """Read-only work-directory mirror combining scheduler users and non-sensitive profile fields."""

    __tablename__ = "sync_staff_directory"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_staff_source_key"),
        Index("ix_sync_staff_directory_deleted", "is_deleted"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reports_to_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    work_shift: Mapped[str | None] = mapped_column(String(64), nullable=True)
    work_location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reporting_manager: Mapped[str | None] = mapped_column(String(150), nullable=True)
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    avora_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    identity_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unmapped")
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    profile_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncEnquiry(Base):
    """Read-only mirror of Designer Task Scheduler enquiries_register."""

    __tablename__ = "sync_enquiries"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_enquiries_source_key"),
        Index("ix_sync_enquiries_deleted_status", "is_deleted", "source_status"),
        Index("ix_sync_enquiries_sl_no", "sl_no"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    sl_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sub_category: Mapped[str | None] = mapped_column(String(150), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    site_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    designer_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    designer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    site_supervisor_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    site_supervisor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    design_assigned_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    design_approved_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    site_visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quote_done_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    job_card_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    design_advance_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    design_advance_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    is_quote_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quotation_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quotation_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    execution_advance_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    execution_advance_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    final_balance_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    job_card_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    workflow_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    linked_task_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    linked_task_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linked_quotation_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    linked_work_confirmed_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    avora_customer_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    customer_match_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unmapped")
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncDesignTask(Base):
    """Read-only mirror of Designer Task Scheduler tasks."""

    __tablename__ = "sync_design_tasks"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_design_tasks_source_key"),
        Index("ix_sync_design_tasks_deleted_status", "is_deleted", "source_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    assignee_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    assigned_by_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    delegated_by_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    task_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_midday: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_break: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    timer_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    total_active_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncQuotation(Base):
    """Read-only commercial quotation mirror from quotations_software.public.quotations."""

    __tablename__ = "sync_quotations"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_quotations_source_key"),
        Index("ix_sync_quotations_quote_id_ver", "quote_id", "quote_version"),
        Index("ix_sync_quotations_deleted_status", "is_deleted", "source_status", "approval_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="quotation_management")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    quote_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    quote_no: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    quote_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    site_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    place: Mapped[str | None] = mapped_column(String(150), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_ref_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    estimator_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    quote_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approval_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    approval_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    saved_to_vault: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    active_option_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    selected_option_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ms_rate_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    include_tax: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    source_subtotal: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_profit_percent: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    source_profit_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_pre_tax_total: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_tax_percent: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    source_tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_rounded_total: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_grand_total: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    selected_option_items: Mapped[list[Any] | dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    all_options_snapshot: Mapped[list[Any] | dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    line_items_snapshot: Mapped[list[Any] | dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    specification: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avora_customer_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    customer_match_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unmapped")
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncWorkConfirmed(Base):
    """Read-only mirror of Designer Task Scheduler accounts_work_confirmed."""

    __tablename__ = "sync_work_confirmed"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_work_confirmed_source_key"),
        Index("ix_sync_work_confirmed_deleted", "is_deleted", "production_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confirmed_quotation_no: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    quotation_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    advance_received: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    balance_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    billing_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    designer_assigned: Mapped[str | None] = mapped_column(String(150), nullable=True)
    production_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    job_card_no: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    job_card_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncComplaint(Base):
    """Read-only mirror of Designer Task Scheduler complaints_register."""

    __tablename__ = "sync_complaints"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_complaints_source_key"),
        Index("ix_sync_complaints_deleted_status", "is_deleted", "source_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    sl_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    complaint_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    complaint_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    delayed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rectified_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rectified_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    billing_warranty_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bill_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    bill_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    warranty_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    linked_task_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    linked_task_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_to_source_pk: Mapped[str | None] = mapped_column(String(128), nullable=True)
    assigned_to_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncSchedulerQuotationRef(Base):
    """Read-only reference mirror of Scheduler accounts_quotations (never counted as commercial revenue)."""

    __tablename__ = "sync_scheduler_quotation_refs"
    __table_args__ = (
        UniqueConstraint("source_system", "source_pk", name="uq_sync_sched_qref_source_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False, default="designer_task_scheduler")
    source_pk: Mapped[str] = mapped_column(String(128), nullable=False)
    quotation_no: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    project_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estimated_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quotation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    prepared_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    is_commercial_quote: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_record_version: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
