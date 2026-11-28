import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.auth import User
from app.models.customer import Customer
from app.models.sync_mirrors import (
    ExternalIdMapping,
    SyncComplaint,
    SyncDesignTask,
    SyncEnquiry,
    SyncFailedEvent,
    SyncQuotation,
    SyncSchedulerQuotationRef,
    SyncSource,
    SyncStaffDirectory,
    SyncWorkConfirmed,
)
from app.sync.worker import SyncWorker

router = APIRouter()

READ_ROLES = [
    "Administrator",
    "Super Admin",
    "Management",
    "Accounts Manager",
    "Project Manager",
    "Read-Only Management",
    "Sales",
    "Designer",
]
ADMIN_ROLES = ["Administrator", "Super Admin", "Management"]


class MappingResolutionUpdate(BaseModel):
    avora_entity_id: uuid.UUID | None = None
    match_status: str = "matched_manual"
    match_reason: str | None = None


@router.get("/status")
def get_sync_status(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
):
    sources = db.query(SyncSource).order_by(SyncSource.source_system.asc()).all()
    total_pending = sum(s.pending_count or 0 for s in sources)
    total_failed = (
        db.query(func.count(SyncFailedEvent.id))
        .filter(SyncFailedEvent.status == "failed")
        .scalar()
        or 0
    )
    review_needed = (
        db.query(func.count(ExternalIdMapping.id))
        .filter(ExternalIdMapping.match_status.in_(["unmapped", "ambiguous", "missing_email"]))
        .scalar()
        or 0
    )

    last_success_dates = [s.last_success_at for s in sources if s.last_success_at is not None]
    last_overall_success = max(last_success_dates) if last_success_dates else None

    return {
        "read_only": True,
        "last_successful_sync": last_overall_success.isoformat() if last_overall_success else None,
        "total_pending": total_pending,
        "total_failed": int(total_failed),
        "mappings_needing_review": int(review_needed),
        "counts": {
            "enquiries": db.query(func.count(SyncEnquiry.id)).filter(SyncEnquiry.is_deleted.is_(False)).scalar() or 0,
            "design_tasks": db.query(func.count(SyncDesignTask.id)).filter(SyncDesignTask.is_deleted.is_(False)).scalar() or 0,
            "quotations": db.query(func.count(SyncQuotation.id)).filter(SyncQuotation.is_deleted.is_(False)).scalar() or 0,
            "work_confirmed": db.query(func.count(SyncWorkConfirmed.id)).filter(SyncWorkConfirmed.is_deleted.is_(False)).scalar() or 0,
            "complaints": db.query(func.count(SyncComplaint.id)).filter(SyncComplaint.is_deleted.is_(False)).scalar() or 0,
            "staff_directory": db.query(func.count(SyncStaffDirectory.id)).filter(SyncStaffDirectory.is_deleted.is_(False)).scalar() or 0,
            "scheduler_quotation_refs": db.query(func.count(SyncSchedulerQuotationRef.id)).filter(SyncSchedulerQuotationRef.is_deleted.is_(False)).scalar() or 0,
        },
        "sources": [
            {
                "source_system": s.source_system,
                "display_name": s.display_name,
                "status": s.status,
                "last_poll_at": s.last_poll_at.isoformat() if s.last_poll_at else None,
                "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
                "last_backfill_at": s.last_backfill_at.isoformat() if s.last_backfill_at else None,
                "last_reconcile_at": s.last_reconcile_at.isoformat() if s.last_reconcile_at else None,
                "last_acked_seq": s.last_acked_seq,
                "pending_count": s.pending_count,
                "failed_count": s.failed_count,
                "last_error": s.last_error,
            }
            for s in sources
        ],
    }


