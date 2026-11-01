import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
from app.schemas.labour import (
    LabourAssignmentCreate,
    LabourRequestCreate,
    LabourRequestListResponse,
    LabourRequestRead,
    LabourRequestStatusUpdate,
    LabourSummaryResponse,
    WorkerCreate,
    WorkerListResponse,
    WorkerRead,
)
from app.services import labour_service

router = APIRouter()


@router.get("/workers", response_model=WorkerListResponse)
def list_workers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    skill_category: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> WorkerListResponse:
    total, items = labour_service.list_workers(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        skill_category=skill_category,
        search=search,
    )
    return WorkerListResponse(total=total, items=items, page=page, page_size=page_size)


@router.post("/workers", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
def create_worker(
    data: WorkerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkerRead:
    return labour_service.create_worker(db, data)


@router.get("/requests", response_model=LabourRequestListResponse)
def list_labour_requests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
) -> LabourRequestListResponse:
    total, items = labour_service.list_labour_requests(db, page=page, page_size=page_size, status_filter=status)
    return LabourRequestListResponse(total=total, items=items, page=page, page_size=page_size)


@router.post("/requests", response_model=LabourRequestRead, status_code=status.HTTP_201_CREATED)
def create_labour_request(
    data: LabourRequestCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> LabourRequestRead:
    return labour_service.create_labour_request(db, data, user_id=current_user.id)


@router.post("/requests/{request_id}/status", response_model=LabourRequestRead)
def update_labour_request_status(
    request_id: uuid.UUID,
    data: LabourRequestStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> LabourRequestRead:
    return labour_service.update_labour_request_status(db, request_id, data, user_id=current_user.id)


@router.post("/requests/{request_id}/assign", response_model=LabourRequestRead)
def assign_worker_to_request(
    request_id: uuid.UUID,
    data: LabourAssignmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> LabourRequestRead:
    return labour_service.assign_worker_to_request(db, request_id, data)


@router.get("/summary", response_model=LabourSummaryResponse)
def get_labour_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> LabourSummaryResponse:
    return labour_service.get_labour_summary(db)
