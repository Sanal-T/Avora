import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest

from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.design import Design
from app.models.quotation import Quotation
from app.models.production import WorkOrder
from app.models.labour import Worker, LabourRequest
from app.models.feedback import Feedback
from app.schemas.customer import CustomerCreate, CustomerContactCreate
from app.schemas.enquiry import EnquiryCreate, EnquiryStatusUpdate
from app.schemas.design import DesignCreate, DesignStatusUpdate, DesignVersionCreate
from app.schemas.quotation import QuotationCreate, QuotationItemCreate, QuotationStatusUpdate
from app.schemas.production import ProductionTaskCreate, ProductionTaskUpdate, WorkOrderStatusUpdate
from app.schemas.labour import WorkerCreate, LabourRequestCreate, LabourAssignmentCreate
from app.schemas.feedback import FeedbackCreate, FeedbackUpdate
from app.services import (
    customer_service,
    enquiry_service,
    design_service,
    quotation_service,
    production_service,
    labour_service,
    feedback_service,
    audit_service,
)


def test_complete_end_to_end_pilot_lifecycle(db_session):
    """
    Day 14 Acceptance Verification:
    Walks through the complete business lifecycle from Customer -> Enquiry -> Design
    -> Quotation -> Work Order -> Labour Allocation -> Feedback.
    Asserts cross-module referential integrity, status progression, audit logging, and KPI alignment.
    """
    system_user_id = uuid.uuid4()

    # ==========================================
    # STAGE 1: Customer Creation
    # ==========================================
    cust_data = CustomerCreate(
        name="Horizon Landmark Towers",
        company_name="Horizon Infra Pvt Ltd",
        email=f"horizon_{uuid.uuid4().hex[:6]}@example.com",
        phone="+91 98888 77777",
        address="Suite 1400, Horizon Commercial Complex, Bangalore",
        tax_id="29ABCDE1234F1Z5",
        notes="High-profile corporate headquarters fit-out.",
        contacts=[
            CustomerContactCreate(name="Mr. Rajesh Kumar", email="rajesh@horizon.com", phone="+91 98888 77771", designation="VP Infrastructure", is_primary=True),
            CustomerContactCreate(name="Ms. Priya Sharma", email="priya@horizon.com", phone="+91 98888 77772", designation="Senior Procurement Lead", is_primary=False),
        ]
    )
    customer = customer_service.create_customer(db_session, cust_data, user_id=system_user_id)
    assert customer.id is not None
    assert customer.customer_code.startswith("CUST-")
    assert len(customer.contacts) == 2

    # ==========================================
    # STAGE 2: Enquiry Qualification
    # ==========================================
    enq_data = EnquiryCreate(
        customer_id=customer.id,
        source="Corporate Referral",
        requirement_summary="Turnkey interior fit-out for 12,000 sq ft office floor including acoustic partitions and bespoke boardroom.",
        estimated_budget=Decimal("4500000.00"),
        priority="High",
    )
    enquiry = enquiry_service.create_enquiry(db_session, enq_data, user_id=system_user_id)
    assert enquiry.id is not None
    assert enquiry.status == "New"
    assert enquiry.customer_id == customer.id

    # Qualify enquiry
    enquiry_qualified = enquiry_service.update_enquiry_status(
        db_session,
        enquiry.id,
        EnquiryStatusUpdate(status="Qualified", notes="Client budget and timeline aligned. Handing off to design team."),
        user_id=system_user_id,
    )
    assert enquiry_qualified.status == "Qualified"

    # ==========================================
    # STAGE 3: Design Proposal & Version Approval
    # ==========================================
    design_data = DesignCreate(
        enquiry_id=enquiry.id,
        title="Horizon Boardroom & Executive Workspace 3D Concept",
        description="Acoustic timber slatted walls, integrated AV paneling, and bespoke ergonomic workstations.",
        priority="High",
        estimated_hours=Decimal("40.00"),
        expected_completion_date=date.today() + timedelta(days=7),
    )
    design = design_service.create_design(db_session, design_data, user_id=system_user_id)
    assert design.id is not None
    assert design.enquiry_id == enquiry.id
    assert design.status == "Not Started"

    # Submit Version 1
    version_data = DesignVersionCreate(
        file_name="Horizon_Concept_v1.pdf",
        file_url="/uploads/designs/Horizon_Concept_v1.pdf",
        change_notes="Initial 3D architectural renders and space plan layout.",
    )
    design_with_v1 = design_service.add_design_version(db_session, design.id, version_data, user_id=system_user_id)
    assert len(design_with_v1.versions) == 1
    assert design_with_v1.status == "Under Review"

    # Approve Design
    design_approved = design_service.update_design_status(
        db_session,
        design.id,
        DesignStatusUpdate(status="Approved", notes="Approved by Client VP of Infrastructure."),
        user_id=system_user_id,
    )
    assert design_approved.status == "Approved"

    # ==========================================
    # STAGE 4: Quotation Builder & Calculation
    # ==========================================
    # Line Items:
    # 1. 200 m2 acoustic paneling @ 3,500 = 700,000
    # 2. 1 custom boardroom table @ 450,000 = 450,000
    # 3. 30 modular executive workstations @ 25,000 = 750,000
    # Subtotal = 1,900,000
    # Discount 5% = 95,000 -> Taxable = 1,805,000
    # Tax 18% = 324,900 -> Total = 2,129,900
    quote_data = QuotationCreate(
        customer_id=customer.id,
        enquiry_id=enquiry.id,
        discount_rate=Decimal("5.00"),
        tax_rate=Decimal("18.00"),
        valid_until=date.today() + timedelta(days=30),
        currency="INR",
        items=[
            QuotationItemCreate(item_code="PANEL-AC-01", description="Acoustic Timber Wall Paneling", quantity=Decimal("200.00"), unit="m2", unit_price=Decimal("3500.00")),
            QuotationItemCreate(item_code="TBL-CONF-01", description="Bespoke Solid Oak Boardroom Table (20-seater)", quantity=Decimal("1.00"), unit="lot", unit_price=Decimal("450000.00")),
            QuotationItemCreate(item_code="WS-EXEC-01", description="Modular Executive Workstations with Cable Trays", quantity=Decimal("30.00"), unit="sets", unit_price=Decimal("25000.00")),
        ]
    )
    quotation = quotation_service.create_quotation(db_session, quote_data, user_id=system_user_id)
    assert quotation.revision_number == 1
    assert quotation.status == "Draft"
    assert quotation.subtotal == Decimal("1900000.00")
    assert quotation.discount_amount == Decimal("95000.00")
    assert quotation.tax_amount == Decimal("324900.00")
    assert quotation.total_amount == Decimal("2129900.00")

    # Move to Sent then Approved
    quotation_service.update_quotation_status(db_session, quotation.id, QuotationStatusUpdate(status="Sent"), user_id=system_user_id)
    quote_approved = quotation_service.update_quotation_status(
        db_session,
        quotation.id,
        QuotationStatusUpdate(status="Approved", notes="Signed PO received from client."),
        user_id=system_user_id,
    )
    assert quote_approved.status == "Approved"

    # ==========================================
    # STAGE 5: Production Handover (Atomic Work Order Conversion)
    # ==========================================
    work_order = quotation_service.convert_quotation_to_work_order(db_session, quotation.id, user_id=system_user_id)
    assert work_order.id is not None
    assert work_order.quotation_id == quotation.id
    assert work_order.customer_id == customer.id
    assert work_order.status == "Pending"
    assert work_order.work_order_number.startswith("WO-")

    # Verify Quotation moved to Converted
    refreshed_quote = quotation_service.get_quotation(db_session, quotation.id)
    assert refreshed_quote.status == "Converted"

    # Stage Production Tasks
    t1 = production_service.add_production_task(
        db_session,
        work_order.id,
        ProductionTaskCreate(task_name="Factory CNC Milling & Joinery", planned_hours=Decimal("80.00")),
    )
    t2 = production_service.add_production_task(
        db_session,
        work_order.id,
        ProductionTaskCreate(task_name="Acoustic Paneling Site Assembly", planned_hours=Decimal("60.00")),
    )
    assert len(t2.tasks) == 2

    # Start and Complete Production
    production_service.update_work_order_status(
        db_session,
        work_order.id,
        WorkOrderStatusUpdate(status="In Progress", notes="Shop floor production underway."),
        user_id=system_user_id,
    )
    wo_completed = production_service.update_work_order_status(
        db_session,
        work_order.id,
        WorkOrderStatusUpdate(status="Completed", notes="Site installation inspected and handed over."),
        user_id=system_user_id,
    )
    assert wo_completed.status == "Completed"
    assert wo_completed.actual_completion_date is not None

    # ==========================================
    # STAGE 6: Labour Allocation & Site Staffing
    # ==========================================
    worker_data = WorkerCreate(
        first_name="Mahesh",
        last_name="Sharma",
        phone="+91 91234 56789",
        skill_category="Joinery & Acoustic Fitting",
        status="Available",
        daily_rate=Decimal("1800.00"),
    )
    worker = labour_service.create_worker(db_session, worker_data)
    assert worker.id is not None
    assert worker.status == "Available"

    # Create Labour Request
    labour_req = labour_service.create_labour_request(
        db_session,
        LabourRequestCreate(
            work_order_id=work_order.id,
            department_id="production",
            required_workers_count=1,
            required_date=date.today(),
            skill_category="Joinery & Acoustic Fitting",
            notes="Deploy senior acoustic joiner to Horizon site.",
        ),
        user_id=system_user_id,
    )
    assert labour_req.status == "Pending"

    # Assign worker to request
    assigned_req = labour_service.assign_worker_to_request(
        db_session,
        labour_req.id,
        LabourAssignmentCreate(
            worker_id=worker.id,
            work_order_id=work_order.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
        ),
    )
    assert len(assigned_req.assignments) == 1

    # Verify worker status reflects assignment
    updated_worker = labour_service.get_worker(db_session, worker.id)
    assert updated_worker.status == "Assigned"

    # ==========================================
    # STAGE 7: Customer Satisfaction & Feedback Resolution
    # ==========================================
    fb_data = FeedbackCreate(
        customer_id=customer.id,
        work_order_id=work_order.id,
        category="Quality & Timeliness",
        rating=5,
        comments="Exceptional craftsmanship on the acoustic paneling and flawless execution by the fit-out team.",
    )
    feedback = feedback_service.create_feedback(db_session, fb_data, user_id=system_user_id)
    assert feedback.id is not None
    assert feedback.customer_id == customer.id
    assert feedback.work_order_id == work_order.id
    assert feedback.rating == 5
    assert feedback.status == "Received"

    # Resolve & Close Feedback Ticket
    fb_closed = feedback_service.update_feedback(
        db_session,
        feedback.id,
        FeedbackUpdate(
            status="Closed",
            resolution_notes="Formal client sign-off certificate received; warranty terms dispatched to client.",
        ),
        user_id=system_user_id,
    )
    assert fb_closed.status == "Closed"
    assert fb_closed.resolved_at is not None

    # ==========================================
    # STAGE 8: Cross-Cutting Audit Trail Verification
    # ==========================================
    _, cust_audits = audit_service.list_audit_logs(db_session, entity_type="customer")
    assert any(l.entity_id == str(customer.id) and l.action == "CREATE" for l in cust_audits)

    _, quote_audits = audit_service.list_audit_logs(db_session, entity_type="quotation")
    assert any(l.entity_id == str(quotation.id) and l.action == "CONVERT" for l in quote_audits)

    _, wo_audits = audit_service.list_audit_logs(db_session, entity_type="work_order")
    assert any(l.entity_id == str(work_order.id) and l.action == "CREATE" for l in wo_audits)

    _, fb_audits = audit_service.list_audit_logs(db_session, entity_type="feedback")
    assert any(l.entity_id == str(feedback.id) and l.action == "CREATE" for l in fb_audits)
