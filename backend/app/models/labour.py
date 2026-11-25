import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import Department, User


class Worker(Base, TimestampMixin):
    __tablename__ = "workers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    worker_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    skill_category: Mapped[str] = mapped_column(String(100), default="General", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Available", index=True, nullable=False)  # Available, Assigned, On Leave, Inactive
    daily_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    assignments: Mapped[list["LabourAssignment"]] = relationship("LabourAssignment", back_populates="worker")


class LabourRequest(Base, TimestampMixin):
    __tablename__ = "labour_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    work_order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    required_workers_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    required_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    skill_category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", index=True, nullable=False)  # Pending, Approved, Rejected, Fulfilled
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    requested_by: Mapped["User | None"] = relationship("User", foreign_keys=[requested_by_id])
    approved_by: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by_id])
    department: Mapped["Department | None"] = relationship("Department")
    assignments: Mapped[list["LabourAssignment"]] = relationship("LabourAssignment", back_populates="labour_request")


class LabourAssignment(Base, TimestampMixin):
    __tablename__ = "labour_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    labour_request_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("labour_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    worker_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    work_order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Assigned", nullable=False)  # Assigned, Active, Completed, Cancelled

    worker: Mapped["Worker"] = relationship("Worker", back_populates="assignments")
    labour_request: Mapped["LabourRequest | None"] = relationship("LabourRequest", back_populates="assignments")
