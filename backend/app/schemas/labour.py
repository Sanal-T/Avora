import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class WorkerBase(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    skill_category: str = "General"
    status: str = "Available"
    daily_rate: Decimal | None = None


class WorkerCreate(WorkerBase):
    worker_code: str | None = None


class WorkerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    skill_category: str | None = None
    status: str | None = None
    daily_rate: Decimal | None = None
    is_active: bool | None = None


class WorkerRead(WorkerBase):
    id: uuid.UUID
    worker_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LabourAssignmentCreate(BaseModel):
    worker_id: uuid.UUID
    work_order_id: uuid.UUID | None = None
    start_date: date
    end_date: date | None = None


class LabourAssignmentRead(BaseModel):
    id: uuid.UUID
    labour_request_id: uuid.UUID | None = None
    worker_id: uuid.UUID
    worker_name: str | None = None
    work_order_id: uuid.UUID | None = None
    start_date: date
    end_date: date | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LabourRequestCreate(BaseModel):
    work_order_id: uuid.UUID | None = None
    department_id: str | None = None
    required_workers_count: int = 1
    required_date: date
    skill_category: str = "General"
    notes: str | None = None


class LabourRequestStatusUpdate(BaseModel):
    status: str  # Approved, Rejected, Fulfilled


class LabourRequestRead(BaseModel):
    id: uuid.UUID
    request_number: str
    work_order_id: uuid.UUID | None = None
    department_id: str | None = None
    required_workers_count: int
    required_date: date
    skill_category: str
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    assignments: list[LabourAssignmentRead] = []

    model_config = ConfigDict(from_attributes=True)


class WorkerListResponse(BaseModel):
    total: int
    items: list[WorkerRead]
    page: int
    page_size: int


class LabourRequestListResponse(BaseModel):
    total: int
    items: list[LabourRequestRead]
    page: int
    page_size: int


class LabourSummaryResponse(BaseModel):
    total_workers: int
    available_workers: int
    assigned_workers: int
    pending_requests: int
    utilization_rate: float
