import uuid
from sqlalchemy.orm import Session
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
