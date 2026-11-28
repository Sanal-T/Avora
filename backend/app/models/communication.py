import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.auth import Department, User
    from app.models.project import Project


class Communication(Base, TimestampMixin):
    __tablename__ = "communications"
    __table_args__ = (
        Index("ix_communications_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    communication_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    from_department_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    to_department_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    type: Mapped[str] = mapped_column(String(50), default="Request", nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="Open", nullable=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project | None"] = relationship("Project")
    from_department: Mapped["Department | None"] = relationship("Department", foreign_keys=[from_department_id])
    to_department: Mapped["Department | None"] = relationship("Department", foreign_keys=[to_department_id])
    created_by: Mapped["User | None"] = relationship("User")
    messages: Mapped[list["CommunicationMessage"]] = relationship(
        "CommunicationMessage",
        back_populates="communication",
        cascade="all, delete-orphan",
        order_by="CommunicationMessage.created_at.asc()",
    )


class CommunicationMessage(Base):
    __tablename__ = "communication_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    communication_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("communications.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    communication: Mapped["Communication"] = relationship("Communication", back_populates="messages")
    sender: Mapped["User | None"] = relationship("User")