@router.get("/enquiries")
def list_synced_enquiries(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(SyncEnquiry)
    if not include_deleted:
        q = q.filter(SyncEnquiry.is_deleted.is_(False))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            SyncEnquiry.project_name.ilike(term)
            | SyncEnquiry.client_name.ilike(term)
            | SyncEnquiry.quotation_number.ilike(term)
            | SyncEnquiry.job_card_no.ilike(term)
        )
    rows = q.order_by(SyncEnquiry.sl_no.desc().nullslast(), SyncEnquiry.source_pk.desc()).limit(limit).all()
    return {
        "read_only": True,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_system": r.source_system,
                "source_pk": r.source_pk,
                "sl_no": r.sl_no,
                "department": r.department,
                "sub_category": r.sub_category,
                "project_name": r.project_name,
                "client_name": r.client_name,
                "client_phone": r.client_phone,
                "client_email": r.client_email,
                "site_location": r.site_location,
                "designer_name": r.designer_name,
                "source_status": r.source_status,
                "workflow_stage": r.workflow_stage,
                "priority": r.priority,
                "quotation_number": r.quotation_number,
                "quotation_amount": float(r.quotation_amount) if r.quotation_amount is not None else None,
                "job_card_no": r.job_card_no,
                "linked_task_source_pk": r.linked_task_source_pk,
                "linked_task_title": r.linked_task_title,
                "linked_quotation_source_pk": r.linked_quotation_source_pk,
                "linked_work_confirmed_source_pk": r.linked_work_confirmed_source_pk,
                "avora_customer_id": str(r.avora_customer_id) if r.avora_customer_id else None,
                "customer_match_status": r.customer_match_status,
                "is_deleted": r.is_deleted,
                "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            }
            for r in rows
        ],
    }


@router.get("/designs")
def list_synced_design_tasks(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
):
    staff_rows = db.query(SyncStaffDirectory).all()
    staff_names = {s.source_pk: s.name for s in staff_rows}

    q = db.query(SyncDesignTask)
    if not include_deleted:
        q = q.filter(SyncDesignTask.is_deleted.is_(False))
    rows = q.order_by(SyncDesignTask.task_date.desc().nullslast(), SyncDesignTask.source_pk.desc()).limit(limit).all()
    return {
        "read_only": True,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "title": r.title,
                "description": r.description,
                "assignee_source_pk": r.assignee_source_pk,
                "assignee_name": staff_names.get(r.assignee_source_pk or ""),
                "priority": r.priority,
                "task_date": r.task_date.isoformat() if r.task_date else None,
                "source_status": r.source_status,
                "timer_status": r.timer_status,
                "total_active_seconds": r.total_active_seconds,
                "deadline_at": r.deadline_at.isoformat() if r.deadline_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "is_deleted": r.is_deleted,
                "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            }
            for r in rows
        ],
    }


@router.get("/quotations")
def list_synced_quotations(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(SyncQuotation)
    if not include_deleted:
        q = q.filter(SyncQuotation.is_deleted.is_(False))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            SyncQuotation.quote_no.ilike(term)
            | SyncQuotation.quote_id.ilike(term)
            | SyncQuotation.project_name.ilike(term)
            | SyncQuotation.client_name.ilike(term)
        )
    rows = q.order_by(SyncQuotation.quote_date.desc().nullslast(), SyncQuotation.source_updated_at.desc().nullslast()).limit(limit).all()
    return {
        "read_only": True,
        "owner_system": "quotation_management",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "quote_id": r.quote_id,
                "quote_no": r.quote_no,
                "quote_version": r.quote_version,
                "project_name": r.project_name,
                "client_name": r.client_name,
                "contact_number": r.contact_number,
                "place": r.place,
                "category": r.category,
                "designer_name": r.designer_name,
                "estimator_name": r.estimator_name,
                "quote_date": r.quote_date.isoformat() if r.quote_date else None,
                "source_status": r.source_status,
                "approval_status": r.approval_status,
                "approved_by": r.approved_by,
                "is_locked": r.is_locked,
                "active_option_index": r.active_option_index,
                "selected_option_label": r.selected_option_label,
                "include_tax": r.include_tax,
                "source_tax_percent": float(r.source_tax_percent) if r.source_tax_percent is not None else None,
                "source_tax_amount": float(r.source_tax_amount) if r.source_tax_amount is not None else None,
                "source_rounded_total": float(r.source_rounded_total) if r.source_rounded_total is not None else None,
                "source_grand_total": float(r.source_grand_total) if r.source_grand_total is not None else None,
                "selected_option_items": r.selected_option_items,
                "avora_customer_id": str(r.avora_customer_id) if r.avora_customer_id else None,
                "customer_match_status": r.customer_match_status,
                "is_deleted": r.is_deleted,
                "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            }
            for r in rows
        ],
    }


