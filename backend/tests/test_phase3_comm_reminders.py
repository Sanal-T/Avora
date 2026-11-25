from datetime import date, timedelta
from app.core.config import get_settings


def _auth_headers(client) -> dict[str, str]:
    settings = get_settings()
    res = client.post(
        "/api/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_communications_and_reminder_notifications(client):
    headers = _auth_headers(client)

    # 1. Create interdepartmental communication & add threaded message
    comm_res = client.post(
        "/api/communications",
        json={
            "from_department_id": "designs",
            "to_department_id": "production",
            "type": "Clarification",
            "subject": "Verify laminate thickness",
            "description": "Please confirm 18mm vs 12mm board spec.",
            "priority": "High",
        },
        headers=headers,
    )
    assert comm_res.status_code == 201
    comm_id = comm_res.json()["id"]
    assert comm_res.json()["status"] == "Open"

    msg_res = client.post(
        f"/api/communications/{comm_id}/messages",
        json={"message": "Confirmed 18mm marine ply."},
        headers=headers,
    )
    assert msg_res.status_code == 201
    assert msg_res.json()["status"] == "Responded"
    assert len(msg_res.json()["messages"]) == 1

    resolve_res = client.patch(
        f"/api/communications/{comm_id}",
        json={"status": "Resolved"},
        headers=headers,
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "Resolved"

    # 2. Create an overdue design to verify automated reminder notifications
    overdue_date = (date.today() - timedelta(days=2)).isoformat()
    des_res = client.post(
        "/api/designs",
        json={
            "title": "Overdue Lobby Concept",
            "priority": "High",
            "expected_completion_date": overdue_date,
        },
        headers=headers,
    )
    assert des_res.status_code == 201

    rem_res = client.post("/api/notifications/run-reminders", headers=headers)
    assert rem_res.status_code == 200
    assert rem_res.json()["created"] >= 1

    # Running again same day should not duplicate
    rem_res2 = client.post("/api/notifications/run-reminders", headers=headers)
    assert rem_res2.status_code == 200
    assert rem_res2.json()["created"] == 0
