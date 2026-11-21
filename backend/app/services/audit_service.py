import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.models.system import AuditLog


def log_audit_action(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str | uuid.UUID,
    user_id: uuid.UUID | None = None,
    changes_summary: str | None = None,
    ip_address: str | None = None,
    commit: bool = True,
) -> AuditLog:
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        user_id=user_id,
        changes_summary=changes_summary,
        ip_address=ip_address,
    )
    db.add(log)
    if commit:
        db.commit()
    return log


def list_audit_logs(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    entity_type: str | None = None,
) -> tuple[int, list[AuditLog]]:
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, items
