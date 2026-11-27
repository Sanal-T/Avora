import uuid
from datetime import date, datetime, time, timezone
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.auth import Employee, User
from app.models.customer import Customer
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.services import audit_service
from app.schemas.enquiry import EnquiryCreate, EnquiryRead, EnquiryStatusHistoryRead, EnquiryStatusUpdate, EnquirySummaryResponse, EnquiryUpdate


VALID_STATUSES = [
    "New",
    "Under Review",
    "Pending",
    "Qualified",
    "Unqualified",
    "Converted",
    "Lost",
    "Closed",
    "Rejected",
    "Cancelled",
]


def _to_enquiry_read(enquiry: Enquiry, include_history: bool = True) -> EnquiryRead:
    history_reads = []
    qualified_by_name: str | None = None
    for h in enquiry.status_history:
        changer_name = h.changed_by.full_name if h.changed_by else None
        if h.to_status == "Qualified" and qualified_by_name is None:
            qualified_by_name = changer_name
        if include_history:
            history_reads.append(
                EnquiryStatusHistoryRead(
                    id=h.id,
                    from_status=h.from_status,
                    to_status=h.to_status,
                    notes=h.notes,
                    created_at=h.created_at,
                    changed_by_name=changer_name,
                )
            )
    return EnquiryRead(
        id=enquiry.id,
        enquiry_number=enquiry.enquiry_number,
        customer_id=enquiry.customer_id,
        assigned_employee_id=enquiry.assigned_employee_id,
        status=enquiry.status,
        source=enquiry.source,
        enquiry_type=enquiry.enquiry_type,
        requirement_summary=enquiry.requirement_summary,
        estimated_budget=enquiry.estimated_budget,
        priority=enquiry.priority,
        rejection_reason=enquiry.rejection_reason,
        pending_reason=enquiry.pending_reason,
        lost_reason=enquiry.lost_reason,
        next_follow_up_date=enquiry.next_follow_up_date,
        remarks=enquiry.remarks,
        qualified_at=enquiry.qualified_at,
        qualified_by_name=qualified_by_name,
        converted_at=enquiry.converted_at,
        created_at=enquiry.created_at,
        updated_at=enquiry.updated_at,
        customer_name=enquiry.customer.name if enquiry.customer else None,
        customer_company=enquiry.customer.company_name if enquiry.customer else None,
        assigned_employee_name=f"{enquiry.assigned_employee.first_name} {enquiry.assigned_employee.last_name}" if enquiry.assigned_employee else None,
        status_history=history_reads,
    )


