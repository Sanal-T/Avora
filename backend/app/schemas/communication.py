import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CommunicationMessageCreate(BaseModel):
    message: str = Field(min_length=1)


class CommunicationMessageRead(BaseModel):
    id: uuid.UUID
    communication_id: uuid.UUID
    sender_id: uuid.UUID | None = None
    sender_name: str | None = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunicationCreate(BaseModel):
    project_id: uuid.UUID | None = None
    from_department_id: str | None = None
    to_department_id: str | None = None
    type: str = "Request"
    subject: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: str = "Medium"


class CommunicationUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    to_department_id: str | None = None


class CommunicationRead(BaseModel):
    id: uuid.UUID
    communication_number: str
    project_id: uuid.UUID | None = None
    from_department_id: str | None = None
    to_department_id: str | None = None
    created_by_id: uuid.UUID | None = None
    type: str
    subject: str
    description: str
    priority: str
    status: str
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    project_number: str | None = None
    from_department_name: str | None = None
    to_department_name: str | None = None
    created_by_name: str | None = None
    messages: list[CommunicationMessageRead] = []

    model_config = ConfigDict(from_attributes=True)


class CommunicationListResponse(BaseModel):
    total: int
    items: list[CommunicationRead]
    page: int
    page_size: int


class CommunicationSummaryResponse(BaseModel):
    total_communications: int
    open_requests: int
    pending_approvals: int
    high_priority_issues: int
    resolved_count: int
