from datetime import date

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

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


class DashboardOverview(BaseModel):
    source: str
    date_from: date | None
    date_to: date | None
    departments: list[DepartmentSummary]


# This is deliberately static prototype data. Replace it with module-owned
# aggregate queries only after KPI definitions and lifecycle rules are approved.
_SUMMARIES = [
    DepartmentSummary(id="enquiries", name="Enquiries", primary_value="148", primary_label="Total enquiries", metrics=[Metric(label="Qualified", value="82"), Metric(label="Pending", value="41"), Metric(label="Converted", value="25")], trend="+12% this month"),
    DepartmentSummary(id="designs", name="Designs", primary_value="67", primary_label="Total designs", metrics=[Metric(label="Pending", value="14"), Metric(label="In progress", value="28"), Metric(label="Completed", value="25")], trend="8 due this week"),
    DepartmentSummary(id="quotations", name="Quotations", primary_value="₹12.4L", primary_label="Quotation value", metrics=[Metric(label="Approved", value="18"), Metric(label="Pending", value="29"), Metric(label="Converted", value="12")], trend="₹3.1L approved"),
    DepartmentSummary(id="production", name="Production", primary_value="42", primary_label="Work orders", metrics=[Metric(label="Active", value="19"), Metric(label="Completed", value="17"), Metric(label="Delayed", value="6")], trend="6 need attention"),
    DepartmentSummary(id="feedback", name="Feedback", primary_value="86", primary_label="Feedback records", metrics=[Metric(label="Received", value="63"), Metric(label="Awaiting", value="23")], trend="73% response rate"),
    DepartmentSummary(id="labour", name="Labour", primary_value="54", primary_label="Total workers", metrics=[Metric(label="Available", value="21"), Metric(label="Assigned", value="27"), Metric(label="Requests", value="6")], trend="4 approvals pending"),
]


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> DashboardOverview:
    return DashboardOverview(source="prototype", date_from=date_from, date_to=date_to, departments=_SUMMARIES)


@router.get("/{department_id}/summary", response_model=DepartmentSummary)
def get_department_summary(department_id: str) -> DepartmentSummary:
    for summary in _SUMMARIES:
        if summary.id == department_id:
            return summary
    raise HTTPException(status_code=404, detail="Unknown dashboard department")
