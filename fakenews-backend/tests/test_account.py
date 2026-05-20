from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def test_account_delete_requires_delete_confirmation(monkeypatch):
    monkeypatch.setattr(
        main,
        "_validate_user_with_supabase",
        lambda token: {"id": "user-1", "email": "u@example.com"},
    )

    side_effects = []

    def _cancel_active_subscription_before_account_delete(user_id):
        side_effects.append(("cancel", user_id))

    def _delete_supabase_user_with_admin(user_id):
        side_effects.append(("delete", user_id))

    monkeypatch.setattr(
        main,
        "_cancel_active_subscription_before_account_delete",
        _cancel_active_subscription_before_account_delete,
    )
    monkeypatch.setattr(main, "_delete_supabase_user_with_admin", _delete_supabase_user_with_admin)

    response = client.post(
        "/account/delete",
        json={"confirmation": "cancelar"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 400
    assert "eliminacion" in response.json()["detail"].lower()
    assert side_effects == []


def test_account_delete_removes_authenticated_user(monkeypatch):
    monkeypatch.setattr(
        main,
        "_validate_user_with_supabase",
        lambda token: {"id": "user-1", "email": "u@example.com"},
    )

    side_effects = []

    def _cancel_active_subscription_before_account_delete(user_id):
        side_effects.append(("cancel", user_id))

    def _delete_supabase_user_with_admin(user_id):
        side_effects.append(("delete", user_id))

    monkeypatch.setattr(
        main,
        "_cancel_active_subscription_before_account_delete",
        _cancel_active_subscription_before_account_delete,
    )
    monkeypatch.setattr(main, "_delete_supabase_user_with_admin", _delete_supabase_user_with_admin)

    response = client.post(
        "/account/delete",
        json={"confirmation": "DELETE"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"deleted": True, "user_id": "user-1"}
    assert side_effects == [("cancel", "user-1"), ("delete", "user-1")]


def test_account_delete_stops_when_subscription_cancel_fails(monkeypatch):
    monkeypatch.setattr(
        main,
        "_validate_user_with_supabase",
        lambda token: {"id": "user-1", "email": "u@example.com"},
    )

    delete_calls = []

    def _cancel_active_subscription_before_account_delete(user_id):
        raise main.HTTPException(
            status_code=502,
            detail="No se pudo cancelar la suscripcion activa antes de eliminar la cuenta.",
        )

    def _delete_supabase_user_with_admin(user_id):
        delete_calls.append(user_id)

    monkeypatch.setattr(
        main,
        "_cancel_active_subscription_before_account_delete",
        _cancel_active_subscription_before_account_delete,
    )
    monkeypatch.setattr(main, "_delete_supabase_user_with_admin", _delete_supabase_user_with_admin)

    response = client.post(
        "/account/delete",
        json={"confirmation": "DELETE"},
        headers={"Authorization": "Bearer faketoken"},
    )

    assert response.status_code == 502
    assert "suscripcion activa" in response.json()["detail"].lower()
    assert delete_calls == []