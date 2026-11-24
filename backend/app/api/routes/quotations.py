import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationFollowUpCreate,
    QuotationListResponse,
    QuotationRead,
    QuotationRevisionCreate,
    QuotationStatusUpdate,
    QuotationSummaryResponse,
    QuotationUpdate,
)
from app.services import quotation_service

router = APIRouter()


@router.get("", response_model=QuotationListResponse)
def list_quotations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> QuotationListResponse:
    total, items = quotation_service.list_quotations(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
    return QuotationListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/summary", response_model=QuotationSummaryResponse)
def get_quotation_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> QuotationSummaryResponse:
    return quotation_service.get_quotation_summary(db, date_from=date_from, date_to=date_to)


@router.post("", response_model=QuotationRead, status_code=status.HTTP_201_CREATED)
def create_quotation(
    data: QuotationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> QuotationRead:
    return quotation_service.create_quotation(db, data, user_id=current_user.id)


@router.get("/{quotation_id}", response_model=QuotationRead)
def get_quotation(
    quotation_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> QuotationRead:
    quotation = quotation_service.get_quotation(db, quotation_id)
    return quotation_service._to_quotation_read(quotation)


@router.put("/{quotation_id}", response_model=QuotationRead)
@router.patch("/{quotation_id}", response_model=QuotationRead)
def update_quotation(
    quotation_id: uuid.UUID,
    data: QuotationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> QuotationRead:
    return quotation_service.update_quotation(db, quotation_id, data, user_id=current_user.id)


@router.post("/{quotation_id}/status", response_model=QuotationRead)
@router.patch("/{quotation_id}/status", response_model=QuotationRead)
def update_quotation_status(
    quotation_id: uuid.UUID,
    data: QuotationStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> QuotationRead:
    return quotation_service.update_quotation_status(db, quotation_id, data, user_id=current_user.id)


@router.post("/{quotation_id}/revisions", response_model=QuotationRead)
def create_quotation_revision(
    quotation_id: uuid.UUID,
    data: QuotationRevisionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> QuotationRead:
    return quotation_service.create_quotation_revision(db, quotation_id, data, user_id=current_user.id)


@router.post("/{quotation_id}/convert-to-work-order")
@router.patch("/{quotation_id}/convert-to-work-order")
def convert_to_work_order(
    quotation_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Production Manager"]))],
) -> dict[str, str]:
    wo = quotation_service.convert_quotation_to_work_order(db, quotation_id, user_id=current_user.id)
    return {"message": "Quotation converted to work order successfully.", "work_order_id": str(wo.id), "work_order_number": wo.work_order_number}


@router.post("/{quotation_id}/follow-ups", response_model=QuotationRead)
def add_follow_up(
    quotation_id: uuid.UUID,
    data: QuotationFollowUpCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> QuotationRead:
    return quotation_service.add_follow_up(db, quotation_id, data, user_id=current_user.id)
