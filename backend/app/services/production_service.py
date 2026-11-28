import uuid
from datetime import date, datetime, time, timezone
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.auth import Role, User
from app.models.customer import Customer
from app.models.production import Installation, ProductionSlot, ProductionTask, ProductionUpdate, WorkOrder, WorkOrderStatusHistory
from app.models.project import Project, ProjectStatusHistory
from app.models.system import Notification
from app.services import accounts_service, audit_service, project_service
from app.schemas.production import (
    InstallationCreate,
    InstallationRead,
    ProductionCompleteHandoverRequest,
    ProductionSlotCreate,
    ProductionSlotRead,
    ProductionSlotUpdate,
    ProductionSummaryResponse,
    ProductionTaskCreate,
    ProductionTaskRead,
    ProductionTaskUpdate,
    ProductionUpdateCreate,
    ProductionUpdateRead,
    WorkOrderCreate,
    WorkOrderRead,
    WorkOrderStatusUpdate,
    WorkOrderUpdate,
)

VALID_PRODUCTION_STATUSES = [
    "Pending",
    "Waiting for Production",
    "Scheduled",
    "In Progress",
    "On Hold",
    "Quality Check",
    "Delayed",
    "Completed",
    "Cancelled",
]


def _to_work_order_read(wo: WorkOrder, include_details: bool = True) -> WorkOrderRead:
    task_reads = (
        [
            ProductionTaskRead(
                id=t.id,
                work_order_id=t.work_order_id,
                task_name=t.task_name,
                sequence_order=t.sequence_order,
                status=t.status,
                assigned_employee_id=t.assigned_employee_id,
                planned_hours=t.planned_hours,
                actual_hours=t.actual_hours,
                completion_notes=t.completion_notes,
                created_at=t.created_at,
                updated_at=t.updated_at,
                assigned_employee_name=f"{t.assigned_employee.first_name} {t.assigned_employee.last_name}" if t.assigned_employee else None,
            )
            for t in wo.tasks
        ]
        if include_details
        else []
    )
    inst_reads = (
        [
            InstallationRead(
                id=i.id,
                work_order_id=i.work_order_id,
                site_address=i.site_address,
                scheduled_date=i.scheduled_date,
                status=i.status,
                lead_installer_id=i.lead_installer_id,
                completion_notes=i.completion_notes,
                signoff_by=i.signoff_by,
                signoff_at=i.signoff_at,
                lead_installer_name=f"{i.lead_installer.first_name} {i.lead_installer.last_name}" if i.lead_installer else None,
                created_at=i.created_at,
                updated_at=i.updated_at,
            )
            for i in wo.installations
        ]
        if include_details
        else []
    )
    update_reads = (
        [
            ProductionUpdateRead(
                id=u.id,
                work_order_id=u.work_order_id,
                status=u.status,
                progress_percentage=u.progress_percentage,
                remarks=u.remarks,
                expected_completion_date=u.expected_completion_date,
                updated_by_name=u.updated_by.full_name if u.updated_by else None,
                created_at=u.created_at,
            )
            for u in wo.updates
        ]
        if include_details
        else []
    )
    return WorkOrderRead(
        id=wo.id,
        work_order_number=wo.work_order_number,
        quotation_id=wo.quotation_id,
        project_id=wo.project_id,
        customer_id=wo.customer_id,
        title=wo.title,
        status=wo.status,
        priority=wo.priority,
        production_slot=wo.production_slot,
        responsible_team=wo.responsible_team,
        progress_percentage=wo.progress_percentage,
        delay_reason=wo.delay_reason,
        planned_start_date=wo.planned_start_date,
        planned_end_date=wo.planned_end_date,
        actual_start_date=wo.actual_start_date,
        actual_completion_date=wo.actual_completion_date,
        notes=wo.notes,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
        customer_name=wo.customer.name if wo.customer else None,
        customer_company=wo.customer.company_name if wo.customer else None,
        tasks=task_reads,
        installations=inst_reads,
        updates=update_reads,
    )


