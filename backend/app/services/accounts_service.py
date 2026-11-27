import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.accounts import AccountsRecord, Invoice, Payment
from app.models.project import Project, ProjectStatusHistory
from app.schemas.accounts import (
    AccountsRecordRead,
    AccountsRecordUpdate,
    AccountsSummaryResponse,
    InvoiceCreate,
    InvoiceRead,
    PaymentCreate,
    PaymentRead,
)
from app.services import audit_service

VALID_ACCOUNTS_STATUSES = [
    "Not Sent to Accounts",
    "Sent to Accounts",
    "Invoice Pending",
    "Invoice Generated",
    "Payment Pending",
    "Partially Paid",
    "Fully Paid",
    "Closed",
]


def _to_accounts_read(record: AccountsRecord, include_details: bool = True) -> AccountsRecordRead:
    return AccountsRecordRead(
        id=record.id,
        accounts_number=record.accounts_number,
        project_id=record.project_id,
        work_order_id=record.work_order_id,
        production_completion_date=record.production_completion_date,
        accounts_transfer_date=record.accounts_transfer_date,
        status=record.status,
        total_invoiced=record.total_invoiced,
        total_received=record.total_received,
        outstanding_amount=record.outstanding_amount,
        remarks=record.remarks,
        closed_at=record.closed_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
        project_number=record.project.project_number if record.project else None,
        project_name=record.project.name if record.project else None,
        customer_name=record.project.customer.name if record.project and record.project.customer else None,
        invoices=[InvoiceRead.model_validate(inv) for inv in record.invoices] if include_details else [],
        payments=(
            [
                PaymentRead(
                    id=p.id,
                    accounts_record_id=p.accounts_record_id,
                    invoice_id=p.invoice_id,
                    project_id=p.project_id,
                    payment_date=p.payment_date,
                    amount=p.amount,
                    payment_method=p.payment_method,
                    reference_number=p.reference_number,
                    remarks=p.remarks,
                    recorded_by_name=p.recorded_by.full_name if p.recorded_by else None,
                    created_at=p.created_at,
                )
                for p in record.payments
            ]
            if include_details
            else []
        ),
    )


def _next_accounts_number(db: Session) -> str:
    count = db.query(AccountsRecord).count() + 1001
    candidate = f"ACC-{count}"
    while db.query(AccountsRecord).filter(AccountsRecord.accounts_number == candidate).first() is not None:
        count += 1
        candidate = f"ACC-{count}"
    return candidate


def _next_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count() + 1001
    candidate = f"INV-{count}"
    while db.query(Invoice).filter(Invoice.invoice_number == candidate).first() is not None:
        count += 1
        candidate = f"INV-{count}"
    return candidate


def _recalculate_accounts_totals(db: Session, record: AccountsRecord) -> None:
    invoices = db.query(Invoice).filter(Invoice.accounts_record_id == record.id, Invoice.status != "Cancelled").all()
    payments = db.query(Payment).filter(Payment.accounts_record_id == record.id).all()

    total_invoiced = sum((inv.total_amount for inv in invoices), Decimal("0.00"))
    total_received = sum((pay.amount for pay in payments), Decimal("0.00"))
    outstanding = max(Decimal("0.00"), total_invoiced - total_received)

    record.total_invoiced = total_invoiced
    record.total_received = total_received
    record.outstanding_amount = outstanding

    if total_invoiced > Decimal("0.00"):
        if outstanding == Decimal("0.00"):
            if record.status != "Closed":
                record.status = "Fully Paid"
        elif total_received > Decimal("0.00"):
            record.status = "Partially Paid"
            if record.project:
                record.project.status = "Partially Paid"
        else:
            record.status = "Payment Pending"
    elif invoices:
        record.status = "Invoice Generated"


