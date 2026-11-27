import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.enquiry import EnquiryCreate, EnquiryListResponse, EnquiryRead, EnquiryStatusUpdate, EnquirySummaryResponse, EnquiryUpdate
from app.services import enquiry_service

router = APIRouter()


@router.get("", response_model=EnquiryListResponse)
def list_enquiries(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=5000),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    compact: bool = Query(default=False),
) -> EnquiryListResponse:
    total, items = enquiry_service.list_enquiries(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
        compact=compact,
    )
    return EnquiryListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/summary", response_model=EnquirySummaryResponse)
def get_enquiry_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> EnquirySummaryResponse:
    return enquiry_service.get_enquiry_summary(db, date_from=date_from, date_to=date_to)


@router.post("", response_model=EnquiryRead, status_code=status.HTTP_201_CREATED)
def create_enquiry(
    data: EnquiryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Enquiry Staff"]))],
) -> EnquiryRead:
    return enquiry_service.create_enquiry(db, data, user_id=current_user.id)


@router.get("/{enquiry_id}", response_model=EnquiryRead)
def get_enquiry(
    enquiry_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> EnquiryRead:
    enquiry = enquiry_service.get_enquiry(db, enquiry_id)
    return enquiry_service._to_enquiry_read(enquiry)


@router.patch("/{enquiry_id}", response_model=EnquiryRead)
def update_enquiry(
    enquiry_id: uuid.UUID,
    data: EnquiryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Enquiry Staff"]))],
) -> EnquiryRead:
    return enquiry_service.update_enquiry(db, enquiry_id, data)


@router.post("/{enquiry_id}/status", response_model=EnquiryRead)
@router.patch("/{enquiry_id}/status", response_model=EnquiryRead)
def update_enquiry_status(
    enquiry_id: uuid.UUID,
    data: EnquiryStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Enquiry Staff"]))],
) -> EnquiryRead:
    return enquiry_service.update_enquiry_status(db, enquiry_id, data, user_id=current_user.id)
