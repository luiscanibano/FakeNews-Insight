"""Tests del endpoint /verify (agente FEVER) con dependencias mockeadas."""

from __future__ import annotations

from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

import main
from fever.agent import VerificationAgent
from fever.inference import StubNLIClassifier
from fever.retrieval import StubSearcher
from fever.schemas import (
    Claim,
    ClaimVerdict,
    Evidence,
    NLIScore,
    ScoredEvidence,
    VerdictLabel,
    VerificationReport,
)


client = TestClient(main.app)

VALID_TEXT = (
    "El ministro afirmo que la inflacion bajo al dos por ciento durante marzo "
    "y que el desempleo juvenil descendio cinco puntos en el ultimo año."
)


# --- helpers de monkeypatch ---

class _SupabaseSpy:
    """Reemplazo de _supabase_json_request configurable por escenario."""

    def __init__(self, profile: Dict[str, Any], user: Dict[str, Any] | None = None):
        self.profile = profile
        self.user = user or {"id": "user-1", "email": "u@example.com"}
        self.calls: List[tuple] = []

    def __call__(self, path, *, method="GET", jwt_token="", query=None,
                 body=None, prefer=None):
        self.calls.append((path, method, query, body))
        if path == "/auth/v1/user":
            return 200, self.user
        if path == "/rest/v1/profiles" and method == "GET":
            return 200, [self.profile]
        if path == "/rest/v1/profiles" and method == "PATCH":
            # Simular update OK con fila representada
            updated = {**self.profile,
                       **(body or {})}
            return 200, [updated]
        if path.startswith("/rest/v1/verification_"):
            # Simular insert
            return 201, [{"id": "row-1", **(body or {})}]
        return 404, {}

    def service_call(self, path, *, method="GET", query=None, body=None, prefer=None):
        self.calls.append((path, method, query, body))
        if path.startswith("/rest/v1/verification_"):
            return 201, [{"id": "row-1", **(body or {})}]
        return 404, {}


def _make_agent() -> VerificationAgent:
    claim = Claim(id="c1", text="afirmacion de prueba")
    ev = ScoredEvidence(
        evidence=Evidence(url="https://x", title="t", snippet="evidencia"),
        nli=NLIScore(label="SUPPORTS", score=0.9),
    )
    verdict = ClaimVerdict(
        claim=claim, label=VerdictLabel.SUPPORTED,
        confidence=0.9, rationale="basado en [1]", evidences=[ev],
    )
    report = VerificationReport(
        input_text="texto",
        claims=[verdict],
        overall_label=VerdictLabel.SUPPORTED,
        summary="ok",
        model_version="fever-stub-v0",
        duration_ms=10,
    )

    class _Agent:
        model_version = "fever-stub-v0"
        def verify(self, text):
            return report

    return _Agent()  # type: ignore[return-value]


@pytest.fixture(autouse=True)
def _reset_agent():
    yield
    import fever_runtime
    fever_runtime.reset_verification_agent()


# --- tests ---

def test_verify_requires_authorization_header():
    response = client.post("/verify", json={"texto": VALID_TEXT})
    assert response.status_code == 401


