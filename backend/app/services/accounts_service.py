import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

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


def _to_accounts_read(record: AccountsRecord) -> AccountsRecordRead:
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
        invoices=[InvoiceRead.model_validate(inv) for inv in record.invoices],
        payments=[
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
        ],
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
    total = query.count()
    items = (
        query.options(joinedload(AccountsRecord.project).joinedload(Project.customer))
        .order_by(AccountsRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return total, [_to_accounts_read(r) for r in items]


def get_accounts_record_orm(db: Session, record_id: uuid.UUID) -> AccountsRecord:
    record = (
        db.query(AccountsRecord)
        .options(joinedload(AccountsRecord.project).joinedload(Project.customer))
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
    records = db.query(AccountsRecord).filter(AccountsRecord.is_deleted == False).all()
    invoices = db.query(Invoice).filter(Invoice.status != "Cancelled").all()
    today = date.today()

    total_invoiced = sum((r.total_invoiced or Decimal("0.00") for r in records), Decimal("0.00"))
    total_received = sum((r.total_received or Decimal("0.00") for r in records), Decimal("0.00"))
    outstanding_balance = sum((r.outstanding_amount or Decimal("0.00") for r in records), Decimal("0.00"))
    collection_rate = round(float(total_received / total_invoiced) * 100.0, 1) if total_invoiced > Decimal("0.00") else 0.0

    overdue_payments = sum(
        1
        for inv in invoices
        if inv.due_date and inv.due_date < today and inv.outstanding_amount > Decimal("0.00")
    )

    return AccountsSummaryResponse(
        total_accounts_records=len(records),
        invoices_pending=sum(1 for r in records if r.status in ("Sent to Accounts", "Invoice Pending")),
        invoices_generated=sum(1 for r in records if r.status == "Invoice Generated"),
        payments_pending=sum(1 for r in records if r.status == "Payment Pending"),
        partially_paid=sum(1 for r in records if r.status == "Partially Paid"),
        fully_paid=sum(1 for r in records if r.status == "Fully Paid"),
        closed_records=sum(1 for r in records if r.status == "Closed"),
        overdue_payments=overdue_payments,
        total_invoiced=total_invoiced,
        total_received=total_received,
        outstanding_balance=outstanding_balance,
        collection_rate=collection_rate,
    )
