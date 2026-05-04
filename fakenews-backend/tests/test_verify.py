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
    response = client.post("/verify", json={"texto": "texto suficientemente largo"})
    assert response.status_code == 401


def test_verify_returns_verdict_for_super_pro(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "super_pro",
        "daily_verification_limit": 10,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": "texto suficientemente largo para verificar"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["veredicto_global"] == "SUPPORTED"
    assert data["limite_diario"] == 10
    assert data["verificaciones_restantes_hoy"] == 9
    assert len(data["claims"]) == 1
    assert data["claims"][0]["evidencias"][0]["nli_label"] == "SUPPORTS"


def test_verify_rejects_non_super_pro_plan(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "pro",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    import fever_runtime
    fever_runtime.set_verification_agent(_make_agent())

    response = client.post(
        "/verify",
        json={"texto": "texto suficientemente largo"},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 403


def test_verify_rejects_short_text(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "super_pro",
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


def test_verify_blocks_when_quota_exhausted(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "super_pro",
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
        json={"texto": "texto suficientemente largo"},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 403
    assert "limite" in response.json()["detail"].lower()


def test_verify_endpoint_is_registered():
    paths = {route.path for route in main.app.routes}
    assert "/verify" in paths
