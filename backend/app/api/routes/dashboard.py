import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, literal, select, union_all
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_db
from app.models.auth import Department, User
from app.models.customer import Customer
from app.models.design import Design
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.models.feedback import Feedback
from app.models.labour import LabourRequest, Worker
from app.models.production import WorkOrder
from app.models.quotation import Quotation, QuotationFollowUp, QuotationStatusHistory
from app.services import (
    accounts_service,
    design_service,
    enquiry_service,
    feedback_service,
    labour_service,
    production_service,
    project_service,
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


def _build_enquiries_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[DepartmentSummary, Any]:
    enq_summary = enquiry_service.get_enquiry_summary(db, date_from=date_from, date_to=date_to)
    card = DepartmentSummary(
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
    return card, enq_summary


def _build_designs_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[DepartmentSummary, Any]:
    des_summary = design_service.get_design_summary(db, date_from=date_from, date_to=date_to)
    card = DepartmentSummary(
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
    return card, des_summary


def _build_quotations_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[DepartmentSummary, Any]:
    q_summary = quotation_service.get_quotation_summary(db, date_from=date_from, date_to=date_to)
    card = DepartmentSummary(
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
    return card, q_summary


def _build_production_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[DepartmentSummary, Any]:
    prod_summary = production_service.get_production_summary(db, date_from=date_from, date_to=date_to)
    card = DepartmentSummary(
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
    return card, prod_summary


def _build_feedback_summary(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[DepartmentSummary, Any]:
    fb_summary = feedback_service.get_feedback_summary(db, date_from=date_from, date_to=date_to)
    card = DepartmentSummary(
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
    return card, fb_summary


def _build_labour_summary(db: Session) -> tuple[DepartmentSummary, Any]:
    lab_summary = labour_service.get_labour_summary(db)
    card = DepartmentSummary(
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
    return card, lab_summary


def build_department_summaries(db: Session, date_from: date | None = None, date_to: date | None = None) -> list[DepartmentSummary]:
    summaries, _ = build_department_summaries_with_data(db, date_from, date_to)
    return summaries


def build_department_summaries_with_data(db: Session, date_from: date | None = None, date_to: date | None = None) -> tuple[list[DepartmentSummary], dict[str, Any]]:
    enq_card, enq_data = _build_enquiries_summary(db, date_from, date_to)
    des_card, des_data = _build_designs_summary(db, date_from, date_to)
    q_card, q_data = _build_quotations_summary(db, date_from, date_to)
    prod_card, prod_data = _build_production_summary(db, date_from, date_to)
    a_sum = accounts_service.get_accounts_summary(db)
    acc_card = DepartmentSummary(
        id="accounts",
        name="Accounts",
        primary_value=_format_inr(a_sum.total_invoiced),
        primary_label="Total invoiced",
        metrics=[
            Metric(label="Received", value=_format_inr(a_sum.total_received)),
            Metric(label="Outstanding", value=_format_inr(a_sum.outstanding_balance)),
            Metric(label="Overdue", value=str(a_sum.overdue_payments)),
        ],
        trend=f"{a_sum.collection_rate}% collected",
    )
    fb_card, fb_data = _build_feedback_summary(db, date_from, date_to)

    summaries = [enq_card, des_card, q_card, prod_card, acc_card, fb_card]
    raw_data = {
        "enquiries": enq_data,
        "designs": des_data,
        "quotations": q_data,
        "production": prod_data,
        "accounts": a_sum,
        "feedback": fb_data,
    }
    return summaries, raw_data


def build_action_items(db: Session, prod_summary: Any = None, q_summary: Any = None) -> list[ActionItem]:
    actions: list[ActionItem] = []
    # Delayed work orders (use precomputed summary if provided)
    if prod_summary is None:
        prod_summary = production_service.get_production_summary(db)
    delayed_wo = prod_summary.delayed_work_orders
    if delayed_wo > 0:
        actions.append(ActionItem(title=f"{delayed_wo} delayed work orders", description="Review production schedules & resources", department_id="production"))

    # Quotation follow-ups due (reuse precomputed q_summary if provided)
    if q_summary is not None:
        pending_follow_ups = q_summary.pending_follow_ups
    else:
        pending_follow_ups = (
            db.query(func.count(QuotationFollowUp.id))
            .join(Quotation, QuotationFollowUp.quotation_id == Quotation.id)
            .filter(Quotation.is_deleted == False, QuotationFollowUp.is_completed == False)
            .scalar()
            or 0
        )
    if pending_follow_ups > 0:
        actions.append(ActionItem(title=f"{pending_follow_ups} quotations need follow-up", description="Contact clients on awaiting proposals", department_id="quotations"))

    # Pending designs & pending labour requests in parallel/single-scalar queries
    pending_designs = db.query(func.count(Design.id)).filter(Design.is_deleted == False, Design.status.in_(["Not Started", "Revision Required"])).scalar() or 0
    if pending_designs > 0:
        actions.append(ActionItem(title=f"{pending_designs} designs awaiting action", description="Assign designers or review revisions", department_id="designs"))

    pending_labour = db.query(func.count(LabourRequest.id)).filter(LabourRequest.status == "Pending").scalar() or 0
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
        now = datetime.now(timezone.utc).replace(tzinfo=None)
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


def _coerce_dt(dt: Any) -> datetime | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def build_recent_activities(db: Session) -> list[ActivityItem]:
    q_sel = (
        select(
            func.coalesce(Quotation.updated_at, Quotation.created_at).label("ts"),
            literal("Quotation").label("category"),
            Quotation.quotation_number.label("ref_num"),
            Quotation.status.label("status_val"),
            literal("").label("extra_text"),
        )
        .where(Quotation.is_deleted == False)
        .order_by(func.coalesce(Quotation.updated_at, Quotation.created_at).desc())
        .limit(6)
    )
    d_sel = (
        select(
            func.coalesce(Design.updated_at, Design.created_at).label("ts"),
            literal("Design").label("category"),
            Design.design_number.label("ref_num"),
            Design.status.label("status_val"),
            Design.title.label("extra_text"),
        )
        .where(Design.is_deleted == False)
        .order_by(func.coalesce(Design.updated_at, Design.created_at).desc())
        .limit(6)
    )
    w_sel = (
        select(
            func.coalesce(WorkOrder.updated_at, WorkOrder.created_at).label("ts"),
            literal("Production").label("category"),
            WorkOrder.work_order_number.label("ref_num"),
            WorkOrder.status.label("status_val"),
            literal("").label("extra_text"),
        )
        .where(WorkOrder.is_deleted == False)
        .order_by(func.coalesce(WorkOrder.updated_at, WorkOrder.created_at).desc())
        .limit(6)
    )
    e_sel = (
        select(
            Enquiry.created_at.label("ts"),
            literal("Enquiry").label("category"),
            Enquiry.enquiry_number.label("ref_num"),
            Enquiry.status.label("status_val"),
            func.coalesce(Customer.name, "Client").label("extra_text"),
        )
        .select_from(Enquiry)
        .outerjoin(Customer, Enquiry.customer_id == Customer.id)
        .where(Enquiry.is_deleted == False)
        .order_by(Enquiry.created_at.desc())
        .limit(6)
    )

    combined = union_all(
        select(q_sel.subquery()),
        select(d_sel.subquery()),
        select(w_sel.subquery()),
        select(e_sel.subquery()),
    ).subquery()
    rows = db.execute(select(combined).order_by(combined.c.ts.desc()).limit(6)).fetchall()

    activities: list[ActivityItem] = []
    for row in rows:
        ts = _coerce_dt(row.ts)
        cat = row.category
        ref = row.ref_num
        st = row.status_val or ""
        extra = row.extra_text or ""
        if cat == "Quotation":
            title = f"Quotation {ref} status is {st}"
        elif cat == "Design":
            title = f"Design {ref} '{extra[:30]}' {st.lower()}"
        elif cat == "Production":
            title = f"Work order {ref} is {st.lower()}"
        else:
            title = f"New enquiry {ref} from {extra or 'Client'}"
        activities.append(ActivityItem(title=title, category=cat, time_ago=_format_time_ago(ts)))
    return activities


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DashboardOverview:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to")

    summaries, raw_data = build_department_summaries_with_data(db, date_from, date_to)
    action_items = build_action_items(db, prod_summary=raw_data.get("production"), q_summary=raw_data.get("quotations"))
    activities = build_recent_activities(db)

    # Compute overall snapshot directly from already-calculated department summaries (ZERO duplicate queries!)
    q_summary = raw_data["quotations"]
    prod_summary = raw_data["production"]
    des_summary = raw_data["designs"]

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
    current_user: Annotated[User, Depends(get_current_active_user)],
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DepartmentSummary:
    # Only calculate the single requested department rather than all six!
    if department_id == "enquiries":
        card, _ = _build_enquiries_summary(db, date_from, date_to)
        return card
    elif department_id == "designs":
        card, _ = _build_designs_summary(db, date_from, date_to)
        return card
    elif department_id == "quotations":
        card, _ = _build_quotations_summary(db, date_from, date_to)
        return card
    elif department_id == "production":
        card, _ = _build_production_summary(db, date_from, date_to)
        return card
    elif department_id == "feedback":
        card, _ = _build_feedback_summary(db, date_from, date_to)
        return card
    elif department_id == "labour":
        card, _ = _build_labour_summary(db)
        return card
    elif department_id == "projects":
        p_sum = project_service.get_project_summary(db)
        return DepartmentSummary(
            id="projects",
            name="Projects",
            primary_value=str(p_sum.total_projects),
            primary_label="Total projects",
            metrics=[
                Metric(label="Approved", value=str(p_sum.approved_projects)),
                Metric(label="In Production", value=str(p_sum.in_production_projects)),
                Metric(label="Closed", value=str(p_sum.closed_projects)),
            ],
            trend=f"{p_sum.delayed_projects} delayed" if p_sum.delayed_projects > 0 else "On schedule",
        )
    elif department_id == "accounts":
        a_sum = accounts_service.get_accounts_summary(db)
        return DepartmentSummary(
            id="accounts",
            name="Accounts",
            primary_value=_format_inr(a_sum.total_invoiced),
            primary_label="Total invoiced",
            metrics=[
                Metric(label="Received", value=_format_inr(a_sum.total_received)),
                Metric(label="Outstanding", value=_format_inr(a_sum.outstanding_balance)),
                Metric(label="Overdue", value=str(a_sum.overdue_payments)),
            ],
            trend=f"{a_sum.collection_rate}% collected",
        )

    raise HTTPException(status_code=404, detail="Unknown dashboard department")
