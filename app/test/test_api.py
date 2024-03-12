from fastapi.testclient import TestClient
from app.api import router
import pytest

client = TestClient(router)


@pytest.fixture
def client():
    return TestClient(router)


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "message": "This application helps you analyze your Chrome bookmarks.",
    }


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "application/json"

    response_data = resp.json()
    assert response_data["status"] == "success"
    assert isinstance(response_data["result"], list)
    assert response_data["message"] == "Application is healthy."


def test_bookmarks(client):
    response = client.get("/bookmarks")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert isinstance(response.json()["result"], dict)
