def get_auth_token(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    return login_res.json()["access_token"]


def test_customer_crud_and_duplicate_prevention(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create customer
    res = client.post("/api/customers", json={
        "name": "Zenith Studios",
        "company_name": "Zenith Infra",
        "email": "zenith@studios.com",
        "phone": "+91 99000 11223",
        "address": "45 Richmond Road, Bengaluru"
    }, headers=headers)
    assert res.status_code == 201
    cust_id = res.json()["id"]

    # 2. Duplicate check
    res_dup = client.post("/api/customers", json={
        "name": "Zenith Copy",
        "email": "zenith@studios.com"
    }, headers=headers)
    assert res_dup.status_code == 409

    # 3. Get customer
    res_get = client.get(f"/api/customers/{cust_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["name"] == "Zenith Studios"

    # 4. List customers
    res_list = client.get("/api/customers?search=Zenith", headers=headers)
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1


def test_enquiry_lifecycle(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Find customer
    c_list = client.get("/api/customers", headers=headers).json()["items"]
    cust_id = c_list[0]["id"]

    # Create enquiry
    res = client.post("/api/enquiries", json={
        "customer_id": cust_id,
        "requirement_summary": "Luxury penthouse modular kitchen & wardrobe",
        "estimated_budget": "750000.00",
        "priority": "High"
    }, headers=headers)
    assert res.status_code == 201
    enquiry = res.json()
    enq_id = enquiry["id"]
    assert enquiry["status"] == "New"

    # Status transition to Qualified
    res_qual = client.post(f"/api/enquiries/{enq_id}/status", json={
        "status": "Qualified",
        "notes": "Budget confirmed with client"
    }, headers=headers)
    assert res_qual.status_code == 200
    assert res_qual.json()["status"] == "Qualified"

    # Status transition to Converted
    res_conv = client.post(f"/api/enquiries/{enq_id}/status", json={
        "status": "Converted",
        "notes": "Moved into quotation and design phase"
    }, headers=headers)
    assert res_conv.status_code == 200
    assert res_conv.json()["status"] == "Converted"

    # Verify history
    res_detail = client.get(f"/api/enquiries/{enq_id}", headers=headers)
    assert len(res_detail.json()["status_history"]) >= 3
