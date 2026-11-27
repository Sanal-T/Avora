import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.accounts import AccountsRecord
from app.models.communication import Communication
from app.models.design import Design
from app.models.enquiry import Enquiry
from app.models.feedback import Feedback
from app.models.production import Installation, WorkOrder
from app.models.project import Project, ProjectMilestone, ProjectStatusHistory
from app.models.quotation import Quotation
from app.schemas.project import (
    ProjectCreate,
    ProjectMilestoneCreate,
    ProjectMilestoneRead,
    ProjectMilestoneUpdate,
    ProjectRead,
    ProjectStatusHistoryRead,
    ProjectStatusUpdate,
    ProjectSummaryResponse,
    ProjectTimelineEvent,
    ProjectUpdate,
)
from app.services import audit_service

VALID_PROJECT_STATUSES = [
    "Approved",
    "In Design",
    "Waiting for Production",
    "In Production",
    "Production Completed",
    "Sent to Accounts",
    "Partially Paid",
    "Closed",
    "On Hold",
    "Cancelled",
]


def _to_project_read(project: Project, include_details: bool = True) -> ProjectRead:
    return ProjectRead(
        id=project.id,
        project_number=project.project_number,
        name=project.name,
        customer_id=project.customer_id,
        enquiry_id=project.enquiry_id,
        approved_quotation_id=project.approved_quotation_id,
        project_manager_id=project.project_manager_id,
        site_location=project.site_location,
        project_value=project.project_value,
        approval_date=project.approval_date,
        start_date=project.start_date,
        expected_completion_date=project.expected_completion_date,
        actual_completion_date=project.actual_completion_date,
        priority=project.priority,
        status=project.status,
        remarks=project.remarks,
        created_at=project.created_at,
        updated_at=project.updated_at,
        customer_name=project.customer.name if project.customer else None,
        customer_company=project.customer.company_name if project.customer else None,
        enquiry_number=project.enquiry.enquiry_number if project.enquiry else None,
        quotation_number=project.approved_quotation.quotation_number if project.approved_quotation else None,
        project_manager_name=(
            f"{project.project_manager.first_name} {project.project_manager.last_name}"
            if project.project_manager
            else None
        ),
        status_history=(
            [
                ProjectStatusHistoryRead(
                    id=h.id,
                    from_status=h.from_status,
                    to_status=h.to_status,
                    notes=h.notes,
                    created_at=h.created_at,
                    changed_by_name=h.changed_by.full_name if h.changed_by else None,
                )
                for h in project.status_history
            ]
            if include_details
            else []
        ),
        milestones=(
            [ProjectMilestoneRead.model_validate(m) for m in project.milestones]
            if include_details
            else []
        ),
    )


def _next_project_number(db: Session) -> str:
    count = db.query(Project).count() + 1001
    candidate = f"PRJ-{count}"
    while db.query(Project).filter(Project.project_number == candidate).first() is not None:
        count += 1
        candidate = f"PRJ-{count}"
    return candidate


def ensure_project_for_quotation(
    db: Session,
    quotation: Quotation,
    user_id: uuid.UUID | None = None,
    commit: bool = False,
) -> Project:
    """Creates or activates the central Project record when a quotation is approved."""
    existing = db.query(Project).filter(
        or_(
            Project.approved_quotation_id == quotation.id,
            Project.id == quotation.project_id,
        ),
        Project.is_deleted == False,
    ).first()
    if existing:
        if not quotation.project_id:
            quotation.project_id = existing.id
        return existing

    project_name = f"Project for {quotation.quotation_number}"
    if quotation.enquiry and quotation.enquiry.requirement_summary:
        summary = quotation.enquiry.requirement_summary.strip()
        project_name = summary[:120] + ("..." if len(summary) > 120 else "")

    project = Project(
        project_number=_next_project_number(db),
        name=project_name,
        customer_id=quotation.customer_id,
        enquiry_id=quotation.enquiry_id,
        approved_quotation_id=quotation.id,
        project_value=quotation.approved_value or quotation.total_amount or Decimal("0.00"),
        approval_date=date.today(),
        priority=quotation.enquiry.priority if quotation.enquiry else "Medium",
        status="Approved",
        remarks=f"Created from approved quotation {quotation.quotation_number}",
    )
    db.add(project)
    db.flush()

    quotation.project_id = project.id
    if quotation.design_id:
        design = db.query(Design).filter(Design.id == quotation.design_id).first()
        if design and not design.project_id:
            design.project_id = project.id

    db.add(
        ProjectStatusHistory(
            project_id=project.id,
            from_status=None,
            to_status="Approved",
            changed_by_id=user_id,
            notes=f"Project activated upon approval of {quotation.quotation_number}",
        )
    )
    audit_service.log_audit_action(
        db,
        action="CREATE",
        entity_type="project",
        entity_id=project.id,
        user_id=user_id,
        changes_summary=f"Created project {project.project_number} from quotation {quotation.quotation_number}",
        commit=False,
    )
    if commit:
        db.commit()
        db.refresh(project)
    return project


