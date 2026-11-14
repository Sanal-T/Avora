import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FeedbackBase(BaseModel):
    customer_id: uuid.UUID
    work_order_id: uuid.UUID | None = None
    category: str = "General"
    rating: int | None = None
    comments: str | None = None


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(BaseModel):
    status: str | None = None
    rating: int | None = None
    comments: str | None = None
    resolution_notes: str | None = None


class FeedbackRead(FeedbackBase):
    id: uuid.UUID
    status: str
    resolution_notes: str | None = None
    received_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    customer_company: str | None = None
    work_order_number: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackListResponse(BaseModel):
    total: int
    items: list[FeedbackRead]
    page: int
    page_size: int


class FeedbackSummaryResponse(BaseModel):
    total_feedback: int
    received_feedback: int
    awaiting_feedback: int
    response_rate: float
