import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class EnquiryStatusHistoryRead(BaseModel):
    id: uuid.UUID
    from_status: str | None = None
    to_status: str
    notes: str | None = None
    created_at: datetime
    changed_by_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EnquiryBase(BaseModel):
    customer_id: uuid.UUID
    assigned_employee_id: uuid.UUID | None = None
    source: str | None = "Direct"
    requirement_summary: str
    estimated_budget: Decimal | None = None
    priority: str = "Medium"


class EnquiryCreate(EnquiryBase):
    pass


class EnquiryUpdate(BaseModel):
    assigned_employee_id: uuid.UUID | None = None
    source: str | None = None
    requirement_summary: str | None = None
    estimated_budget: Decimal | None = None
    priority: str | None = None


class EnquiryStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None
    notes: str | None = None


class EnquiryRead(EnquiryBase):
    id: uuid.UUID
    enquiry_number: str
    status: str
    rejection_reason: str | None = None
    qualified_at: datetime | None = None
    converted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    customer_company: str | None = None
    assigned_employee_name: str | None = None
    status_history: list[EnquiryStatusHistoryRead] = []

    model_config = ConfigDict(from_attributes=True)


class EnquiryListResponse(BaseModel):
    total: int
    items: list[EnquiryRead]
    page: int
    page_size: int


class EnquirySummaryResponse(BaseModel):
    total_enquiries: int
    qualified_enquiries: int
    pending_enquiries: int
    converted_enquiries: int
    rejected_enquiries: int
    conversion_rate: float
