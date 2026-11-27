import csv
import io
from datetime import date, datetime, time, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.accounts import AccountsRecord
from app.models.auth import User
from app.models.enquiry import Enquiry
from app.models.production import WorkOrder
from app.models.project import Project
from app.models.quotation import Quotation
from app.services import accounts_service, enquiry_service, production_service, project_service, quotation_service

router = APIRouter()


@router.get("/enquiries/export")
def export_enquiries_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management", "Sales / Accounts", "Enquiry Staff"]))],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> Response:
    query = db.query(Enquiry).options(joinedload(Enquiry.customer)).filter(Enquiry.is_deleted == False)
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
    items = db.query(Quotation).options(joinedload(Quotation.customer)).filter(Quotation.is_deleted == False).all()
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
    items = db.query(WorkOrder).options(joinedload(WorkOrder.customer)).filter(WorkOrder.is_deleted == False).all()
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


@router.get("/projects/export")
def export_projects_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management"]))],
) -> Response:
    items = db.query(Project).options(joinedload(Project.customer)).filter(Project.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Project Number", "Name", "Customer", "Status", "Priority", "Value", "Approval Date"])
    for p in items:
        writer.writerow([
            p.project_number,
            p.name,
            p.customer.name if p.customer else "N/A",
            p.status,
            p.priority,
            str(p.project_value),
            str(p.approval_date or ""),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=projects_report.csv"},
    )


@router.get("/accounts/export")
def export_accounts_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Accounts Manager", "Sales / Accounts"]))],
) -> Response:
    items = db.query(AccountsRecord).options(joinedload(AccountsRecord.project)).filter(AccountsRecord.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Accounts Number", "Project", "Status", "Total Invoiced", "Total Received", "Outstanding", "Transfer Date"])
    for a in items:
        writer.writerow([
            a.accounts_number,
            a.project.project_number if a.project else "N/A",
            a.status,
            str(a.total_invoiced),
            str(a.total_received),
            str(a.outstanding_amount),
            str(a.accounts_transfer_date or ""),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=accounts_report.csv"},
    )


@router.get("/summary")
def get_reports_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Read-Only Management", "Accounts Manager"]))],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> dict:
    return {
        "enquiries": enquiry_service.get_enquiry_summary(db, date_from=date_from, date_to=date_to),
        "quotations": quotation_service.get_quotation_summary(db, date_from=date_from, date_to=date_to),
        "projects": project_service.get_project_summary(db),
        "production": production_service.get_production_summary(db, date_from=date_from, date_to=date_to),
        "accounts": accounts_service.get_accounts_summary(db),
    }
