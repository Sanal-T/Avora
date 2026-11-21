import uuid
from datetime import date, datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.labour import LabourAssignment, LabourRequest, Worker
from app.schemas.labour import (
    LabourAssignmentCreate,
    LabourAssignmentRead,
    LabourRequestCreate,
    LabourRequestRead,
    LabourRequestStatusUpdate,
    LabourSummaryResponse,
    WorkerCreate,
    WorkerRead,
    WorkerUpdate,
)


def _to_worker_read(w: Worker) -> WorkerRead:
    return WorkerRead(
        id=w.id,
        worker_code=w.worker_code,
        first_name=w.first_name,
        last_name=w.last_name,
        phone=w.phone,
        skill_category=w.skill_category,
        status=w.status,
        daily_rate=w.daily_rate,
        is_active=w.is_active,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


def _to_labour_request_read(req: LabourRequest) -> LabourRequestRead:
    assign_reads = [
        LabourAssignmentRead(
            id=a.id,
            labour_request_id=a.labour_request_id,
            worker_id=a.worker_id,
            worker_name=f"{a.worker.first_name} {a.worker.last_name}" if a.worker else None,
            work_order_id=a.work_order_id,
            start_date=a.start_date,
            end_date=a.end_date,
            status=a.status,
            created_at=a.created_at,
        )
        for a in req.assignments
    ]
    return LabourRequestRead(
        id=req.id,
        request_number=req.request_number,
        work_order_id=req.work_order_id,
        department_id=req.department_id,
        required_workers_count=req.required_workers_count,
        required_date=req.required_date,
        skill_category=req.skill_category,
        status=req.status,
        notes=req.notes,
        created_at=req.created_at,
        updated_at=req.updated_at,
        assignments=assign_reads,
    )


def list_workers(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    skill_category: str | None = None,
    search: str | None = None,
) -> tuple[int, list[WorkerRead]]:
    query = db.query(Worker).filter(Worker.is_active == True)
    if status_filter:
        query = query.filter(Worker.status == status_filter)
    if skill_category:
        query = query.filter(Worker.skill_category == skill_category)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Worker.first_name.ilike(search_filter),
                Worker.last_name.ilike(search_filter),
                Worker.worker_code.ilike(search_filter),
            )
        )
    total = query.count()
    items = query.order_by(Worker.first_name.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, [_to_worker_read(item) for item in items]


def create_worker(db: Session, data: WorkerCreate) -> WorkerRead:
    worker_code = data.worker_code
    if not worker_code:
        count = db.query(Worker).count() + 1
        worker_code = f"WRK-{count + 100}"

    worker = Worker(
        worker_code=worker_code,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        skill_category=data.skill_category,
        status=data.status,
        daily_rate=data.daily_rate,
        is_active=True,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return _to_worker_read(worker)


def get_worker(db: Session, worker_id: uuid.UUID) -> WorkerRead:
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    return _to_worker_read(worker)


def update_worker(db: Session, worker_id: uuid.UUID, data: WorkerUpdate) -> WorkerRead:
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    if data.first_name is not None:
        worker.first_name = data.first_name
    if data.last_name is not None:
        worker.last_name = data.last_name
    if data.phone is not None:
        worker.phone = data.phone
    if data.skill_category is not None:
        worker.skill_category = data.skill_category
    if data.status is not None:
        worker.status = data.status
    if data.daily_rate is not None:
        worker.daily_rate = data.daily_rate
    if data.is_active is not None:
        worker.is_active = data.is_active
    db.commit()
    db.refresh(worker)
    return _to_worker_read(worker)


def list_labour_requests(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
) -> tuple[int, list[LabourRequestRead]]:
    query = db.query(LabourRequest)
    if status_filter:
        query = query.filter(LabourRequest.status == status_filter)
    total = query.count()
    items = query.order_by(LabourRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, [_to_labour_request_read(item) for item in items]


def create_labour_request(db: Session, data: LabourRequestCreate, user_id: uuid.UUID | None = None) -> LabourRequestRead:
    count = db.query(LabourRequest).count() + 1
    req_number = f"LR-{count + 130}"
    req = LabourRequest(
        request_number=req_number,
        work_order_id=data.work_order_id,
        department_id=data.department_id,
        required_workers_count=data.required_workers_count,
        required_date=data.required_date,
        skill_category=data.skill_category,
        notes=data.notes,
        requested_by_id=user_id,
        status="Pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _to_labour_request_read(req)


def update_labour_request_status(db: Session, request_id: uuid.UUID, data: LabourRequestStatusUpdate, user_id: uuid.UUID | None = None) -> LabourRequestRead:
    req = db.query(LabourRequest).filter(LabourRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Labour request not found.")
    req.status = data.status
    if data.status == "Approved":
        req.approved_by_id = user_id
        req.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return _to_labour_request_read(req)


def assign_worker_to_request(db: Session, request_id: uuid.UUID, data: LabourAssignmentCreate) -> LabourRequestRead:
    req = db.query(LabourRequest).filter(LabourRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Labour request not found.")
    worker = db.query(Worker).filter(Worker.id == data.worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")

    assignment = LabourAssignment(
        labour_request_id=req.id,
        worker_id=worker.id,
        work_order_id=data.work_order_id or req.work_order_id,
        start_date=data.start_date,
        end_date=data.end_date,
        status="Assigned",
    )
    try:
        worker.status = "Assigned"
        db.add(assignment)
        db.commit()
        db.refresh(req)
        return _to_labour_request_read(req)
    except Exception:
        db.rollback()
        raise


def get_labour_summary(db: Session) -> LabourSummaryResponse:
    total = db.query(Worker).filter(Worker.is_active == True).count()
    available = db.query(Worker).filter(Worker.is_active == True, Worker.status == "Available").count()
    assigned = db.query(Worker).filter(Worker.is_active == True, Worker.status == "Assigned").count()
    pending_reqs = db.query(LabourRequest).filter(LabourRequest.status == "Pending").count()
    rate = round((assigned / total * 100), 1) if total > 0 else 0.0

    return LabourSummaryResponse(
        total_workers=total,
        available_workers=available,
        assigned_workers=assigned,
        pending_requests=pending_reqs,
        utilization_rate=rate,
    )
