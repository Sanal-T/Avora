import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


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