def test_verify_returns_verdict_for_ultra(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "ultra",
        "daily_verification_limit": 10,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["veredicto_global"] == "SUPPORTED"
    assert data["limite_diario"] == 10
    assert data["verificaciones_restantes_hoy"] == 9
    assert data["run_id"] == "row-1"
    assert len(data["claims"]) == 1
    assert data["claims"][0]["evidencias"][0]["nli_label"] == "SUPPORTS"


def test_verify_returns_verdict_for_pro_with_plan_limits(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "pro",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["plan"] == "pro"
    assert data["limite_diario"] == 50
    assert data["max_claims"] == 3
    assert data["max_evidences"] == 3


def test_verify_returns_verdict_for_ultra_with_plan_limits(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "ultra",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["plan"] == "ultra"
    assert data["limite_diario"] == 200
    assert data["max_claims"] == 8
    assert data["max_evidences"] == 5


def test_verify_returns_run_id_even_when_service_role_handles_persistence(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "ultra",
        "daily_verification_limit": 10,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })

    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/profiles" and method == "GET":
            return 200, [spy.profile]
        if path == "/rest/v1/profiles" and method == "PATCH":
            return 200, [{**spy.profile, **(body or {})}]
        if path.startswith("/rest/v1/verification_"):
            return 403, {"detail": "RLS insert denied"}
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["run_id"] == "row-1"


def test_verify_rejects_short_text(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "ultra",
        "daily_verification_limit": 10,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    response = client.post(
        "/verify", json={"texto": "corto"},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 400


def test_verify_rejects_text_over_plan_limit_before_quota(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "free",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)

    response = client.post(
        "/verify", json={"texto": "a" * 2001},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 413
    assert "2000" in response.json()["detail"]
    assert not any(call[1] == "PATCH" for call in spy.calls)


def test_verify_blocks_when_quota_exhausted(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "ultra",
        "daily_verification_limit": 1,
        "daily_verification_used": 1,
        "daily_verification_date": "2999-01-01",
    })
    # Forzar misma fecha
    import datetime as _dt
    real_today = _dt.date.today
    monkeypatch.setattr(main, "_supabase_json_request", spy)

    class _FakeDate(_dt.date):
        @classmethod
        def today(cls):
            return cls(2999, 1, 1)
    monkeypatch.setattr(main, "date", _FakeDate)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 403
    assert "limite" in response.json()["detail"].lower()


def test_verify_endpoint_is_registered():
    paths = {route.path for route in main.app.routes}
    assert "/verify" in paths


def test_delete_verification_history_entry(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [{
                "id": "run-1",
                "user_id": "user-1",
                "input_text": "texto",
                "overall_label": "SUPPORTED",
                "summary": "ok",
                "model_version": "fever-stub-v0",
                "duration_ms": 10,
                "created_at": "2026-01-01T10:00:00Z",
            }]
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_runs" and method == "DELETE":
            return 200, [{"id": "run-1"}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.delete(
        "/verification-history/run-1",
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"deleted": True, "run_id": "run-1"}


def test_save_verification_history_entry(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [{
                "id": "run-1",
                "user_id": "user-1",
                "input_text": "texto",
                "overall_label": "SUPPORTED",
                "summary": "ok",
                "model_version": "fever-stub-v0",
                "duration_ms": 10,
                "created_at": "2026-01-01T10:00:00Z",
                "saved_to_history": False,
                "saved_at": None,
            }]
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_runs" and method == "PATCH":
            return 200, [{"id": "run-1", "user_id": "user-1", **(body or {})}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.post(
        "/verification-history/save",
        json={"run_id": "run-1"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"saved": True, "already_saved": False, "run_id": "run-1"}


def test_save_verification_history_entry_fails_when_patch_updates_no_rows(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [{
                "id": "run-1",
                "user_id": "user-1",
                "input_text": "texto",
                "overall_label": "SUPPORTED",
                "summary": "ok",
                "model_version": "fever-stub-v0",
                "duration_ms": 10,
                "created_at": "2026-01-01T10:00:00Z",
                "saved_to_history": False,
                "saved_at": None,
            }]
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_runs" and method == "PATCH":
            return 200, []
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.post(
        "/verification-history/save",
        json={"run_id": "run-1"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 502, response.text
    assert "confirmar" in response.json()["detail"].lower()


def test_save_verification_history_entry_without_run_id(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        return 404, {}

    calls = []

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        calls.append((path, method, body))
        if path == "/rest/v1/verification_runs" and method == "POST":
            return 201, [{"id": "run-created", **(body or {})}]
        if path == "/rest/v1/verification_claims" and method == "POST":
            return 201, [{"id": "claim-created", **(body or {})}]
        if path == "/rest/v1/verification_evidences" and method == "POST":
            return 201, [{"id": "evidence-created", **(body or {})}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.post(
        "/verification-history/save",
        json={
            "input_text": "Texto largo que ya fue verificado y ahora se quiere guardar.",
            "report": {
                "veredicto_global": "SUPPORTED",
                "resumen": "ok",
                "model_version": "fever-stub-v0",
                "duracion_ms": 42,
                "claims": [
                    {
                        "texto": "afirmacion",
                        "veredicto": "SUPPORTED",
                        "confianza": 0.92,
                        "razonamiento": "basado en [1]",
                        "evidencias": [
                            {
                                "url": "https://example.org",
                                "titulo": "Example",
                                "snippet": "snippet",
                                "nli_label": "SUPPORTS",
                                "nli_score": 0.95,
                            }
                        ],
                    }
                ],
            },
        },
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"saved": True, "already_saved": False, "run_id": "run-created"}
    assert any(call[0] == "/rest/v1/verification_runs" and call[1] == "POST" for call in calls)
