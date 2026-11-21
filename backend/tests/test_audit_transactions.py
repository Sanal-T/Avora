import uuid
from decimal import Decimal
import pytest
from fastapi import HTTPException

from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationStatusHistory
from app.models.production import WorkOrder, WorkOrderStatusHistory
from app.models.system import AuditLog
from app.schemas.quotation import QuotationCreate, QuotationItemCreate, QuotationStatusUpdate
from app.schemas.customer import CustomerCreate, CustomerContactCreate
from app.services import quotation_service, customer_service, notification_service, audit_service


def test_atomic_quote_conversion_and_audit_trail(db_session):
    # 1. Create a customer
    cust_in = CustomerCreate(
        name="Apex Architectural Studios",
        company_name="Apex Studios LLC",
        email=f"apex_{uuid.uuid4().hex[:6]}@example.com",
        contacts=[CustomerContactCreate(name="Lead Estimator", email="est@apex.com", is_primary=True)]
    )
    cust = customer_service.create_customer(db_session, cust_in)

    # 2. Create quotation with items
    q_in = QuotationCreate(
        customer_id=cust.id,
        discount_rate=Decimal("5.00"),
        tax_rate=Decimal("18.00"),
        items=[
            QuotationItemCreate(description="Acoustic Ceiling Grid", quantity=Decimal("20.00"), unit="m2", unit_price=Decimal("1500.00")),
            QuotationItemCreate(description="Diffuser Panels", quantity=Decimal("10.00"), unit="pcs", unit_price=Decimal("800.00")),
        ]
    )
    q = quotation_service.create_quotation(db_session, q_in)
    assert q.revision_number == 1
    assert q.status == "Draft"
    assert q.total_amount > Decimal("0.00")

    # 3. Approve quotation
    q_app = quotation_service.update_quotation_status(db_session, q.id, QuotationStatusUpdate(status="Approved"))
    assert q_app.status == "Approved"

    # 4. Convert quotation to Work Order atomically
    wo = quotation_service.convert_quotation_to_work_order(db_session, q.id)
    assert wo.quotation_id == q.id
    assert wo.customer_id == cust.id
    assert wo.status == "Pending"

    # Verify Quotation updated to Converted
    refreshed_q = quotation_service.get_quotation(db_session, q.id)
    assert refreshed_q.status == "Converted"

    # Verify both QuotationStatusHistory and WorkOrderStatusHistory exist
    quote_hist = db_session.query(QuotationStatusHistory).filter(QuotationStatusHistory.quotation_id == q.id).all()
    assert any(h.to_status == "Converted" for h in quote_hist)

    wo_hist = db_session.query(WorkOrderStatusHistory).filter(WorkOrderStatusHistory.work_order_id == wo.id).all()
    assert len(wo_hist) >= 1
    assert wo_hist[0].to_status == "Pending"

    # 5. Verify audit logs were committed atomically in the same transaction
    total_q_logs, q_logs = audit_service.list_audit_logs(db_session, entity_type="quotation")
    assert any(l.entity_id == str(q.id) and l.action == "CONVERT" for l in q_logs)

    total_wo_logs, wo_logs = audit_service.list_audit_logs(db_session, entity_type="work_order")
    assert any(l.entity_id == str(wo.id) and l.action == "CREATE" for l in wo_logs)


def test_duplicate_conversion_conflict(db_session):
    cust_in = CustomerCreate(
        name="Unique Conversion Test Corp",
        email=f"dup_{uuid.uuid4().hex[:6]}@example.com",
    )
    cust = customer_service.create_customer(db_session, cust_in)

    q_in = QuotationCreate(
        customer_id=cust.id,
        items=[QuotationItemCreate(description="Custom Joinery", quantity=Decimal("1.00"), unit="lot", unit_price=Decimal("12000.00"))]
    )
    q = quotation_service.create_quotation(db_session, q_in)
    quotation_service.update_quotation_status(db_session, q.id, QuotationStatusUpdate(status="Approved"))

    # First conversion succeeds
    wo1 = quotation_service.convert_quotation_to_work_order(db_session, q.id)
    assert wo1 is not None

    # Second conversion is blocked
    with pytest.raises(HTTPException) as exc_info:
        quotation_service.convert_quotation_to_work_order(db_session, q.id)
    assert exc_info.value.status_code in [400, 409]


def test_customer_creation_atomic_and_audit(db_session):
    cust_in = CustomerCreate(
        name="Global Interiors Ltd",
        company_name="Global Holdings",
        email=f"global_{uuid.uuid4().hex[:6]}@example.com",
        phone="+91 98765 43210",
        address="Tower 2, Commercial Zone",
        contacts=[
            CustomerContactCreate(name="Director", email="dir@global.com", designation="Managing Director", is_primary=True),
            CustomerContactCreate(name="Finance Head", email="fin@global.com", designation="CFO", is_primary=False),
        ]
    )
    cust = customer_service.create_customer(db_session, cust_in)
    assert cust.id is not None
    assert len(cust.contacts) == 2

    # Check audit logs for customer creation
    total_logs, logs = audit_service.list_audit_logs(db_session, entity_type="customer")
    matching = [l for l in logs if l.entity_id == str(cust.id)]
    assert len(matching) == 1
    assert matching[0].action == "CREATE"


def test_in_app_notifications_lifecycle(db_session):
    fake_user_id = uuid.uuid4()

    # Create notification
    notif = notification_service.create_notification(
        db=db_session,
        recipient_id=fake_user_id,
        title="Production Schedule Delay Alert",
        message="Work order WO-0842 requires re-assignment.",
        category="production",
        link="/production",
    )
    assert notif.id is not None
    assert notif.is_read is False

    # List notifications
    total, items = notification_service.list_user_notifications(db_session, user_id=fake_user_id, unread_only=True)
    assert total == 1
    assert items[0].id == notif.id

    # Mark read individually
    updated = notification_service.mark_notification_read(db_session, notification_id=notif.id, user_id=fake_user_id)
    assert updated is not None
    assert updated.is_read is True

    # Create second notification
    notification_service.create_notification(
        db=db_session,
        recipient_id=fake_user_id,
        title="Quotation Revision Available",
        message="Quotation Q-2026-0004 Rev 2 submitted.",
        category="quotation",
    )

    # Mark all read
    marked_count = notification_service.mark_all_notifications_read(db_session, user_id=fake_user_id)
    assert marked_count == 1

    # Verify unread count is zero
    unread_total, _ = notification_service.list_user_notifications(db_session, user_id=fake_user_id, unread_only=True)
    assert unread_total == 0
