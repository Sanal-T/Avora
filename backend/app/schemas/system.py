import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: uuid.UUID
    recipient_id: uuid.UUID
    title: str
    message: str
    link: str | None = None
    is_read: bool
    category: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    total: int
    items: list[NotificationRead]


class AuditLogRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    action: str
    entity_type: str
    entity_id: str
    changes_summary: str | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    total: int
    items: list[AuditLogRead]
    page: int
    page_size: int
