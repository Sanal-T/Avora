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
