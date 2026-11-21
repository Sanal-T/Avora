import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
from app.schemas.system import NotificationListResponse, NotificationRead
from app.services import notification_service

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    unread_only: bool = Query(default=False),
) -> NotificationListResponse:
    total, items = notification_service.list_user_notifications(db, current_user.id, unread_only=unread_only)
    return NotificationListResponse(total=total, items=items)


@router.patch("/read-all")
def mark_all_read(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, Any]:
    count = notification_service.mark_all_notifications_read(db, current_user.id)
    return {"status": "ok", "marked_read": count}


@router.patch("/{notification_id}/read", response_model=NotificationRead | None)
def mark_read(
    notification_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> NotificationRead | None:
    return notification_service.mark_notification_read(db, notification_id, current_user.id)
