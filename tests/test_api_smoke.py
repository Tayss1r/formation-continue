from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_openapi_schema_available() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()
    assert payload["info"]["title"] == "Formation Continue - Training Courses Platform"


def test_docs_available() -> None:
    response = client.get("/docs")

    assert response.status_code == 200
    assert "Swagger UI" in response.text


def test_unknown_api_route_returns_404() -> None:
    response = client.get("/api/v1/this-route-does-not-exist")

    assert response.status_code == 404
