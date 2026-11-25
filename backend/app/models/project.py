import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.accounts import AccountsRecord
    from app.models.auth import Employee, User
    from app.models.customer import Customer
    from app.models.enquiry import Enquiry
    from app.models.quotation import Quotation


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    enquiry_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True, index=True)
    approved_quotation_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"), unique=True, nullable=True, index=True)
    project_manager_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)

    site_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    approval_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    actual_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="Approved", nullable=False, index=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="projects")
    enquiry: Mapped["Enquiry | None"] = relationship("Enquiry", foreign_keys=[enquiry_id])
    approved_quotation: Mapped["Quotation | None"] = relationship("Quotation", foreign_keys=[approved_quotation_id])
    project_manager: Mapped["Employee | None"] = relationship("Employee", foreign_keys=[project_manager_id])
    status_history: Mapped[list["ProjectStatusHistory"]] = relationship(
        "ProjectStatusHistory",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectStatusHistory.created_at.desc()",
    )
    milestones: Mapped[list["ProjectMilestone"]] = relationship(
        "ProjectMilestone",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectMilestone.due_date.asc()",
    )
    accounts_record: Mapped["AccountsRecord | None"] = relationship("AccountsRecord", back_populates="project", uselist=False)


class ProjectStatusHistory(Base):
    __tablename__ = "project_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")


class ProjectMilestone(Base, TimestampMixin):
    __tablename__ = "project_milestones"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="milestones")