@router.get("/scheduler-quotation-refs")
def list_scheduler_quotation_refs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    limit: int = Query(default=100, ge=1, le=500),
):
    rows = (
        db.query(SyncSchedulerQuotationRef)
        .filter(SyncSchedulerQuotationRef.is_deleted.is_(False))
        .order_by(SyncSchedulerQuotationRef.quotation_date.desc().nullslast())
        .limit(limit)
        .all()
    )
    return {
        "read_only": True,
        "is_commercial_quote": False,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "quotation_no": r.quotation_no,
                "client_name": r.client_name,
                "project_title": r.project_title,
                "department": r.department,
                "estimated_amount": float(r.estimated_amount) if r.estimated_amount is not None else None,
                "source_status": r.source_status,
                "quotation_date": r.quotation_date.isoformat() if r.quotation_date else None,
                "prepared_by": r.prepared_by,
                "is_commercial_quote": False,
            }
            for r in rows
        ],
    }


@router.get("/work-confirmed")
def list_synced_work_confirmed(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(SyncWorkConfirmed)
    if not include_deleted:
        q = q.filter(SyncWorkConfirmed.is_deleted.is_(False))
    rows = q.order_by(SyncWorkConfirmed.source_updated_at.desc().nullslast()).limit(limit).all()
    return {
        "read_only": True,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "project_name": r.project_name,
                "client_name": r.client_name,
                "confirmed_quotation_no": r.confirmed_quotation_no,
                "quotation_amount": float(r.quotation_amount) if r.quotation_amount is not None else None,
                "advance_received": float(r.advance_received) if r.advance_received is not None else None,
                "balance_amount": float(r.balance_amount) if r.balance_amount is not None else None,
                "billing_status": r.billing_status,
                "designer_assigned": r.designer_assigned,
                "production_status": r.production_status,
                "job_card_no": r.job_card_no,
                "job_card_date": r.job_card_date.isoformat() if r.job_card_date else None,
                "is_deleted": r.is_deleted,
            }
            for r in rows
        ],
    }


@router.get("/complaints")
def list_synced_complaints(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(SyncComplaint)
    if not include_deleted:
        q = q.filter(SyncComplaint.is_deleted.is_(False))
    rows = q.order_by(SyncComplaint.sl_no.desc().nullslast()).limit(limit).all()
    return {
        "read_only": True,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "sl_no": r.sl_no,
                "complaint_date": r.complaint_date.isoformat() if r.complaint_date else None,
                "client_name": r.client_name,
                "client_phone": r.client_phone,
                "category": r.category,
                "complaint_details": r.complaint_details,
                "delayed_date": r.delayed_date.isoformat() if r.delayed_date else None,
                "rectified_date": r.rectified_date.isoformat() if r.rectified_date else None,
                "rectified_by": r.rectified_by,
                "billing_warranty_type": r.billing_warranty_type,
                "bill_amount": float(r.bill_amount) if r.bill_amount is not None else None,
                "source_status": r.source_status,
                "assigned_to_name": r.assigned_to_name,
                "linked_task_source_pk": r.linked_task_source_pk,
                "is_deleted": r.is_deleted,
            }
            for r in rows
        ],
    }


@router.get("/staff")
def list_synced_staff(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    include_deleted: bool = Query(default=False),
):
    q = db.query(SyncStaffDirectory)
    if not include_deleted:
        q = q.filter(SyncStaffDirectory.is_deleted.is_(False))
    rows = q.order_by(SyncStaffDirectory.name.asc().nullslast()).all()
    return {
        "read_only": True,
        "owner_system": "designer_task_scheduler",
        "items": [
            {
                "id": str(r.id),
                "source_pk": r.source_pk,
                "name": r.name,
                "role": r.role,
                "specialization": r.specialization,
                "department": r.department,
                "email": r.email,
                "phone": r.phone,
                "source_status": r.source_status,
                "employee_code": r.employee_code,
                "designation": r.designation,
                "employment_type": r.employment_type,
                "work_shift": r.work_shift,
                "work_location": r.work_location,
                "avora_user_id": str(r.avora_user_id) if r.avora_user_id else None,
                "identity_status": r.identity_status,
                "is_deleted": r.is_deleted,
            }
            for r in rows
        ],
    }


