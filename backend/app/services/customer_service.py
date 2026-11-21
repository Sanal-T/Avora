import uuid
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.customer import Customer, CustomerContact
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services import audit_service


def list_customers(db: Session, page: int = 1, page_size: int = 20, search: str | None = None) -> tuple[int, list[Customer]]:
    query = db.query(Customer).filter(Customer.is_deleted == False)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
                Customer.email.ilike(search_filter),
                Customer.customer_code.ilike(search_filter),
            )
        )
    total = query.count()
    items = query.order_by(Customer.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, items


def get_customer(db: Session, customer_id: uuid.UUID) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    return customer


def create_customer(db: Session, data: CustomerCreate, user_id: uuid.UUID | None = None) -> Customer:
    # Check duplicate email
    existing = db.query(Customer).filter(Customer.email == data.email, Customer.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this email already exists.")

    # Generate customer code if not provided
    customer_code = data.customer_code
    if not customer_code:
        count = db.query(Customer).count() + 1
        customer_code = f"CUST-{count:03d}"

    customer = Customer(
        customer_code=customer_code,
        name=data.name,
        company_name=data.company_name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        tax_id=data.tax_id,
        notes=data.notes,
    )

    try:
        db.add(customer)
        db.flush()

        for c in data.contacts:
            contact = CustomerContact(
                customer_id=customer.id,
                name=c.name,
                email=c.email,
                phone=c.phone,
                designation=c.designation,
                is_primary=c.is_primary,
            )
            db.add(contact)

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="customer",
            entity_id=customer.id,
            user_id=user_id,
            changes_summary=f"Created customer {customer.name} ({customer.customer_code}) with {len(data.contacts)} contacts",
            commit=False,
        )
        db.commit()
        db.refresh(customer)
        return customer
    except Exception:
        db.rollback()
        raise


def update_customer(db: Session, customer_id: uuid.UUID, data: CustomerUpdate, user_id: uuid.UUID | None = None) -> Customer:
    customer = get_customer(db, customer_id)
    update_dict = data.model_dump(exclude_unset=True)

    if "email" in update_dict and update_dict["email"] != customer.email:
        existing = db.query(Customer).filter(Customer.email == update_dict["email"], Customer.id != customer_id, Customer.is_deleted == False).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this email already exists.")

    try:
        for key, value in update_dict.items():
            setattr(customer, key, value)

        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="customer",
            entity_id=customer.id,
            user_id=user_id,
            changes_summary=f"Updated customer {customer.name} fields: {', '.join(update_dict.keys())}",
            commit=False,
        )
        db.commit()
        db.refresh(customer)
        return customer
    except Exception:
        db.rollback()
        raise


def delete_customer(db: Session, customer_id: uuid.UUID, user_id: uuid.UUID | None = None) -> None:
    customer = get_customer(db, customer_id)
    try:
        customer.is_deleted = True
        customer.deleted_at = datetime.now(timezone.utc)
        audit_service.log_audit_action(
            db,
            action="DELETE",
            entity_type="customer",
            entity_id=customer.id,
            user_id=user_id,
            changes_summary=f"Soft deleted customer {customer.name} ({customer.customer_code})",
            commit=False,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
