import uuid
from datetime import date, datetime, time, timezone
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.auth import Employee
from app.models.design import Design, DesignStatusHistory, DesignVersion
from app.models.enquiry import Enquiry
from app.schemas.design import DesignCreate, DesignRead, DesignStatusUpdate, DesignSummaryResponse, DesignUpdate, DesignVersionCreate, DesignVersionRead
from app.services import audit_service


VALID_DESIGN_STATUSES = [
    "Not Started",
    "Assigned",
    "In Progress",
    "Internal Review",
    "Client Review",
    "Under Review",
    "Revision Required",
    "Approved",
    "Completed",
    "Rejected",
    "On Hold",
    "Cancelled",
]


def _to_design_read(design: Design, include_versions: bool = True) -> DesignRead:
    version_reads = (
        [
            DesignVersionRead(
                id=v.id,
                version_number=v.version_number,
                file_name=v.file_name,
                file_url=v.file_url,
                change_notes=v.change_notes,
                is_approved=v.is_approved,
                created_at=v.created_at,
                submitted_by_name=v.submitted_by.full_name if v.submitted_by else None,
            )
            for v in design.versions
        ]
        if include_versions
        else []
    )
    return DesignRead(
        id=design.id,
        design_number=design.design_number,
        enquiry_id=design.enquiry_id,
        project_id=design.project_id,
        assigned_designer_id=design.assigned_designer_id,
        title=design.title,
        description=design.description,
        site_location=design.site_location,
        status=design.status,
        approval_status=design.approval_status,
        priority=design.priority,
        design_value=design.design_value,
        estimated_hours=design.estimated_hours,
        actual_hours=design.actual_hours,
        expected_completion_date=design.expected_completion_date,
        completed_at=design.completed_at,
        remarks=design.remarks,
        created_at=design.created_at,
        updated_at=design.updated_at,
        enquiry_number=design.enquiry.enquiry_number if design.enquiry else None,
        assigned_designer_name=f"{design.assigned_designer.first_name} {design.assigned_designer.last_name}" if design.assigned_designer else None,
        versions=version_reads,
    )


def list_designs(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    compact: bool = False,
) -> tuple[int, list[DesignRead]]:
    query = db.query(Design).filter(Design.is_deleted == False)
    if status_filter:
        query = query.filter(Design.status == status_filter)
    if date_from:
        query = query.filter(Design.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Design.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Design.design_number.ilike(search_filter),
                Design.title.ilike(search_filter),
                Design.description.ilike(search_filter),
            )
        )
    options = [
        joinedload(Design.enquiry),
        joinedload(Design.assigned_designer),
    ]
    if not compact:
        options.append(selectinload(Design.versions).joinedload(DesignVersion.submitted_by))

    items = (
        query.options(*options)
        .order_by(Design.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_design_read(item, include_versions=not compact) for item in items]


def get_design(db: Session, design_id: uuid.UUID) -> Design:
    design = (
        db.query(Design)
        .options(
            joinedload(Design.enquiry),
            joinedload(Design.assigned_designer),
            selectinload(Design.versions).joinedload(DesignVersion.submitted_by),
        )
        .filter(Design.id == design_id, Design.is_deleted == False)
        .first()
    )
    if not design:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Design not found.")
    return design


def create_design(db: Session, data: DesignCreate, user_id: uuid.UUID | None = None) -> DesignRead:
    count = db.query(Design).count() + 1
    design_number = f"D-{count:03d}"

    design = Design(
        design_number=design_number,
        enquiry_id=data.enquiry_id,
        project_id=data.project_id,
        assigned_designer_id=data.assigned_designer_id,
        title=data.title,
        description=data.description,
        site_location=data.site_location,
        status="Assigned" if data.assigned_designer_id else "Not Started",
        approval_status=data.approval_status,
        priority=data.priority,
        design_value=data.design_value,
        estimated_hours=data.estimated_hours,
        expected_completion_date=data.expected_completion_date,
        remarks=data.remarks,
    )
    try:
        db.add(design)
        db.flush()

        history = DesignStatusHistory(
            design_id=design.id,
            from_status=None,
            to_status="Not Started",
            changed_by_id=user_id,
            notes="Design work order created.",
        )
        db.add(history)

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="design",
            entity_id=design.id,
            user_id=user_id,
            changes_summary=f"Created design {design.design_number}: {design.title}",
            commit=False,
        )
        db.commit()
        db.refresh(design)
        return _to_design_read(design)
    except Exception:
        db.rollback()
        raise