@router.get("/mappings")
def list_external_mappings(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    match_status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(ExternalIdMapping)
    if match_status:
        q = q.filter(ExternalIdMapping.match_status == match_status)
    rows = q.order_by(ExternalIdMapping.updated_at.desc()).limit(limit).all()
    return {
        "items": [
            {
                "id": str(r.id),
                "source_system": r.source_system,
                "source_table": r.source_table,
                "source_pk": r.source_pk,
                "avora_entity_type": r.avora_entity_type,
                "avora_entity_id": str(r.avora_entity_id) if r.avora_entity_id else None,
                "match_status": r.match_status,
                "match_reason": r.match_reason,
                "source_label": r.source_label,
                "candidate_ids": r.candidate_ids,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            }
            for r in rows
        ]
    }


@router.patch("/mappings/{mapping_id}")
def resolve_external_mapping(
    mapping_id: uuid.UUID,
    payload: MappingResolutionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(ADMIN_ROLES))],
):
    """Explicit admin review of link table only; never modifies imported business fields."""
    mapping = db.get(ExternalIdMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping record not found.")

    allowed_statuses = {"matched_manual", "unmapped", "ignored"}
    if payload.match_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"match_status must be one of {sorted(allowed_statuses)}",
        )

    if payload.match_status == "matched_manual":
        if not payload.avora_entity_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="avora_entity_id is required when linking manually.",
            )
        if mapping.avora_entity_type == "customer" and not db.get(Customer, payload.avora_entity_id):
            raise HTTPException(status_code=404, detail="Target Avora Customer UUID not found.")
        if mapping.avora_entity_type == "user" and not db.get(User, payload.avora_entity_id):
            raise HTTPException(status_code=404, detail="Target Avora User UUID not found.")

    mapping.avora_entity_id = payload.avora_entity_id
    mapping.match_status = payload.match_status
    mapping.match_reason = payload.match_reason or f"Manually set to {payload.match_status} by {current_user.email}"
    mapping.reviewed_by_id = current_user.id
    mapping.reviewed_at = datetime.now(timezone.utc)

    # Propagate only the link UUID onto corresponding mirror rows
    if mapping.source_table == "enquiries_register":
        mirror = (
            db.query(SyncEnquiry)
            .filter(SyncEnquiry.source_system == mapping.source_system, SyncEnquiry.source_pk == mapping.source_pk)
            .first()
        )
        if mirror:
            mirror.avora_customer_id = payload.avora_entity_id
            mirror.customer_match_status = payload.match_status
    elif mapping.source_table == "quotations":
        mirror_q = (
            db.query(SyncQuotation)
            .filter(SyncQuotation.source_system == mapping.source_system, SyncQuotation.source_pk == mapping.source_pk)
            .first()
        )
        if mirror_q:
            mirror_q.avora_customer_id = payload.avora_entity_id
            mirror_q.customer_match_status = payload.match_status
    elif mapping.source_table == "users":
        mirror_s = (
            db.query(SyncStaffDirectory)
            .filter(SyncStaffDirectory.source_system == mapping.source_system, SyncStaffDirectory.source_pk == mapping.source_pk)
            .first()
        )
        if mirror_s:
            mirror_s.avora_user_id = payload.avora_entity_id
            mirror_s.identity_status = payload.match_status

    db.commit()
    return {
        "id": str(mapping.id),
        "match_status": mapping.match_status,
        "avora_entity_id": str(mapping.avora_entity_id) if mapping.avora_entity_id else None,
        "reviewed_at": mapping.reviewed_at.isoformat() if mapping.reviewed_at else None,
    }


@router.get("/failed-events")
def list_failed_events(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(READ_ROLES))],
    status_filter: str = Query(default="failed"),
    limit: int = Query(default=100, ge=1, le=500),
):
    rows = (
        db.query(SyncFailedEvent)
        .filter(SyncFailedEvent.status == status_filter)
        .order_by(SyncFailedEvent.last_failed_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": str(r.id),
                "event_id": str(r.event_id),
                "source_system": r.source_system,
                "source_table": r.source_table,
                "source_pk": r.source_pk,
                "event_seq": r.event_seq,
                "record_version": r.record_version,
                "operation": r.operation,
                "is_deleted": r.is_deleted,
                "error_message": r.error_message,
                "retry_count": r.retry_count,
                "status": r.status,
                "first_failed_at": r.first_failed_at.isoformat(),
                "last_failed_at": r.last_failed_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.post("/failed-events/retry")
def retry_failed_sync_events(
    _: Annotated[User, Depends(require_roles(ADMIN_ROLES))],
    source_system: str | None = Query(default=None),
):
    worker = SyncWorker()
    return worker.retry_failed_events(source_system=source_system)
