def test_login_success(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "WrongPassword"
    })
    assert response.status_code == 401


def test_get_current_user_profile(client):
    login_res = client.post("/api/auth/login", json={
        "email": "admin@avora.io",
        "password": "Admin@123456"
    })
    token = login_res.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "admin@avora.io"
    assert "Administrator" in user_data["roles"]
    assert user_data["is_superuser"] is True
