import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import case, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.auth import Employee
from app.models.customer import Customer
from app.models.production import WorkOrder, WorkOrderStatusHistory
from app.models.project import ProjectStatusHistory
from app.models.quotation import Quotation, QuotationFollowUp, QuotationItem, QuotationRevision, QuotationStatusHistory
from app.services import audit_service, project_service
from app.schemas.quotation import (
    QuotationCreate,
    QuotationFollowUpCreate,
    QuotationFollowUpRead,
    QuotationItemCreate,
    QuotationItemRead,
    QuotationRead,
    QuotationRevisionCreate,
    QuotationRevisionRead,
    QuotationStatusUpdate,
    QuotationSummaryResponse,
    QuotationUpdate,
)

VALID_QUOTATION_STATUSES = [
    "Draft",
    "Sent",
    "Awaiting Response",
    "Pending Approval",
    "Approved",
    "Rejected",
    "Revision Requested",
    "Converted",
    "Expired",
    "Cancelled",
]


def _round_currency(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_quotation_totals(items: list[QuotationItemCreate], discount_rate: Decimal, tax_rate: Decimal) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    subtotal = Decimal("0.00")
    for it in items:
        line_total = _round_currency(Decimal(str(it.quantity)) * Decimal(str(it.unit_price)))
        subtotal += line_total

    disc_rate = Decimal(str(discount_rate))
    tx_rate = Decimal(str(tax_rate))

    discount_amount = _round_currency((subtotal * disc_rate) / Decimal("100.00"))
    taxable_amount = subtotal - discount_amount
    tax_amount = _round_currency((taxable_amount * tx_rate) / Decimal("100.00"))
    total_amount = taxable_amount + tax_amount

    return subtotal, discount_amount, tax_amount, total_amount


def _to_quotation_read(
    quotation: Quotation,
    include_details: bool = True,
    include_follow_ups: bool = True,
) -> QuotationRead:
    item_reads = (
        [
            QuotationItemRead(
                id=i.id,
                item_code=i.item_code,
                description=i.description,
                quantity=i.quantity,
                unit=i.unit,
                unit_price=i.unit_price,
                total_price=i.total_price,
                sort_order=i.sort_order,
            )
            for i in quotation.items
        ]
        if include_details
        else []
    )
    rev_reads = (
        [
            QuotationRevisionRead(
                id=r.id,
                revision_number=r.revision_number,
                total_amount=r.total_amount,
                change_summary=r.change_summary,
                created_at=r.created_at,
            )
            for r in quotation.revisions
        ]
        if include_details
        else []
    )
    follow_reads = (
        [
            QuotationFollowUpRead(
                id=f.id,
                scheduled_date=f.scheduled_date,
                notes=f.notes,
                outcome=f.outcome,
                assigned_employee_id=f.assigned_employee_id,
                contacted_person=f.contacted_person,
                company=f.company,
                contact_method=f.contact_method,
                customer_response=f.customer_response,
                next_follow_up_date=f.next_follow_up_date,
                is_completed=f.is_completed,
                completed_date=f.completed_date,
                created_at=f.created_at,
                assigned_employee_name=f"{f.assigned_employee.first_name} {f.assigned_employee.last_name}" if f.assigned_employee else None,
            )
            for f in quotation.follow_ups
        ]
        if (include_details or include_follow_ups)
        else []
    )
    return QuotationRead(
        id=quotation.id,
        quotation_number=quotation.quotation_number,
        revision_number=quotation.revision_number,
        enquiry_id=quotation.enquiry_id,
        design_id=quotation.design_id,
        project_id=quotation.project_id,
        customer_id=quotation.customer_id,
        status=quotation.status,
        subtotal=quotation.subtotal,
        discount_rate=quotation.discount_rate,
        discount_amount=quotation.discount_amount,
        tax_rate=quotation.tax_rate,
        tax_amount=quotation.tax_amount,
        total_amount=quotation.total_amount,
        approved_value=quotation.approved_value,
        currency=quotation.currency,
        sent_date=quotation.sent_date,
        valid_until=quotation.valid_until,
        approved_at=quotation.approved_at,
        rejection_reason=quotation.rejection_reason,
        remarks=quotation.remarks,
        created_at=quotation.created_at,
        updated_at=quotation.updated_at,
        customer_name=quotation.customer.name if quotation.customer else None,
        customer_company=quotation.customer.company_name if quotation.customer else None,
        items=item_reads,
        revisions=rev_reads,
        follow_ups=follow_reads,
        has_work_order=quotation.work_order is not None,
    )


def list_quotations(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    compact: bool = False,
    include_follow_ups: bool = False,
) -> tuple[int, list[QuotationRead]]:
    query = db.query(Quotation).filter(Quotation.is_deleted == False)
    if status_filter:
        query = query.filter(Quotation.status == status_filter)
    if date_from:
        query = query.filter(Quotation.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Quotation.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    if search:
        search_filter = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                Quotation.quotation_number.ilike(search_filter),
                Customer.name.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
            )
        )
    options = [
        joinedload(Quotation.customer),
        joinedload(Quotation.work_order),
    ]
    if not compact:
        options.extend(
            [
                selectinload(Quotation.items),
                selectinload(Quotation.revisions),
                selectinload(Quotation.follow_ups).joinedload(QuotationFollowUp.assigned_employee),
            ]
        )
    elif include_follow_ups:
        options.append(selectinload(Quotation.follow_ups).joinedload(QuotationFollowUp.assigned_employee))

    items = (
        query.options(*options)
        .order_by(Quotation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [
        _to_quotation_read(
            item,
            include_details=not compact,
            include_follow_ups=(not compact) or include_follow_ups,
        )
        for item in items
    ]


def get_quotation(db: Session, quotation_id: uuid.UUID) -> Quotation:
    quotation = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.work_order),
            selectinload(Quotation.items),
            selectinload(Quotation.revisions),
            selectinload(Quotation.follow_ups).joinedload(QuotationFollowUp.assigned_employee),
        )
        .filter(Quotation.id == quotation_id, Quotation.is_deleted == False)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")
    return quotation