def list_work_orders(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    compact: bool = False,
) -> tuple[int, list[WorkOrderRead]]:
    query = db.query(WorkOrder).filter(WorkOrder.is_deleted == False)
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
    if date_from:
        query = query.filter(WorkOrder.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(WorkOrder.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    if search:
        search_filter = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                WorkOrder.work_order_number.ilike(search_filter),
                WorkOrder.title.ilike(search_filter),
                Customer.name.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
            )
        )
    options = [joinedload(WorkOrder.customer)]
    if not compact:
        options.extend(
            [
                selectinload(WorkOrder.tasks).joinedload(ProductionTask.assigned_employee),
                selectinload(WorkOrder.installations).joinedload(Installation.lead_installer),
                selectinload(WorkOrder.updates).joinedload(ProductionUpdate.updated_by),
            ]
        )
    items = (
        query.options(*options)
        .order_by(WorkOrder.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = len(items) if page == 1 and len(items) < page_size else query.count()
    return total, [_to_work_order_read(item, include_details=not compact) for item in items]


def get_work_order(db: Session, work_order_id: uuid.UUID) -> WorkOrder:
    wo = (
        db.query(WorkOrder)
        .options(
            joinedload(WorkOrder.customer),
            selectinload(WorkOrder.tasks).joinedload(ProductionTask.assigned_employee),
            selectinload(WorkOrder.installations).joinedload(Installation.lead_installer),
            selectinload(WorkOrder.updates).joinedload(ProductionUpdate.updated_by),
        )
        .filter(WorkOrder.id == work_order_id, WorkOrder.is_deleted == False)
        .first()
    )
    if not wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found.")
    return wo


def create_work_order(db: Session, data: WorkOrderCreate, user_id: uuid.UUID | None = None) -> WorkOrderRead:
    count = db.query(WorkOrder).count() + 1
    while True:
        work_order_number = f"WO-{count + 840:04d}"
        if not db.query(WorkOrder).filter(WorkOrder.work_order_number == work_order_number).first():
            break
        count += 1

    wo = WorkOrder(
        work_order_number=work_order_number,
        quotation_id=data.quotation_id,
        project_id=data.project_id,
        customer_id=data.customer_id,
        title=data.title,
        priority=data.priority,
        production_slot=data.production_slot,
        responsible_team=data.responsible_team,
        progress_percentage=data.progress_percentage,
        delay_reason=data.delay_reason,
        planned_start_date=data.planned_start_date,
        planned_end_date=data.planned_end_date,
        notes=data.notes,
        status="Pending",
    )
    try:
        db.add(wo)
        db.flush()

        history = WorkOrderStatusHistory(
            work_order_id=wo.id,
            from_status=None,
            to_status="Pending",
            changed_by_id=user_id,
            notes="Work order created.",
        )
        db.add(history)

        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="work_order",
            entity_id=wo.id,
            user_id=user_id,
            changes_summary=f"Created work order {wo.work_order_number}: {wo.title}",
            commit=False,
        )
        db.commit()
        db.refresh(wo)
        return _to_work_order_read(wo)
    except Exception:
        db.rollback()
        raise


def update_work_order(db: Session, work_order_id: uuid.UUID, data: WorkOrderUpdate, user_id: uuid.UUID | None = None) -> WorkOrderRead:
    wo = get_work_order(db, work_order_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wo, key, value)

    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


def update_work_order_status(db: Session, work_order_id: uuid.UUID, data: WorkOrderStatusUpdate, user_id: uuid.UUID | None = None) -> WorkOrderRead:
    if data.status not in VALID_PRODUCTION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {data.status}")

    wo = get_work_order(db, work_order_id)
    old_status = wo.status
    if old_status == data.status:
        return _to_work_order_read(wo)

    wo.status = data.status
    if data.delay_reason is not None:
        wo.delay_reason = data.delay_reason
    if data.status == "Completed":
        wo.actual_completion_date = date.today()
        wo.progress_percentage = 100
    elif data.status == "In Progress" and not wo.actual_start_date:
        wo.actual_start_date = date.today()

    history = WorkOrderStatusHistory(
        work_order_id=wo.id,
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
            entity_type="work_order",
            entity_id=wo.id,
            user_id=user_id,
            changes_summary=f"Work order {wo.work_order_number} status changed from {old_status} to {data.status}",
            commit=False,
        )
        db.commit()
        db.refresh(wo)
        return _to_work_order_read(wo)
    except Exception:
        db.rollback()
        raise


def add_production_task(db: Session, work_order_id: uuid.UUID, data: ProductionTaskCreate) -> WorkOrderRead:
    wo = get_work_order(db, work_order_id)
    seq = len(wo.tasks) + 1
    task = ProductionTask(
        work_order_id=wo.id,
        task_name=data.task_name,
        sequence_order=seq,
        status=data.status,
        assigned_employee_id=data.assigned_employee_id,
        planned_hours=data.planned_hours,
        actual_hours=data.actual_hours,
        completion_notes=data.completion_notes,
    )
    db.add(task)
    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


def update_task_status(db: Session, work_order_id: uuid.UUID, task_id: uuid.UUID, data: ProductionTaskUpdate, user_id: uuid.UUID | None = None) -> WorkOrderRead:
    wo = get_work_order(db, work_order_id)
    task = db.query(ProductionTask).filter(ProductionTask.id == task_id, ProductionTask.work_order_id == wo.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Production task not found.")

    if data.status is not None:
        task.status = data.status
    if data.actual_hours is not None:
        task.actual_hours = data.actual_hours
    if data.completion_notes is not None:
        task.completion_notes = data.completion_notes

    # Auto-complete work order if all tasks are completed
    total_tasks = len(wo.tasks)
    completed_tasks = sum(1 for t in wo.tasks if t.status == "Completed")
    if total_tasks > 0 and completed_tasks == total_tasks and wo.status not in ["Completed", "Cancelled"]:
        wo.status = "Completed"
        wo.actual_completion_date = date.today()
        history = WorkOrderStatusHistory(
            work_order_id=wo.id,
            from_status="In Progress",
            to_status="Completed",
            changed_by_id=user_id,
            notes="All production tasks completed.",
        )
        db.add(history)

    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


def add_installation(db: Session, work_order_id: uuid.UUID, data: InstallationCreate) -> WorkOrderRead:
    wo = get_work_order(db, work_order_id)
    inst = Installation(
        work_order_id=wo.id,
        project_id=data.project_id or wo.project_id,
        site_address=data.site_address,
        scheduled_date=data.scheduled_date,
        completed_date=data.completed_date,
        status=data.status,
        assigned_team=data.assigned_team,
        lead_installer_id=data.lead_installer_id,
        completion_notes=data.completion_notes,
        remarks=data.remarks,
        signoff_by=data.signoff_by,
    )
    db.add(inst)
    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


def add_production_update(
    db: Session,
    work_order_id: uuid.UUID,
    data: ProductionUpdateCreate,
    user_id: uuid.UUID | None = None,
) -> WorkOrderRead:
    if data.status not in VALID_PRODUCTION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {data.status}")

    wo = get_work_order(db, work_order_id)
    old_status = wo.status
    try:
        update = ProductionUpdate(
            work_order_id=wo.id,
            status=data.status,
            progress_percentage=data.progress_percentage,
            remarks=data.remarks,
            expected_completion_date=data.expected_completion_date,
            updated_by_id=user_id,
        )
        db.add(update)

        wo.status = data.status
        wo.progress_percentage = data.progress_percentage
        if data.expected_completion_date:
            wo.planned_end_date = data.expected_completion_date
        if data.status == "In Progress" and not wo.actual_start_date:
            wo.actual_start_date = date.today()
        if data.status == "Completed":
            wo.actual_completion_date = wo.actual_completion_date or date.today()

        if old_status != data.status:
            db.add(
                WorkOrderStatusHistory(
                    work_order_id=wo.id,
                    from_status=old_status,
                    to_status=data.status,
                    changed_by_id=user_id,
                    notes=data.remarks,
                )
            )
        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="work_order",
            entity_id=wo.id,
            user_id=user_id,
            changes_summary=f"Production update on {wo.work_order_number}: {data.status} ({data.progress_percentage}%)",
            commit=False,
        )
        db.commit()
        db.refresh(wo)
        return _to_work_order_read(wo)
    except Exception:
        db.rollback()
        raise


def complete_production_and_transfer_to_accounts(
    db: Session,
    work_order_id: uuid.UUID,
    data: ProductionCompleteHandoverRequest,
    user_id: uuid.UUID | None = None,
) -> dict[str, str]:
    """
    Transactional Production-to-Accounts handover:
    1. Marks WorkOrder Completed + records completion date
    2. Ensures linked Project exists and updates lifecycle status to 'Sent to Accounts'
    3. Creates AccountsRecord (without marking financially closed)
    4. Records WorkOrderStatusHistory, ProjectStatusHistory, AuditLog
    5. Notifies Management & Accounts users
    """
    wo = get_work_order(db, work_order_id)
    if wo.status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancelled work orders cannot be transferred to Accounts.")

    completion_dt = data.completion_date or wo.actual_completion_date or date.today()
    old_wo_status = wo.status

    try:
        # 1. Mark WorkOrder completed
        wo.status = "Completed"
        wo.progress_percentage = 100
        wo.actual_completion_date = completion_dt
        if data.remarks:
            wo.notes = f"{wo.notes}\n{data.remarks}".strip() if wo.notes else data.remarks

        if old_wo_status != "Completed":
            db.add(
                WorkOrderStatusHistory(
                    work_order_id=wo.id,
                    from_status=old_wo_status,
                    to_status="Completed",
                    changed_by_id=user_id,
                    notes=data.remarks or "Production completed and transferred to Accounts.",
                )
            )
        db.add(
            ProductionUpdate(
                work_order_id=wo.id,
                status="Completed",
                progress_percentage=100,
                remarks=data.remarks or "Production completed; handed over to Accounts.",
                expected_completion_date=completion_dt,
                updated_by_id=user_id,
            )
        )

        # 2. Ensure Project exists and update lifecycle status
        project: Project | None = None
        if wo.project_id:
            project = db.query(Project).filter(Project.id == wo.project_id, Project.is_deleted == False).first()
        if not project and wo.quotation:
            project = project_service.ensure_project_for_quotation(db, wo.quotation, user_id=user_id, commit=False)
            wo.project_id = project.id
        if not project:
            project = Project(
                project_number=project_service._next_project_number(db),
                name=wo.title,
                customer_id=wo.customer_id,
                priority=wo.priority,
                approval_date=wo.planned_start_date or date.today(),
                start_date=wo.actual_start_date or wo.planned_start_date,
                status="Production Completed",
            )
            db.add(project)
            db.flush()
            wo.project_id = project.id

        old_proj_status = project.status
        project.status = "Sent to Accounts"
        db.add(
            ProjectStatusHistory(
                project_id=project.id,
                from_status=old_proj_status,
                to_status="Sent to Accounts",
                changed_by_id=user_id,
                notes=f"Production {wo.work_order_number} completed on {completion_dt}; transferred to Accounts.",
            )
        )

        # 3. Create AccountsRecord
        acc = accounts_service.create_accounts_record_for_project(
            db,
            project=project,
            work_order_id=wo.id,
            production_completion_date=completion_dt,
            user_id=user_id,
            commit=False,
        )

        # 4. Notify Management / Accounts / Admin users
        target_users = (
            db.query(User)
            .join(User.roles)
            .filter(User.is_active == True, Role.name.in_(["Administrator", "Super Admin", "Management", "Accounts Manager", "Sales / Accounts"]))
            .distinct()
            .all()
        )
        for u in target_users:
            db.add(
                Notification(
                    recipient_id=u.id,
                    title=f"Project {project.project_number} Ready for Accounts",
                    message=f"Production {wo.work_order_number} completed. Accounts record {acc.accounts_number} created.",
                    category="approval",
                    link=f"/accounts/{acc.id}",
                    is_read=False,
                )
            )

        # 5. Audit log
        audit_service.log_audit_action(
            db,
            action="HANDOVER",
            entity_type="work_order",
            entity_id=wo.id,
            user_id=user_id,
            changes_summary=f"Completed {wo.work_order_number} and transferred Project {project.project_number} to Accounts ({acc.accounts_number})",
            commit=False,
        )

        db.commit()
        return {
            "status": "transferred",
            "work_order_id": str(wo.id),
            "project_id": str(project.id),
            "accounts_record_id": str(acc.id),
            "accounts_number": acc.accounts_number,
        }
    except Exception:
        db.rollback()
        raise


def get_production_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> ProductionSummaryResponse:
    query = db.query(WorkOrder).filter(WorkOrder.is_deleted == False)
    if date_from:
        query = query.filter(WorkOrder.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(WorkOrder.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    today = date.today()
    delayed_cond = or_(
        WorkOrder.status == "Delayed",
        and_(
            WorkOrder.status.in_(["Scheduled", "In Progress", "Pending"]),
            WorkOrder.planned_end_date != None,
            WorkOrder.planned_end_date < today,
        ),
    )
    on_time_cond = and_(
        WorkOrder.status == "Completed",
        or_(
            WorkOrder.actual_completion_date == None,
            WorkOrder.planned_end_date == None,
            WorkOrder.actual_completion_date <= WorkOrder.planned_end_date,
        ),
    )

    stats = query.with_entities(
        func.count(WorkOrder.id),
        func.count(case((WorkOrder.status.in_(["Scheduled", "In Progress"]), 1))),
        func.count(case((WorkOrder.status == "Completed", 1))),
        func.count(case((delayed_cond, 1))),
        func.count(case((on_time_cond, 1))),
    ).first()

    total = stats[0] if stats else 0
    active = stats[1] if stats else 0
    completed = stats[2] if stats else 0
    total_delayed = stats[3] if stats else 0
    completed_on_time = stats[4] if stats else 0
    rate = round(((completed_on_time) / completed * 100), 1) if completed > 0 else 100.0

    return ProductionSummaryResponse(
        total_work_orders=total,
        active_work_orders=active,
        completed_work_orders=completed,
        delayed_work_orders=total_delayed,
        on_time_completion_rate=rate,
    )


def _check_slot_overlap(
    db: Session,
    *,
    bay: str,
    start_date: date,
    end_date: date,
    start_time: str,
    end_time: str,
    slot_status: str,
    exclude_slot_id: uuid.UUID | None = None,
) -> None:
    if slot_status == "completed":
        return

    query = db.query(ProductionSlot).filter(
        ProductionSlot.is_deleted == False,
        ProductionSlot.bay == bay,
        ProductionSlot.status != "completed",
        ProductionSlot.start_date <= end_date,
        ProductionSlot.end_date >= start_date,
        ProductionSlot.start_time < end_time,
        ProductionSlot.end_time > start_time,
    )
    if exclude_slot_id is not None:
        query = query.filter(ProductionSlot.id != exclude_slot_id)

    conflict = query.first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Production bay '{bay}' already has an overlapping slot {conflict.code} "
                f"({conflict.start_date} to {conflict.end_date}, {conflict.start_time}-{conflict.end_time})."
            ),
        )


def _generate_slot_code(db: Session) -> str:
    count = db.query(ProductionSlot).count() + 101
    while True:
        code = f"SLOT-{count}"
        if not db.query(ProductionSlot).filter(ProductionSlot.code == code).first():
            return code
        count += 1


def list_production_slots(
    db: Session,
    *,
    bay: str | None = None,
    status_filter: str | None = None,
    work_order_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[int, list[ProductionSlotRead]]:
    query = db.query(ProductionSlot).filter(ProductionSlot.is_deleted == False)
    if bay:
        query = query.filter(ProductionSlot.bay == bay)
    if status_filter:
        query = query.filter(ProductionSlot.status == status_filter)
    if work_order_id:
        query = query.filter(ProductionSlot.work_order_id == work_order_id)
    if date_from:
        query = query.filter(ProductionSlot.end_date >= date_from)
    if date_to:
        query = query.filter(ProductionSlot.start_date <= date_to)

    items = query.order_by(ProductionSlot.start_date.asc(), ProductionSlot.start_time.asc()).all()
    return len(items), [ProductionSlotRead.model_validate(s) for s in items]


def get_production_slot(db: Session, slot_id: uuid.UUID) -> ProductionSlot:
    slot = db.query(ProductionSlot).filter(ProductionSlot.id == slot_id, ProductionSlot.is_deleted == False).first()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Production slot not found.")
    return slot


def create_production_slot(
    db: Session,
    data: ProductionSlotCreate,
    user_id: uuid.UUID | None = None,
) -> ProductionSlotRead:
    bay = data.bay.strip()
    work_order_code = data.work_order_code
    if data.work_order_id is not None:
        wo = get_work_order(db, data.work_order_id)
        if not work_order_code:
            work_order_code = wo.work_order_number

    _check_slot_overlap(
        db,
        bay=bay,
        start_date=data.start_date,
        end_date=data.end_date,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_status=data.status,
    )

    code = (data.code or "").strip()
    if code:
        if db.query(ProductionSlot).filter(ProductionSlot.code == code).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Slot code '{code}' already exists.")
    else:
        code = _generate_slot_code(db)

    slot = ProductionSlot(
        code=code,
        work_order_id=data.work_order_id,
        work_order_code=work_order_code,
        client=data.client.strip(),
        title=data.title.strip(),
        bay=bay,
        stage=data.stage.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        start_time=data.start_time,
        end_time=data.end_time,
        lead_worker=data.lead_worker.strip() or "Unassigned",
        status=data.status,
        capacity_hours=data.capacity_hours,
        priority=data.priority,
        notes=data.notes.strip() if data.notes else None,
        created_by_id=user_id,
    )
    try:
        db.add(slot)
        db.flush()
        audit_service.log_audit_action(
            db,
            action="CREATE",
            entity_type="production_slot",
            entity_id=slot.id,
            user_id=user_id,
            changes_summary=f"Allocated slot {slot.code} on {slot.bay} ({slot.start_date} to {slot.end_date})",
            commit=False,
        )
        db.commit()
        db.refresh(slot)
        return ProductionSlotRead.model_validate(slot)
    except Exception:
        db.rollback()
        raise


def update_production_slot(
    db: Session,
    slot_id: uuid.UUID,
    data: ProductionSlotUpdate,
    user_id: uuid.UUID | None = None,
) -> ProductionSlotRead:
    slot = get_production_slot(db, slot_id)
    updates = data.model_dump(exclude_unset=True)

    new_work_order_id = updates.get("work_order_id", slot.work_order_id)
    if "work_order_id" in updates and new_work_order_id is not None:
        wo = get_work_order(db, new_work_order_id)
        if "work_order_code" not in updates or not updates["work_order_code"]:
            updates["work_order_code"] = wo.work_order_number

    new_bay = (updates.get("bay", slot.bay) or "").strip()
    new_start_date = updates.get("start_date", slot.start_date)
    new_end_date = updates.get("end_date", slot.end_date)
    new_start_time = updates.get("start_time", slot.start_time)
    new_end_time = updates.get("end_time", slot.end_time)
    new_status = updates.get("status", slot.status)

    if new_end_date < new_start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must not be earlier than start_date",
        )
    if new_end_time <= new_start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    _check_slot_overlap(
        db,
        bay=new_bay,
        start_date=new_start_date,
        end_date=new_end_date,
        start_time=new_start_time,
        end_time=new_end_time,
        slot_status=new_status,
        exclude_slot_id=slot.id,
    )

    for key, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(slot, key, value)

    try:
        audit_service.log_audit_action(
            db,
            action="UPDATE",
            entity_type="production_slot",
            entity_id=slot.id,
            user_id=user_id,
            changes_summary=f"Updated slot {slot.code} on {slot.bay} ({slot.start_date} to {slot.end_date})",
            commit=False,
        )
        db.commit()
        db.refresh(slot)
        return ProductionSlotRead.model_validate(slot)
    except Exception:
        db.rollback()
        raise


def delete_production_slot(
    db: Session,
    slot_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> None:
    slot = get_production_slot(db, slot_id)
    slot.is_deleted = True
    slot.deleted_at = datetime.now(timezone.utc)
    try:
        audit_service.log_audit_action(
            db,
            action="DELETE",
            entity_type="production_slot",
            entity_id=slot.id,
            user_id=user_id,
            changes_summary=f"Removed production slot {slot.code} on {slot.bay}",
            commit=False,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
