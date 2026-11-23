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
