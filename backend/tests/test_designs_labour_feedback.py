def get_auth_token(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    return login_res.json()["access_token"]


def test_design_lifecycle_and_versioning(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create design
    res = client.post("/api/designs", json={
        "title": "Conference Room Concept Layout",
        "priority": "High",
        "estimated_hours": "25.00"
    }, headers=headers)
    assert res.status_code == 201
    d = res.json()
    d_id = d["id"]
    assert d["status"] == "Not Started"

    # 2. Add design version
    res_v = client.post(f"/api/designs/{d_id}/versions", json={
        "file_name": "conference_v1.dwg",
        "file_url": "/uploads/designs/conference_v1.dwg",
        "change_notes": "First client presentation draft"
    }, headers=headers)
    assert res_v.status_code == 200
    assert len(res_v.json()["versions"]) >= 1
    assert res_v.json()["status"] == "Under Review"

    # 3. Mark completed
    res_comp = client.post(f"/api/designs/{d_id}/status", json={"status": "Completed"}, headers=headers)
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "Completed"


def test_feedback_and_labour(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    c_list = client.get("/api/customers", headers=headers).json()["items"]
    cust_id = c_list[0]["id"]

    # 1. Create feedback
    res_fb = client.post("/api/feedback", json={
        "customer_id": cust_id,
        "category": "Quality",
        "rating": 5,
        "comments": "Excellent woodwork and precision fitting."
    }, headers=headers)
    assert res_fb.status_code == 201
    assert res_fb.json()["status"] == "Received"

    # 2. Create worker
    res_w = client.post("/api/labour/workers", json={
        "first_name": "Vijay",
        "last_name": "Kumar",
        "skill_category": "Electrical",
        "daily_rate": "1250.00"
    }, headers=headers)
    assert res_w.status_code == 201
    assert res_w.json()["status"] == "Available"

    # 3. Create labour request
    res_req = client.post("/api/labour/requests", json={
        "required_workers_count": 1,
        "required_date": "2026-11-20",
        "skill_category": "Electrical",
        "notes": "Wiring for workstation cubicles"
    }, headers=headers)
    assert res_req.status_code == 201
    assert res_req.json()["status"] == "Pending"
