import uuid
from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin


class Design(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "designs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    design_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    enquiry_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_designer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Not Started", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)

    estimated_hours: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    actual_hours: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    expected_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    enquiry: Mapped["Enquiry | None"] = relationship("Enquiry", back_populates="designs")
    assigned_designer: Mapped["Employee | None"] = relationship("Employee")
    versions: Mapped[list["DesignVersion"]] = relationship("DesignVersion", back_populates="design", cascade="all, delete-orphan", order_by="DesignVersion.version_number.desc()")
    status_history: Mapped[list["DesignStatusHistory"]] = relationship("DesignStatusHistory", back_populates="design", cascade="all, delete-orphan", order_by="DesignStatusHistory.created_at.desc()")


class DesignVersion(Base, TimestampMixin):
    __tablename__ = "design_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    design_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    change_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    design: Mapped["Design"] = relationship("Design", back_populates="versions")
    submitted_by: Mapped["User | None"] = relationship("User")


class DesignStatusHistory(Base):
    __tablename__ = "design_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    design_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    design: Mapped["Design"] = relationship("Design", back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship("User")
