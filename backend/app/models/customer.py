import uuid
from sqlalchemy import Boolean, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin


class Customer(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    contacts: Mapped[list["CustomerContact"]] = relationship("CustomerContact", back_populates="customer", cascade="all, delete-orphan")
    enquiries: Mapped[list["Enquiry"]] = relationship("Enquiry", back_populates="customer")
    quotations: Mapped[list["Quotation"]] = relationship("Quotation", back_populates="customer")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="customer")
    feedback_records: Mapped[list["Feedback"]] = relationship("Feedback", back_populates="customer")


class CustomerContact(Base, TimestampMixin):
    __tablename__ = "customer_contacts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="contacts")