def create_quotation(db: Session, data: QuotationCreate, user_id: uuid.UUID | None = None) -> QuotationRead:
    customer = db.query(Customer).filter(Customer.id == data.customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced customer does not exist.")

    count = db.query(Quotation).count() + 1
    quotation_number = f"Q-{count + 2040}"

    subtotal, discount_amount, tax_amount, total_amount = calculate_quotation_totals(data.items, data.discount_rate, data.tax_rate)

    quotation = Quotation(
        quotation_number=quotation_number,
        revision_number=1,
        enquiry_id=data.enquiry_id,
        customer_id=data.customer_id,
        status="Draft",
        subtotal=subtotal,
        discount_rate=data.discount_rate,
        discount_amount=discount_amount,
        tax_rate=data.tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency=data.currency,
        valid_until=data.valid_until,
    )

    try:
        db.add(quotation)
        db.flush()

        for idx, it in enumerate(data.items):
            item_total = _round_currency(Decimal(str(it.quantity)) * Decimal(str(it.unit_price)))
            item = QuotationItem(
                quotation_id=quotation.id,
                item_code=it.item_code,
                description=it.description,
                quantity=it.quantity,
                unit=it.unit,
                unit_price=it.unit_price,
                total_price=item_total,
                sort_order=idx + 1,
            )
            db.add(item)

        history = QuotationStatusHistory(
            quotation_id=quotation.id,
            from_status=None,
            to_status="Draft",
            changed_by_id=user_id,
            notes="Quotation draft created.",
        )
        db.add(history)

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="quotation",
            entity_id=quotation.id,
            user_id=user_id,
            changes_summary=f"Created quotation {quotation.quotation_number} with {len(data.items)} items totaling {quotation.total_amount}",
            commit=False,
        )
        db.commit()
        db.refresh(quotation)
        return _to_quotation_read(quotation)
    except Exception:
        db.rollback()
        raise


def update_quotation(db: Session, quotation_id: uuid.UUID, data: QuotationUpdate, user_id: uuid.UUID | None = None) -> QuotationRead:
    quotation = get_quotation(db, quotation_id)
    if quotation.status in ["Approved", "Converted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation in status '{quotation.status}' cannot be edited directly. Please create a revision.",
        )

    if data.discount_rate is not None:
        quotation.discount_rate = data.discount_rate
    if data.tax_rate is not None:
        quotation.tax_rate = data.tax_rate
    if data.valid_until is not None:
        quotation.valid_until = data.valid_until
    if data.currency is not None:
        quotation.currency = data.currency

    if data.items is not None:
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation.id).delete()
        for idx, it in enumerate(data.items):
            item_total = _round_currency(Decimal(str(it.quantity)) * Decimal(str(it.unit_price)))
            item = QuotationItem(
                quotation_id=quotation.id,
                item_code=it.item_code,
                description=it.description,
                quantity=it.quantity,
                unit=it.unit,
                unit_price=it.unit_price,
                total_price=item_total,
                sort_order=idx + 1,
            )
            db.add(item)
        subtotal, discount_amount, tax_amount, total_amount = calculate_quotation_totals(
            data.items, quotation.discount_rate, quotation.tax_rate
        )
        quotation.subtotal = subtotal
        quotation.discount_amount = discount_amount
        quotation.tax_amount = tax_amount
        quotation.total_amount = total_amount

    try:
        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="quotation",
            entity_id=quotation.id,
            user_id=user_id,
            changes_summary=f"Updated draft quotation {quotation.quotation_number} (total {quotation.total_amount})",
            commit=False,
        )
        db.commit()
        db.refresh(quotation)
        return _to_quotation_read(quotation)
    except Exception:
        db.rollback()
        raise


