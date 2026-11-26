import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.customer import CustomerCreate, CustomerListResponse, CustomerRead, CustomerUpdate
from app.services import customer_service

router = APIRouter()


@router.get("", response_model=CustomerListResponse)
def list_customers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=5000),
    search: str | None = Query(default=None),
) -> CustomerListResponse:
    total, items = customer_service.list_customers(db, page=page, page_size=page_size, search=search)
    return CustomerListResponse(
        total=total,
        items=[CustomerRead.model_validate(i) for i in items],
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager", "Sales / Accounts", "Enquiry Staff"])),
    ],
) -> CustomerRead:
    customer = customer_service.create_customer(db, data, user_id=current_user.id)
    return CustomerRead.model_validate(customer)


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> CustomerRead:
    customer = customer_service.get_customer(db, customer_id)
    return CustomerRead.model_validate(customer)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager", "Sales / Accounts", "Enquiry Staff"])),
    ],
) -> CustomerRead:
    customer = customer_service.update_customer(db, customer_id, data, user_id=current_user.id)
    return CustomerRead.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management"]))],
) -> None:
    customer_service.delete_customer(db, customer_id, user_id=current_user.id)
