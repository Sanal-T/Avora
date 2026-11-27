import uuid
from datetime import date, datetime, time, timezone
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.models.feedback import Feedback
from app.models.production import WorkOrder
from app.schemas.feedback import FeedbackCreate, FeedbackRead, FeedbackSummaryResponse, FeedbackUpdate
from app.services import audit_service


def _to_feedback_read(fb: Feedback) -> FeedbackRead:
    return FeedbackRead(
        id=fb.id,
        customer_id=fb.customer_id,
        work_order_id=fb.work_order_id,
        project_id=fb.project_id,
        category=fb.category,
        rating=fb.rating,
        comments=fb.comments,
        suggestions=fb.suggestions,
        complaints=fb.complaints,
        internal_review=fb.internal_review,
        status=fb.status,
        resolution_notes=fb.resolution_notes,
        received_at=fb.received_at,
        resolved_at=fb.resolved_at,
        created_at=fb.created_at,
        updated_at=fb.updated_at,
        customer_name=fb.customer.name if fb.customer else None,
        customer_company=fb.customer.company_name if fb.customer else None,
        work_order_number=fb.work_order.work_order_number if fb.work_order else None,
    )


def list_feedback(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[int, list[FeedbackRead]]:
    query = db.query(Feedback).filter(Feedback.is_deleted == False)
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    if category:
        query = query.filter(Feedback.category == category)
    if date_from:
        query = query.filter(Feedback.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Feedback.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    items = (
        query.options(
            joinedload(Feedback.customer),
            joinedload(Feedback.work_order),
        )
        .order_by(Feedback.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_feedback_read(item) for item in items]


def get_feedback(db: Session, feedback_id: uuid.UUID) -> FeedbackRead:
    fb = (
        db.query(Feedback)
        .options(
            joinedload(Feedback.customer),
            joinedload(Feedback.work_order),
        )
        .filter(Feedback.id == feedback_id, Feedback.is_deleted == False)
        .first()
    )
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback record not found.")
    return _to_feedback_read(fb)


def create_feedback(db: Session, data: FeedbackCreate, user_id: uuid.UUID | None = None) -> FeedbackRead:
    fb = Feedback(
        customer_id=data.customer_id,
        work_order_id=data.work_order_id,
        project_id=data.project_id,
        category=data.category,
        rating=data.rating,
        comments=data.comments,
        suggestions=data.suggestions,
        complaints=data.complaints,
        status="Received" if (data.comments or data.rating or data.complaints or data.suggestions) else "Awaiting",
        received_at=datetime.now(timezone.utc) if (data.comments or data.rating or data.complaints or data.suggestions) else None,
    )
    try:
        db.add(fb)
        db.flush()

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="feedback",
            entity_id=fb.id,
            user_id=user_id,
            changes_summary=f"Created feedback {fb.id} (Category: {fb.category}, Status: {fb.status})",
            commit=False,
        )
        db.commit()
        db.refresh(fb)
        return _to_feedback_read(fb)
    except Exception:
        db.rollback()
        raise


def update_feedback(db: Session, feedback_id: uuid.UUID, data: FeedbackUpdate, user_id: uuid.UUID | None = None) -> FeedbackRead:
    fb = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.is_deleted == False).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback record not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(fb, key, value)

    if data.status == "Closed" and not fb.resolved_at:
        fb.resolved_at = datetime.now(timezone.utc)
    if data.comments and not fb.received_at:
        fb.received_at = datetime.now(timezone.utc)
        if fb.status == "Awaiting":
            fb.status = "Received"

    try:
        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="feedback",
            entity_id=fb.id,
            user_id=user_id,
            changes_summary=f"Updated feedback {fb.id} (Status: {fb.status}, Rating: {fb.rating})",
            commit=False,
        )
        db.commit()
        db.refresh(fb)
        return _to_feedback_read(fb)
    except Exception:
        db.rollback()
        raise


def get_feedback_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> FeedbackSummaryResponse:
    query = db.query(Feedback).filter(Feedback.is_deleted == False)
    if date_from:
        query = query.filter(Feedback.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Feedback.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    stats = query.with_entities(
        func.count(Feedback.id),
        func.count(case((Feedback.status.in_(["Received", "Reviewed", "Closed"]), 1))),
        func.count(case((Feedback.status == "Awaiting", 1))),
    ).first()

    total = stats[0] if stats else 0
    received = stats[1] if stats else 0
    awaiting = stats[2] if stats else 0
    rate = round((received / total * 100), 1) if total > 0 else 0.0

    return FeedbackSummaryResponse(
        total_feedback=total,
        received_feedback=received,
        awaiting_feedback=awaiting,
        response_rate=rate,
    )