def list_enquiries(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    compact: bool = False,
) -> tuple[int, list[EnquiryRead]]:
    query = db.query(Enquiry).filter(Enquiry.is_deleted == False)

    if status_filter:
        query = query.filter(Enquiry.status == status_filter)

    if date_from:
        start_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Enquiry.created_at >= start_dt)
    if date_to:
        end_dt = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        query = query.filter(Enquiry.created_at <= end_dt)

    if search:
        search_filter = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                Enquiry.enquiry_number.ilike(search_filter),
                Customer.name.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
                Enquiry.requirement_summary.ilike(search_filter),
            )
        )

    items = (
        query.options(
            joinedload(Enquiry.customer),
            joinedload(Enquiry.assigned_employee),
            selectinload(Enquiry.status_history).joinedload(EnquiryStatusHistory.changed_by),
        )
        .order_by(Enquiry.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_enquiry_read(item, include_history=not compact) for item in items]


def get_enquiry(db: Session, enquiry_id: uuid.UUID) -> Enquiry:
    enquiry = (
        db.query(Enquiry)
        .options(
            joinedload(Enquiry.customer),
            joinedload(Enquiry.assigned_employee),
            selectinload(Enquiry.status_history).joinedload(EnquiryStatusHistory.changed_by),
        )
        .filter(Enquiry.id == enquiry_id, Enquiry.is_deleted == False)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found.")
    return enquiry


def create_enquiry(db: Session, data: EnquiryCreate, user_id: uuid.UUID | None = None) -> EnquiryRead:
    # Validate customer exists
    customer = db.query(Customer).filter(Customer.id == data.customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced customer does not exist.")

    count = db.query(Enquiry).count() + 1
    enquiry_number = f"ENQ-{count:04d}"

    enquiry = Enquiry(
        enquiry_number=enquiry_number,
        customer_id=data.customer_id,
        assigned_employee_id=data.assigned_employee_id,
        status="New",
        source=data.source,
        enquiry_type=data.enquiry_type,
        requirement_summary=data.requirement_summary,
        estimated_budget=data.estimated_budget,
        priority=data.priority,
        next_follow_up_date=data.next_follow_up_date,
        remarks=data.remarks,
    )
    try:
        db.add(enquiry)
        db.flush()

        # Initial history record
        history = EnquiryStatusHistory(
            enquiry_id=enquiry.id,
            from_status=None,
            to_status="New",
            changed_by_id=user_id,
            notes="Enquiry created.",
        )
        db.add(history)

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="enquiry",
            entity_id=enquiry.id,
            user_id=user_id,
            changes_summary=f"Created enquiry {enquiry.enquiry_number} for customer {customer.name}",
            commit=False,
        )
        db.commit()
        db.refresh(enquiry)
        return _to_enquiry_read(enquiry)
    except Exception:
        db.rollback()
        raise


def update_enquiry(db: Session, enquiry_id: uuid.UUID, data: EnquiryUpdate) -> EnquiryRead:
    enquiry = get_enquiry(db, enquiry_id)
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(enquiry, key, value)
    db.commit()
    db.refresh(enquiry)
    return _to_enquiry_read(enquiry)


def update_enquiry_status(db: Session, enquiry_id: uuid.UUID, data: EnquiryStatusUpdate, user_id: uuid.UUID | None = None) -> EnquiryRead:
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Allowed statuses: {VALID_STATUSES}")

    enquiry = get_enquiry(db, enquiry_id)
    old_status = enquiry.status
    if old_status == data.status:
        return _to_enquiry_read(enquiry)

    enquiry.status = data.status
    now = datetime.now(timezone.utc)

    if data.status == "Qualified":
        enquiry.qualified_at = now
    elif data.status == "Converted":
        enquiry.converted_at = now
    elif data.status == "Pending" and data.pending_reason:
        enquiry.pending_reason = data.pending_reason
    elif data.status == "Lost" and data.lost_reason:
        enquiry.lost_reason = data.lost_reason
    elif data.status in ["Rejected", "Cancelled"]:
        enquiry.rejection_reason = data.rejection_reason

    history = EnquiryStatusHistory(
        enquiry_id=enquiry.id,
        from_status=old_status,
        to_status=data.status,
        changed_by_id=user_id,
        notes=data.notes or (f"Reason: {data.rejection_reason}" if data.rejection_reason else None),
    )

    try:
        db.add(history)
        audit_service.log_audit_action(
            db,
            action="STATUS_CHANGE",
            entity_type="enquiry",
            entity_id=enquiry.id,
            user_id=user_id,
            changes_summary=f"Enquiry {enquiry.enquiry_number} status changed from {old_status} to {data.status}",
            commit=False,
        )
        db.commit()
        db.refresh(enquiry)
        return _to_enquiry_read(enquiry)
    except Exception:
        db.rollback()
        raise


def get_enquiry_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> EnquirySummaryResponse:
    query = db.query(Enquiry).filter(Enquiry.is_deleted == False)
    if date_from:
        query = query.filter(Enquiry.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Enquiry.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    stats = query.with_entities(
        func.count(Enquiry.id),
        func.count(case((Enquiry.status == "Qualified", 1))),
        func.count(case((Enquiry.status.in_(["New", "Pending", "Under Review"]), 1))),
        func.count(case((Enquiry.status == "Converted", 1))),
        func.count(case((Enquiry.status.in_(["Rejected", "Cancelled"]), 1))),
    ).first()

    total = stats[0] if stats else 0
    qualified = stats[1] if stats else 0
    pending = stats[2] if stats else 0
    converted = stats[3] if stats else 0
    rejected = stats[4] if stats else 0
    rate = round((converted / total * 100), 1) if total > 0 else 0.0

    return EnquirySummaryResponse(
        total_enquiries=total,
        qualified_enquiries=qualified,
        pending_enquiries=pending,
        converted_enquiries=converted,
        rejected_enquiries=rejected,
        conversion_rate=rate,
    )
