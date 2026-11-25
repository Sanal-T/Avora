import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.auth import User
from app.schemas.accounts import (
    AccountsListResponse,
    AccountsRecordRead,
    AccountsRecordUpdate,
    AccountsSummaryResponse,
    InvoiceCreate,
    PaymentCreate,
)
from app.services import accounts_service

router = APIRouter()

FINANCE_VIEW_ROLES = [
    "Administrator",
    "Super Admin",
    "Management",
    "Read-Only Management",
    "Accounts Manager",
    "Sales / Accounts",
]
FINANCE_EDIT_ROLES = [
    "Administrator",
    "Super Admin",
    "Management",
    "Accounts Manager",
    "Sales / Accounts",
]


@router.get("/summary", response_model=AccountsSummaryResponse)
def get_accounts_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_VIEW_ROLES))],
) -> AccountsSummaryResponse:
    return accounts_service.get_accounts_summary(db)


@router.get("", response_model=AccountsListResponse)
def list_accounts_records(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_VIEW_ROLES))],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
) -> AccountsListResponse:
    total, items = accounts_service.list_accounts_records(
        db,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        search=search,
    )
    return AccountsListResponse(total=total, items=items, page=page, page_size=page_size)


@router.get("/{record_id}", response_model=AccountsRecordRead)
def get_accounts_record(
    record_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_VIEW_ROLES))],
) -> AccountsRecordRead:
    return accounts_service.get_accounts_record(db, record_id)


@router.patch("/{record_id}", response_model=AccountsRecordRead)
def update_accounts_record(
    record_id: uuid.UUID,
    data: AccountsRecordUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_EDIT_ROLES))],
) -> AccountsRecordRead:
    return accounts_service.update_accounts_record(db, record_id, data, user_id=current_user.id)


@router.post("/{record_id}/invoices", response_model=AccountsRecordRead, status_code=status.HTTP_201_CREATED)
def create_invoice(
    record_id: uuid.UUID,
    data: InvoiceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_EDIT_ROLES))],
) -> AccountsRecordRead:
    return accounts_service.create_invoice(db, record_id, data, user_id=current_user.id)


@router.post("/{record_id}/payments", response_model=AccountsRecordRead, status_code=status.HTTP_201_CREATED)
def record_payment(
    record_id: uuid.UUID,
    data: PaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(FINANCE_EDIT_ROLES))],
) -> AccountsRecordRead:
    return accounts_service.record_payment(db, record_id, data, user_id=current_user.id)
