import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProductionTaskBase(BaseModel):
    task_name: str = Field(min_length=1)
    sequence_order: int = 1
    status: str = "Pending"
    assigned_employee_id: uuid.UUID | None = None
    planned_hours: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    actual_hours: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    completion_notes: str | None = None


class ProductionTaskCreate(ProductionTaskBase):
    pass


class ProductionTaskUpdate(BaseModel):
    status: str | None = None
    actual_hours: Decimal | None = None
    completion_notes: str | None = None


class ProductionTaskRead(ProductionTaskBase):
    id: uuid.UUID
    work_order_id: uuid.UUID
    assigned_employee_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstallationBase(BaseModel):
    project_id: uuid.UUID | None = None
    site_address: str
    scheduled_date: date
    completed_date: date | None = None
    status: str = "Scheduled"
    assigned_team: str | None = None
    lead_installer_id: uuid.UUID | None = None
    completion_notes: str | None = None
    remarks: str | None = None
    signoff_by: str | None = None


class InstallationCreate(InstallationBase):
    pass


class InstallationRead(InstallationBase):
    id: uuid.UUID
    work_order_id: uuid.UUID
    signoff_at: datetime | None = None
    lead_installer_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkOrderBase(BaseModel):
    title: str
    priority: str = "Medium"
    production_slot: str | None = None
    responsible_team: str | None = None
    progress_percentage: int = Field(default=0, ge=0, le=100)
    delay_reason: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    notes: str | None = None


class WorkOrderCreate(WorkOrderBase):
    quotation_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    customer_id: uuid.UUID


class WorkOrderUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    production_slot: str | None = None
    responsible_team: str | None = None
    progress_percentage: int | None = Field(default=None, ge=0, le=100)
    delay_reason: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    notes: str | None = None


class WorkOrderStatusUpdate(BaseModel):
    status: str
    delay_reason: str | None = None
    notes: str | None = None


class ProductionUpdateCreate(BaseModel):
    status: str
    progress_percentage: int = Field(default=0, ge=0, le=100)
    remarks: str | None = None
    expected_completion_date: date | None = None


class ProductionUpdateRead(BaseModel):
    id: uuid.UUID
    work_order_id: uuid.UUID
    status: str
    progress_percentage: int
    remarks: str | None = None
    expected_completion_date: date | None = None
    updated_by_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductionCompleteHandoverRequest(BaseModel):
    completion_date: date | None = None
    remarks: str | None = None


class WorkOrderRead(WorkOrderBase):
    id: uuid.UUID
    work_order_number: str
    quotation_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    customer_id: uuid.UUID
    status: str
    actual_start_date: date | None = None
    actual_completion_date: date | None = None
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    customer_company: str | None = None
    tasks: list[ProductionTaskRead] = []
    installations: list[InstallationRead] = []
    updates: list[ProductionUpdateRead] = []

    model_config = ConfigDict(from_attributes=True)


class WorkOrderListResponse(BaseModel):
    total: int
    items: list[WorkOrderRead]
    page: int
    page_size: int


class ProductionSummaryResponse(BaseModel):
    total_work_orders: int
    active_work_orders: int
    completed_work_orders: int
    delayed_work_orders: int
    on_time_completion_rate: float


ProductionSlotStatus = Literal["allocated", "in_progress", "completed", "delayed", "maintenance"]
ProductionSlotPriority = Literal["low", "medium", "high", "urgent"]


def _validate_hhmm(value: str, field_name: str) -> str:
    parts = value.split(":")
    if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
        raise ValueError(f"{field_name} must be in HH:MM format")
    hour, minute = int(parts[0]), int(parts[1])
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(f"{field_name} must be a valid 24-hour time")
    return f"{hour:02d}:{minute:02d}"


class ProductionSlotBase(BaseModel):
    work_order_id: uuid.UUID | None = None
    work_order_code: str | None = Field(default=None, max_length=50)
    client: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=250)
    bay: str = Field(min_length=1, max_length=100)
    stage: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    start_time: str = Field(default="08:00", pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(default="17:00", pattern=r"^\d{2}:\d{2}$")
    lead_worker: str = Field(default="Unassigned", min_length=1, max_length=150)
    status: ProductionSlotStatus = "allocated"
    capacity_hours: int = Field(default=8, ge=1, le=500)
    priority: ProductionSlotPriority = "medium"
    notes: str | None = None

    @model_validator(mode="after")
    def validate_schedule_window(self) -> "ProductionSlotBase":
        self.start_time = _validate_hhmm(self.start_time, "start_time")
        self.end_time = _validate_hhmm(self.end_time, "end_time")
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be earlier than start_date")
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ProductionSlotCreate(ProductionSlotBase):
    code: str | None = Field(default=None, max_length=50)


class ProductionSlotUpdate(BaseModel):
    work_order_id: uuid.UUID | None = None
    work_order_code: str | None = Field(default=None, max_length=50)
    client: str | None = Field(default=None, min_length=1, max_length=200)
    title: str | None = Field(default=None, min_length=1, max_length=250)
    bay: str | None = Field(default=None, min_length=1, max_length=100)
    stage: str | None = Field(default=None, min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lead_worker: str | None = Field(default=None, min_length=1, max_length=150)
    status: ProductionSlotStatus | None = None
    capacity_hours: int | None = Field(default=None, ge=1, le=500)
    priority: ProductionSlotPriority | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_partial_window(self) -> "ProductionSlotUpdate":
        if self.start_time is not None:
            self.start_time = _validate_hhmm(self.start_time, "start_time")
        if self.end_time is not None:
            self.end_time = _validate_hhmm(self.end_time, "end_time")
        if self.start_date is not None and self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must not be earlier than start_date")
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ProductionSlotRead(ProductionSlotBase):
    id: uuid.UUID
    code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductionSlotListResponse(BaseModel):
    total: int
    items: list[ProductionSlotRead]