def update_quotation_status(db: Session, quotation_id: uuid.UUID, data: QuotationStatusUpdate, user_id: uuid.UUID | None = None) -> QuotationRead:
    if data.status not in VALID_QUOTATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid quotation status. Allowed: {VALID_QUOTATION_STATUSES}")

    quotation = get_quotation(db, quotation_id)
    old_status = quotation.status

    if old_status == "Approved" and data.status not in ["Approved", "Converted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved quotations cannot be directly altered. Please create a new revision.",
        )

    quotation.status = data.status
    if data.status == "Sent" and not quotation.sent_date:
        quotation.sent_date = date.today()
    elif data.status == "Approved":
        quotation.approved_at = datetime.now(timezone.utc)
        quotation.approved_value = quotation.approved_value or quotation.total_amount
        project_service.ensure_project_for_quotation(db, quotation, user_id=user_id, commit=False)
    elif data.status == "Rejected":
        quotation.rejection_reason = data.rejection_reason

    history = QuotationStatusHistory(
        quotation_id=quotation.id,
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
            entity_type="quotation",
            entity_id=quotation.id,
            user_id=user_id,
            changes_summary=f"Quotation {quotation.quotation_number} status changed from {old_status} to {data.status}",
            commit=False,
        )
        db.commit()
        db.refresh(quotation)
        return _to_quotation_read(quotation)
    except Exception:
        db.rollback()
        raise


def create_quotation_revision(db: Session, quotation_id: uuid.UUID, data: QuotationRevisionCreate, user_id: uuid.UUID | None = None) -> QuotationRead:
    quotation = get_quotation(db, quotation_id)

    try:
        # 1. Archive current revision into QuotationRevision
        archived_rev = QuotationRevision(
            quotation_id=quotation.id,
            revision_number=quotation.revision_number,
            total_amount=quotation.total_amount,
            change_summary=data.change_summary,
            created_by_id=user_id,
        )
        db.add(archived_rev)

        # 2. Increment revision number
        quotation.revision_number += 1
        quotation.status = "Draft"
        quotation.approved_at = None

        # 3. Recalculate totals with new items
        subtotal, discount_amount, tax_amount, total_amount = calculate_quotation_totals(data.items, data.discount_rate, data.tax_rate)
        quotation.subtotal = subtotal
        quotation.discount_rate = data.discount_rate
        quotation.discount_amount = discount_amount
        quotation.tax_rate = data.tax_rate
        quotation.tax_amount = tax_amount
        quotation.total_amount = total_amount

        # 4. Replace items
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation.id).delete()
        for idx, it in enumerate(data.items):
            item_total = _round_currency(Decimal(str(it.quantity)) * Decimal(str(it.unit_price)))
            item = QuotationItem(
                quotation_id=quotation.id,
                item_code=it.item_code,
                description=it.description,
                quantity=it.quantity,
                unit=it.unit,
                unit_price=it.unit_price,
                total_price=item_total,
                sort_order=idx + 1,
            )
            db.add(item)

        history = QuotationStatusHistory(
            quotation_id=quotation.id,
            from_status=f"Rev {quotation.revision_number - 1}",
            to_status=f"Rev {quotation.revision_number} Draft",
            changed_by_id=user_id,
            notes=f"Revision created: {data.change_summary}",
        )
        db.add(history)

        audit_service.log_audit_action(
            db,
            action="REVISE",
            entity_type="quotation",
            entity_id=quotation.id,
            user_id=user_id,
            changes_summary=f"Created revision {quotation.revision_number} for {quotation.quotation_number}: {data.change_summary}",
            commit=False,
        )
        db.commit()
        db.refresh(quotation)
        return _to_quotation_read(quotation)
    except Exception:
        db.rollback()
        raise


