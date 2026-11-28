import logging
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.sync_mirrors import (
    SyncComplaint,
    SyncDesignTask,
    SyncEnquiry,
    SyncFailedEvent,
    SyncProcessedEvent,
    SyncQuotation,
    SyncSchedulerQuotationRef,
    SyncSource,
    SyncStaffDirectory,
    SyncWorkConfirmed,
)
from app.sync.config import SyncConfig, get_sync_config
from app.sync.mapper import (
    SOURCE_QUOTATIONS,
    SOURCE_SCHEDULER,
    extract_selected_quotation_option,
    parse_bool,
    parse_date,
    parse_datetime,
    parse_decimal,
    parse_int,
    resolve_customer_mapping,
    resolve_user_mapping,
    scrub_sensitive_payload,
)

logger = logging.getLogger("avora.sync")

SOURCE_DISPLAY_NAMES = {
    SOURCE_SCHEDULER: "Designer Task Scheduler",
    SOURCE_QUOTATIONS: "Quotation Management",
}


@dataclass
class OutboxEvent:
    event_seq: int
    event_id: uuid.UUID
    source_system: str
    source_table: str
    source_pk: str
    operation: str
    record_version: int
    is_deleted: bool
    payload: dict[str, Any]
    created_at: datetime | None = None


def _should_apply_version(
    current_version: int | None,
    current_deleted: bool | None,
    incoming_version: int,
    incoming_deleted: bool,
) -> bool:
    """
    Per-record causal ordering rule:
    - Apply if record is new (current_version is None)
    - Apply if incoming_version > current_version
    - If versions tie, deletion wins over non-deletion (keeps deleted rows deleted)
    """
    if current_version is None:
        return True
    if incoming_version > current_version:
        return True
    if incoming_version == current_version and incoming_deleted and not current_deleted:
        return True
    return False