def list_accounts_records(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    compact: bool = False,
) -> tuple[int, list[AccountsRecordRead]]:
    query = db.query(AccountsRecord).filter(AccountsRecord.is_deleted == False)
    if status_filter and status_filter != "all":
        query = query.filter(AccountsRecord.status == status_filter)
    if search:
        pattern = f"%{search}%"
        query = query.join(Project, AccountsRecord.project_id == Project.id).filter(
            or_(
                AccountsRecord.accounts_number.ilike(pattern),
                Project.project_number.ilike(pattern),
                Project.name.ilike(pattern),
            )
        )
    options = [joinedload(AccountsRecord.project).joinedload(Project.customer)]
    if not compact:
        options.extend(
            [
                selectinload(AccountsRecord.invoices),
                selectinload(AccountsRecord.payments).joinedload(Payment.recorded_by),
            ]
        )
    items = (
        query.options(*options)
        .order_by(AccountsRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_accounts_read(r, include_details=not compact) for r in items]


def get_accounts_record_orm(db: Session, record_id: uuid.UUID) -> AccountsRecord:
    record = (
        db.query(AccountsRecord)
        .options(
            joinedload(AccountsRecord.project).joinedload(Project.customer),
            selectinload(AccountsRecord.invoices),
            selectinload(AccountsRecord.payments).joinedload(Payment.recorded_by),
        )
        .filter(AccountsRecord.id == record_id, AccountsRecord.is_deleted == False)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Accounts record not found.")
    return record


def get_accounts_record(db: Session, record_id: uuid.UUID) -> AccountsRecordRead:
    return _to_accounts_read(get_accounts_record_orm(db, record_id))


def create_accounts_record_for_project(
    db: Session,
    project: Project,
    work_order_id: uuid.UUID | None = None,
    production_completion_date: date | None = None,
    user_id: uuid.UUID | None = None,
    commit: bool = False,
) -> AccountsRecord:
    existing = db.query(AccountsRecord).filter(AccountsRecord.project_id == project.id, AccountsRecord.is_deleted == False).first()
    if existing:
        return existing

    record = AccountsRecord(
        accounts_number=_next_accounts_number(db),
        project_id=project.id,
        work_order_id=work_order_id,
        production_completion_date=production_completion_date or date.today(),
        accounts_transfer_date=date.today(),
        status="Sent to Accounts",
        total_invoiced=Decimal("0.00"),
        total_received=Decimal("0.00"),
        outstanding_amount=project.project_value or Decimal("0.00"),
    )
    db.add(record)
    db.flush()
    audit_service.log_audit_action(
        db,
        action="CREATE",
        entity_type="accounts_record",
        entity_id=record.id,
        user_id=user_id,
        changes_summary=f"Created Accounts record {record.accounts_number} for project {project.project_number}",
        commit=False,
    )
    if commit:
        db.commit()
        db.refresh(record)
    return record


def update_accounts_record(
    db: Session,
    record_id: uuid.UUID,
    data: AccountsRecordUpdate,
    user_id: uuid.UUID | None = None,
) -> AccountsRecordRead:
    record = get_accounts_record_orm(db, record_id)
    if data.status:
        if data.status not in VALID_ACCOUNTS_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid accounts status. Allowed: {VALID_ACCOUNTS_STATUSES}")
        if data.status == "Closed" and record.outstanding_amount > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot financially close an accounts record while an outstanding balance remains.",
            )
        record.status = data.status
        if data.status == "Closed":
            record.closed_at = datetime.now(timezone.utc)
            if record.project:
                old_p_status = record.project.status
                record.project.status = "Closed"
                record.project.actual_completion_date = record.project.actual_completion_date or date.today()
                db.add(
                    ProjectStatusHistory(
                        project_id=record.project.id,
                        from_status=old_p_status,
                        to_status="Closed",
                        changed_by_id=user_id,
                        notes=f"Project financially closed via {record.accounts_number}",
                    )
                )
    if data.remarks is not None:
        record.remarks = data.remarks

    audit_service.log_audit_action(
        db,
        action="UPDATE",
        entity_type="accounts_record",
        entity_id=record.id,
        user_id=user_id,
        changes_summary=f"Updated accounts record {record.accounts_number} (status: {record.status})",
        commit=False,
    )
    db.commit()
    return get_accounts_record(db, record.id)


def create_invoice(
    db: Session,
    record_id: uuid.UUID,
    data: InvoiceCreate,
    user_id: uuid.UUID | None = None,
) -> AccountsRecordRead:
    record = get_accounts_record_orm(db, record_id)
    inv_num = data.invoice_number or _next_invoice_number(db)
    if db.query(Invoice).filter(Invoice.invoice_number == inv_num).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Invoice number {inv_num} already exists.")

    total = data.invoice_amount + data.tax_amount
    invoice = Invoice(
        accounts_record_id=record.id,
        project_id=record.project_id,
        invoice_number=inv_num,
        invoice_date=data.invoice_date or date.today(),
        due_date=data.due_date,
        invoice_amount=data.invoice_amount,
        tax_amount=data.tax_amount,
        total_amount=total,
        amount_received=Decimal("0.00"),
        outstanding_amount=total,
        status="Generated",
        remarks=data.remarks,
    )
    try:
        db.add(invoice)
        db.flush()
        _recalculate_accounts_totals(db, record)
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="invoice",
            entity_id=invoice.id,
            user_id=user_id,
            changes_summary=f"Generated invoice {invoice.invoice_number} for {total}",
            commit=False,
        )
        db.commit()
        return get_accounts_record(db, record.id)
    except Exception:
        db.rollback()
        raise