def update_design_status(db: Session, design_id: uuid.UUID, data: DesignStatusUpdate, user_id: uuid.UUID | None = None) -> DesignRead:
    if data.status not in VALID_DESIGN_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid design status. Allowed: {VALID_DESIGN_STATUSES}")

    design = get_design(db, design_id)
    old_status = design.status
    if old_status == data.status:
        return _to_design_read(design)

    design.status = data.status
    if data.status == "Completed":
        design.completed_at = datetime.now(timezone.utc)
    elif data.status == "Approved":
        design.approval_status = "Approved"
    elif data.status == "Rejected":
        design.approval_status = "Rejected"

    history = DesignStatusHistory(
        design_id=design.id,
        from_status=old_status,
        to_status=data.status,
        changed_by_id=user_id,
        notes=data.notes,
    )

    try:
        db.add(history)
        audit_service.log_audit_action(
            db,
            action="STATUS_CHANGE",
            entity_type="design",
            entity_id=design.id,
            user_id=user_id,
            changes_summary=f"Design {design.design_number} status changed from {old_status} to {data.status}",
            commit=False,
        )
        db.commit()
        db.refresh(design)
        return _to_design_read(design)
    except Exception:
        db.rollback()
        raise


def add_design_version(db: Session, design_id: uuid.UUID, data: DesignVersionCreate, user_id: uuid.UUID | None = None) -> DesignRead:
    design = get_design(db, design_id)
    version_num = len(design.versions) + 1
    version = DesignVersion(
        design_id=design.id,
        version_number=version_num,
        file_name=data.file_name,
        file_url=data.file_url,
        change_notes=data.change_notes,
        submitted_by_id=user_id,
        is_approved=False,
    )
    try:
        db.add(version)
        design.status = "Under Review"

        audit_service.log_audit_action(
            db,
            action="ADD_VERSION",
            entity_type="design",
            entity_id=design.id,
            user_id=user_id,
            changes_summary=f"Added version {version_num} ({data.file_name}) to design {design.design_number}",
            commit=False,
        )
        db.commit()
        db.refresh(design)
        return _to_design_read(design)
    except Exception:
        db.rollback()
        raise


def get_design_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> DesignSummaryResponse:
    query = db.query(Design).filter(Design.is_deleted == False)
    if date_from:
        query = query.filter(Design.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Design.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    today = date.today()
    stats = query.with_entities(
        func.count(Design.id),
        func.count(
            case(
                (
                    Design.status.in_(
                        ["Not Started", "Assigned", "Internal Review", "Client Review", "Under Review", "Revision Required", "On Hold"]
                    ),
                    1,
                )
            )
        ),
        func.count(case((Design.status == "In Progress", 1))),
        func.count(case((Design.status.in_(["Approved", "Completed"]), 1))),
        func.count(
            case(
                (
                    and_(
                        Design.status.notin_(["Approved", "Completed", "Cancelled", "Rejected"]),
                        Design.expected_completion_date != None,
                        Design.expected_completion_date < today,
                    ),
                    1,
                )
            )
        ),
    ).first()

    total = stats[0] if stats else 0
    pending = stats[1] if stats else 0
    in_progress = stats[2] if stats else 0
    completed = stats[3] if stats else 0
    overdue = stats[4] if stats else 0

    return DesignSummaryResponse(
        total_designs=total,
        pending_designs=pending,
        in_progress_designs=in_progress,
        completed_designs=completed,
        overdue_designs=overdue,
    )