class SyncWorker:
    """One-way PostgreSQL outbox poller, backfill runner, and reconciler."""

    def __init__(
        self,
        config: SyncConfig | None = None,
        avora_engine: Engine | None = None,
        source_engines: dict[str, Engine] | None = None,
    ) -> None:
        self.config = config or get_sync_config()
        self.avora_engine = avora_engine or self._build_engine(self.config.normalized_avora_url)
        self.avora_session_factory = sessionmaker(
            bind=self.avora_engine, autocommit=False, autoflush=False
        )

        if source_engines is not None:
            self.source_engines = dict(source_engines)
        else:
            self.source_engines = {}
            if self.config.sync_enable_scheduler and self.config.scheduler_sync_database_url:
                self.source_engines[SOURCE_SCHEDULER] = self._build_engine(
                    self.config.normalized_scheduler_url
                )
            if self.config.sync_enable_quotations and self.config.quotations_sync_database_url:
                self.source_engines[SOURCE_QUOTATIONS] = self._build_engine(
                    self.config.normalized_quotations_url
                )

    def _build_engine(self, url: str) -> Engine:
        return create_engine(
            url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": self.config.sync_connect_timeout_seconds},
        )

    def ensure_sources_registered(self) -> None:
        with self.avora_session_factory() as db:
            for source_system, display_name in SOURCE_DISPLAY_NAMES.items():
                if not db.get(SyncSource, source_system):
                    db.add(
                        SyncSource(
                            source_system=source_system,
                            display_name=display_name,
                            status="idle",
                        )
                    )
            db.commit()

    def _get_or_create_source_row(self, db: Session, source_system: str) -> SyncSource:
        row = db.get(SyncSource, source_system)
        if not row:
            row = SyncSource(
                source_system=source_system,
                display_name=SOURCE_DISPLAY_NAMES.get(source_system, source_system),
                status="idle",
            )
            db.add(row)
            db.flush()
        return row

    def _apply_mirror_upsert_or_delete(self, db: Session, ev: OutboxEvent) -> None:
        p = scrub_sensitive_payload(ev.payload or {})
        now = datetime.now(timezone.utc)
        tbl = ev.source_table
        pk = str(ev.source_pk)
        ver = int(ev.record_version)
        deleted = bool(ev.is_deleted)

        if ev.source_system == SOURCE_QUOTATIONS and tbl == "quotations":
            row = (
                db.query(SyncQuotation)
                .filter(
                    SyncQuotation.source_system == ev.source_system,
                    SyncQuotation.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncQuotation(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.quote_id = p.get("quote_id")
            row.quote_no = p.get("quote_no")
            row.quote_version = parse_int(p.get("quote_version"))
            row.project_name = p.get("project_name")
            row.client_name = p.get("client_name")
            row.contact_number = p.get("contact_number")
            row.site_address = p.get("site_address")
            row.place = p.get("place")
            row.category = p.get("category")
            row.category_ref_no = p.get("category_ref_no")
            row.designer_name = p.get("designer_name")
            row.estimator_name = p.get("estimator_name")
            row.quote_date = parse_date(p.get("quote_date"))
            row.source_status = p.get("status")
            row.approval_status = p.get("approval_status")
            row.approved_at = parse_datetime(p.get("approved_at"))
            row.approved_by = p.get("approved_by")
            row.approval_notes = p.get("approval_notes")
            row.is_locked = parse_bool(p.get("is_locked"), False)
            row.locked_at = parse_datetime(p.get("locked_at"))
            row.locked_by = p.get("locked_by")
            row.saved_to_vault = parse_bool(p.get("saved_to_vault"), False)
            row.ms_rate_mode = p.get("ms_rate_mode")
            row.source_subtotal = parse_decimal(p.get("subtotal"))
            row.source_profit_percent = parse_decimal(p.get("profit_percent"))
            row.source_profit_amount = parse_decimal(p.get("profit_amount"))
            row.source_pre_tax_total = parse_decimal(p.get("pre_tax_total"))
            row.specification = p.get("specification")
            row.work_description = p.get("work_description")
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))

            extracted = extract_selected_quotation_option(p)
            row.active_option_index = extracted["active_option_index"]
            row.selected_option_label = extracted["selected_option_label"]
            row.include_tax = extracted["include_tax"]
            row.source_tax_percent = extracted["source_tax_percent"]
            row.source_tax_amount = extracted["source_tax_amount"]
            row.source_rounded_total = extracted["source_rounded_total"]
            row.source_grand_total = extracted["source_grand_total"]
            row.selected_option_items = extracted["selected_option_items"]
            row.all_options_snapshot = extracted["all_options_snapshot"]
            row.line_items_snapshot = extracted["line_items_snapshot"]

            cust_id, cust_status = resolve_customer_mapping(
                db,
                ev.source_system,
                "quotations",
                pk,
                p.get("client_email"),
                p.get("client_name"),
            )
            row.avora_customer_id = cust_id
            row.customer_match_status = cust_status
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "enquiries_register":
            row = (
                db.query(SyncEnquiry)
                .filter(
                    SyncEnquiry.source_system == ev.source_system,
                    SyncEnquiry.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncEnquiry(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.sl_no = parse_int(p.get("sl_no"))
            row.department = p.get("department")
            row.sub_category = p.get("sub_category")
            row.project_name = p.get("project_name")
            row.client_name = p.get("client_name")
            row.client_phone = p.get("client_phone")
            row.client_email = p.get("client_email")
            row.site_location = p.get("site_location")
            row.reference = p.get("reference")
            row.designer_source_pk = (
                str(p["designer_id"]) if p.get("designer_id") is not None else None
            )
            row.designer_name = p.get("designer_name")
            row.site_supervisor_source_pk = (
                str(p["site_supervisor_id"])
                if p.get("site_supervisor_id") is not None
                else None
            )
            row.site_supervisor_name = p.get("site_supervisor_name")
            row.start_date = parse_date(p.get("start_date"))
            row.target_date = parse_date(p.get("target_date"))
            row.design_assigned_date = parse_date(p.get("design_assigned_date"))
            row.design_approved_date = parse_date(p.get("design_approved_date"))
            row.site_visit_date = parse_date(p.get("site_visit_date"))
            row.quote_done_date = parse_date(p.get("quote_done_date"))
            row.job_card_date = parse_date(p.get("job_card_date"))
            row.design_advance_status = p.get("design_advance_status")
            row.design_advance_amount = parse_decimal(p.get("design_advance_amount"))
            row.is_quote_requested = parse_bool(p.get("is_quote_requested"), False)
            row.quotation_number = p.get("quotation_number")
            row.quotation_amount = parse_decimal(p.get("quotation_amount"))
            row.execution_advance_status = p.get("execution_advance_status")
            row.execution_advance_amount = parse_decimal(p.get("execution_advance_amount"))
            row.final_balance_amount = parse_decimal(p.get("final_balance_amount"))
            row.job_card_no = p.get("job_card_no")
            row.source_status = p.get("status")
            row.workflow_stage = p.get("workflow_stage")
            row.priority = p.get("priority")
            row.remarks = p.get("remarks")
            row.linked_task_source_pk = (
                str(p["linked_task_id"]) if p.get("linked_task_id") is not None else None
            )
            row.linked_task_title = p.get("linked_task_title")
            row.linked_quotation_source_pk = (
                str(p["linked_quotation_id"])
                if p.get("linked_quotation_id") is not None
                else None
            )
            row.linked_work_confirmed_source_pk = (
                str(p["linked_work_confirmed_id"])
                if p.get("linked_work_confirmed_id") is not None
                else None
            )
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))

            cust_id, cust_status = resolve_customer_mapping(
                db,
                ev.source_system,
                "enquiries_register",
                pk,
                p.get("client_email"),
                p.get("client_name"),
            )
            row.avora_customer_id = cust_id
            row.customer_match_status = cust_status
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "tasks":
            row = (
                db.query(SyncDesignTask)
                .filter(
                    SyncDesignTask.source_system == ev.source_system,
                    SyncDesignTask.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncDesignTask(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.assignee_source_pk = (
                str(p["user_id"]) if p.get("user_id") is not None else None
            )
            row.assigned_by_source_pk = (
                str(p["assigned_by_id"])
                if p.get("assigned_by_id") is not None
                else None
            )
            row.delegated_by_source_pk = (
                str(p["delegated_by_id"])
                if p.get("delegated_by_id") is not None
                else None
            )
            row.title = p.get("title")
            row.description = p.get("description")
            row.priority = p.get("priority")
            row.task_date = parse_date(p.get("task_date"))
            row.source_status = p.get("status")
            row.reason = p.get("reason")
            row.is_midday = parse_bool(p.get("is_midday"), False)
            row.is_break = parse_bool(p.get("is_break"), False)
            row.timer_status = p.get("timer_status")
            row.total_active_seconds = parse_int(p.get("total_active_seconds"), 0) or 0
            row.deadline_at = parse_datetime(p.get("deadline_at"))
            row.first_started_at = parse_datetime(p.get("first_started_at"))
            row.completed_at = parse_datetime(p.get("completed_at"))
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "users":
            row = (
                db.query(SyncStaffDirectory)
                .filter(
                    SyncStaffDirectory.source_system == ev.source_system,
                    SyncStaffDirectory.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncStaffDirectory(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                if p.get("status"):
                    row.source_status = p.get("status")
                return

            row.deleted_at = None
            row.name = p.get("name")
            row.role = p.get("role")
            row.specialization = p.get("specialization")
            row.department = p.get("department")
            row.email = p.get("email")
            row.phone = p.get("phone")
            row.source_status = p.get("status")
            row.reports_to_source_pk = (
                str(p["reports_to_id"])
                if p.get("reports_to_id") is not None
                else None
            )

            user_id, ident_status = resolve_user_mapping(
                db,
                ev.source_system,
                "users",
                pk,
                p.get("email"),
                p.get("name"),
            )
            row.avora_user_id = user_id
            row.identity_status = ident_status
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "employee_profiles":
            staff_pk = str(p.get("user_id") or "")
            if not staff_pk:
                # Look up existing staff row owning this profile is impossible on sparse delete
                return
            row = (
                db.query(SyncStaffDirectory)
                .filter(
                    SyncStaffDirectory.source_system == ev.source_system,
                    SyncStaffDirectory.source_pk == staff_pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.profile_record_version, False, ver, False
            ):
                return
            if not row:
                row = SyncStaffDirectory(
                    source_system=ev.source_system, source_pk=staff_pk
                )
                db.add(row)

            row.profile_record_version = ver
            row.last_synced_at = now
            if deleted:
                row.employee_code = None
                row.designation = None
                row.employment_type = None
                row.work_shift = None
                row.work_location = None
                row.reporting_manager = None
                row.joining_date = None
                return

            row.employee_code = p.get("employee_code")
            row.designation = p.get("designation")
            row.department = p.get("department") or row.department
            row.employment_type = p.get("employment_type")
            row.work_shift = p.get("work_shift")
            row.work_location = p.get("work_location")
            row.reporting_manager = p.get("reporting_manager")
            row.joining_date = parse_date(p.get("joining_date"))
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "accounts_work_confirmed":
            row = (
                db.query(SyncWorkConfirmed)
                .filter(
                    SyncWorkConfirmed.source_system == ev.source_system,
                    SyncWorkConfirmed.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncWorkConfirmed(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.project_name = p.get("project_name")
            row.client_name = p.get("client_name")
            row.client_phone = p.get("client_phone")
            row.client_email = p.get("client_email")
            row.project_category = p.get("project_category")
            row.confirmed_quotation_no = p.get("confirmed_quotation_no")
            row.quotation_amount = parse_decimal(p.get("quotation_amount"))
            row.advance_received = parse_decimal(p.get("advance_received"))
            row.balance_amount = parse_decimal(p.get("balance_amount"))
            row.billing_status = p.get("billing_status")
            row.designer_assigned = p.get("designer_assigned")
            row.production_status = p.get("production_status")
            row.job_card_no = p.get("job_card_no")
            row.job_card_date = parse_date(p.get("job_card_date"))
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "complaints_register":
            row = (
                db.query(SyncComplaint)
                .filter(
                    SyncComplaint.source_system == ev.source_system,
                    SyncComplaint.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncComplaint(source_system=ev.source_system, source_pk=pk)
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.sl_no = parse_int(p.get("sl_no"))
            row.complaint_date = parse_date(p.get("complaint_date"))
            row.client_name = p.get("client_name")
            row.client_phone = p.get("client_phone")
            row.category = p.get("category")
            row.complaint_details = p.get("complaint_details")
            row.delayed_date = parse_date(p.get("delayed_date"))
            row.rectified_date = parse_date(p.get("rectified_date"))
            row.rectified_by = p.get("rectified_by")
            row.billing_warranty_type = p.get("billing_warranty_type")
            row.bill_amount = parse_decimal(p.get("bill_amount"))
            row.bill_reference = p.get("bill_reference")
            row.warranty_details = p.get("warranty_details")
            row.source_status = p.get("status")
            row.linked_task_source_pk = (
                str(p["linked_task_id"])
                if p.get("linked_task_id") is not None
                else None
            )
            row.linked_task_title = p.get("linked_task_title")
            row.assigned_to_source_pk = (
                str(p["assigned_to_id"])
                if p.get("assigned_to_id") is not None
                else None
            )
            row.assigned_to_name = p.get("assigned_to_name")
            row.resolution_notes = p.get("resolution_notes")
            row.priority = p.get("priority")
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))
            return

        if ev.source_system == SOURCE_SCHEDULER and tbl == "accounts_quotations":
            row = (
                db.query(SyncSchedulerQuotationRef)
                .filter(
                    SyncSchedulerQuotationRef.source_system == ev.source_system,
                    SyncSchedulerQuotationRef.source_pk == pk,
                )
                .first()
            )
            if row and not _should_apply_version(
                row.source_record_version, row.is_deleted, ver, deleted
            ):
                return
            if not row:
                row = SyncSchedulerQuotationRef(
                    source_system=ev.source_system, source_pk=pk
                )
                db.add(row)

            row.source_record_version = ver
            row.is_deleted = deleted
            row.is_commercial_quote = False
            row.last_synced_at = now
            if deleted:
                row.deleted_at = parse_datetime(p.get("deleted_at")) or now
                return

            row.deleted_at = None
            row.quotation_no = p.get("quotation_no")
            row.client_name = p.get("client_name")
            row.client_phone = p.get("client_phone")
            row.project_title = p.get("project_title")
            row.department = p.get("department")
            row.estimated_amount = parse_decimal(p.get("estimated_amount"))
            row.source_status = p.get("status")
            row.quotation_date = parse_date(p.get("quotation_date"))
            row.valid_until = parse_date(p.get("valid_until"))
            row.prepared_by = p.get("prepared_by")
            row.source_created_at = parse_datetime(p.get("created_at"))
            row.source_updated_at = parse_datetime(p.get("updated_at"))
            return

        raise ValueError(f"Unsupported sync target: {ev.source_system}.{tbl}")

    def apply_event(self, ev: OutboxEvent) -> bool:
        """
        Apply a single event inside ONE Avora DB transaction:
        returns True if committed cleanly (new or already processed duplicate),
        False if failed and moved/updated in sync_failed_events.
        """
        with self.avora_session_factory() as db:
            try:
                already = db.get(SyncProcessedEvent, ev.event_id)
                if not already:
                    self._apply_mirror_upsert_or_delete(db, ev)
                    db.add(
                        SyncProcessedEvent(
                            event_id=ev.event_id,
                            source_system=ev.source_system,
                            source_table=ev.source_table,
                            source_pk=str(ev.source_pk),
                            event_seq=ev.event_seq,
                            record_version=ev.record_version,
                            operation=ev.operation,
                        )
                    )
                failed = (
                    db.query(SyncFailedEvent)
                    .filter(SyncFailedEvent.event_id == ev.event_id)
                    .first()
                )
                if failed and failed.status != "resolved":
                    failed.status = "resolved"
                    failed.resolved_at = datetime.now(timezone.utc)

                src_row = self._get_or_create_source_row(db, ev.source_system)
                if ev.event_seq > src_row.last_acked_seq:
                    src_row.last_acked_seq = ev.event_seq
                db.commit()
                return True
            except Exception as exc:
                db.rollback()
                logger.exception(
                    "Failed processing outbox event %s (%s.%s#%s): %s",
                    ev.event_id,
                    ev.source_system,
                    ev.source_table,
                    ev.source_pk,
                    exc,
                )
                self._record_failed_event(ev, str(exc))
                return False

    def _record_failed_event(self, ev: OutboxEvent, error_message: str) -> None:
        now = datetime.now(timezone.utc)
        with self.avora_session_factory() as db:
            failed = (
                db.query(SyncFailedEvent)
                .filter(SyncFailedEvent.event_id == ev.event_id)
                .first()
            )
            if not failed:
                failed = SyncFailedEvent(
                    event_id=ev.event_id,
                    source_system=ev.source_system,
                    source_table=ev.source_table,
                    source_pk=str(ev.source_pk),
                    event_seq=ev.event_seq,
                    record_version=ev.record_version,
                    operation=ev.operation,
                    is_deleted=ev.is_deleted,
                    payload=scrub_sensitive_payload(ev.payload or {}),
                    error_message=error_message[:2000],
                    retry_count=1,
                    status="failed",
                    first_failed_at=now,
                    last_failed_at=now,
                )
                db.add(failed)
            else:
                failed.error_message = error_message[:2000]
                failed.retry_count = (failed.retry_count or 0) + 1
                failed.status = "failed"
                failed.last_failed_at = now
                failed.resolved_at = None

            src_row = self._get_or_create_source_row(db, ev.source_system)
            src_row.failed_count = (
                db.query(SyncFailedEvent)
                .filter(
                    SyncFailedEvent.source_system == ev.source_system,
                    SyncFailedEvent.status == "failed",
                )
                .count()
            )
            src_row.last_error = error_message[:500]
            src_row.status = "degraded"
            db.commit()

    def _ack_source_event(
        self, source_engine: Engine, event_id: uuid.UUID, acked: bool, error: str | None = None
    ) -> None:
        with source_engine.begin() as conn:
            if acked:
                conn.execute(
                    text(
                        """
                        UPDATE public.sync_outbox_events
                        SET acked_at = NOW(), last_error = NULL
                        WHERE event_id = :event_id AND acked_at IS NULL
                        """
                    ),
                    {"event_id": str(event_id)},
                )
            else:
                conn.execute(
                    text(
                        """
                        UPDATE public.sync_outbox_events
                        SET ack_attempt_count = ack_attempt_count + 1,
                            last_error = :err
                        WHERE event_id = :event_id AND acked_at IS NULL
                        """
                    ),
                    {"event_id": str(event_id), "err": (error or "unknown error")[:500]},
                )

    def poll_source_once(
        self,
        source_system: str,
        *,
        simulate_crash_after_avora_commit: bool = False,
    ) -> dict[str, int]:
        """
        Poll un-acked outbox events ordered by event_seq ASC.
        Commit Avora first -> Ack source ONLY after Avora commits.
        Quarantined failed events do not block unrelated records.
        """
        source_engine = self.source_engines.get(source_system)
        if not source_engine:
            return {"processed": 0, "failed": 0, "pending": 0}

        processed = 0
        failed = 0
        now = datetime.now(timezone.utc)

        with self.avora_session_factory() as db:
            quarantined_ids = [
                str(r[0])
                for r in db.query(SyncFailedEvent.event_id)
                .filter(
                    SyncFailedEvent.source_system == source_system,
                    SyncFailedEvent.status == "failed",
                )
                .all()
            ]
            src_row = self._get_or_create_source_row(db, source_system)
            src_row.last_poll_at = now
            db.commit()

        try:
            with source_engine.connect() as conn:
                if quarantined_ids:
                    rows = conn.execute(
                        text(
                            """
                            SELECT event_seq, event_id, source_system, source_table, source_pk,
                                   operation, record_version, is_deleted, payload, created_at
                            FROM public.sync_outbox_events
                            WHERE acked_at IS NULL
                              AND event_id::text != ALL(:skip_ids)
                            ORDER BY event_seq ASC
                            LIMIT :limit
                            """
                        ),
                        {"skip_ids": quarantined_ids, "limit": self.config.sync_batch_size},
                    ).mappings().all()
                else:
                    rows = conn.execute(
                        text(
                            """
                            SELECT event_seq, event_id, source_system, source_table, source_pk,
                                   operation, record_version, is_deleted, payload, created_at
                            FROM public.sync_outbox_events
                            WHERE acked_at IS NULL
                            ORDER BY event_seq ASC
                            LIMIT :limit
                            """
                        ),
                        {"limit": self.config.sync_batch_size},
                    ).mappings().all()
        except Exception as exc:
            logger.error("Source %s unreachable during poll: %s", source_system, exc)
            with self.avora_session_factory() as db:
                src_row = self._get_or_create_source_row(db, source_system)
                src_row.status = "offline"
                src_row.last_error = str(exc)[:500]
                src_row.last_poll_at = now
                db.commit()
            return {"processed": 0, "failed": 0, "pending": -1}

        for r in rows:
            ev_uuid = (
                r["event_id"]
                if isinstance(r["event_id"], uuid.UUID)
                else uuid.UUID(str(r["event_id"]))
            )
            ev = OutboxEvent(
                event_seq=int(r["event_seq"]),
                event_id=ev_uuid,
                source_system=r["source_system"],
                source_table=r["source_table"],
                source_pk=str(r["source_pk"]),
                operation=r["operation"],
                record_version=int(r["record_version"]),
                is_deleted=bool(r["is_deleted"]),
                payload=dict(r["payload"] or {}),
                created_at=r.get("created_at"),
            )
            ok = self.apply_event(ev)
            if ok:
                processed += 1
                if simulate_crash_after_avora_commit:
                    raise RuntimeError("Simulated worker crash after Avora commit before source ACK")
                self._ack_source_event(source_engine, ev.event_id, acked=True)
            else:
                failed += 1
                self._ack_source_event(
                    source_engine,
                    ev.event_id,
                    acked=False,
                    error="Quarantined in Avora sync_failed_events",
                )

        with source_engine.connect() as conn:
            pending_count = int(
                conn.execute(
                    text("SELECT COUNT(*) FROM public.sync_outbox_events WHERE acked_at IS NULL")
                ).scalar_one()
            )

        with self.avora_session_factory() as db:
            src_row = self._get_or_create_source_row(db, source_system)
            failed_total = (
                db.query(SyncFailedEvent)
                .filter(
                    SyncFailedEvent.source_system == source_system,
                    SyncFailedEvent.status == "failed",
                )
                .count()
            )
            src_row.pending_count = pending_count
            src_row.failed_count = failed_total
            src_row.last_poll_at = datetime.now(timezone.utc)
            if failed_total == 0:
                src_row.last_success_at = datetime.now(timezone.utc)
                src_row.status = "healthy"
                src_row.last_error = None
            else:
                src_row.status = "degraded"
            db.commit()

        return {"processed": processed, "failed": failed, "pending": pending_count}

    def poll_all_once(self) -> dict[str, dict[str, int]]:
        self.ensure_sources_registered()
        results: dict[str, dict[str, int]] = {}
        for source_system in list(self.source_engines.keys()):
            results[source_system] = self.poll_source_once(source_system)
        return results

    def retry_failed_events(self, source_system: str | None = None) -> dict[str, int]:
        """Re-attempt quarantined SyncFailedEvent entries inside Avora and ACK source if un-acked."""
        self.ensure_sources_registered()
        resolved = 0
        still_failed = 0
        with self.avora_session_factory() as db:
            q = db.query(SyncFailedEvent).filter(SyncFailedEvent.status == "failed")
            if source_system:
                q = q.filter(SyncFailedEvent.source_system == source_system)
            items = q.order_by(SyncFailedEvent.event_seq.asc()).all()

        for item in items:
            ev = OutboxEvent(
                event_seq=int(item.event_seq),
                event_id=item.event_id,
                source_system=item.source_system,
                source_table=item.source_table,
                source_pk=item.source_pk,
                operation=item.operation,
                record_version=int(item.record_version),
                is_deleted=bool(item.is_deleted),
                payload=dict(item.payload or {}),
            )
            ok = self.apply_event(ev)
            if ok:
                resolved += 1
                src_eng = self.source_engines.get(ev.source_system)
                if src_eng:
                    self._ack_source_event(src_eng, ev.event_id, acked=True)
            else:
                still_failed += 1

        with self.avora_session_factory() as db:
            for src in self.source_engines.keys():
                src_row = self._get_or_create_source_row(db, src)
                failed_total = (
                    db.query(SyncFailedEvent)
                    .filter(
                        SyncFailedEvent.source_system == src,
                        SyncFailedEvent.status == "failed",
                    )
                    .count()
                )
                src_row.failed_count = failed_total
                if failed_total == 0:
                    src_row.status = "healthy"
                    src_row.last_error = None
            db.commit()

        return {"resolved": resolved, "still_failed": still_failed}

    def backfill_source(self, source_system: str) -> dict[str, Any]:
        """
        Race-free initial backfill:
        1. Assumes capture triggers (001_sync_outbox.sql) are already active BEFORE this runs.
        2. Opens a REPEATABLE READ READ ONLY snapshot on the source DB and joins
           sync_record_versions so each row carries its exact committed record_version at snapshot time.
        3. Applies baseline snapshot rows only where Avora has no newer record_version.
        4. Drains all un-acked outbox events captured before/during the copy so concurrent edits
           and deletes overwrite stale snapshot rows cleanly.
        """
        source_engine = self.source_engines.get(source_system)
        if not source_engine:
            raise ValueError(f"Source engine not configured: {source_system}")

        self.ensure_sources_registered()
        if source_system == SOURCE_QUOTATIONS:
            queries = [
                (
                    "quotations",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.quotations t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'quotations' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                )
            ]
        elif source_system == SOURCE_SCHEDULER:
            queries = [
                (
                    "users",
                    """
                    SELECT t.id, t.name, t.role, t.specialization, t.department, t.email,
                           t.phone, t.status, t.reports_to_id, t.created_at,
                           COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.users t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'users' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "employee_profiles",
                    """
                    SELECT t.id, t.user_id, t.employee_code, t.designation, t.department,
                           t.employment_type, t.work_shift, t.work_location,
                           t.reporting_manager, t.joining_date, t.updated_at,
                           COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.employee_profiles t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'employee_profiles' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "enquiries_register",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.enquiries_register t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'enquiries_register' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "tasks",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.tasks t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'tasks' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "accounts_work_confirmed",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.accounts_work_confirmed t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'accounts_work_confirmed' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "complaints_register",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.complaints_register t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'complaints_register' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
                (
                    "accounts_quotations",
                    """
                    SELECT t.*, COALESCE(rv.current_version, 0) AS sync_ver
                    FROM public.accounts_quotations t
                    LEFT JOIN public.sync_record_versions rv
                      ON rv.source_table = 'accounts_quotations' AND rv.source_pk = t.id::text
                    ORDER BY t.id
                    """,
                ),
            ]
        else:
            raise ValueError(f"Unsupported backfill source: {source_system}")

        copied_counts: dict[str, int] = {}
        with source_engine.connect().execution_options(
            isolation_level="REPEATABLE READ"
        ) as src_conn:
            src_conn.execute(text("SET TRANSACTION READ ONLY"))
            for table_name, sql in queries:
                copied = 0
                result = src_conn.execute(text(sql)).mappings()
                batch: list[dict[str, Any]] = []
                for row_map in result:
                    batch.append(dict(row_map))
                    if len(batch) >= self.config.sync_backfill_chunk_size:
                        self._apply_snapshot_batch(source_system, table_name, batch)
                        copied += len(batch)
                        batch.clear()
                if batch:
                    self._apply_snapshot_batch(source_system, table_name, batch)
                    copied += len(batch)
                copied_counts[table_name] = copied
            src_conn.commit()

        # Drain all outbox changes captured before and during the snapshot copy
        replayed_total = 0
        while True:
            poll_stats = self.poll_source_once(source_system)
            replayed_total += poll_stats["processed"]
            if poll_stats["processed"] == 0:
                break

        with self.avora_session_factory() as db:
            src_row = self._get_or_create_source_row(db, source_system)
            src_row.last_backfill_at = datetime.now(timezone.utc)
            src_row.last_success_at = datetime.now(timezone.utc)
            if src_row.failed_count == 0:
                src_row.status = "healthy"
            db.commit()

        return {"copied": copied_counts, "replayed_outbox": replayed_total}

    def _apply_snapshot_batch(
        self, source_system: str, table_name: str, rows: list[dict[str, Any]]
    ) -> None:
        with self.avora_session_factory() as db:
            for raw in rows:
                ver = int(raw.pop("sync_ver", 0) or 0)
                is_deleted = False
                if table_name == "users":
                    status_val = str(raw.get("status") or "active").lower()
                    if status_val in {"inactive", "deleted", "archived", "suspended"}:
                        is_deleted = True
                ev = OutboxEvent(
                    event_seq=0,
                    event_id=uuid.uuid4(),
                    source_system=source_system,
                    source_table=table_name,
                    source_pk=str(raw["id"]),
                    operation="INSERT",
                    record_version=ver,
                    is_deleted=is_deleted,
                    payload=raw,
                )
                self._apply_mirror_upsert_or_delete(db, ev)
            db.commit()

    def reconcile_source(self, source_system: str) -> dict[str, Any]:
        """Compare active row counts & key totals between source DB and Avora mirror."""
        source_engine = self.source_engines.get(source_system)
        if not source_engine:
            raise ValueError(f"Source engine not configured: {source_system}")

        report: dict[str, Any] = {"source_system": source_system, "tables": {}, "in_sync": True}
        with source_engine.connect() as s_conn, self.avora_session_factory() as db:
            if source_system == SOURCE_QUOTATIONS:
                src_cnt = int(s_conn.execute(text("SELECT COUNT(*) FROM public.quotations")).scalar_one())
                src_sum = str(
                    s_conn.execute(
                        text("SELECT COALESCE(SUM(grand_total), 0) FROM public.quotations")
                    ).scalar_one()
                )
                mir_cnt = (
                    db.query(SyncQuotation).filter(SyncQuotation.is_deleted.is_(False)).count()
                )
                mir_sum = str(
                    db.execute(
                        text(
                            "SELECT COALESCE(SUM(source_grand_total), 0) FROM sync_quotations WHERE is_deleted = false"
                        )
                    ).scalar_one()
                )
                matched = src_cnt == mir_cnt and Decimal(src_sum) == Decimal(mir_sum)
                report["tables"]["quotations"] = {
                    "source_count": src_cnt,
                    "mirror_count": mir_cnt,
                    "source_grand_total_sum": src_sum,
                    "mirror_grand_total_sum": mir_sum,
                    "matched": matched,
                }
                if not matched:
                    report["in_sync"] = False
            elif source_system == SOURCE_SCHEDULER:
                pairs = [
                    ("enquiries_register", SyncEnquiry, "SELECT COUNT(*) FROM public.enquiries_register"),
                    ("tasks", SyncDesignTask, "SELECT COUNT(*) FROM public.tasks"),
                    ("accounts_work_confirmed", SyncWorkConfirmed, "SELECT COUNT(*) FROM public.accounts_work_confirmed"),
                    ("complaints_register", SyncComplaint, "SELECT COUNT(*) FROM public.complaints_register"),
                    ("accounts_quotations", SyncSchedulerQuotationRef, "SELECT COUNT(*) FROM public.accounts_quotations"),
                ]
                for tbl, model_cls, sql in pairs:
                    src_cnt = int(s_conn.execute(text(sql)).scalar_one())
                    mir_cnt = db.query(model_cls).filter(model_cls.is_deleted.is_(False)).count()
                    matched = src_cnt == mir_cnt
                    report["tables"][tbl] = {
                        "source_count": src_cnt,
                        "mirror_count": mir_cnt,
                        "matched": matched,
                    }
                    if not matched:
                        report["in_sync"] = False

            src_row = self._get_or_create_source_row(db, source_system)
            src_row.last_reconcile_at = datetime.now(timezone.utc)
            db.commit()

        return report

    def purge_acked_outbox(self, retention_days: int | None = None) -> dict[str, int]:
        days = retention_days if retention_days is not None else self.config.sync_outbox_retention_days
        purged: dict[str, int] = {}
        for source_system, eng in self.source_engines.items():
            with eng.begin() as conn:
                cnt = conn.execute(
                    text("SELECT public.fn_sync_purge_acked_outbox(:days)"),
                    {"days": int(days)},
                ).scalar_one()
                purged[source_system] = int(cnt or 0)
        return purged

    def run_forever(self) -> None:
        self.ensure_sources_registered()
        logger.info(
            "Starting Avora read-only sync worker (interval=%ss, batch=%s)",
            self.config.sync_poll_interval_seconds,
            self.config.sync_batch_size,
        )
        while True:
            try:
                self.poll_all_once()
            except Exception as exc:
                logger.exception("Unhandled cycle error in sync worker: %s", exc)
            time.sleep(self.config.sync_poll_interval_seconds)
