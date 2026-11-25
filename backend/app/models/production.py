import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.auth import Employee, User
    from app.models.customer import Customer
    from app.models.feedback import Feedback
    from app.models.project import Project
    from app.models.quotation import Quotation


class WorkOrder(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"), unique=True, nullable=True, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)
    production_slot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    responsible_team: Mapped[str | None] = mapped_column(String(150), nullable=True)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delay_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    planned_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    actual_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    quotation: Mapped["Quotation | None"] = relationship("Quotation", back_populates="work_order")
    project: Mapped["Project | None"] = relationship("Project", foreign_keys=[project_id])
    customer: Mapped["Customer"] = relationship("Customer", back_populates="work_orders")
    tasks: Mapped[list["ProductionTask"]] = relationship("ProductionTask", back_populates="work_order", cascade="all, delete-orphan", order_by="ProductionTask.sequence_order.asc()")
    updates: Mapped[list["ProductionUpdate"]] = relationship("ProductionUpdate", back_populates="work_order", cascade="all, delete-orphan", order_by="ProductionUpdate.created_at.desc()")
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
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    site_address: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Scheduled", nullable=False)
    assigned_team: Mapped[str | None] = mapped_column(String(150), nullable=True)
    lead_installer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    completion_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    signoff_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    signoff_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="installations")
    project: Mapped["Project | None"] = relationship("Project", foreign_keys=[project_id])
    lead_installer: Mapped["Employee | None"] = relationship("Employee")


class ProductionUpdate(Base):
    __tablename__ = "production_updates"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="updates")
    updated_by: Mapped["User | None"] = relationship("User")


class WorkOrderStatusHistory(Base):
    __tablename__ = "work_order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")
