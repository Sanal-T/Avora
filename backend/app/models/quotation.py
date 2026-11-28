import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.auth import Employee, User
    from app.models.customer import Customer
    from app.models.design import Design
    from app.models.enquiry import Enquiry
    from app.models.production import WorkOrder
    from app.models.project import Project


class Quotation(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "quotations"
    __table_args__ = (
        Index("ix_quotations_deleted_created", "is_deleted", "created_at"),
        Index("ix_quotations_deleted_status", "is_deleted", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    revision_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    enquiry_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True, index=True)
    design_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("designs.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(50), default="Draft", index=True, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    discount_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    approved_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    sent_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="quotations")
    enquiry: Mapped["Enquiry | None"] = relationship("Enquiry", back_populates="quotations")
    design: Mapped["Design | None"] = relationship("Design", foreign_keys=[design_id])
    project: Mapped["Project | None"] = relationship("Project", foreign_keys=[project_id])
    items: Mapped[list["QuotationItem"]] = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationItem.sort_order.asc()")
    revisions: Mapped[list["QuotationRevision"]] = relationship("QuotationRevision", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationRevision.revision_number.desc()")
    follow_ups: Mapped[list["QuotationFollowUp"]] = relationship("QuotationFollowUp", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationFollowUp.scheduled_date.asc()")
    status_history: Mapped[list["QuotationStatusHistory"]] = relationship("QuotationStatusHistory", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationStatusHistory.created_at.desc()")
    work_order: Mapped["WorkOrder | None"] = relationship("WorkOrder", back_populates="quotation", uselist=False)


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    item_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1.00"), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="unit", nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")


class QuotationRevision(Base, TimestampMixin):
    __tablename__ = "quotation_revisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="revisions")
    created_by: Mapped["User | None"] = relationship("User")


class QuotationFollowUp(Base, TimestampMixin):
    __tablename__ = "quotation_follow_ups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contacted_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_employee_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="follow_ups")
    assigned_employee: Mapped["Employee | None"] = relationship("Employee")


class QuotationStatusHistory(Base):
    __tablename__ = "quotation_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")
