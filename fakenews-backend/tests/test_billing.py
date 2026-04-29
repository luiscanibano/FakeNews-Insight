"""Tests del módulo billing: checkout, upgrade prorrateado, downgrade programado, cancel/resume y webhook idempotente."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple
from unittest.mock import MagicMock

import pytest

# Variables minimas requeridas por billing._ensure_stripe_config y supabase service config.
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_dummy")
os.environ.setdefault("STRIPE_PRICE_PRO", "price_pro_test")
os.environ.setdefault("STRIPE_PRICE_ULTRA", "price_ultra_test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "anon-test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-test")
os.environ.setdefault(
    "BILLING_SUCCESS_URL",
    "http://localhost:5173/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
)
os.environ.setdefault("BILLING_CANCEL_URL", "http://localhost:5173/dashboard?billing=cancel")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402  (debe cargarse antes de billing para evitar ciclo)
import billing  # noqa: E402

client = TestClient(main.app)

USER_ID = "00000000-0000-0000-0000-000000000001"
EMAIL = "user@test.dev"
AUTH_HEADER = {"Authorization": "Bearer fake-jwt"}


@pytest.fixture(autouse=True)
def _stub_auth(monkeypatch):
    """Bypassa la validacion JWT contra Supabase."""
    monkeypatch.setattr(
        billing,
        "_validate_user_with_supabase",
        lambda token: {"id": USER_ID, "email": EMAIL},
    )


class FakeProfile:
    """Estado mutable del perfil persistido, compartido entre stubs de Supabase."""

    def __init__(self, **overrides: Any) -> None:
        self.data: Dict[str, Any] = {
            "id": USER_ID,
            "plan": "free",
            "role": "user",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "stripe_subscription_status": None,
            "current_period_end": None,
            "scheduled_plan": None,
            "scheduled_plan_change_at": None,
            "cancel_at_period_end": False,
        }
        self.data.update(overrides)
        self.events: List[Dict[str, Any]] = []


@pytest.fixture
def fake_profile(monkeypatch) -> FakeProfile:
    """Stub completo del backend Supabase para billing."""
    state = FakeProfile()

    def _fake_service_request(
        path: str,
        *,
        method: str = "GET",
        query: Dict[str, str] | None = None,
        body: Dict[str, Any] | None = None,
        prefer: str | None = None,
    ) -> Tuple[int, Any]:
        if path.startswith("/rest/v1/profiles"):
            if method == "GET":
                if query and query.get("stripe_customer_id", "").startswith("eq."):
                    cust = query["stripe_customer_id"][3:]
                    if state.data.get("stripe_customer_id") == cust:
                        return 200, [{"id": state.data["id"]}]
                    return 200, []
                return 200, [dict(state.data)]
            if method == "PATCH":
                state.data.update(body or {})
                return 200, [dict(state.data)]
        if path.startswith("/rest/v1/billing_events") and method == "POST":
            event_id = (body or {}).get("stripe_event_id")
            if any(ev["stripe_event_id"] == event_id for ev in state.events):
                return 409, {"code": "23505"}
            state.events.append(dict(body or {}))
            return 201, None
        raise AssertionError(f"Llamada Supabase no esperada: {method} {path}")

    monkeypatch.setattr(billing, "_supabase_service_json_request", _fake_service_request)
    return state


@pytest.fixture
def stripe_mock(monkeypatch) -> MagicMock:
    """Reemplaza el cliente stripe del módulo billing por un MagicMock controlable."""
    mock = MagicMock()
    monkeypatch.setattr(billing, "stripe", mock)
    return mock


# ---------------------------------------------------------------------------
# /billing/snapshot
# ---------------------------------------------------------------------------

def test_snapshot_returns_free_for_new_user(fake_profile, stripe_mock):
    response = client.get("/billing/snapshot", headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "free"
    assert data["scheduled_plan"] is None
    assert data["cancel_at_period_end"] is False


# ---------------------------------------------------------------------------
# /billing/checkout
# ---------------------------------------------------------------------------

def test_checkout_creates_session_when_no_subscription(fake_profile, stripe_mock):
    stripe_mock.Customer.create.return_value = {"id": "cus_new"}
    stripe_mock.checkout.Session.create.return_value = {
        "id": "cs_test_1",
        "url": "https://checkout.stripe.test/cs_test_1",
    }

    response = client.post("/billing/checkout", json={"plan": "pro"}, headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "checkout"
    assert body["checkout_url"].startswith("https://checkout.stripe.test/")
    assert body["session_id"] == "cs_test_1"
    assert fake_profile.data["stripe_customer_id"] == "cus_new"

    call_kwargs = stripe_mock.checkout.Session.create.call_args.kwargs
    assert call_kwargs["mode"] == "subscription"
    assert call_kwargs["customer"] == "cus_new"
    assert call_kwargs["line_items"][0]["price"] == "price_pro_test"
    assert call_kwargs["client_reference_id"] == USER_ID


def test_checkout_upgrade_pro_to_ultra_is_prorated(fake_profile, stripe_mock):
    fake_profile.data.update(
        {
            "plan": "pro",
            "stripe_customer_id": "cus_existing",
            "stripe_subscription_id": "sub_123",
            "stripe_subscription_status": "active",
        }
    )

    stripe_mock.Subscription.retrieve.return_value = {
        "id": "sub_123",
        "items": {"data": [{"id": "si_1", "price": {"id": "price_pro_test"}}]},
        "current_period_end": 1_900_000_000,
    }
    stripe_mock.Subscription.modify.return_value = {
        "id": "sub_123",
        "status": "active",
        "current_period_end": 1_900_000_000,
    }

    response = client.post("/billing/checkout", json={"plan": "ultra"}, headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "upgraded"
    assert body["plan"] == "ultra"
    assert body["prorated"] is True

    modify_kwargs = stripe_mock.Subscription.modify.call_args.kwargs
    assert modify_kwargs["proration_behavior"] == "create_prorations"
    assert modify_kwargs["payment_behavior"] == "error_if_incomplete"
    assert modify_kwargs["items"][0]["price"] == "price_ultra_test"
    assert fake_profile.data["plan"] == "ultra"


def test_checkout_downgrade_ultra_to_pro_is_scheduled(fake_profile, stripe_mock):
    fake_profile.data.update(
        {
            "plan": "ultra",
            "stripe_customer_id": "cus_existing",
            "stripe_subscription_id": "sub_456",
            "stripe_subscription_status": "active",
        }
    )

    stripe_mock.Subscription.retrieve.return_value = {
        "id": "sub_456",
        "items": {"data": [{"id": "si_2", "price": {"id": "price_ultra_test"}}]},
        "current_period_start": 1_800_000_000,
        "current_period_end": 1_900_000_000,
    }
    stripe_mock.SubscriptionSchedule.create.return_value = {"id": "sub_sched_1"}
    stripe_mock.SubscriptionSchedule.modify.return_value = {"id": "sub_sched_1"}

    response = client.post("/billing/checkout", json={"plan": "pro"}, headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "scheduled_downgrade"
    assert body["plan"] == "ultra"
    assert body["scheduled_plan"] == "pro"
    assert body["scheduled_plan_change_at"] is not None
    assert fake_profile.data["plan"] == "ultra"
    assert fake_profile.data["scheduled_plan"] == "pro"


def test_checkout_rejects_same_plan(fake_profile, stripe_mock):
    fake_profile.data["plan"] = "pro"
    fake_profile.data["stripe_subscription_id"] = "sub_keep"
    response = client.post("/billing/checkout", json={"plan": "pro"}, headers=AUTH_HEADER)
    assert response.status_code == 409


def test_checkout_rejects_invalid_plan(fake_profile, stripe_mock):
    response = client.post("/billing/checkout", json={"plan": "free"}, headers=AUTH_HEADER)
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# /billing/cancel y /billing/resume
# ---------------------------------------------------------------------------

def test_cancel_marks_subscription_at_period_end(fake_profile, stripe_mock):
    fake_profile.data.update(
        {
            "plan": "pro",
            "stripe_customer_id": "cus_x",
            "stripe_subscription_id": "sub_x",
        }
    )
    stripe_mock.Subscription.modify.return_value = {
        "id": "sub_x",
        "status": "active",
        "current_period_end": 1_900_000_000,
    }

    response = client.post("/billing/cancel", headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "scheduled_cancel"
    assert body["scheduled_plan"] == "free"
    assert body["days_remaining"] is not None
    stripe_mock.Subscription.modify.assert_called_once_with("sub_x", cancel_at_period_end=True)
    assert fake_profile.data["cancel_at_period_end"] is True


def test_resume_clears_cancel_flag(fake_profile, stripe_mock):
    fake_profile.data.update(
        {
            "plan": "pro",
            "stripe_subscription_id": "sub_y",
            "cancel_at_period_end": True,
            "scheduled_plan": "free",
        }
    )
    stripe_mock.Subscription.modify.return_value = {"id": "sub_y", "status": "active"}

    response = client.post("/billing/resume", headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "resumed"
    stripe_mock.Subscription.modify.assert_called_once_with("sub_y", cancel_at_period_end=False)
    assert fake_profile.data["cancel_at_period_end"] is False


# ---------------------------------------------------------------------------
# /billing/portal
# ---------------------------------------------------------------------------

def test_portal_returns_session_url(fake_profile, stripe_mock):
    fake_profile.data["stripe_customer_id"] = "cus_portal"
    stripe_mock.billing_portal.Session.create.return_value = {
        "url": "https://portal.stripe.test/session_1"
    }

    response = client.post("/billing/portal", headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    assert response.json()["url"].startswith("https://portal.stripe.test/")


# ---------------------------------------------------------------------------
# /billing/webhook
# ---------------------------------------------------------------------------

def test_webhook_rejects_invalid_signature(fake_profile, stripe_mock):
    stripe_mock.error.SignatureVerificationError = Exception
    stripe_mock.Webhook.construct_event.side_effect = Exception("bad sig")

    response = client.post(
        "/billing/webhook",
        data=b"{}",
        headers={"stripe-signature": "t=1,v1=bad"},
    )
    assert response.status_code == 400


def test_webhook_processes_subscription_updated_once(fake_profile, stripe_mock):
    fake_profile.data["stripe_customer_id"] = "cus_w"
    event = {
        "id": "evt_1",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_w",
                "customer": "cus_w",
                "status": "active",
                "cancel_at_period_end": False,
                "current_period_end": 1_900_000_000,
                "items": {"data": [{"id": "si", "price": {"id": "price_ultra_test"}}]},
            }
        },
    }
    stripe_mock.error.SignatureVerificationError = Exception
    stripe_mock.Webhook.construct_event.return_value = event

    body = b'{"id":"evt_1"}'
    headers = {"stripe-signature": "t=1,v1=ok"}

    first = client.post("/billing/webhook", content=body, headers=headers)
    assert first.status_code == 200
    assert first.json() == {"received": True}
    assert fake_profile.data["plan"] == "ultra"

    fake_profile.data["plan"] = "free"
    second = client.post("/billing/webhook", content=body, headers=headers)
    assert second.status_code == 200
    assert second.json()["duplicate"] is True
    # No vuelve a aplicarse el efecto al ser duplicado.
    assert fake_profile.data["plan"] == "free"


def test_webhook_subscription_deleted_returns_to_free(fake_profile, stripe_mock):
    fake_profile.data.update(
        {
            "plan": "pro",
            "stripe_customer_id": "cus_d",
            "stripe_subscription_id": "sub_d",
        }
    )
    event = {
        "id": "evt_del_1",
        "type": "customer.subscription.deleted",
        "data": {"object": {"id": "sub_d", "customer": "cus_d"}},
    }
    stripe_mock.error.SignatureVerificationError = Exception
    stripe_mock.Webhook.construct_event.return_value = event

    response = client.post(
        "/billing/webhook",
        content=b'{"id":"evt_del_1"}',
        headers={"stripe-signature": "t=1,v1=ok"},
    )
    assert response.status_code == 200
    assert fake_profile.data["plan"] == "free"
    assert fake_profile.data["stripe_subscription_id"] is None


def test_billing_routes_are_registered():
    paths = {route.path for route in main.app.routes}
    for expected in (
        "/billing/snapshot",
        "/billing/checkout",
        "/billing/cancel",
        "/billing/resume",
        "/billing/confirm",
        "/billing/portal",
        "/billing/webhook",
    ):
        assert expected in paths
