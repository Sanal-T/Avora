import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_path = str(Path(__file__).resolve().parent.parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.auth import Department, Employee, Permission, Role, User
from app.models.customer import Customer, CustomerContact
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.models.design import Design, DesignVersion, DesignStatusHistory
from app.models.quotation import Quotation, QuotationFollowUp, QuotationItem, QuotationRevision, QuotationStatusHistory
from app.models.production import Installation, ProductionTask, WorkOrder, WorkOrderStatusHistory
from app.models.feedback import Feedback, FeedbackCategory
from app.models.labour import LabourAssignment, LabourRequest, Worker

settings = get_settings()



def init_db(db: Session) -> None:
    if settings.app_env.lower() == "production":
        raise RuntimeError("Safety check: Seeding development sample data is disabled in production environment.")

    # 1. Departments
    dept_data = [
        {"id": "enquiries", "name": "Enquiries", "icon": "◌", "accent": "blue", "description": "Track new customer opportunities and conversion progress."},
        {"id": "designs", "name": "Designs", "icon": "✦", "accent": "violet", "description": "Follow design proposals, assignments, and completion."},
        {"id": "quotations", "name": "Quotations", "icon": "▤", "accent": "orange", "description": "Manage follow-ups, approvals, and production handover."},
        {"id": "production", "name": "Production", "icon": "▧", "accent": "teal", "description": "Monitor schedules, production progress, and installation."},
        {"id": "feedback", "name": "Feedback", "icon": "♡", "accent": "rose", "description": "Review customer sentiment and close feedback requests."},
        {"id": "labour", "name": "Labour", "icon": "◒", "accent": "gold", "description": "Coordinate workers, requests, and field allocation."},
    ]
    for d in dept_data:
        existing = db.query(Department).filter(Department.id == d["id"]).first()
        if not existing:
            dept = Department(
                id=d["id"],
                name=d["name"],
                icon=d["icon"],
                accent=d["accent"],
                description=d["description"],
                is_active=True,
            )
            db.add(dept)
    db.flush()

    # 2. Roles
    role_names = [
        "Administrator",
        "Management",
        "Enquiry Staff",
        "Design Team",
        "Sales / Accounts",
        "Production Manager",
        "Labour Coordinator",
    ]
    role_map = {}
    for r_name in role_names:
        role = db.query(Role).filter(Role.name == r_name).first()
        if not role:
            role = Role(name=r_name, description=f"{r_name} role")
            db.add(role)
            db.flush()
        role_map[r_name] = role

    # 3. Permissions
    modules = ["enquiries", "designs", "quotations", "production", "feedback", "labour", "users", "reports"]
    actions = ["read", "write", "approve", "delete"]
    for mod in modules:
        for act in actions:
            code = f"{mod}:{act}"
            perm = db.query(Permission).filter(Permission.code == code).first()
            if not perm:
                perm = Permission(code=code, module=mod, description=f"Permission to {act} {mod}")
                db.add(perm)
                db.flush()
                # Assign all to Admin
                if perm not in role_map["Administrator"].permissions:
                    role_map["Administrator"].permissions.append(perm)
    db.flush()

    # 4. Default Admin User
    admin = db.query(User).filter(User.email == settings.admin_email).first()
    if not admin:
        admin = User(
            email=settings.admin_email,
            full_name="Shiva Kumar",
            hashed_password=get_password_hash(settings.admin_password),
            is_active=True,
            is_superuser=True,
        )
        admin.roles.append(role_map["Administrator"])
        db.add(admin)
        db.flush()

    # 5. Default Employee for Admin
    emp = db.query(Employee).filter(Employee.email == settings.admin_email).first()
    if not emp:
        emp = Employee(
            user_id=admin.id,
            employee_code="EMP-001",
            first_name="Shiva",
            last_name="Kumar",
            email=settings.admin_email,
            phone="+91 98765 43210",
            department_id="quotations",
            designation="Administrator & General Manager",
            is_active=True,
        )
        db.add(emp)
        db.flush()

    # 6. Sample Customers
    customers_data = [
        {"code": "CUST-001", "name": "Aster Interiors", "company": "Aster Spaces LLP", "email": "contact@asterinteriors.com", "phone": "+91 98450 11223"},
        {"code": "CUST-002", "name": "Acme Spaces", "company": "Acme Realty", "email": "info@acmespaces.in", "phone": "+91 98450 44556"},
        {"code": "CUST-003", "name": "Lakeview Retail", "company": "Lakeview Mall Brands", "email": "procurement@lakeview.com", "phone": "+91 98450 77889"},
        {"code": "CUST-004", "name": "Urban Form Architects", "company": "Urban Form Studios", "email": "projects@urbanform.org", "phone": "+91 98450 99001"},
    ]
    customer_map = {}
    for c in customers_data:
        cust = db.query(Customer).filter(Customer.customer_code == c["code"]).first()
        if not cust:
            cust = Customer(
                customer_code=c["code"],
                name=c["name"],
                company_name=c["company"],
                email=c["email"],
                phone=c["phone"],
                address="102 MG Road, Bengaluru, Karnataka",
                tax_id="29ABCDE1234F1Z5",
            )
            db.add(cust)
            db.flush()
            # Add primary contact
            contact = CustomerContact(
                customer_id=cust.id,
                name=f"{c['name']} Contact",
                email=c["email"],
                phone=c["phone"],
                is_primary=True,
            )
            db.add(contact)
        customer_map[c["code"]] = cust
    db.flush()

    # 7. Sample Enquiries
    now = datetime.now(timezone.utc)
    enq1 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1048").first()
    if not enq1:
        enq1 = Enquiry(
            enquiry_number="ENQ-1048",
            customer_id=customer_map["CUST-002"].id,
            assigned_employee_id=emp.id,
            status="Qualified",
            source="Website",
            requirement_summary="Executive office workstation setup with 35 cabins and acoustic wall paneling.",
            estimated_budget=Decimal("450000.00"),
            priority="High",
            qualified_at=now - timedelta(days=2),
            created_at=now - timedelta(days=5),
        )
        db.add(enq1)

    enq2 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1046").first()
    if not enq2:
        enq2 = Enquiry(
            enquiry_number="ENQ-1046",
            customer_id=customer_map["CUST-001"].id,
            assigned_employee_id=emp.id,
            status="Converted",
            source="Referral",
            requirement_summary="Luxury apartment custom modular kitchen and walk-in wardrobe.",
            estimated_budget=Decimal("620000.00"),
            priority="High",
            qualified_at=now - timedelta(days=8),
            converted_at=now - timedelta(days=3),
            created_at=now - timedelta(days=12),
        )
        db.add(enq2)

    enq3 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1042").first()
    if not enq3:
        enq3 = Enquiry(
            enquiry_number="ENQ-1042",
            customer_id=customer_map["CUST-004"].id,
            assigned_employee_id=emp.id,
            status="Pending",
            source="Direct",
            requirement_summary="Commercial reception counter and conference table in teak finish.",
            estimated_budget=Decimal("280000.00"),
            priority="Medium",
            created_at=now - timedelta(days=1),
        )
        db.add(enq3)

    enq4 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1035").first()
    if not enq4:
        enq4 = Enquiry(
            enquiry_number="ENQ-1035",
            customer_id=customer_map["CUST-003"].id,
            assigned_employee_id=emp.id,
            status="Qualified",
            source="Website",
            requirement_summary="Retail mall kiosk display modular racking.",
            estimated_budget=Decimal("340000.00"),
            priority="Medium",
            qualified_at=now - timedelta(days=12),
            created_at=now - timedelta(days=14),
        )
        db.add(enq4)

    enq5 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1028").first()
    if not enq5:
        enq5 = Enquiry(
            enquiry_number="ENQ-1028",
            customer_id=customer_map["CUST-002"].id,
            assigned_employee_id=emp.id,
            status="Converted",
            source="Referral",
            requirement_summary="Corporate conference room 16-seater table and credenza.",
            estimated_budget=Decimal("520000.00"),
            priority="High",
            qualified_at=now - timedelta(days=22),
            converted_at=now - timedelta(days=18),
            created_at=now - timedelta(days=24),
        )
        db.add(enq5)

    enq6 = db.query(Enquiry).filter(Enquiry.enquiry_number == "ENQ-1021").first()
    if not enq6:
        enq6 = Enquiry(
            enquiry_number="ENQ-1021",
            customer_id=customer_map["CUST-001"].id,
            assigned_employee_id=emp.id,
            status="Qualified",
            source="Exhibition",
            requirement_summary="Penthouse living room wall panelling and media console.",
            estimated_budget=Decimal("410000.00"),
            priority="Low",
            qualified_at=now - timedelta(days=25),
            created_at=now - timedelta(days=27),
        )
        db.add(enq6)
    db.flush()

    # 8. Sample Designs
    if db.query(Design).count() == 0:
        d1 = Design(
            design_number="D-619",
            enquiry_id=enq1.id if enq1 else None,
            assigned_designer_id=emp.id,
            title="Office fit-out 3D concept & layout",
            description="3D layout drawings, material specifications, and electrical conduits.",
            status="In Progress",
            priority="High",
            estimated_hours=Decimal("40.00"),
            actual_hours=Decimal("26.00"),
            expected_completion_date=date.today() + timedelta(days=3),
            created_at=now - timedelta(days=4),
        )
        d2 = Design(
            design_number="D-616",
            enquiry_id=enq2.id if enq2 else None,
            assigned_designer_id=emp.id,
            title="Modular kitchen and wardrobe proposal",
            description="Complete CAD drawings and finishes sheet.",
            status="Completed",
            priority="High",
            estimated_hours=Decimal("35.00"),
            actual_hours=Decimal("32.00"),
            expected_completion_date=date.today() - timedelta(days=2),
            completed_at=now - timedelta(days=2),
            created_at=now - timedelta(days=10),
        )
        d3 = Design(
            design_number="D-610",
            enquiry_id=enq4.id if enq4 else None,
            assigned_designer_id=emp.id,
            title="Retail mall kiosk display modular layout",
            description="Fabrication drawings for display islands.",
            status="Completed",
            priority="Medium",
            estimated_hours=Decimal("28.00"),
            actual_hours=Decimal("25.00"),
            expected_completion_date=date.today() - timedelta(days=8),
            completed_at=now - timedelta(days=8),
            created_at=now - timedelta(days=14),
        )
        d4 = Design(
            design_number="D-604",
            enquiry_id=enq5.id if enq5 else None,
            assigned_designer_id=emp.id,
            title="Corporate conference table construction drawings",
            description="Veneer match and wiring grommet plan.",
            status="Completed",
            priority="High",
            estimated_hours=Decimal("30.00"),
            actual_hours=Decimal("29.00"),
            expected_completion_date=date.today() - timedelta(days=18),
            completed_at=now - timedelta(days=18),
            created_at=now - timedelta(days=24),
        )
        db.add_all([d1, d2, d3, d4])
        db.flush()

        v1 = DesignVersion(
            design_id=d2.id,
            version_number=1,
            file_name="kitchen_spec_v1.dwg",
            file_url="/uploads/designs/kitchen_spec_v1.dwg",
            change_notes="Final client approved layout",
            is_approved=True,
            created_at=now - timedelta(days=3),
        )
        db.add(v1)
        db.flush()

    # 9. Sample Quotations
    q1 = db.query(Quotation).filter(Quotation.quotation_number == "Q-2048").first()
    if not q1:
        q1 = Quotation(
            quotation_number="Q-2048",
            revision_number=1,
            enquiry_id=enq2.id if enq2 else None,
            customer_id=customer_map["CUST-001"].id,
            status="Approved",
            subtotal=Decimal("525423.73"),
            discount_rate=Decimal("5.00"),
            discount_amount=Decimal("26271.19"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("89847.46"),
            total_amount=Decimal("589000.00"),
            valid_until=date.today() + timedelta(days=20),
            approved_at=now - timedelta(days=1),
            created_at=now - timedelta(days=3),
        )
        db.add(q1)
        db.flush()

        item1 = QuotationItem(
            quotation_id=q1.id,
            item_code="KIT-MOD-01",
            description="Modular Kitchen High Gloss Finish with Hafele Hardware",
            quantity=Decimal("1.00"),
            unit="set",
            unit_price=Decimal("350000.00"),
            total_price=Decimal("350000.00"),
            sort_order=1,
        )
        item2 = QuotationItem(
            quotation_id=q1.id,
            item_code="WAR-WALK-02",
            description="Master Bedroom Walk-in Wardrobe with LED profile lighting",
            quantity=Decimal("1.00"),
            unit="set",
            unit_price=Decimal("175423.73"),
            total_price=Decimal("175423.73"),
            sort_order=2,
        )
        db.add_all([item1, item2])
        db.flush()

    q2 = db.query(Quotation).filter(Quotation.quotation_number == "Q-2052").first()
    if not q2:
        q2 = Quotation(
            quotation_number="Q-2052",
            revision_number=1,
            enquiry_id=enq1.id if enq1 else None,
            customer_id=customer_map["CUST-002"].id,
            status="Awaiting Response",
            subtotal=Decimal("381355.93"),
            discount_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("68644.07"),
            total_amount=Decimal("450000.00"),
            valid_until=date.today() + timedelta(days=14),
            created_at=now - timedelta(days=2),
        )
        db.add(q2)
        db.flush()

        follow1 = QuotationFollowUp(
            quotation_id=q2.id,
            scheduled_date=date.today() + timedelta(days=2),
            notes="Follow up with Procurement Head on budget sign-off",
            assigned_employee_id=emp.id,
            is_completed=False,
        )
        db.add(follow1)
        db.flush()

    q3 = db.query(Quotation).filter(Quotation.quotation_number == "Q-2041").first()
    if not q3:
        q3 = Quotation(
            quotation_number="Q-2041",
            revision_number=1,
            enquiry_id=enq4.id if enq4 else None,
            customer_id=customer_map["CUST-003"].id,
            status="Approved",
            subtotal=Decimal("288135.59"),
            discount_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("51864.41"),
            total_amount=Decimal("340000.00"),
            valid_until=date.today() + timedelta(days=5),
            approved_at=now - timedelta(days=10),
            created_at=now - timedelta(days=13),
        )
        db.add(q3)
        db.flush()

    q4 = db.query(Quotation).filter(Quotation.quotation_number == "Q-2028").first()
    if not q4:
        q4 = Quotation(
            quotation_number="Q-2028",
            revision_number=1,
            enquiry_id=enq5.id if enq5 else None,
            customer_id=customer_map["CUST-002"].id,
            status="Converted",
            subtotal=Decimal("440677.97"),
            discount_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("79322.03"),
            total_amount=Decimal("520000.00"),
            valid_until=date.today() - timedelta(days=2),
            approved_at=now - timedelta(days=20),
            created_at=now - timedelta(days=23),
        )
        db.add(q4)
        db.flush()

    # 10. Sample Work Orders (Production)
    wo1 = db.query(WorkOrder).filter(WorkOrder.work_order_number == "WO-0842").first()
    if not wo1:
        wo1 = WorkOrder(
            work_order_number="WO-0842",
            quotation_id=q1.id if q1 else None,
            customer_id=customer_map["CUST-001"].id,
            title="Aster Interiors - Modular Kitchen & Wardrobe Fabrication",
            status="In Progress",
            priority="High",
            planned_start_date=date.today() - timedelta(days=2),
            planned_end_date=date.today() + timedelta(days=12),
            actual_start_date=date.today() - timedelta(days=1),
            notes="Factory CNC cutting underway. Edge banding scheduled tomorrow.",
            created_at=now - timedelta(days=1),
        )
        db.add(wo1)
        db.flush()

        task1 = ProductionTask(
            work_order_id=wo1.id,
            task_name="CNC Carcass Cutting",
            sequence_order=1,
            status="Completed",
            assigned_employee_id=emp.id,
            planned_hours=Decimal("12.00"),
            actual_hours=Decimal("11.50"),
            completion_notes="Carcass boards cut and labeled.",
        )
        task2 = ProductionTask(
            work_order_id=wo1.id,
            task_name="Edge Banding & Grooving",
            sequence_order=2,
            status="In Progress",
            assigned_employee_id=emp.id,
            planned_hours=Decimal("8.00"),
            actual_hours=Decimal("4.00"),
        )
        inst1 = Installation(
            work_order_id=wo1.id,
            site_address="Flat 804, Aster Heights, Whitefield, Bengaluru",
            scheduled_date=date.today() + timedelta(days=10),
            status="Scheduled",
            lead_installer_id=emp.id,
        )
        db.add_all([task1, task2, inst1])
        db.flush()

    wo2 = db.query(WorkOrder).filter(WorkOrder.work_order_number == "WO-0839").first()
    if not wo2:
        wo2 = WorkOrder(
            work_order_number="WO-0839",
            quotation_id=q3.id if q3 else None,
            customer_id=customer_map["CUST-003"].id,
            title="Lakeview Retail Kiosk Fabrication",
            status="Completed",
            priority="Medium",
            planned_start_date=date.today() - timedelta(days=11),
            planned_end_date=date.today() - timedelta(days=2),
            actual_start_date=date.today() - timedelta(days=11),
            actual_completion_date=date.today() - timedelta(days=2),
            notes="Delivered and handed over to mall facilities.",
            created_at=now - timedelta(days=12),
        )
        db.add(wo2)
        db.flush()

    wo3 = db.query(WorkOrder).filter(WorkOrder.work_order_number == "WO-0831").first()
    if not wo3:
        wo3 = WorkOrder(
            work_order_number="WO-0831",
            quotation_id=q4.id if q4 else None,
            customer_id=customer_map["CUST-002"].id,
            title="Acme Spaces Conference Table Assembly",
            status="Completed",
            priority="High",
            planned_start_date=date.today() - timedelta(days=22),
            planned_end_date=date.today() - timedelta(days=14),
            actual_start_date=date.today() - timedelta(days=22),
            actual_completion_date=date.today() - timedelta(days=14),
            notes="Polishing and acoustic grommets completed.",
            created_at=now - timedelta(days=22),
        )
        db.add(wo3)
        db.flush()

    # 11. Sample Feedback
    if db.query(Feedback).count() == 0:
        fb1 = Feedback(
            customer_id=customer_map["CUST-001"].id,
            work_order_id=wo1.id if wo1 else None,
            status="Awaiting",
            category="Quality",
            comments="Installation pending; feedback request generated for initial design phase.",
            created_at=now - timedelta(hours=6),
        )
        fb2 = Feedback(
            customer_id=customer_map["CUST-003"].id,
            work_order_id=wo2.id if wo2 else None,
            status="Received",
            category="Delivery",
            rating=5,
            comments="Delivered 2 days ahead of retail mall opening. High quality finish.",
            created_at=now - timedelta(days=10),
            received_at=now - timedelta(days=9),
        )
        fb3 = Feedback(
            customer_id=customer_map["CUST-002"].id,
            work_order_id=wo3.id if wo3 else None,
            status="Received",
            category="Product",
            rating=4,
            comments="Conference table wood grain looks premium. Very happy with design.",
            created_at=now - timedelta(days=20),
            received_at=now - timedelta(days=19),
        )
        db.add_all([fb1, fb2, fb3])
        db.flush()

    # 12. Sample Workers & Labour
    if db.query(Worker).count() == 0:
        w1 = Worker(
            worker_code="WRK-101",
            first_name="Ramesh",
            last_name="Kumar",
            phone="+91 99887 76611",
            skill_category="Carpentry",
            status="Assigned",
            daily_rate=Decimal("1200.00"),
        )
        w2 = Worker(
            worker_code="WRK-102",
            first_name="Mohan",
            last_name="Lal",
            phone="+91 99887 76622",
            skill_category="Finishing",
            status="Available",
            daily_rate=Decimal("1100.00"),
        )
        w3 = Worker(
            worker_code="WRK-103",
            first_name="Suresh",
            last_name="Sharma",
            phone="+91 99887 76633",
            skill_category="Installation",
            status="Available",
            daily_rate=Decimal("1300.00"),
        )
        db.add_all([w1, w2, w3])
        db.flush()

        lr1 = LabourRequest(
            request_number="LR-140",
            work_order_id=wo1.id if wo1 else None,
            requested_by_id=admin.id,
            department_id="production",
            required_workers_count=2,
            required_date=date.today() + timedelta(days=1),
            skill_category="Carpentry",
            status="Approved",
            notes="Assembly assistance needed at factory floor.",
            approved_by_id=admin.id,
            approved_at=now,
        )
        db.add(lr1)
        db.flush()

        assign1 = LabourAssignment(
            labour_request_id=lr1.id,
            worker_id=w1.id,
            work_order_id=wo1.id if wo1 else None,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2),
            status="Active",
        )
        db.add(assign1)

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
        print("Database initialized and seeded successfully.")
    finally:
        db.close()
