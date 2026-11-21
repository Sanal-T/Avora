import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class ProductionTaskBase(BaseModel):
    task_name: str
    sequence_order: int = 1
    status: str = "Pending"
    assigned_employee_id: uuid.UUID | None = None
    planned_hours: Decimal | None = None
    actual_hours: Decimal | None = None
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
    site_address: str
    scheduled_date: date
    status: str = "Scheduled"
    lead_installer_id: uuid.UUID | None = None
    completion_notes: str | None = None
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
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    notes: str | None = None


class WorkOrderCreate(WorkOrderBase):
    quotation_id: uuid.UUID | None = None
    customer_id: uuid.UUID


class WorkOrderUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    notes: str | None = None


class WorkOrderStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class WorkOrderRead(WorkOrderBase):
    id: uuid.UUID
    work_order_number: str
    quotation_id: uuid.UUID | None = None
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
