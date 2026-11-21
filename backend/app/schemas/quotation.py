import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class QuotationItemBase(BaseModel):
    item_code: str | None = None
    description: str
    quantity: Decimal = Field(gt=Decimal("0.00"), description="Quantity must be greater than zero")
    unit: str = "unit"
    unit_price: Decimal = Field(ge=Decimal("0.00"), description="Unit price cannot be negative")
    sort_order: int = 0


class QuotationItemCreate(QuotationItemBase):
    pass


class QuotationItemRead(QuotationItemBase):
    id: uuid.UUID
    total_price: Decimal

    model_config = ConfigDict(from_attributes=True)


class QuotationFollowUpBase(BaseModel):
    scheduled_date: date
    notes: str
    outcome: str | None = None
    assigned_employee_id: uuid.UUID | None = None


class QuotationFollowUpCreate(QuotationFollowUpBase):
    pass


class QuotationFollowUpRead(QuotationFollowUpBase):
    id: uuid.UUID
    is_completed: bool
    completed_date: date | None = None
    created_at: datetime
    assigned_employee_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class QuotationRevisionRead(BaseModel):
    id: uuid.UUID
    revision_number: int
    total_amount: Decimal
    change_summary: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuotationCreate(BaseModel):
    enquiry_id: uuid.UUID | None = None
    customer_id: uuid.UUID
    discount_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))
    tax_rate: Decimal = Field(default=Decimal("18.00"), ge=Decimal("0.00"), le=Decimal("100.00"))
    valid_until: date | None = None
    currency: str = "INR"
    items: list[QuotationItemCreate] = []


class QuotationUpdate(BaseModel):
    discount_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))
    tax_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))
    valid_until: date | None = None
    currency: str | None = None
    items: list[QuotationItemCreate] | None = None


class QuotationStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None
    notes: str | None = None


class QuotationRevisionCreate(BaseModel):
    change_summary: str
    items: list[QuotationItemCreate]
    discount_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))
    tax_rate: Decimal = Field(default=Decimal("18.00"), ge=Decimal("0.00"), le=Decimal("100.00"))


class QuotationRead(BaseModel):
    id: uuid.UUID
    quotation_number: str
    revision_number: int
    enquiry_id: uuid.UUID | None = None
    customer_id: uuid.UUID
    status: str
    subtotal: Decimal
    discount_rate: Decimal
    discount_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    valid_until: date | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    customer_company: str | None = None
    items: list[QuotationItemRead] = []
    revisions: list[QuotationRevisionRead] = []
    follow_ups: list[QuotationFollowUpRead] = []
    has_work_order: bool = False

    model_config = ConfigDict(from_attributes=True)


class QuotationListResponse(BaseModel):
    total: int
    items: list[QuotationRead]
    page: int
    page_size: int


class QuotationSummaryResponse(BaseModel):
    total_quotations: int
    total_value: Decimal
    approved_quotations: int
    approved_value: Decimal
    pending_quotations: int
    converted_quotations: int
    pending_follow_ups: int
