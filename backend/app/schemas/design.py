import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class DesignVersionRead(BaseModel):
    id: uuid.UUID
    version_number: int
    file_name: str
    file_url: str
    change_notes: str | None = None
    is_approved: bool
    created_at: datetime
    submitted_by_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DesignVersionCreate(BaseModel):
    file_name: str
    file_url: str
    change_notes: str | None = None


class DesignBase(BaseModel):
    enquiry_id: uuid.UUID | None = None
    assigned_designer_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    priority: str = "Medium"
    estimated_hours: Decimal | None = None
    expected_completion_date: date | None = None


class DesignCreate(DesignBase):
    pass


class DesignUpdate(BaseModel):
    assigned_designer_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    estimated_hours: Decimal | None = None
    actual_hours: Decimal | None = None
    expected_completion_date: date | None = None


class DesignStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class DesignRead(DesignBase):
    id: uuid.UUID
    design_number: str
    status: str
    actual_hours: Decimal | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    enquiry_number: str | None = None
    assigned_designer_name: str | None = None
    versions: list[DesignVersionRead] = []

    model_config = ConfigDict(from_attributes=True)


class DesignListResponse(BaseModel):
    total: int
    items: list[DesignRead]
    page: int
    page_size: int


class DesignSummaryResponse(BaseModel):
    total_designs: int
    pending_designs: int
    in_progress_designs: int
    completed_designs: int
    overdue_designs: int
