import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
from app.schemas.feedback import FeedbackCreate, FeedbackListResponse, FeedbackRead, FeedbackSummaryResponse, FeedbackUpdate
from app.services import feedback_service

router = APIRouter()


@router.get("", response_model=FeedbackListResponse)
def list_feedback(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> FeedbackListResponse:
    total, items = feedback_service.list_feedback(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        category=category,
        date_from=date_from,
        date_to=date_to,
    )
    return FeedbackListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/summary", response_model=FeedbackSummaryResponse)
def get_feedback_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> FeedbackSummaryResponse:
    return feedback_service.get_feedback_summary(db, date_from=date_from, date_to=date_to)


@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def create_feedback(
    data: FeedbackCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FeedbackRead:
    return feedback_service.create_feedback(db, data)


@router.patch("/{feedback_id}", response_model=FeedbackRead)
def update_feedback(
    feedback_id: uuid.UUID,
    data: FeedbackUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FeedbackRead:
    return feedback_service.update_feedback(db, feedback_id, data)
