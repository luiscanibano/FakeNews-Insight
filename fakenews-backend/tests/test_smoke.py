"""Smoke tests del backend: validan que la API arranca y /health responde."""

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_app_has_expected_routes():
    paths = {route.path for route in app.routes}
    assert "/health" in paths
    assert "/predecir/" in paths
