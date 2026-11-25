import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.accounts import Invoice
from app.models.auth import Role, User
from app.models.design import Design
from app.models.production import WorkOrder
from app.models.quotation import Quotation, QuotationFollowUp
from app.models.system import Notification


def create_notification(
    db: Session,
    recipient_id: uuid.UUID,
    title: str,
    message: str,
    category: str = "general",
    link: str | None = None,
) -> Notification:
    notif = Notification(
        recipient_id=recipient_id,
        title=title,
        message=message,
        category=category,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_user_notifications(
    db: Session,
    user_id: uuid.UUID,
    unread_only: bool = False,
) -> tuple[int, list[Notification]]:
    query = db.query(Notification).filter(Notification.recipient_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    total = query.count()
    items = query.order_by(Notification.created_at.desc()).limit(50).all()
    return total, items


def mark_notification_read(db: Session, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification | None:
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.recipient_id == user_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_read(db: Session, user_id: uuid.UUID) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id, Notification.is_read == False)
        .update({Notification.is_read: True})
    )
    db.commit()
    return count


def _notify_if_not_sent_today(
    db: Session,
    recipient_id: uuid.UUID,
    title: str,
    message: str,
    category: str,
    link: str,
) -> bool:
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    exists = (
        db.query(Notification.id)
        .filter(
            Notification.recipient_id == recipient_id,
            Notification.title == title,
            Notification.created_at >= today_start,
        )
        .first()
    )
    if exists:
        return False
    db.add(
        Notification(
            recipient_id=recipient_id,
            title=title,
            message=message,
            category=category,
            link=link,
            is_read=False,
        )
    )
    return True


def run_reminder_checks(db: Session) -> dict[str, int]:
    """Scans due/overdue items across modules and creates deduplicated in-app notifications."""
    today = date.today()
    soon = today + timedelta(days=3)
    created_count = 0

    mgmt_users = (
        db.query(User)
        .join(User.roles)
        .filter(User.is_active == True, Role.name.in_(["Administrator", "Super Admin", "Management"]))
        .distinct()
        .all()
    )
    if not mgmt_users:
        return {"created": 0}

    # 1. Quotation follow-ups due or overdue
    due_follow_ups = (
        db.query(QuotationFollowUp)
        .join(Quotation, QuotationFollowUp.quotation_id == Quotation.id)
        .filter(
            Quotation.is_deleted == False,
            QuotationFollowUp.is_completed == False,
            QuotationFollowUp.scheduled_date <= today,
        )
        .all()
    )
    for fu in due_follow_ups:
        status_word = "overdue" if fu.scheduled_date < today else "due today"
        for u in mgmt_users:
            if _notify_if_not_sent_today(
                db,
                u.id,
                f"Follow-up {status_word}: {fu.quotation.quotation_number}",
                f"Quotation {fu.quotation.quotation_number} follow-up scheduled for {fu.scheduled_date}.",
                "follow_up",
                f"/quotations/{fu.quotation_id}",
            ):
                created_count += 1

    # 2. Quotations nearing expiry
    expiring_quotes = (
        db.query(Quotation)
        .filter(
            Quotation.is_deleted == False,
            Quotation.status.in_(["Sent", "Awaiting Response", "Pending Approval"]),
            Quotation.valid_until != None,
            Quotation.valid_until <= soon,
            Quotation.valid_until >= today,
        )
        .all()
    )
    for q in expiring_quotes:
        for u in mgmt_users:
            if _notify_if_not_sent_today(
                db,
                u.id,
                f"Quotation expiring soon: {q.quotation_number}",
                f"Quotation {q.quotation_number} expires on {q.valid_until}.",
                "deadline",
                f"/quotations/{q.id}",
            ):
                created_count += 1

    # 3. Overdue designs
    overdue_designs = (
        db.query(Design)
        .filter(
            Design.is_deleted == False,
            Design.status.notin_(["Completed", "Approved", "Cancelled", "Rejected"]),
            Design.expected_completion_date != None,
            Design.expected_completion_date < today,
        )
        .all()
    )
    for d in overdue_designs:
        for u in mgmt_users:
            if _notify_if_not_sent_today(
                db,
                u.id,
                f"Design overdue: {d.design_number}",
                f"Design '{d.title}' was due on {d.expected_completion_date}.",
                "delay",
                f"/designs/{d.id}",
            ):
                created_count += 1

    # 4. Delayed production work orders
    delayed_wos = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.is_deleted == False,
            WorkOrder.status.notin_(["Completed", "Cancelled"]),
            WorkOrder.planned_end_date != None,
            WorkOrder.planned_end_date < today,
        )
        .all()
    )
    for wo in delayed_wos:
        for u in mgmt_users:
            if _notify_if_not_sent_today(
                db,
                u.id,
                f"Production delayed: {wo.work_order_number}",
                f"Work order '{wo.title}' passed planned end date {wo.planned_end_date}.",
                "delay",
                f"/production/{wo.id}",
            ):
                created_count += 1

    # 5. Overdue invoices
    overdue_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.status != "Cancelled",
            Invoice.due_date != None,
            Invoice.due_date < today,
            Invoice.outstanding_amount > Decimal("0.00"),
        )
        .all()
    )
    for inv in overdue_invoices:
        for u in mgmt_users:
            if _notify_if_not_sent_today(
                db,
                u.id,
                f"Payment overdue: {inv.invoice_number}",
                f"Invoice {inv.invoice_number} (outstanding {inv.outstanding_amount}) was due on {inv.due_date}.",
                "deadline",
                f"/accounts/{inv.accounts_record_id}",
            ):
                created_count += 1

    if created_count > 0:
        db.commit()
    return {"created": created_count}