def list_projects(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    priority_filter: str | None = None,
    customer_id: uuid.UUID | None = None,
    search: str | None = None,
    compact: bool = False,
) -> tuple[int, list[ProjectRead]]:
    query = db.query(Project).filter(Project.is_deleted == False)
    if status_filter and status_filter != "all":
        query = query.filter(Project.status == status_filter)
    if priority_filter and priority_filter != "all":
        query = query.filter(Project.priority == priority_filter)
    if customer_id:
        query = query.filter(Project.customer_id == customer_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Project.project_number.ilike(pattern),
                Project.name.ilike(pattern),
                Project.site_location.ilike(pattern),
            )
        )
    options = [
        joinedload(Project.customer),
        joinedload(Project.enquiry),
        joinedload(Project.approved_quotation),
        joinedload(Project.project_manager),
    ]
    if not compact:
        options.extend(
            [
                selectinload(Project.status_history).joinedload(ProjectStatusHistory.changed_by),
                selectinload(Project.milestones),
            ]
        )
    items = (
        query.options(*options)
        .order_by(Project.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_project_read(p, include_details=not compact) for p in items]


def get_project_orm(db: Session, project_id: uuid.UUID) -> Project:
    project = (
        db.query(Project)
        .options(
            joinedload(Project.customer),
            joinedload(Project.enquiry),
            joinedload(Project.approved_quotation),
            joinedload(Project.project_manager),
            selectinload(Project.status_history).joinedload(ProjectStatusHistory.changed_by),
            selectinload(Project.milestones),
        )
        .filter(Project.id == project_id, Project.is_deleted == False)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


def get_project(db: Session, project_id: uuid.UUID) -> ProjectRead:
    return _to_project_read(get_project_orm(db, project_id))


def create_project(db: Session, data: ProjectCreate, user_id: uuid.UUID | None = None) -> ProjectRead:
    project = Project(
        project_number=_next_project_number(db),
        name=data.name,
        customer_id=data.customer_id,
        enquiry_id=data.enquiry_id,
        approved_quotation_id=data.approved_quotation_id,
        project_manager_id=data.project_manager_id,
        site_location=data.site_location,
        project_value=data.project_value,
        approval_date=data.approval_date or date.today(),
        start_date=data.start_date,
        expected_completion_date=data.expected_completion_date,
        priority=data.priority,
        status="Approved",
        remarks=data.remarks,
    )
    try:
        db.add(project)
        db.flush()
        db.add(
            ProjectStatusHistory(
                project_id=project.id,
                from_status=None,
                to_status="Approved",
                changed_by_id=user_id,
                notes="Project created.",
            )
        )
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="project",
            entity_id=project.id,
            user_id=user_id,
            changes_summary=f"Created project {project.project_number}: {project.name}",
            commit=False,
        )
        db.commit()
        return get_project(db, project.id)
    except Exception:
        db.rollback()
        raise


def update_project(db: Session, project_id: uuid.UUID, data: ProjectUpdate, user_id: uuid.UUID | None = None) -> ProjectRead:
    project = get_project_orm(db, project_id)
    update_dict = data.model_dump(exclude_unset=True)
    try:
        for key, value in update_dict.items():
            setattr(project, key, value)
        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="project",
            entity_id=project.id,
            user_id=user_id,
            changes_summary=f"Updated project {project.project_number} fields: {', '.join(update_dict.keys())}",
            commit=False,
        )
        db.commit()
        return get_project(db, project.id)
    except Exception:
        db.rollback()
        raise


def update_project_status(
    db: Session,
    project_id: uuid.UUID,
    data: ProjectStatusUpdate,
    user_id: uuid.UUID | None = None,
) -> ProjectRead:
    if data.status not in VALID_PROJECT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid project status. Allowed: {VALID_PROJECT_STATUSES}",
        )
    project = get_project_orm(db, project_id)
    old_status = project.status
    project.status = data.status
    if data.status == "Closed" and not project.actual_completion_date:
        project.actual_completion_date = date.today()

    try:
        db.add(
            ProjectStatusHistory(
                project_id=project.id,
                from_status=old_status,
                to_status=data.status,
                changed_by_id=user_id,
                notes=data.notes,
            )
        )
        audit_service.log_audit_action(
            db,
            action="STATUS_CHANGE",
            entity_type="project",
            entity_id=project.id,
            user_id=user_id,
            changes_summary=f"Project {project.project_number} status: {old_status} -> {data.status}",
            commit=False,
        )
        db.commit()
        return get_project(db, project.id)
    except Exception:
        db.rollback()
        raise