def record_payment(
    db: Session,
    record_id: uuid.UUID,
    data: PaymentCreate,
    user_id: uuid.UUID | None = None,
) -> AccountsRecordRead:
    record = get_accounts_record_orm(db, record_id)
    invoice: Invoice | None = None
    if data.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id, Invoice.accounts_record_id == record.id).first()
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found for this accounts record.")

    payment = Payment(
        accounts_record_id=record.id,
        invoice_id=invoice.id if invoice else None,
        project_id=record.project_id,
        payment_date=data.payment_date or date.today(),
        amount=data.amount,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        remarks=data.remarks,
        recorded_by_id=user_id,
    )
    try:
        db.add(payment)
        db.flush()
        if invoice:
            invoice.amount_received = (invoice.amount_received or Decimal("0.00")) + data.amount
            invoice.outstanding_amount = max(Decimal("0.00"), invoice.total_amount - invoice.amount_received)
            invoice.status = "Paid" if invoice.outstanding_amount == Decimal("0.00") else "Partially Paid"

        _recalculate_accounts_totals(db, record)
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="payment",
            entity_id=payment.id,
            user_id=user_id,
            changes_summary=f"Recorded payment of {data.amount} on {record.accounts_number}",
            commit=False,
        )
        db.commit()
        return get_accounts_record(db, record.id)
    except Exception:
        db.rollback()
        raise


def get_accounts_summary(db: Session) -> AccountsSummaryResponse:
    today = date.today()
    stats = (
        db.query(
            func.count(AccountsRecord.id),
            func.count(case((AccountsRecord.status.in_(["Sent to Accounts", "Invoice Pending"]), 1))),
            func.count(case((AccountsRecord.status == "Invoice Generated", 1))),
            func.count(case((AccountsRecord.status == "Payment Pending", 1))),
            func.count(case((AccountsRecord.status == "Partially Paid", 1))),
            func.count(case((AccountsRecord.status == "Fully Paid", 1))),
            func.count(case((AccountsRecord.status == "Closed", 1))),
            func.coalesce(func.sum(AccountsRecord.total_invoiced), Decimal("0.00")),
            func.coalesce(func.sum(AccountsRecord.total_received), Decimal("0.00")),
            func.coalesce(func.sum(AccountsRecord.outstanding_amount), Decimal("0.00")),
        )
        .filter(AccountsRecord.is_deleted == False)
        .first()
    )

    overdue_payments = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.status != "Cancelled",
            Invoice.due_date != None,
            Invoice.due_date < today,
            Invoice.outstanding_amount > Decimal("0.00"),
        )
        .scalar()
        or 0
    )

    total_invoiced = stats[7] if stats else Decimal("0.00")
    total_received = stats[8] if stats else Decimal("0.00")
    outstanding_balance = stats[9] if stats else Decimal("0.00")
    collection_rate = round(float(total_received / total_invoiced) * 100.0, 1) if total_invoiced > Decimal("0.00") else 0.0

    return AccountsSummaryResponse(
        total_accounts_records=stats[0] if stats else 0,
        invoices_pending=stats[1] if stats else 0,
        invoices_generated=stats[2] if stats else 0,
        payments_pending=stats[3] if stats else 0,
        partially_paid=stats[4] if stats else 0,
        fully_paid=stats[5] if stats else 0,
        closed_records=stats[6] if stats else 0,
        overdue_payments=overdue_payments,
        total_invoiced=total_invoiced,
        total_received=total_received,
        outstanding_balance=outstanding_balance,
        collection_rate=collection_rate,
    )
