import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.production import WorkOrder
    from app.models.project import Project


class FeedbackCategory(Base):
    __tablename__ = "feedback_categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Feedback(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "feedback"
    __table_args__ = (
        Index("ix_feedback_deleted_created", "is_deleted", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    work_order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    status: Mapped[str] = mapped_column(String(50), default="Awaiting", index=True, nullable=False)  # Received, Awaiting, Reviewed, Closed
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1 to 5, optional
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggestions: Mapped[str | None] = mapped_column(Text, nullable=True)
    complaints: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_review: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="feedback_records")
    work_order: Mapped["WorkOrder | None"] = relationship("WorkOrder", back_populates="feedback")
    project: Mapped["Project | None"] = relationship("Project", foreign_keys=[project_id])
