import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class InvoiceCreate(BaseModel):
    invoice_number: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    invoice_amount: Decimal = Field(gt=Decimal("0.00"))
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    remarks: str | None = None


class InvoiceRead(BaseModel):
    id: uuid.UUID
    accounts_record_id: uuid.UUID
    project_id: uuid.UUID
    invoice_number: str
    invoice_date: date
    due_date: date | None = None
    invoice_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_received: Decimal
    outstanding_amount: Decimal
    status: str
    remarks: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID | None = None
    payment_date: date | None = None
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_method: str = "Bank Transfer"
    reference_number: str | None = None
    remarks: str | None = None


class PaymentRead(BaseModel):
    id: uuid.UUID
    accounts_record_id: uuid.UUID
    invoice_id: uuid.UUID | None = None
    project_id: uuid.UUID
    payment_date: date
    amount: Decimal
    payment_method: str
    reference_number: str | None = None
    remarks: str | None = None
    recorded_by_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccountsRecordUpdate(BaseModel):
    status: str | None = None
    remarks: str | None = None


class AccountsRecordRead(BaseModel):
    id: uuid.UUID
    accounts_number: str
    project_id: uuid.UUID
    work_order_id: uuid.UUID | None = None
    production_completion_date: date | None = None
    accounts_transfer_date: date | None = None
    status: str
    total_invoiced: Decimal
    total_received: Decimal
    outstanding_amount: Decimal
    remarks: str | None = None
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    project_number: str | None = None
    project_name: str | None = None
    customer_name: str | None = None
    invoices: list[InvoiceRead] = []
    payments: list[PaymentRead] = []

    model_config = ConfigDict(from_attributes=True)


class AccountsListResponse(BaseModel):
    total: int
    items: list[AccountsRecordRead]
    page: int
    page_size: int


class AccountsSummaryResponse(BaseModel):
    total_accounts_records: int
    invoices_pending: int
    invoices_generated: int
    payments_pending: int
    partially_paid: int
    fully_paid: int
    closed_records: int
    overdue_payments: int
    total_invoiced: Decimal
    total_received: Decimal
    outstanding_balance: Decimal
    collection_rate: float
