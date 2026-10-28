import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
from app.schemas.production import (
    InstallationCreate,
    ProductionSummaryResponse,
    ProductionTaskCreate,
    WorkOrderCreate,
    WorkOrderListResponse,
    WorkOrderRead,
    WorkOrderStatusUpdate,
    WorkOrderUpdate,
)
from app.services import production_service

router = APIRouter()


@router.get("", response_model=WorkOrderListResponse)
def list_work_orders(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> WorkOrderListResponse:
    total, items = production_service.list_work_orders(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
    return WorkOrderListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/summary", response_model=ProductionSummaryResponse)
def get_production_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> ProductionSummaryResponse:
    return production_service.get_production_summary(db, date_from=date_from, date_to=date_to)


@router.post("", response_model=WorkOrderRead, status_code=status.HTTP_201_CREATED)
def create_work_order(
    data: WorkOrderCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkOrderRead:
    return production_service.create_work_order(db, data, user_id=current_user.id)


@router.get("/{work_order_id}", response_model=WorkOrderRead)
def get_work_order(
    work_order_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkOrderRead:
    wo = production_service.get_work_order(db, work_order_id)
    return production_service._to_work_order_read(wo)


@router.post("/{work_order_id}/status", response_model=WorkOrderRead)
def update_work_order_status(
    work_order_id: uuid.UUID,
    data: WorkOrderStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkOrderRead:
    return production_service.update_work_order_status(db, work_order_id, data, user_id=current_user.id)


@router.post("/{work_order_id}/tasks", response_model=WorkOrderRead)
def add_production_task(
    work_order_id: uuid.UUID,
    data: ProductionTaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkOrderRead:
    return production_service.add_production_task(db, work_order_id, data)


@router.post("/{work_order_id}/installations", response_model=WorkOrderRead)
def add_installation(
    work_order_id: uuid.UUID,
    data: InstallationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> WorkOrderRead:
    return production_service.add_installation(db, work_order_id, data)
