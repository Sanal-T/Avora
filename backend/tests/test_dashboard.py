def get_auth_token(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    return login_res.json()["access_token"]


def test_dashboard_overview_returns_database_source(client):
    token = get_auth_token(client)
    response = client.get("/api/dashboard/overview", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "database"
    assert "departments" in data
    assert len(data["departments"]) == 6
    assert "snapshot" in data
    assert "action_items" in data
    assert "recent_activities" in data


def test_dashboard_date_filter_validation(client):
    token = get_auth_token(client)
    response = client.get(
        "/api/dashboard/overview?date_from=2026-12-01&date_to=2026-11-01",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422


def test_department_summary_endpoints(client):
    token = get_auth_token(client)
    for dept_id in ["enquiries", "designs", "quotations", "production", "feedback", "labour"]:
        response = client.get(
            f"/api/dashboard/{dept_id}/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        summary = response.json()
        assert summary["id"] == dept_id
        assert "primary_value" in summary
        assert "metrics" in summary


def test_dashboard_accounts_access_restricted_to_finance_roles(client, db_session):
    from app.core.security import get_password_hash
    from app.models.auth import User

    admin_token = get_auth_token(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin / finance role can access accounts summary card
    acc_res = client.get("/api/dashboard/accounts/summary", headers=admin_headers)
    assert acc_res.status_code == 200
    assert acc_res.json()["id"] == "accounts"

    # Create a non-finance user (active, non-superuser, no finance roles)
    user = User(
        email="designer_dash@avora.io",
        full_name="Dashboard Designer",
        hashed_password=get_password_hash("Password@123"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()

    login_res = client.post(
        "/api/auth/login",
        json={"email": "designer_dash@avora.io", "password": "Password@123"},
    )
    assert login_res.status_code == 200
    designer_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Overview should succeed but omit the accounts card
    overview_res = client.get("/api/dashboard/overview", headers=designer_headers)
    assert overview_res.status_code == 200
    dept_ids = [d["id"] for d in overview_res.json()["departments"]]
    assert "accounts" not in dept_ids

    # Direct accounts summary card should be forbidden
    acc_forbidden = client.get("/api/dashboard/accounts/summary", headers=designer_headers)
    assert acc_forbidden.status_code == 403
