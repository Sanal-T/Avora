import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
from app.schemas.communication import (
    CommunicationCreate,
    CommunicationListResponse,
    CommunicationMessageCreate,
    CommunicationRead,
    CommunicationSummaryResponse,
    CommunicationUpdate,
)
from app.services import communication_service

router = APIRouter()


@router.get("/summary", response_model=CommunicationSummaryResponse)
def get_communication_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CommunicationSummaryResponse:
    return communication_service.get_communication_summary(db)


@router.get("", response_model=CommunicationListResponse)
def list_communications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=5000),
    status_filter: str | None = Query(default=None, alias="status"),
    type_filter: str | None = Query(default=None, alias="type"),
    department_id: str | None = Query(default=None),
    project_id: uuid.UUID | None = Query(default=None),
    search: str | None = Query(default=None),
) -> CommunicationListResponse:
    total, items = communication_service.list_communications(
        db,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        type_filter=type_filter,
        department_id=department_id,
        project_id=project_id,
        search=search,
    )
    return CommunicationListResponse(total=total, items=items, page=page, page_size=page_size)


@router.post("", response_model=CommunicationRead, status_code=status.HTTP_201_CREATED)
def create_communication(
    data: CommunicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CommunicationRead:
    return communication_service.create_communication(db, data, user_id=current_user.id)


@router.get("/{comm_id}", response_model=CommunicationRead)
def get_communication(
    comm_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CommunicationRead:
    return communication_service.get_communication(db, comm_id)


@router.patch("/{comm_id}", response_model=CommunicationRead)
def update_communication(
    comm_id: uuid.UUID,
    data: CommunicationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CommunicationRead:
    return communication_service.update_communication(db, comm_id, data, user_id=current_user.id)


@router.post("/{comm_id}/messages", response_model=CommunicationRead, status_code=status.HTTP_201_CREATED)
def add_communication_message(
    comm_id: uuid.UUID,
    data: CommunicationMessageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CommunicationRead:
    return communication_service.add_message(db, comm_id, data, user_id=current_user.id)
