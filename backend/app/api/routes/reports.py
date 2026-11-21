import csv
import io
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.models.enquiry import Enquiry
from app.models.production import WorkOrder
from app.models.quotation import Quotation

router = APIRouter()


@router.get("/enquiries/export")
def export_enquiries_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Enquiry Staff"]))],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> Response:
    query = db.query(Enquiry).filter(Enquiry.is_deleted == False)
    items = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Enquiry Number", "Customer", "Status", "Priority", "Estimated Budget", "Created At"])
    for e in items:
        writer.writerow([
            e.enquiry_number,
            e.customer.name if e.customer else "N/A",
            e.status,
            e.priority,
            str(e.estimated_budget or 0),
            e.created_at.isoformat() if e.created_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enquiries_report.csv"},
    )


@router.get("/quotations/export")
def export_quotations_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts"]))],
) -> Response:
    items = db.query(Quotation).filter(Quotation.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Quotation Number", "Rev", "Customer", "Status", "Subtotal", "Tax", "Total", "Created At"])
    for q in items:
        writer.writerow([
            q.quotation_number,
            q.revision_number,
            q.customer.name if q.customer else "N/A",
            q.status,
            str(q.subtotal),
            str(q.tax_amount),
            str(q.total_amount),
            q.created_at.isoformat() if q.created_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=quotations_report.csv"},
    )


@router.get("/production/export")
def export_production_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Production Manager"]))],
) -> Response:
    items = db.query(WorkOrder).filter(WorkOrder.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Work Order Number", "Title", "Customer", "Status", "Priority", "Planned End", "Actual End"])
    for w in items:
        writer.writerow([
            w.work_order_number,
            w.title,
            w.customer.name if w.customer else "N/A",
            w.status,
            w.priority,
            str(w.planned_end_date or ""),
            str(w.actual_completion_date or ""),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=production_report.csv"},
    )
