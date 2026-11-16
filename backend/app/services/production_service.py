import uuid
from datetime import date, datetime, time, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.models.production import Installation, ProductionTask, WorkOrder, WorkOrderStatusHistory
from app.schemas.production import (
    InstallationCreate,
    InstallationRead,
    ProductionSummaryResponse,
    ProductionTaskCreate,
    ProductionTaskRead,
    WorkOrderCreate,
    WorkOrderRead,
    WorkOrderStatusUpdate,
    WorkOrderUpdate,
)

VALID_PRODUCTION_STATUSES = ["Pending", "Scheduled", "In Progress", "On Hold", "Delayed", "Completed", "Cancelled"]


def _to_work_order_read(wo: WorkOrder) -> WorkOrderRead:
    task_reads = [
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
    inst_reads = [
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
    return WorkOrderRead(
        id=wo.id,
        work_order_number=wo.work_order_number,
        quotation_id=wo.quotation_id,
        customer_id=wo.customer_id,
        title=wo.title,
        status=wo.status,
        priority=wo.priority,
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
    )


def list_work_orders(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
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
    total = query.count()
    items = query.order_by(WorkOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, [_to_work_order_read(item) for item in items]


def get_work_order(db: Session, work_order_id: uuid.UUID) -> WorkOrder:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id, WorkOrder.is_deleted == False).first()
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
        customer_id=data.customer_id,
        title=data.title,
        priority=data.priority,
        planned_start_date=data.planned_start_date,
        planned_end_date=data.planned_end_date,
        notes=data.notes,
        status="Pending",
    )
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
    if data.status == "Completed":
        wo.actual_completion_date = date.today()
    elif data.status == "In Progress" and not wo.actual_start_date:
        wo.actual_start_date = date.today()

    history = WorkOrderStatusHistory(
        work_order_id=wo.id,
        from_status=old_status,
        to_status=data.status,
        changed_by_id=user_id,
        notes=data.notes,
    )
    db.add(history)
    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


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


def add_installation(db: Session, work_order_id: uuid.UUID, data: InstallationCreate) -> WorkOrderRead:
    wo = get_work_order(db, work_order_id)
    inst = Installation(
        work_order_id=wo.id,
        site_address=data.site_address,
        scheduled_date=data.scheduled_date,
        status=data.status,
        lead_installer_id=data.lead_installer_id,
        completion_notes=data.completion_notes,
        signoff_by=data.signoff_by,
    )
    db.add(inst)
    db.commit()
    db.refresh(wo)
    return _to_work_order_read(wo)


def get_production_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> ProductionSummaryResponse:
    query = db.query(WorkOrder).filter(WorkOrder.is_deleted == False)
    if date_from:
        query = query.filter(WorkOrder.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(WorkOrder.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    total = query.count()
    active = query.filter(WorkOrder.status.in_(["Scheduled", "In Progress"])).count()
    completed = query.filter(WorkOrder.status == "Completed").count()
    delayed = query.filter(WorkOrder.status == "Delayed").count()

    today = date.today()
    auto_delayed = query.filter(
        WorkOrder.status.in_(["Scheduled", "In Progress"]),
        WorkOrder.planned_end_date != None,
        WorkOrder.planned_end_date < today,
    ).count()
    total_delayed = max(delayed, auto_delayed)

    rate = round(((completed) / total * 100), 1) if total > 0 else 100.0

    return ProductionSummaryResponse(
        total_work_orders=total,
        active_work_orders=active,
        completed_work_orders=completed,
        delayed_work_orders=total_delayed,
        on_time_completion_rate=rate,
    )
