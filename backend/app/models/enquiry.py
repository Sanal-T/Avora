import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.auth import Employee, User
    from app.models.customer import Customer
    from app.models.design import Design
    from app.models.quotation import Quotation


class Enquiry(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "enquiries"
    __table_args__ = (
        Index("ix_enquiries_deleted_created", "is_deleted", "created_at"),
        Index("ix_enquiries_deleted_status", "is_deleted", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enquiry_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_employee_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)

    status: Mapped[str] = mapped_column(String(50), default="New", index=True, nullable=False)
    source: Mapped[str | None] = mapped_column(String(100), default="Direct", nullable=True)
    enquiry_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requirement_summary: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_budget: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    qualified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="enquiries")
    assigned_employee: Mapped["Employee | None"] = relationship("Employee")
    designs: Mapped[list["Design"]] = relationship("Design", back_populates="enquiry")
    quotations: Mapped[list["Quotation"]] = relationship("Quotation", back_populates="enquiry")
    status_history: Mapped[list["EnquiryStatusHistory"]] = relationship("EnquiryStatusHistory", back_populates="enquiry", cascade="all, delete-orphan", order_by="EnquiryStatusHistory.created_at.desc()")


class EnquiryStatusHistory(Base):
    __tablename__ = "enquiry_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    enquiry: Mapped["Enquiry"] = relationship("Enquiry", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")