def add_milestone(db: Session, project_id: uuid.UUID, data: ProjectMilestoneCreate, user_id: uuid.UUID | None = None) -> ProjectRead:
    project = get_project_orm(db, project_id)
    milestone = ProjectMilestone(
        project_id=project.id,
        title=data.title,
        due_date=data.due_date,
        status=data.status,
        remarks=data.remarks,
    )
    db.add(milestone)
    audit_service.log_audit_action(
        db,
        action="CREATE",
        entity_type="project_milestone",
        entity_id=project.id,
        user_id=user_id,
        changes_summary=f"Added milestone '{data.title}' to {project.project_number}",
        commit=False,
    )
    db.commit()
    return get_project(db, project.id)


def update_milestone(
    db: Session,
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: ProjectMilestoneUpdate,
    user_id: uuid.UUID | None = None,
) -> ProjectRead:
    milestone = (
        db.query(ProjectMilestone)
        .filter(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, key, value)
    if data.status == "Completed" and not milestone.completed_at:
        milestone.completed_at = datetime.now(timezone.utc)
    db.commit()
    return get_project(db, project_id)


def get_project_timeline(db: Session, project_id: uuid.UUID) -> list[ProjectTimelineEvent]:
    project = get_project_orm(db, project_id)
    events: list[ProjectTimelineEvent] = []

    def _dt(val: datetime | date | None) -> datetime:
        if val is None:
            return datetime.now(timezone.utc)
        if isinstance(val, date) and not isinstance(val, datetime):
            return datetime.combine(val, datetime.min.time(), tzinfo=timezone.utc)
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val

    # 1. Project status history
    for h in project.status_history:
        events.append(
            ProjectTimelineEvent(
                event_type="project_status",
                title=f"Project status: {h.to_status}",
                description=h.notes or (f"Changed from {h.from_status}" if h.from_status else "Project initialized"),
                timestamp=_dt(h.created_at),
                actor=h.changed_by.full_name if h.changed_by else None,
                entity_type="project",
                entity_id=str(project.id),
            )
        )

    # 2. Enquiry events
    if project.enquiry:
        enq = project.enquiry
        events.append(
            ProjectTimelineEvent(
                event_type="enquiry_created",
                title=f"Enquiry {enq.enquiry_number} created",
                description=enq.requirement_summary[:140],
                timestamp=_dt(enq.created_at),
                entity_type="enquiry",
                entity_id=str(enq.id),
            )
        )
        for eh in enq.status_history:
            events.append(
                ProjectTimelineEvent(
                    event_type="enquiry_status",
                    title=f"Enquiry {enq.enquiry_number} → {eh.to_status}",
                    description=eh.notes,
                    timestamp=_dt(eh.created_at),
                    actor=eh.changed_by.full_name if eh.changed_by else None,
                    entity_type="enquiry",
                    entity_id=str(enq.id),
                )
            )

    # 3. Designs
    designs = db.query(Design).filter(
        or_(Design.project_id == project.id, Design.enquiry_id == project.enquiry_id) if project.enquiry_id else (Design.project_id == project.id),
        Design.is_deleted == False,
    ).all()
    for d in designs:
        events.append(
            ProjectTimelineEvent(
                event_type="design_created",
                title=f"Design {d.design_number}: {d.title}",
                description=f"Status: {d.status} ({d.approval_status})",
                timestamp=_dt(d.created_at),
                entity_type="design",
                entity_id=str(d.id),
            )
        )

    # 4. Quotations
    quotations = db.query(Quotation).filter(
        or_(Quotation.project_id == project.id, Quotation.id == project.approved_quotation_id),
        Quotation.is_deleted == False,
    ).all()
    for q in quotations:
        for qh in q.status_history:
            events.append(
                ProjectTimelineEvent(
                    event_type="quotation_status",
                    title=f"Quotation {q.quotation_number} → {qh.to_status}",
                    description=qh.notes,
                    timestamp=_dt(qh.created_at),
                    actor=qh.changed_by.full_name if qh.changed_by else None,
                    entity_type="quotation",
                    entity_id=str(q.id),
                )
            )

    # 5. Production Work Orders & Updates
    work_orders = db.query(WorkOrder).filter(
        or_(WorkOrder.project_id == project.id, WorkOrder.quotation_id == project.approved_quotation_id)
        if project.approved_quotation_id
        else (WorkOrder.project_id == project.id),
        WorkOrder.is_deleted == False,
    ).all()
    for wo in work_orders:
        for wh in wo.status_history:
            events.append(
                ProjectTimelineEvent(
                    event_type="production_status",
                    title=f"Production {wo.work_order_number} → {wh.to_status}",
                    description=wh.notes,
                    timestamp=_dt(wh.created_at),
                    actor=wh.changed_by.full_name if wh.changed_by else None,
                    entity_type="production",
                    entity_id=str(wo.id),
                )
            )
        for upd in wo.updates:
            events.append(
                ProjectTimelineEvent(
                    event_type="production_update",
                    title=f"Production update ({upd.progress_percentage}%): {upd.status}",
                    description=upd.remarks,
                    timestamp=_dt(upd.created_at),
                    actor=upd.updated_by.full_name if upd.updated_by else None,
                    entity_type="production",
                    entity_id=str(wo.id),
                )
            )

    # 6. Accounts, Invoices, Payments
    acc = db.query(AccountsRecord).filter(AccountsRecord.project_id == project.id, AccountsRecord.is_deleted == False).first()
    if acc:
        events.append(
            ProjectTimelineEvent(
                event_type="accounts_transfer",
                title=f"Transferred to Accounts ({acc.accounts_number})",
                description=f"Status: {acc.status}",
                timestamp=_dt(acc.accounts_transfer_date or acc.created_at),
                entity_type="accounts",
                entity_id=str(acc.id),
            )
        )
        for inv in acc.invoices:
            events.append(
                ProjectTimelineEvent(
                    event_type="invoice_generated",
                    title=f"Invoice {inv.invoice_number} generated",
                    description=f"Total: {inv.total_amount}",
                    timestamp=_dt(inv.invoice_date),
                    entity_type="invoice",
                    entity_id=str(inv.id),
                )
            )
        for pay in acc.payments:
            events.append(
                ProjectTimelineEvent(
                    event_type="payment_received",
                    title=f"Payment received: {pay.amount}",
                    description=f"Method: {pay.payment_method}" + (f" ({pay.reference_number})" if pay.reference_number else ""),
                    timestamp=_dt(pay.payment_date),
                    actor=pay.recorded_by.full_name if pay.recorded_by else None,
                    entity_type="accounts",
                    entity_id=str(acc.id),
                )
            )

    # 7. Installations & Feedback & Communications
    for inst in db.query(Installation).filter(Installation.project_id == project.id).all():
        events.append(
            ProjectTimelineEvent(
                event_type="installation",
                title=f"Installation: {inst.status}",
                description=inst.site_address,
                timestamp=_dt(inst.completed_date or inst.scheduled_date),
                entity_type="installation",
                entity_id=str(inst.id),
            )
        )
    for fb in db.query(Feedback).filter(Feedback.project_id == project.id, Feedback.is_deleted == False).all():
        events.append(
            ProjectTimelineEvent(
                event_type="feedback",
                title=f"Customer Feedback ({fb.rating or '-'}/5)",
                description=fb.comments,
                timestamp=_dt(fb.received_at or fb.created_at),
                entity_type="feedback",
                entity_id=str(fb.id),
            )
        )
    for comm in db.query(Communication).filter(Communication.project_id == project.id).all():
        events.append(
            ProjectTimelineEvent(
                event_type="communication",
                title=f"{comm.type}: {comm.subject}",
                description=f"Status: {comm.status}",
                timestamp=_dt(comm.created_at),
                entity_type="communication",
                entity_id=str(comm.id),
            )
        )

    events.sort(key=lambda e: e.timestamp, reverse=True)
    return events


def get_project_summary(db: Session) -> ProjectSummaryResponse:
    today = date.today()
    delayed_cond = and_(
        Project.expected_completion_date != None,
        Project.expected_completion_date < today,
        Project.status.notin_(["Closed", "Cancelled", "Production Completed", "Sent to Accounts"]),
    )
    stats = (
        db.query(
            func.count(Project.id),
            func.count(case((Project.status == "Approved", 1))),
            func.count(case((Project.status.in_(["Waiting for Production", "In Production"]), 1))),
            func.count(case((Project.status.in_(["Sent to Accounts", "Partially Paid"]), 1))),
            func.count(case((Project.status == "Closed", 1))),
            func.count(case((delayed_cond, 1))),
            func.coalesce(func.sum(Project.project_value), Decimal("0.00")),
        )
        .filter(Project.is_deleted == False)
        .first()
    )
    return ProjectSummaryResponse(
        total_projects=stats[0] if stats else 0,
        approved_projects=stats[1] if stats else 0,
        in_production_projects=stats[2] if stats else 0,
        sent_to_accounts_projects=stats[3] if stats else 0,
        closed_projects=stats[4] if stats else 0,
        delayed_projects=stats[5] if stats else 0,
        total_project_value=stats[6] if stats else Decimal("0.00"),
    )
