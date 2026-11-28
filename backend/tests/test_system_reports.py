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

    # Authenticated request with date range
    res_range = client.get("/api/dashboard/overview?date_from=2026-01-01&date_to=2026-12-31", headers=headers)
    assert res_range.status_code == 200
    data = res_range.json()
    assert data["date_from"] == "2026-01-01"
    assert data["date_to"] == "2026-12-31"

    # Invalid date range rejected with 422
    res_inv = client.get("/api/dashboard/overview?date_from=2026-12-31&date_to=2026-01-01", headers=headers)
    assert res_inv.status_code == 422

    # Department summary with date filter
    res_dept = client.get("/api/dashboard/enquiries/summary?date_from=2026-01-01&date_to=2026-12-31", headers=headers)
    assert res_dept.status_code == 200
    assert res_dept.json()["id"] == "enquiries"


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


def test_health_check_verifies_database(client):
    from app.api.deps import get_db
    from app.main import app

    res_ok = client.get("/api/health")
    assert res_ok.status_code == 200
    assert res_ok.json() == {"status": "ok", "database": "ok"}

    class BrokenSession:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("DB unreachable")

    def override_broken_db():
        yield BrokenSession()

    app.dependency_overrides[get_db] = override_broken_db
    try:
        res_err = client.get("/api/health")
        assert res_err.status_code == 503
        assert res_err.json() == {"status": "error", "database": "unavailable"}
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_file_attachment_record_authorization(client, db_session):
    from app.core.security import get_password_hash
    from app.models.accounts import AccountsRecord
    from app.models.auth import User

    admin_token = get_auth_token(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Find an existing accounts record (or verify via API)
    acc = db_session.query(AccountsRecord).filter(AccountsRecord.is_deleted == False).first()
    if acc is None:
        # Ensure we have a project to attach an accounts record to
        from app.models.project import Project
        proj = db_session.query(Project).filter(Project.is_deleted == False).first()
        assert proj is not None
        acc = AccountsRecord(accounts_number="ACC-TEST-FILE-01", project_id=proj.id)
        db_session.add(acc)
        db_session.commit()
        db_session.refresh(acc)

    # Admin uploads a PDF to the accounts record
    up_res = client.post(
        f"/api/files/upload?entity_type=accounts&entity_id={acc.id}",
        headers=admin_headers,
        files={"file": ("ledger.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert up_res.status_code == 200
    att_id = up_res.json()["id"]

    # Admin can list and download the attachment
    assert client.get(f"/api/files?entity_type=accounts&entity_id={acc.id}", headers=admin_headers).status_code == 200
    assert client.get(f"/api/files/{att_id}/download", headers=admin_headers).status_code == 200

    # Non-finance user must be denied read/list/batch/upload/download on accounts attachments
    non_fin = User(
        email="nonfinance_files@avora.io",
        full_name="Non Finance User",
        hashed_password=get_password_hash("Password@123"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(non_fin)
    db_session.commit()

    login_res = client.post(
        "/api/auth/login",
        json={"email": "nonfinance_files@avora.io", "password": "Password@123"},
    )
    assert login_res.status_code == 200
    non_fin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    assert client.get(f"/api/files/{att_id}/download", headers=non_fin_headers).status_code == 403
    assert client.get(f"/api/files?entity_type=accounts&entity_id={acc.id}", headers=non_fin_headers).status_code == 403
    assert client.get(f"/api/files/batch?entity_type=accounts&entity_ids={acc.id}", headers=non_fin_headers).status_code == 403
    assert (
        client.post(
            f"/api/files/upload?entity_type=accounts&entity_id={acc.id}",
            headers=non_fin_headers,
            files={"file": ("hack.pdf", b"%PDF-1.4", "application/pdf")},
        ).status_code
        == 403
    )

    # Non-existent linked record returns 404
    import uuid
    missing_id = uuid.uuid4()
    assert client.get(f"/api/files?entity_type=enquiry&entity_id={missing_id}", headers=admin_headers).status_code == 404
