def test_dashboard_overview_returns_database_source(client):
    response = client.get("/api/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "database"
    assert "departments" in data
    assert len(data["departments"]) == 6
    assert "snapshot" in data
    assert "action_items" in data
    assert "recent_activities" in data


def test_dashboard_date_filter_validation(client):
    response = client.get("/api/dashboard/overview?date_from=2026-12-01&date_to=2026-11-01")
    assert response.status_code == 422


def test_department_summary_endpoints(client):
    for dept_id in ["enquiries", "designs", "quotations", "production", "feedback", "labour"]:
        response = client.get(f"/api/dashboard/{dept_id}/summary")
        assert response.status_code == 200
        summary = response.json()
        assert summary["id"] == dept_id
        assert "primary_value" in summary
        assert "metrics" in summary
