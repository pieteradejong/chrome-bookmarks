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


def test_bookmarks(client):
    response = client.get("/bookmarks")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert isinstance(response.json()["result"], dict)
