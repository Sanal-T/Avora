import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.production import (
    InstallationCreate,
    ProductionCompleteHandoverRequest,
    ProductionSlotCreate,
    ProductionSlotListResponse,
    ProductionSlotRead,
    ProductionSlotUpdate,
    ProductionSummaryResponse,
    ProductionTaskCreate,
    ProductionTaskUpdate,
    ProductionUpdateCreate,
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
    page_size: int = Query(default=20, ge=1, le=5000),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    compact: bool = Query(default=False),
) -> WorkOrderListResponse:
    total, items = production_service.list_work_orders(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
        compact=compact,
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


@router.get("/slots", response_model=ProductionSlotListResponse)
def list_production_slots(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    bay: str | None = Query(default=None),
    status: str | None = Query(default=None),
    work_order_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> ProductionSlotListResponse:
    total, items = production_service.list_production_slots(
        db,
        bay=bay,
        status_filter=status,
        work_order_id=work_order_id,
        date_from=date_from,
        date_to=date_to,
    )
    return ProductionSlotListResponse(total=total, items=items)


@router.post("/slots", response_model=ProductionSlotRead, status_code=status.HTTP_201_CREATED)
def create_production_slot(
    data: ProductionSlotCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Production Manager"]))],
) -> ProductionSlotRead:
    return production_service.create_production_slot(db, data, user_id=current_user.id)


@router.get("/slots/{slot_id}", response_model=ProductionSlotRead)
def get_production_slot(
    slot_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ProductionSlotRead:
    slot = production_service.get_production_slot(db, slot_id)
    return ProductionSlotRead.model_validate(slot)


@router.put("/slots/{slot_id}", response_model=ProductionSlotRead)
@router.patch("/slots/{slot_id}", response_model=ProductionSlotRead)
def update_production_slot(
    slot_id: uuid.UUID,
    data: ProductionSlotUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Production Manager"]))],
) -> ProductionSlotRead:
    return production_service.update_production_slot(db, slot_id, data, user_id=current_user.id)


@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_production_slot(
    slot_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Production Manager"]))],
) -> None:
    production_service.delete_production_slot(db, slot_id, user_id=current_user.id)


@router.post("", response_model=WorkOrderRead, status_code=status.HTTP_201_CREATED)
def create_work_order(
    data: WorkOrderCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
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


@router.put("/{work_order_id}", response_model=WorkOrderRead)
@router.patch("/{work_order_id}", response_model=WorkOrderRead)
def update_work_order(
    work_order_id: uuid.UUID,
    data: WorkOrderUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.update_work_order(db, work_order_id, data, user_id=current_user.id)


@router.post("/{work_order_id}/status", response_model=WorkOrderRead)
@router.patch("/{work_order_id}/status", response_model=WorkOrderRead)
def update_work_order_status(
    work_order_id: uuid.UUID,
    data: WorkOrderStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.update_work_order_status(db, work_order_id, data, user_id=current_user.id)


@router.post("/{work_order_id}/tasks", response_model=WorkOrderRead)
def add_production_task(
    work_order_id: uuid.UUID,
    data: ProductionTaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.add_production_task(db, work_order_id, data)


@router.put("/{work_order_id}/tasks/{task_id}", response_model=WorkOrderRead)
@router.patch("/{work_order_id}/tasks/{task_id}", response_model=WorkOrderRead)
def update_production_task(
    work_order_id: uuid.UUID,
    task_id: uuid.UUID,
    data: ProductionTaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.update_task_status(db, work_order_id, task_id, data, user_id=current_user.id)


@router.post("/{work_order_id}/installations", response_model=WorkOrderRead)
def add_installation(
    work_order_id: uuid.UUID,
    data: InstallationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.add_installation(db, work_order_id, data)


@router.post("/{work_order_id}/updates", response_model=WorkOrderRead, status_code=status.HTTP_201_CREATED)
def add_production_update(
    work_order_id: uuid.UUID,
    data: ProductionUpdateCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Production Manager"]))],
) -> WorkOrderRead:
    return production_service.add_production_update(db, work_order_id, data, user_id=current_user.id)


@router.post("/{work_order_id}/complete-and-transfer")
def complete_and_transfer_to_accounts(
    work_order_id: uuid.UUID,
    data: ProductionCompleteHandoverRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Production Manager"]))],
) -> dict[str, str]:
    return production_service.complete_production_and_transfer_to_accounts(db, work_order_id, data, user_id=current_user.id)
