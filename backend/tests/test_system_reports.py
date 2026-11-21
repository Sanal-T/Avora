def get_auth_token(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    return login_res.json()["access_token"]


def test_notifications_and_audit_logs(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List notifications
    res_notif = client.get("/api/notifications", headers=headers)
    assert res_notif.status_code == 200
    assert "items" in res_notif.json()

    # 2. List audit logs
    res_audit = client.get("/api/audit-logs", headers=headers)
    assert res_audit.status_code == 200
    assert "items" in res_audit.json()


def test_dashboard_auth_and_access_control(client):
    # Anonymous request must be rejected with 401
    res_anon = client.get("/api/dashboard/overview")
    assert res_anon.status_code == 401

    res_dept_anon = client.get("/api/dashboard/enquiries/summary")
    assert res_dept_anon.status_code == 401

    # Authenticated request succeeds
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    res_auth = client.get("/api/dashboard/overview", headers=headers)
    assert res_auth.status_code == 200
    assert "departments" in res_auth.json()


def test_reports_csv_exports(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Export enquiries
    res_enq = client.get("/api/reports/enquiries/export", headers=headers)
    assert res_enq.status_code == 200
    assert "text/csv" in res_enq.headers["content-type"]
    assert "Enquiry Number" in res_enq.text

    # Export quotations
    res_q = client.get("/api/reports/quotations/export", headers=headers)
    assert res_q.status_code == 200
    assert "text/csv" in res_q.headers["content-type"]
    assert "Quotation Number" in res_q.text

    # Export production
    res_prod = client.get("/api/reports/production/export", headers=headers)
    assert res_prod.status_code == 200
    assert "text/csv" in res_prod.headers["content-type"]
    assert "Work Order Number" in res_prod.text
