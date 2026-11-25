import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class ProjectStatusHistoryRead(BaseModel):
    id: uuid.UUID
    from_status: str | None = None
    to_status: str
    notes: str | None = None
    created_at: datetime
    changed_by_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectMilestoneBase(BaseModel):
    title: str = Field(min_length=1)
    due_date: date | None = None
    status: str = "Pending"
    remarks: str | None = None


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneUpdate(BaseModel):
    title: str | None = None
    due_date: date | None = None
    status: str | None = None
    remarks: str | None = None


class ProjectMilestoneRead(ProjectMilestoneBase):
    id: uuid.UUID
    project_id: uuid.UUID
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectTimelineEvent(BaseModel):
    event_type: str
    title: str
    description: str | None = None
    timestamp: datetime
    actor: str | None = None
    entity_type: str
    entity_id: str


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)
    customer_id: uuid.UUID
    enquiry_id: uuid.UUID | None = None
    approved_quotation_id: uuid.UUID | None = None
    project_manager_id: uuid.UUID | None = None
    site_location: str | None = None
    project_value: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    approval_date: date | None = None
    start_date: date | None = None
    expected_completion_date: date | None = None
    priority: str = "Medium"
    remarks: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    project_manager_id: uuid.UUID | None = None
    site_location: str | None = None
    project_value: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    start_date: date | None = None
    expected_completion_date: date | None = None
    actual_completion_date: date | None = None
    priority: str | None = None
    remarks: str | None = None


class ProjectStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class ProjectRead(BaseModel):
    id: uuid.UUID
    project_number: str
    name: str
    customer_id: uuid.UUID
    enquiry_id: uuid.UUID | None = None
    approved_quotation_id: uuid.UUID | None = None
    project_manager_id: uuid.UUID | None = None
    site_location: str | None = None
    project_value: Decimal
    approval_date: date | None = None
    start_date: date | None = None
    expected_completion_date: date | None = None
    actual_completion_date: date | None = None
    priority: str
    status: str
    remarks: str | None = None
    created_at: datetime
    updated_at: datetime

    customer_name: str | None = None
    customer_company: str | None = None
    enquiry_number: str | None = None
    quotation_number: str | None = None
    project_manager_name: str | None = None
    status_history: list[ProjectStatusHistoryRead] = []
    milestones: list[ProjectMilestoneRead] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    total: int
    items: list[ProjectRead]
    page: int
    page_size: int


class ProjectSummaryResponse(BaseModel):
    total_projects: int
    approved_projects: int
    in_production_projects: int
    sent_to_accounts_projects: int
    closed_projects: int
    delayed_projects: int
    total_project_value: Decimal
