import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.auth import Department
from app.models.customer import Customer
from app.models.design import Design
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.models.feedback import Feedback
from app.models.labour import LabourRequest, Worker
from app.models.production import WorkOrder
from app.models.quotation import Quotation, QuotationFollowUp, QuotationStatusHistory
from app.services import (
    design_service,
    enquiry_service,
    feedback_service,
    labour_service,
    production_service,
    quotation_service,
)

router = APIRouter()


class Metric(BaseModel):
    label: str
    value: str


class DepartmentSummary(BaseModel):
    id: str
    name: str
    primary_value: str
    primary_label: str
    metrics: list[Metric]
    trend: str


class ActionItem(BaseModel):
    title: str
    description: str
    department_id: str


class ActivityItem(BaseModel):
    title: str
    category: str
    time_ago: str


class OverallBusinessSnapshot(BaseModel):
    active_pipeline_value: str
    open_work_count: int
    needs_attention_count: int


class DashboardOverview(BaseModel):
    source: str
    date_from: date | None
    date_to: date | None
    snapshot: OverallBusinessSnapshot
    departments: list[DepartmentSummary]
    action_items: list[ActionItem]
    recent_activities: list[ActivityItem]


def _format_inr(amount: Decimal) -> str:
    val = float(amount)
    if val >= 10000000:
        return f"₹{val / 10000000:.2f}Cr"
    elif val >= 100000:
        return f"₹{val / 100000:.1f}L"
    elif val >= 1000:
        return f"₹{val / 1000:.1f}k"
    return f"₹{val:.0f}"


def build_department_summaries(db: Session, date_from: date | None = None, date_to: date | None = None) -> list[DepartmentSummary]:
    # 1. Enquiries
    enq_summary = enquiry_service.get_enquiry_summary(db, date_from=date_from, date_to=date_to)
    enquiries_card = DepartmentSummary(
        id="enquiries",
        name="Enquiries",
        primary_value=str(enq_summary.total_enquiries),
        primary_label="Total enquiries",
        metrics=[
            Metric(label="Qualified", value=str(enq_summary.qualified_enquiries)),
            Metric(label="Pending", value=str(enq_summary.pending_enquiries)),
            Metric(label="Converted", value=str(enq_summary.converted_enquiries)),
        ],
        trend=f"{enq_summary.conversion_rate}% conversion",
    )

    # 2. Designs
    des_summary = design_service.get_design_summary(db, date_from=date_from, date_to=date_to)
    designs_card = DepartmentSummary(
        id="designs",
        name="Designs",
        primary_value=str(des_summary.total_designs),
        primary_label="Total designs",
        metrics=[
            Metric(label="Pending", value=str(des_summary.pending_designs)),
            Metric(label="In progress", value=str(des_summary.in_progress_designs)),
            Metric(label="Completed", value=str(des_summary.completed_designs)),
        ],
        trend=f"{des_summary.overdue_designs} overdue" if des_summary.overdue_designs > 0 else "On schedule",
    )

    # 3. Quotations
    q_summary = quotation_service.get_quotation_summary(db, date_from=date_from, date_to=date_to)
    quotations_card = DepartmentSummary(
        id="quotations",
        name="Quotations",
        primary_value=_format_inr(q_summary.total_value),
        primary_label="Quotation value",
        metrics=[
            Metric(label="Approved", value=str(q_summary.approved_quotations)),
            Metric(label="Pending", value=str(q_summary.pending_quotations)),
            Metric(label="Converted", value=str(q_summary.converted_quotations)),
        ],
        trend=f"{_format_inr(q_summary.approved_value)} approved",
    )

    # 4. Production
    prod_summary = production_service.get_production_summary(db, date_from=date_from, date_to=date_to)
    production_card = DepartmentSummary(
        id="production",
        name="Production",
        primary_value=str(prod_summary.total_work_orders),
        primary_label="Work orders",
        metrics=[
            Metric(label="Active", value=str(prod_summary.active_work_orders)),
            Metric(label="Completed", value=str(prod_summary.completed_work_orders)),
            Metric(label="Delayed", value=str(prod_summary.delayed_work_orders)),
        ],
        trend=f"{prod_summary.delayed_work_orders} need attention" if prod_summary.delayed_work_orders > 0 else f"{prod_summary.on_time_completion_rate}% on time",
    )

    # 5. Feedback
    fb_summary = feedback_service.get_feedback_summary(db, date_from=date_from, date_to=date_to)
    feedback_card = DepartmentSummary(
        id="feedback",
        name="Feedback",
        primary_value=str(fb_summary.total_feedback),
        primary_label="Feedback records",
        metrics=[
            Metric(label="Received", value=str(fb_summary.received_feedback)),
            Metric(label="Awaiting", value=str(fb_summary.awaiting_feedback)),
        ],
        trend=f"{fb_summary.response_rate}% response rate",
    )

    # 6. Labour
    lab_summary = labour_service.get_labour_summary(db)
    labour_card = DepartmentSummary(
        id="labour",
        name="Labour",
        primary_value=str(lab_summary.total_workers),
        primary_label="Total workers",
        metrics=[
            Metric(label="Available", value=str(lab_summary.available_workers)),
            Metric(label="Assigned", value=str(lab_summary.assigned_workers)),
            Metric(label="Requests", value=str(lab_summary.pending_requests)),
        ],
        trend=f"{lab_summary.pending_requests} approvals pending",
    )

    return [enquiries_card, designs_card, quotations_card, production_card, feedback_card, labour_card]


