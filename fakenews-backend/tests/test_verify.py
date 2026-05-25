"""Tests del endpoint /verify (agente FEVER) con dependencias mockeadas."""

from __future__ import annotations

from typing import Any, Dict, List

import pytest
from fastapi import HTTPException
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


def _fake_enqueue_verification_job(*, run_id, user_id, jwt_token, text, quota):
    return {
        "job_id": f"job-for-{run_id}",
        "status": "pending",
    }


def _fake_enqueue_csv_batch_job(*, batch_id, user_id, jwt_token, rows, quota):
    return {
        "job_id": f"job-for-{batch_id}",
        "status": "pending",
    }


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
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    data = response.json()
    assert data["status"] == "pending"
    assert data["run_type"] == "text"
    assert data["daily_limit"] == 200
    assert data["remaining_today"] == 199
    assert data["run_id"] == "row-1"
    assert data["job_id"] == "job-for-row-1"
    assert data["result"] is None


def test_verify_returns_verdict_for_pro_with_plan_limits(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "pro",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 202, response.text
    data = response.json()
    assert data["plan"] == "pro"
    assert data["daily_limit"] == 50
    assert data["max_claims"] == 3
    assert data["max_evidences"] == 3
    assert data["status"] == "pending"


def test_verify_ignores_stale_persisted_limit_and_repairs_profile(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "free",
        "daily_verification_limit": 20,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    data = response.json()
    assert data["plan"] == "free"
    assert data["daily_limit"] == 5
    assert data["remaining_today"] == 4

    profile_patch = next(
        body
        for path, method, _query, body in spy.calls
        if path == "/rest/v1/profiles" and method == "PATCH"
    )
    assert profile_patch["daily_verification_limit"] == 5


def test_verify_returns_verdict_for_ultra_with_plan_limits(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1", "plan": "ultra",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )
    assert response.status_code == 202, response.text
    data = response.json()
    assert data["plan"] == "ultra"
    assert data["daily_limit"] == 200
    assert data["max_claims"] == 8
    assert data["max_evidences"] == 5
    assert data["status"] == "pending"


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
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    assert response.json()["run_id"] == "row-1"


def test_verify_enqueues_async_job_and_returns_pending_status(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "ultra",
        "daily_verification_limit": 10,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })

    enqueued_calls = []

    def _enqueue_verification_job(*, run_id, user_id, jwt_token, text, quota):
        enqueued_calls.append({
            "run_id": run_id,
            "user_id": user_id,
            "jwt_token": jwt_token,
            "text": text,
            "quota": quota,
        })
        return {"job_id": "job-123", "status": "pending"}

    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    data = response.json()
    assert data["run_id"] == "row-1"
    assert data["job_id"] == "job-123"
    assert data["status"] == "pending"
    assert data["max_claims"] == 8
    assert data["max_evidences"] == 5
    assert data["result"] is None
    assert len(enqueued_calls) == 1
    assert enqueued_calls[0]["text"] == VALID_TEXT


def test_verify_status_returns_completed_result(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [{
                "id": "run-1",
                "user_id": "user-1",
                "input_text": VALID_TEXT,
                "run_type": "text",
                "source_url": None,
                "source_title": None,
                "batch_id": None,
                "batch_row_index": None,
                "input_origin": None,
                "overall_label": "SUPPORTED",
                "summary": "ok",
                "model_version": "fever-stub-v0",
                "duration_ms": 10,
                "created_at": "2026-01-01T10:00:00Z",
                "saved_to_history": False,
                "saved_at": None,
                "status": "completed",
                "job_id": "job-1",
                "started_at": "2026-01-01T10:00:01Z",
                "completed_at": "2026-01-01T10:00:10Z",
                "error_message": None,
                "selected_claims": 1,
            }]
        if path == "/rest/v1/verification_claims" and method == "GET":
            return 200, [{
                "id": "claim-1",
                "claim_text": "afirmacion de prueba",
                "label": "SUPPORTED",
                "confidence": 0.9,
                "rationale": "basado en [1]",
                "position": 0,
            }]
        if path == "/rest/v1/verification_evidences" and method == "GET":
            return 200, [{
                "url": "https://x",
                "title": "t",
                "snippet": "evidencia",
                "nli_label": "SUPPORTS",
                "nli_score": 0.9,
                "position": 0,
            }]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)

    response = client.get(
        "/verify/run-1",
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["run_id"] == "run-1"
    assert data["status"] == "completed"
    assert data["run_type"] == "text"
    assert data["error"] is None
    assert data["result"]["run_type"] == "text"
    assert data["result"]["overall_label"] == "SUPPORTED"
    assert data["result"]["selected_claims"] == 1
    assert data["result"]["claims"][0]["evidencias"][0]["nli_label"] == "SUPPORTS"


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
        "daily_verification_used": 200,
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
    assert "/verify/url" in paths
    assert "/verify/csv" in paths


def test_verify_url_enqueues_async_job_with_extracted_content(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "pro",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })

    captured_enqueue = {}

    def _enqueue_verification_job(*, run_id, user_id, jwt_token, text, quota):
        captured_enqueue.update({
            "run_id": run_id,
            "user_id": user_id,
            "jwt_token": jwt_token,
            "text": text,
            "quota": quota,
        })
        return {"job_id": "job-url-1", "status": "pending"}

    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _enqueue_verification_job)
    monkeypatch.setattr(
        main,
        "_extract_verification_input_from_url",
        lambda *, url, max_chars: {
            "input_text": VALID_TEXT,
            "source_url": url,
            "source_title": "Articulo de prueba",
        },
    )

    response = client.post(
        "/verify/url",
        json={"url": "https://example.org/noticia"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    data = response.json()
    assert data["run_type"] == "url"
    assert data["source_url"] == "https://example.org/noticia"
    assert data["source_title"] == "Articulo de prueba"
    assert data["daily_limit"] == 50
    assert data["remaining_today"] == 49
    assert captured_enqueue["text"] == VALID_TEXT

    creation_body = next(
        body
        for path, method, _query, body in spy.calls
        if path == "/rest/v1/verification_runs" and method == "POST"
    )
    assert creation_body["run_type"] == "url"
    assert creation_body["source_url"] == "https://example.org/noticia"
    assert creation_body["source_title"] == "Articulo de prueba"


def test_verify_url_rejects_invalid_source_without_consuming_quota(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "free",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })

    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(
        main,
        "_extract_verification_input_from_url",
        lambda *, url, max_chars: (_ for _ in ()).throw(
            HTTPException(status_code=400, detail="Debes indicar una URL HTTP o HTTPS valida.")
        ),
    )

    response = client.post(
        "/verify/url",
        json={"url": "nota-local"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 400
    assert "url http o https valida" in response.json()["detail"].lower()
    assert not any(call[0] == "/rest/v1/profiles" and call[1] == "PATCH" for call in spy.calls)


def test_verify_status_returns_source_metadata_for_url_runs(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [{
                "id": "run-url-1",
                "user_id": "user-1",
                "input_text": VALID_TEXT,
                "run_type": "url",
                "source_url": "https://example.org/noticia",
                "source_title": "Articulo remoto",
                "batch_id": None,
                "batch_row_index": None,
                "input_origin": None,
                "overall_label": "SUPPORTED",
                "summary": "ok",
                "model_version": "fever-stub-v0",
                "duration_ms": 10,
                "created_at": "2026-01-01T10:00:00Z",
                "saved_to_history": False,
                "saved_at": None,
                "status": "completed",
                "job_id": "job-url-1",
                "started_at": "2026-01-01T10:00:01Z",
                "completed_at": "2026-01-01T10:00:10Z",
                "error_message": None,
                "selected_claims": 1,
            }]
        if path == "/rest/v1/verification_claims" and method == "GET":
            return 200, [{
                "id": "claim-1",
                "claim_text": "afirmacion de prueba",
                "label": "SUPPORTED",
                "confidence": 0.9,
                "rationale": "basado en [1]",
                "position": 0,
            }]
        if path == "/rest/v1/verification_evidences" and method == "GET":
            return 200, [{
                "url": "https://x",
                "title": "t",
                "snippet": "evidencia",
                "nli_label": "SUPPORTS",
                "nli_score": 0.9,
                "position": 0,
            }]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)

    response = client.get(
        "/verify/run-url-1",
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["run_type"] == "url"
    assert data["source_url"] == "https://example.org/noticia"
    assert data["source_title"] == "Articulo remoto"
    assert data["result"]["run_type"] == "url"
    assert data["result"]["source_url"] == "https://example.org/noticia"
    assert data["result"]["source_title"] == "Articulo remoto"


def test_verify_csv_enqueues_batch_and_reserves_quota(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "free",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_csv_batch_job", _fake_enqueue_csv_batch_job)
    monkeypatch.setattr(
        main,
        "_parse_verification_csv_file",
        lambda *, file_bytes, filename, max_chars: {
            "filename": filename,
            "rows": [
                {"row_index": 1, "input_text": VALID_TEXT},
                {"row_index": 2, "input_text": VALID_TEXT},
            ],
        },
    )

    response = client.post(
        "/verify/csv",
        files={"file": ("lote.csv", b"texto\nuno\ndos\n", "text/csv")},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    data = response.json()
    assert data["status"] == "pending"
    assert data["total_rows"] == 2
    assert data["daily_limit"] == 5
    assert data["remaining_today"] == 3
    assert data["job_id"] == "job-for-row-1"

    profile_patch = next(
        body
        for path, method, _query, body in spy.calls
        if path == "/rest/v1/profiles" and method == "PATCH"
    )
    assert profile_patch["daily_verification_used"] == 2

    batch_creation_body = next(
        body
        for path, method, _query, body in spy.calls
        if path == "/rest/v1/verification_batches" and method == "POST"
    )
    assert batch_creation_body["total_rows"] == 2


def test_verify_csv_rejects_invalid_file_without_consuming_quota(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "free",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(
        main,
        "_parse_verification_csv_file",
        lambda *, file_bytes, filename, max_chars: (_ for _ in ()).throw(
            HTTPException(status_code=400, detail="El CSV debe contener exactamente una columna de texto para contrastar.")
        ),
    )

    response = client.post(
        "/verify/csv",
        files={"file": ("lote.csv", b"texto,url\nuno,dos\n", "text/csv")},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 400
    assert "exactamente una columna" in response.json()["detail"].lower()
    assert not any(call[0] == "/rest/v1/profiles" and call[1] == "PATCH" for call in spy.calls)


def test_verify_csv_status_returns_batch_items(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_batches" and method == "GET":
            return 200, [{
                "id": "batch-1",
                "user_id": "user-1",
                "filename": "lote.csv",
                "status": "completed",
                "job_id": "job-batch-1",
                "total_rows": 2,
                "processed_rows": 2,
                "success_rows": 1,
                "failed_rows": 1,
                "error_message": None,
                "input_origin": None,
                "created_at": "2026-01-01T10:00:00Z",
                "started_at": "2026-01-01T10:00:01Z",
                "completed_at": "2026-01-01T10:00:10Z",
            }]
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 200, [
                {
                    "id": "run-csv-1",
                    "run_type": "csv",
                    "batch_row_index": 1,
                    "status": "completed",
                    "overall_label": "SUPPORTED",
                    "summary": "ok",
                    "error_message": None,
                    "source_url": None,
                    "source_title": None,
                    "selected_claims": 1,
                    "created_at": "2026-01-01T10:00:02Z",
                },
                {
                    "id": "run-csv-2",
                    "run_type": "csv",
                    "batch_row_index": 2,
                    "status": "failed",
                    "overall_label": "NOT_ENOUGH_INFO",
                    "summary": "",
                    "error_message": "Fila demasiado corta",
                    "source_url": None,
                    "source_title": None,
                    "selected_claims": None,
                    "created_at": "2026-01-01T10:00:03Z",
                },
            ]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)

    response = client.get(
        "/verify/csv/batch-1",
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["batch_id"] == "batch-1"
    assert data["status"] == "completed"
    assert data["total_rows"] == 2
    assert data["items"][0]["run_type"] == "csv"
    assert data["items"][0]["row_index"] == 1
    assert data["items"][1]["status"] == "failed"
    assert "corta" in data["items"][1]["error"].lower()


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


def test_delete_csv_batch_history_entry(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_batches" and method == "GET":
            return 200, [{
                "id": "batch-1",
                "user_id": "user-1",
                "filename": "lote.csv",
                "status": "completed",
                "saved_to_history": True,
            }]
        if path == "/rest/v1/verification_runs" and method == "GET":
            return 404, {}
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_batches" and method == "DELETE":
            return 200, [{"id": "batch-1"}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.delete(
        "/verification-history/batch-1",
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"deleted": True, "batch_id": "batch-1"}


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


def test_save_verification_history_entry_from_extension_marks_input_origin(monkeypatch):
    patch_calls = []

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
                "input_origin": None,
            }]
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_runs" and method == "PATCH":
            patch_calls.append(body or {})
            return 200, [{"id": "run-1", "user_id": "user-1", **(body or {})}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.post(
        "/verification-history/save",
        json={"run_id": "run-1"},
        headers={
            "Authorization": "Bearer faketoken",
            "Origin": "chrome-extension://abcdefghijklmnopqrstuvwxyzaabbcc",
        },
    )

    assert response.status_code == 200, response.text
    assert any(call.get("input_origin") == "extension" for call in patch_calls)


def test_save_csv_batch_history_entry(monkeypatch):
    def _supabase_json_request(path, *, method="GET", jwt_token="", query=None,
                               body=None, prefer=None):
        if path == "/auth/v1/user":
            return 200, {"id": "user-1", "email": "u@example.com"}
        if path == "/rest/v1/verification_batches" and method == "GET":
            return 200, [{
                "id": "batch-1",
                "user_id": "user-1",
                "filename": "lote.csv",
                "status": "completed",
                "saved_to_history": False,
                "saved_at": None,
            }]
        return 404, {}

    def _supabase_service_json_request(path, *, method="GET", query=None,
                                       body=None, prefer=None):
        if path == "/rest/v1/verification_batches" and method == "PATCH":
            return 200, [{"id": "batch-1", "user_id": "user-1", **(body or {})}]
        return 404, {}

    monkeypatch.setattr(main, "_supabase_json_request", _supabase_json_request)
    monkeypatch.setattr(main, "_supabase_service_json_request", _supabase_service_json_request)

    response = client.post(
        "/verification-history/save",
        json={"batch_id": "batch-1"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"saved": True, "already_saved": False, "batch_id": "batch-1"}


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


def test_verify_persists_text_run_type_on_creation(monkeypatch):
    spy = _SupabaseSpy(profile={
        "id": "user-1",
        "plan": "free",
        "daily_verification_limit": None,
        "daily_verification_used": 0,
        "daily_verification_date": None,
    })
    monkeypatch.setattr(main, "_supabase_json_request", spy)
    monkeypatch.setattr(main, "_supabase_service_json_request", spy.service_call)
    monkeypatch.setattr(main, "_enqueue_verification_job", _fake_enqueue_verification_job)

    response = client.post(
        "/verify",
        json={"texto": VALID_TEXT},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 202, response.text
    creation_body = next(
        body
        for path, method, _query, body in spy.calls
        if path == "/rest/v1/verification_runs" and method == "POST"
    )
    assert creation_body["run_type"] == "text"
