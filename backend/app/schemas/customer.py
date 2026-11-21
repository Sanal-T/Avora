import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerContactBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    designation: str | None = None
    is_primary: bool = False


class CustomerContactCreate(CustomerContactBase):
    pass


class CustomerContactRead(CustomerContactBase):
    id: uuid.UUID
    customer_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerBase(BaseModel):
    name: str = Field(min_length=1)
    company_name: str | None = None
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    tax_id: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    customer_code: str | None = None
    contacts: list[CustomerContactCreate] = []


class CustomerUpdate(BaseModel):
    name: str | None = None
    company_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    tax_id: str | None = None
    notes: str | None = None


class CustomerRead(CustomerBase):
    id: uuid.UUID
    customer_code: str
    created_at: datetime
    updated_at: datetime
    contacts: list[CustomerContactRead] = []

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    total: int
    items: list[CustomerRead]
    page: int
    page_size: int