def build_action_items(db: Session) -> list[ActionItem]:
    actions: list[ActionItem] = []
    # Delayed work orders
    delayed_wo = db.query(WorkOrder).filter(WorkOrder.is_deleted == False, WorkOrder.status == "Delayed").count()
    if delayed_wo > 0:
        actions.append(ActionItem(title=f"{delayed_wo} delayed work orders", description="Review production schedules & resources", department_id="production"))

    # Quotation follow-ups due
    pending_follow_ups = db.query(QuotationFollowUp).filter(QuotationFollowUp.is_completed == False).count()
    if pending_follow_ups > 0:
        actions.append(ActionItem(title=f"{pending_follow_ups} quotations need follow-up", description="Contact clients on awaiting proposals", department_id="quotations"))

    # Pending designs
    pending_designs = db.query(Design).filter(Design.is_deleted == False, Design.status.in_(["Not Started", "Revision Required"])).count()
    if pending_designs > 0:
        actions.append(ActionItem(title=f"{pending_designs} designs awaiting action", description="Assign designers or review revisions", department_id="designs"))

    # Pending labour requests
    pending_labour = db.query(LabourRequest).filter(LabourRequest.status == "Pending").count()
    if pending_labour > 0:
        actions.append(ActionItem(title=f"{pending_labour} labour requests awaiting approval", description="Review worker allocations", department_id="labour"))

    if not actions:
        actions.append(ActionItem(title="All operations on schedule", description="No urgent bottlenecks detected", department_id="enquiries"))

    return actions


def _format_time_ago(dt: datetime | None) -> str:
    if not dt:
        return "Recently"
    if dt.tzinfo is not None:
        now = datetime.now(dt.tzinfo)
    else:
        now = datetime.utcnow()
    diff = now - dt
    total_seconds = int(diff.total_seconds())

    if total_seconds < 0:
        return dt.strftime("%b %d, %I:%M %p")
    elif total_seconds < 60:
        return "Just now"
    elif total_seconds < 3600:
        mins = total_seconds // 60
        return f"{mins}m ago"
    elif total_seconds < 86400 and dt.date() == now.date():
        hours = total_seconds // 3600
        return f"{hours}h ago"
    elif (now.date() - dt.date()).days == 1:
        return f"Yesterday, {dt.strftime('%I:%M %p')}"
    elif total_seconds < 7 * 86400:
        days = (now.date() - dt.date()).days
        return f"{days}d ago"
    else:
        return dt.strftime("%b %d, %I:%M %p")


def _normalize_dt(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def build_recent_activities(db: Session) -> list[ActivityItem]:
    items: list[tuple[datetime | None, ActivityItem]] = []

    # Recent quotation status changes
    recent_quotes = db.query(Quotation).order_by(Quotation.updated_at.desc()).limit(4).all()
    for q in recent_quotes:
        ts = q.updated_at or q.created_at
        items.append((
            ts,
            ActivityItem(
                title=f"Quotation {q.quotation_number} status is {q.status}",
                category="Quotation",
                time_ago=_format_time_ago(ts),
            ),
        ))

    # Recent designs
    recent_designs = db.query(Design).order_by(Design.updated_at.desc()).limit(4).all()
    for d in recent_designs:
        ts = d.updated_at or d.created_at
        items.append((
            ts,
            ActivityItem(
                title=f"Design {d.design_number} '{d.title[:30]}' {d.status.lower()}",
                category="Design",
                time_ago=_format_time_ago(ts),
            ),
        ))

    # Recent work orders
    recent_wos = db.query(WorkOrder).order_by(WorkOrder.updated_at.desc()).limit(4).all()
    for w in recent_wos:
        ts = w.updated_at or w.created_at
        items.append((
            ts,
            ActivityItem(
                title=f"Work order {w.work_order_number} is {w.status.lower()}",
                category="Production",
                time_ago=_format_time_ago(ts),
            ),
        ))

    # Recent enquiries
    recent_enqs = db.query(Enquiry).order_by(Enquiry.created_at.desc()).limit(4).all()
    for e in recent_enqs:
        ts = e.created_at
        cust_name = e.customer.name if e.customer else (e.customer_name or "Client")
        items.append((
            ts,
            ActivityItem(
                title=f"New enquiry {e.enquiry_number} from {cust_name}",
                category="Enquiry",
                time_ago=_format_time_ago(ts),
            ),
        ))

    # Sort in true chronological order (newest first)
    items.sort(key=lambda x: _normalize_dt(x[0]), reverse=True)
    return [act for _, act in items[:6]]


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    db: Annotated[Session, Depends(get_db)],
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DashboardOverview:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to")

    summaries = build_department_summaries(db, date_from, date_to)
    action_items = build_action_items(db)
    activities = build_recent_activities(db)

    # Compute overall snapshot
    q_summary = quotation_service.get_quotation_summary(db, date_from=date_from, date_to=date_to)
    prod_summary = production_service.get_production_summary(db, date_from=date_from, date_to=date_to)
    des_summary = design_service.get_design_summary(db, date_from=date_from, date_to=date_to)

    snapshot = OverallBusinessSnapshot(
        active_pipeline_value=_format_inr(q_summary.total_value),
        open_work_count=prod_summary.active_work_orders + des_summary.in_progress_designs,
        needs_attention_count=prod_summary.delayed_work_orders + q_summary.pending_follow_ups,
    )

    return DashboardOverview(
        source="database",
        date_from=date_from,
        date_to=date_to,
        snapshot=snapshot,
        departments=summaries,
        action_items=action_items,
        recent_activities=activities,
    )


@router.get("/{department_id}/summary", response_model=DepartmentSummary)
def get_department_summary(
    department_id: str,
    db: Annotated[Session, Depends(get_db)],
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DepartmentSummary:
    summaries = build_department_summaries(db, date_from, date_to)
    for summary in summaries:
        if summary.id == department_id:
            return summary
    raise HTTPException(status_code=404, detail="Unknown dashboard department")
