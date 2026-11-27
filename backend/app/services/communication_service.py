import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.communication import Communication, CommunicationMessage
from app.schemas.communication import (
    CommunicationCreate,
    CommunicationMessageCreate,
    CommunicationMessageRead,
    CommunicationRead,
    CommunicationSummaryResponse,
    CommunicationUpdate,
)
from app.services import audit_service

VALID_COMM_TYPES = ["Request", "Suggestion", "Approval", "Clarification", "Issue", "Complaint", "Delay Report"]
VALID_COMM_STATUSES = ["Open", "Acknowledged", "In Progress", "Responded", "Resolved", "Closed"]


def _to_comm_read(c: Communication, include_messages: bool = True) -> CommunicationRead:
    return CommunicationRead(
        id=c.id,
        communication_number=c.communication_number,
        project_id=c.project_id,
        from_department_id=c.from_department_id,
        to_department_id=c.to_department_id,
        created_by_id=c.created_by_id,
        type=c.type,
        subject=c.subject,
        description=c.description,
        priority=c.priority,
        status=c.status,
        resolved_at=c.resolved_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
        project_number=c.project.project_number if c.project else None,
        from_department_name=c.from_department.name if c.from_department else None,
        to_department_name=c.to_department.name if c.to_department else None,
        created_by_name=c.created_by.full_name if c.created_by else None,
        messages=(
            [
                CommunicationMessageRead(
                    id=m.id,
                    communication_id=m.communication_id,
                    sender_id=m.sender_id,
                    sender_name=m.sender.full_name if m.sender else None,
                    message=m.message,
                    created_at=m.created_at,
                )
                for m in c.messages
            ]
            if include_messages
            else []
        ),
    )


def _next_comm_number(db: Session) -> str:
    count = db.query(Communication).count() + 1001
    candidate = f"COM-{count}"
    while db.query(Communication).filter(Communication.communication_number == candidate).first() is not None:
        count += 1
        candidate = f"COM-{count}"
    return candidate


def list_communications(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    type_filter: str | None = None,
    department_id: str | None = None,
    project_id: uuid.UUID | None = None,
    search: str | None = None,
    compact: bool = False,
) -> tuple[int, list[CommunicationRead]]:
    query = db.query(Communication)
    if status_filter and status_filter != "all":
        query = query.filter(Communication.status == status_filter)
    if type_filter and type_filter != "all":
        query = query.filter(Communication.type == type_filter)
    if department_id:
        query = query.filter(
            or_(
                Communication.from_department_id == department_id,
                Communication.to_department_id == department_id,
            )
        )
    if project_id:
        query = query.filter(Communication.project_id == project_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Communication.communication_number.ilike(pattern),
                Communication.subject.ilike(pattern),
                Communication.description.ilike(pattern),
            )
        )
    options = [
        joinedload(Communication.project),
        joinedload(Communication.from_department),
        joinedload(Communication.to_department),
        joinedload(Communication.created_by),
    ]
    if not compact:
        options.append(selectinload(Communication.messages).joinedload(CommunicationMessage.sender))

    items = (
        query.options(*options)
        .order_by(Communication.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_comm_read(c, include_messages=not compact) for c in items]


def get_communication_orm(db: Session, comm_id: uuid.UUID) -> Communication:
    comm = (
        db.query(Communication)
        .options(
            joinedload(Communication.project),
            joinedload(Communication.from_department),
            joinedload(Communication.to_department),
            joinedload(Communication.created_by),
            selectinload(Communication.messages).joinedload(CommunicationMessage.sender),
        )
        .filter(Communication.id == comm_id)
        .first()
    )
    if not comm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication record not found.")
    return comm


def get_communication(db: Session, comm_id: uuid.UUID) -> CommunicationRead:
    return _to_comm_read(get_communication_orm(db, comm_id))


def create_communication(db: Session, data: CommunicationCreate, user_id: uuid.UUID | None = None) -> CommunicationRead:
    if data.type not in VALID_COMM_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid communication type. Allowed: {VALID_COMM_TYPES}")
    comm = Communication(
        communication_number=_next_comm_number(db),
        project_id=data.project_id,
        from_department_id=data.from_department_id,
        to_department_id=data.to_department_id,
        created_by_id=user_id,
        type=data.type,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        status="Open",
    )
    try:
        db.add(comm)
        db.flush()
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="communication",
            entity_id=comm.id,
            user_id=user_id,
            changes_summary=f"Created {comm.type} {comm.communication_number}: {comm.subject}",
            commit=False,
        )
        db.commit()
        return get_communication(db, comm.id)
    except Exception:
        db.rollback()
        raise


def update_communication(db: Session, comm_id: uuid.UUID, data: CommunicationUpdate, user_id: uuid.UUID | None = None) -> CommunicationRead:
    comm = get_communication_orm(db, comm_id)
    if data.status:
        if data.status not in VALID_COMM_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Allowed: {VALID_COMM_STATUSES}")
        comm.status = data.status
        if data.status in ("Resolved", "Closed") and not comm.resolved_at:
            comm.resolved_at = datetime.now(timezone.utc)
    if data.priority:
        comm.priority = data.priority
    if data.to_department_id is not None:
        comm.to_department_id = data.to_department_id

    audit_service.log_audit_action(
        db,
        action="UPDATE",
        entity_type="communication",
        entity_id=comm.id,
        user_id=user_id,
        changes_summary=f"Updated {comm.communication_number} (status: {comm.status})",
        commit=False,
    )
    db.commit()
    return get_communication(db, comm.id)


def add_message(db: Session, comm_id: uuid.UUID, data: CommunicationMessageCreate, user_id: uuid.UUID | None = None) -> CommunicationRead:
    comm = get_communication_orm(db, comm_id)
    msg = CommunicationMessage(
        communication_id=comm.id,
        sender_id=user_id,
        message=data.message,
    )
    db.add(msg)
    if comm.status == "Open":
        comm.status = "Responded"
    db.commit()
    return get_communication(db, comm.id)


def get_communication_summary(db: Session) -> CommunicationSummaryResponse:
    stats = db.query(
        func.count(Communication.id),
        func.count(case((Communication.status.in_(["Open", "Acknowledged", "In Progress"]), 1))),
        func.count(case(((Communication.type == "Approval") & (Communication.status.notin_(["Resolved", "Closed"])), 1))),
        func.count(case(((Communication.priority.in_(["High", "Urgent"])) & (Communication.status.notin_(["Resolved", "Closed"])), 1))),
        func.count(case((Communication.status.in_(["Resolved", "Closed"]), 1))),
    ).first()
    return CommunicationSummaryResponse(
        total_communications=stats[0] if stats else 0,
        open_requests=stats[1] if stats else 0,
        pending_approvals=stats[2] if stats else 0,
        high_priority_issues=stats[3] if stats else 0,
        resolved_count=stats[4] if stats else 0,
    )