def convert_quotation_to_work_order(db: Session, quotation_id: uuid.UUID, user_id: uuid.UUID | None = None) -> WorkOrder:
    quotation = get_quotation(db, quotation_id)
    if quotation.status != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved quotations can be converted to production work orders.",
        )

    # Check duplicate conversion
    existing_wo = db.query(WorkOrder).filter(WorkOrder.quotation_id == quotation.id).first()
    if existing_wo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Work order {existing_wo.work_order_number} has already been created for this quotation.",
        )

    count = db.query(WorkOrder).count() + 1
    while True:
        work_order_number = f"WO-{count + 840:04d}"
        if not db.query(WorkOrder).filter(WorkOrder.work_order_number == work_order_number).first():
            break
        count += 1

    planned_end = (
        quotation.valid_until
        if (quotation.valid_until and quotation.valid_until > date.today())
        else (date.today() + timedelta(days=14))
    )

    try:
        project = project_service.ensure_project_for_quotation(db, quotation, user_id=user_id, commit=False)
        old_project_status = project.status
        project.status = "Waiting for Production"
        db.add(
            ProjectStatusHistory(
                project_id=project.id,
                from_status=old_project_status,
                to_status="Waiting for Production",
                changed_by_id=user_id,
                notes=f"Transferred to Production ({work_order_number})",
            )
        )

        work_order = WorkOrder(
            work_order_number=work_order_number,
            quotation_id=quotation.id,
            project_id=project.id,
            customer_id=quotation.customer_id,
            title=f"Work Order for {quotation.quotation_number} - {quotation.customer.name}",
            status="Pending",
            priority="Medium",
            planned_start_date=date.today(),
            planned_end_date=planned_end,
            notes=f"Converted from quotation {quotation.quotation_number} Rev {quotation.revision_number}",
        )
        db.add(work_order)
        db.flush()

        wo_history = WorkOrderStatusHistory(
            work_order_id=work_order.id,
            from_status=None,
            to_status="Pending",
            changed_by_id=user_id,
            notes="Generated from approved quotation.",
        )
        db.add(wo_history)

        quote_history = QuotationStatusHistory(
            quotation_id=quotation.id,
            from_status="Approved",
            to_status="Converted",
            changed_by_id=user_id,
            notes=f"Converted to Work Order {work_order.work_order_number}.",
        )
        db.add(quote_history)

        quotation.status = "Converted"

        audit_service.log_audit_action(
            db,
            action="CONVERT",
            entity_type="quotation",
            entity_id=quotation.id,
            user_id=user_id,
            changes_summary=f"Converted quotation {quotation.quotation_number} to Work Order {work_order.work_order_number}",
            commit=False,
        )
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="work_order",
            entity_id=work_order.id,
            user_id=user_id,
            changes_summary=f"Created Work Order {work_order.work_order_number} from approved Quotation {quotation.quotation_number}",
            commit=False,
        )

        db.commit()
        db.refresh(work_order)
        return work_order
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Work order already created or duplicate constraint violated for quotation {quotation.quotation_number}.",
        )
    except Exception:
        db.rollback()
        raise


def add_follow_up(db: Session, quotation_id: uuid.UUID, data: QuotationFollowUpCreate, user_id: uuid.UUID | None = None) -> QuotationRead:
    quotation = get_quotation(db, quotation_id)
    follow_up = QuotationFollowUp(
        quotation_id=quotation.id,
        scheduled_date=data.scheduled_date,
        notes=data.notes,
        outcome=data.outcome,
        assigned_employee_id=data.assigned_employee_id,
        contacted_person=data.contacted_person,
        company=data.company,
        contact_method=data.contact_method,
        customer_response=data.customer_response,
        next_follow_up_date=data.next_follow_up_date,
        is_completed=False,
    )
    db.add(follow_up)
    db.commit()
    db.refresh(quotation)
    return _to_quotation_read(quotation)


def get_quotation_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> QuotationSummaryResponse:
    query = db.query(Quotation).filter(Quotation.is_deleted == False)
    if date_from:
        query = query.filter(Quotation.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Quotation.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    total_stats = query.with_entities(
        func.count(Quotation.id),
        func.coalesce(func.sum(Quotation.total_amount), Decimal("0.00")),
        func.count(case((Quotation.status.in_(["Approved", "Converted"]), 1))),
        func.coalesce(func.sum(case((Quotation.status.in_(["Approved", "Converted"]), Quotation.total_amount), else_=Decimal("0.00"))), Decimal("0.00")),
        func.count(case((Quotation.status.in_(["Draft", "Sent", "Awaiting Response", "Revision Requested"]), 1))),
        func.count(case((Quotation.status == "Converted", 1))),
    ).first()

    total_count = total_stats[0] if total_stats else 0
    total_val = total_stats[1] if total_stats else Decimal("0.00")
    approved_count = total_stats[2] if total_stats else 0
    approved_val = total_stats[3] if total_stats else Decimal("0.00")
    pending_count = total_stats[4] if total_stats else 0
    converted_count = total_stats[5] if total_stats else 0

    pending_follow_ups = (
        db.query(func.count(QuotationFollowUp.id))
        .join(Quotation, QuotationFollowUp.quotation_id == Quotation.id)
        .filter(Quotation.is_deleted == False, QuotationFollowUp.is_completed == False)
        .scalar() or 0
    )

    return QuotationSummaryResponse(
        total_quotations=total_count,
        total_value=total_val,
        approved_quotations=approved_count,
        approved_value=approved_val,
        pending_quotations=pending_count,
        converted_quotations=converted_count,
        pending_follow_ups=pending_follow_ups,
    )
