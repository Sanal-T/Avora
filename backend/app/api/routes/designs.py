import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.design import DesignCreate, DesignListResponse, DesignRead, DesignStatusUpdate, DesignSummaryResponse, DesignUpdate, DesignVersionCreate
from app.services import design_service

router = APIRouter()


@router.get("", response_model=DesignListResponse)
def list_designs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=5000),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    compact: bool = Query(default=False),
) -> DesignListResponse:
    total, items = design_service.list_designs(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
        compact=compact,
    )
    return DesignListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/summary", response_model=DesignSummaryResponse)
def get_design_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> DesignSummaryResponse:
    return design_service.get_design_summary(db, date_from=date_from, date_to=date_to)


@router.post("", response_model=DesignRead, status_code=status.HTTP_201_CREATED)
def create_design(
    data: DesignCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Design Team"]))],
) -> DesignRead:
    return design_service.create_design(db, data, user_id=current_user.id)


@router.get("/{design_id}", response_model=DesignRead)
def get_design(
    design_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> DesignRead:
    design = design_service.get_design(db, design_id)
    return design_service._to_design_read(design)


@router.post("/{design_id}/status", response_model=DesignRead)
def update_design_status(
    design_id: uuid.UUID,
    data: DesignStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Design Team"]))],
) -> DesignRead:
    return design_service.update_design_status(db, design_id, data, user_id=current_user.id)


@router.post("/{design_id}/versions", response_model=DesignRead)
def add_design_version(
    design_id: uuid.UUID,
    data: DesignVersionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Design Team"]))],
) -> DesignRead:
    return design_service.add_design_version(db, design_id, data, user_id=current_user.id)
