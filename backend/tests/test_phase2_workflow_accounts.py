from app.core.config import get_settings


def _auth_headers(client) -> dict[str, str]:
    settings = get_settings()
    res = client.post(
        "/api/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_full_workflow_quotation_to_project_production_and_accounts(client):
    headers = _auth_headers(client)

    # 1. Create Customer
    cust_res = client.post(
        "/api/customers",
        json={"name": "Horizon Builders", "company_name": "Horizon Corp", "email": "accounts@horizon.example"},
        headers=headers,
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 2. Create Enquiry & qualify
    enq_res = client.post(
        "/api/enquiries",
        json={
            "customer_id": customer_id,
            "requirement_summary": "Complete modular office fitout",
            "estimated_budget": 100000,
            "priority": "High",
            "enquiry_type": "Commercial",
        },
        headers=headers,
    )
    assert enq_res.status_code == 201
    enquiry_id = enq_res.json()["id"]

    q_status_res = client.patch(
        f"/api/enquiries/{enquiry_id}/status",
        json={"status": "Qualified", "notes": "Budget verified"},
        headers=headers,
    )
    assert q_status_res.status_code == 200

    # 3. Create Quotation & approve -> auto-creates Project
    quote_res = client.post(
        "/api/quotations",
        json={
            "customer_id": customer_id,
            "enquiry_id": enquiry_id,
            "discount_rate": 0,
            "tax_rate": 0,
            "items": [{"description": "Workstations", "quantity": 10, "unit_price": 10000}],
        },
        headers=headers,
    )
    assert quote_res.status_code == 201
    quotation_id = quote_res.json()["id"]

    approve_res = client.patch(
        f"/api/quotations/{quotation_id}/status",
        json={"status": "Approved", "notes": "Client signed off"},
        headers=headers,
    )
    assert approve_res.status_code == 200
    project_id = approve_res.json()["project_id"]
    assert project_id is not None

    proj_res = client.get(f"/api/projects/{project_id}", headers=headers)
    assert proj_res.status_code == 200
    assert proj_res.json()["status"] == "Approved"

    # 4. Convert to Production Work Order
    conv_res = client.post(f"/api/quotations/{quotation_id}/convert-to-work-order", headers=headers)
    assert conv_res.status_code == 200
    wo_id = conv_res.json()["work_order_id"]
    wo_detail = client.get(f"/api/production/{wo_id}", headers=headers)
    assert wo_detail.status_code == 200
    assert wo_detail.json()["project_id"] == project_id

    # 5. Add multiple production updates without overwriting
    u1 = client.post(
        f"/api/production/{wo_id}/updates",
        json={"status": "In Progress", "progress_percentage": 40, "remarks": "CNC cutting started"},
        headers=headers,
    )
    assert u1.status_code == 201
    u2 = client.post(
        f"/api/production/{wo_id}/updates",
        json={"status": "Quality Check", "progress_percentage": 90, "remarks": "Finishing inspection"},
        headers=headers,
    )
    assert u2.status_code == 201
    assert len(u2.json()["updates"]) == 2

    # 6. Complete Production & Handover to Accounts
    handover = client.post(
        f"/api/production/{wo_id}/complete-and-transfer",
        json={"remarks": "Dispatched to site"},
        headers=headers,
    )
    assert handover.status_code == 200
    acc_id = handover.json()["accounts_record_id"]

    proj_after = client.get(f"/api/projects/{project_id}", headers=headers).json()
    assert proj_after["status"] == "Sent to Accounts"

    # 7. Generate Invoice & record multiple partial payments
    inv_res = client.post(
        f"/api/accounts/{acc_id}/invoices",
        json={"invoice_amount": 100000, "tax_amount": 0, "remarks": "Final project invoice"},
        headers=headers,
    )
    assert inv_res.status_code == 201
    invoice_id = inv_res.json()["invoices"][0]["id"]
    assert inv_res.json()["status"] == "Payment Pending"

    # Cannot close while balance > 0
    bad_close = client.patch(f"/api/accounts/{acc_id}", json={"status": "Closed"}, headers=headers)
    assert bad_close.status_code == 400

    # Partial payment 1
    p1 = client.post(
        f"/api/accounts/{acc_id}/payments",
        json={"invoice_id": invoice_id, "amount": 40000, "payment_method": "NEFT", "reference_number": "UTR-001"},
        headers=headers,
    )
    assert p1.status_code == 201
    assert p1.json()["status"] == "Partially Paid"
    assert float(p1.json()["outstanding_amount"]) == 60000.0

    # Partial payment 2 (remaining)
    p2 = client.post(
        f"/api/accounts/{acc_id}/payments",
        json={"invoice_id": invoice_id, "amount": 60000, "payment_method": "RTGS", "reference_number": "UTR-002"},
        headers=headers,
    )
    assert p2.status_code == 201
    assert p2.json()["status"] == "Fully Paid"
    assert float(p2.json()["outstanding_amount"]) == 0.0
    assert len(p2.json()["payments"]) == 2

    # Close accounts record
    close_res = client.patch(f"/api/accounts/{acc_id}", json={"status": "Closed"}, headers=headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

    # 8. Verify Unified Project Timeline has events across stages
    tl_res = client.get(f"/api/projects/{project_id}/timeline", headers=headers)
    assert tl_res.status_code == 200
    event_types = {e["event_type"] for e in tl_res.json()}
    assert "enquiry_created" in event_types
    assert "quotation_status" in event_types
    assert "production_update" in event_types
    assert "accounts_transfer" in event_types
    assert "invoice_generated" in event_types
    assert "payment_received" in event_types
