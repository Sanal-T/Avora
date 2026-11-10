import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin


class WorkOrder(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"), unique=True, nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)

    planned_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    actual_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    quotation: Mapped["Quotation | None"] = relationship("Quotation", back_populates="work_order")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="work_orders")
    tasks: Mapped[list["ProductionTask"]] = relationship("ProductionTask", back_populates="work_order", cascade="all, delete-orphan", order_by="ProductionTask.sequence_order.asc()")
    installations: Mapped[list["Installation"]] = relationship("Installation", back_populates="work_order", cascade="all, delete-orphan", order_by="Installation.scheduled_date.asc()")
    status_history: Mapped[list["WorkOrderStatusHistory"]] = relationship("WorkOrderStatusHistory", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderStatusHistory.created_at.desc()")
    feedback: Mapped[list["Feedback"]] = relationship("Feedback", back_populates="work_order")


class ProductionTask(Base, TimestampMixin):
    __tablename__ = "production_tasks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(200), nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    assigned_employee_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    planned_hours: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    actual_hours: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    completion_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="tasks")
    assigned_employee: Mapped["Employee | None"] = relationship("Employee")


class Installation(Base, TimestampMixin):
    __tablename__ = "installations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    site_address: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="Scheduled", nullable=False)
    lead_installer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    completion_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    signoff_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    signoff_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="installations")
    lead_installer: Mapped["Employee | None"] = relationship("Employee")


class WorkOrderStatusHistory(Base):
    __tablename__ = "work_order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")
