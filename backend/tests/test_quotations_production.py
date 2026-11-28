from decimal import Decimal


def get_auth_token(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    return login_res.json()["access_token"]


def test_quotation_calculations_and_lifecycle(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    c_list = client.get("/api/customers", headers=headers).json()["items"]
    cust_id = c_list[0]["id"]

    # 1. Create quotation with items
    # Item 1: 10 units @ 1000 = 10000
    # Item 2: 5 units @ 2000 = 10000
    # Subtotal = 20000
    # Discount 10% = 2000 -> Taxable = 18000
    # Tax 18% = 3240 -> Total = 21240
    res = client.post("/api/quotations", json={
        "customer_id": cust_id,
        "discount_rate": "10.00",
        "tax_rate": "18.00",
        "items": [
            {"description": "Acoustic panels", "quantity": "10.00", "unit": "pcs", "unit_price": "1000.00"},
            {"description": "Profile handles", "quantity": "5.00", "unit": "sets", "unit_price": "2000.00"}
        ]
    }, headers=headers)
    assert res.status_code == 201
    q = res.json()
    q_id = q["id"]
    assert Decimal(str(q["subtotal"])) == Decimal("20000.00")
    assert Decimal(str(q["discount_amount"])) == Decimal("2000.00")
    assert Decimal(str(q["tax_amount"])) == Decimal("3240.00")
    assert Decimal(str(q["total_amount"])) == Decimal("21240.00")
    assert q["revision_number"] == 1

    # 2. Approve quotation
    res_app = client.post(f"/api/quotations/{q_id}/status", json={"status": "Approved"}, headers=headers)
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "Approved"

    # 3. Converting to work order
    res_conv = client.post(f"/api/quotations/{q_id}/convert-to-work-order", headers=headers)
    assert res_conv.status_code == 200
    wo_data = res_conv.json()
    wo_id = wo_data["work_order_id"]
    assert "work_order_id" in wo_data

    # 4. Duplicate conversion prevention
    res_conv_dup = client.post(f"/api/quotations/{q_id}/convert-to-work-order", headers=headers)
    assert res_conv_dup.status_code == 400 or res_conv_dup.status_code == 409

    # 5. Add production task to the work order
    res_task = client.post(f"/api/production/{wo_id}/tasks", json={
        "task_name": "Assembly & Finishing",
        "planned_hours": "16.00"
    }, headers=headers)
    assert res_task.status_code == 200
    assert len(res_task.json()["tasks"]) >= 1


def test_production_slot_persistence_and_overlap_validation(client, db_session):
    from app.core.security import get_password_hash
    from app.models.auth import User

    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create a second user to verify cross-user visibility
    second_user = User(
        email="viewer_prod@avora.io",
        full_name="Second Production Viewer",
        hashed_password=get_password_hash("Password@123"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(second_user)
    db_session.commit()

    second_login = client.post(
        "/api/auth/login",
        json={"email": "viewer_prod@avora.io", "password": "Password@123"},
    )
    assert second_login.status_code == 200
    second_headers = {"Authorization": f"Bearer {second_login.json()['access_token']}"}

    # 1. Create a slot
    slot_a_res = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Aster Interiors",
            "title": "Conference Pods Milling",
            "bay": "CNC Bay 1",
            "stage": "Cutting",
            "start_date": "2026-12-01",
            "end_date": "2026-12-04",
            "start_time": "08:00",
            "end_time": "12:00",
            "lead_worker": "Ramesh Gowda",
            "status": "allocated",
            "capacity_hours": 16,
            "priority": "high",
        },
    )
    assert slot_a_res.status_code == 201
    slot_a = slot_a_res.json()
    assert slot_a["code"].startswith("SLOT-")

    # 2. Second user sees the persisted slot via GET /api/production/slots
    list_res = client.get("/api/production/slots", headers=second_headers)
    assert list_res.status_code == 200
    assert any(s["id"] == slot_a["id"] for s in list_res.json()["items"])

    # 3. Overlapping bay + date + time -> 409 Conflict
    overlap_res = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Orion Corp",
            "title": "Overlapping CNC Run",
            "bay": "CNC Bay 1",
            "stage": "Cutting",
            "start_date": "2026-12-03",
            "end_date": "2026-12-06",
            "start_time": "10:00",
            "end_time": "16:00",
            "lead_worker": "Ramesh Gowda",
            "status": "allocated",
            "capacity_hours": 24,
            "priority": "medium",
        },
    )
    assert overlap_res.status_code == 409

    # 4. Same bay + overlapping dates, non-overlapping shift time (12:00-17:00) -> 201 Created
    afternoon_res = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Orion Corp",
            "title": "Afternoon CNC Run",
            "bay": "CNC Bay 1",
            "stage": "Cutting",
            "start_date": "2026-12-03",
            "end_date": "2026-12-06",
            "start_time": "12:00",
            "end_time": "17:00",
            "lead_worker": "Ramesh Gowda",
            "status": "allocated",
            "capacity_hours": 20,
            "priority": "medium",
        },
    )
    assert afternoon_res.status_code == 201
    slot_b = afternoon_res.json()

    # 5. Different bay + overlapping dates/times -> 201 Created
    other_bay_res = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Vertex Spaces",
            "title": "Joinery Run",
            "bay": "Joinery Bay 2",
            "stage": "Assembly",
            "start_date": "2026-12-01",
            "end_date": "2026-12-04",
            "start_time": "08:00",
            "end_time": "17:00",
            "lead_worker": "Ramesh Gowda",
            "status": "allocated",
            "capacity_hours": 32,
            "priority": "medium",
        },
    )
    assert other_bay_res.status_code == 201

    # 6. Updating slot B to overlap slot A -> 409 Conflict
    conflict_patch = client.patch(
        f"/api/production/slots/{slot_b['id']}",
        headers=headers,
        json={"start_time": "09:00"},
    )
    assert conflict_patch.status_code == 409

    # 7. Updating slot A without overlapping slot B -> 200 OK (does not self-conflict)
    ok_patch = client.patch(
        f"/api/production/slots/{slot_a['id']}",
        headers=headers,
        json={"notes": "Updated notes", "end_time": "11:30"},
    )
    assert ok_patch.status_code == 200
    assert ok_patch.json()["end_time"] == "11:30"

    # 8. Invalid date range -> 422
    bad_dates = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Bad Dates",
            "title": "Invalid Range",
            "bay": "Assembly Line A",
            "stage": "Assembly",
            "start_date": "2026-12-10",
            "end_date": "2026-12-08",
            "start_time": "08:00",
            "end_time": "17:00",
        },
    )
    assert bad_dates.status_code == 422

    # 9. Deleting slot A frees the window so a new slot can claim it
    del_res = client.delete(f"/api/production/slots/{slot_a['id']}", headers=headers)
    assert del_res.status_code == 204

    recreate_res = client.post(
        "/api/production/slots",
        headers=headers,
        json={
            "client": "Aster Interiors",
            "title": "Re-allocated Milling",
            "bay": "CNC Bay 1",
            "stage": "Cutting",
            "start_date": "2026-12-01",
            "end_date": "2026-12-04",
            "start_time": "08:00",
            "end_time": "12:00",
        },
    )
    assert recreate_res.status_code == 201


def test_concurrent_slot_allocation_prevents_double_booking(client):
    from concurrent.futures import ThreadPoolExecutor

    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    payload_1 = {
        "client": "Concurrent Client A",
        "title": "Concurrent Job A",
        "bay": "Finishing Booth 1",
        "stage": "Finishing",
        "start_date": "2027-01-10",
        "end_date": "2027-01-12",
        "start_time": "08:00",
        "end_time": "17:00",
    }
    payload_2 = {
        "client": "Concurrent Client B",
        "title": "Concurrent Job B",
        "bay": "Finishing Booth 1",
        "stage": "Finishing",
        "start_date": "2027-01-11",
        "end_date": "2027-01-13",
        "start_time": "09:00",
        "end_time": "15:00",
    }

    def book(payload):
        return client.post("/api/production/slots", headers=headers, json=payload)

    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(book, payload_1)
        f2 = pool.submit(book, payload_2)
        statuses = sorted([f1.result().status_code, f2.result().status_code])

    assert statuses == [201, 409]
