"""
@file billing.py
@description Endpoints de facturacion con Stripe: checkout, upgrade prorrateado, downgrade/cancel programado, snapshot, customer portal y webhook con idempotencia.
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

import stripe

from main import (
    _ensure_supabase_service_config,
    _extract_bearer_token,
    _extract_detail,
    _supabase_json_request,
    _supabase_service_json_request,
    _validate_user_with_supabase,
)


# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO", "").strip()
STRIPE_PRICE_ULTRA = os.getenv("STRIPE_PRICE_ULTRA", "").strip()
STRIPE_PRICE_SUPER_PRO = os.getenv("STRIPE_PRICE_SUPER_PRO", "").strip()
BILLING_SUCCESS_URL = os.getenv(
    "BILLING_SUCCESS_URL",
    "http://localhost:5173/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
).strip()
BILLING_CANCEL_URL = os.getenv(
    "BILLING_CANCEL_URL",
    "http://localhost:5173/dashboard?billing=cancel",
).strip()
BILLING_PORTAL_RETURN_URL = os.getenv(
    "BILLING_PORTAL_RETURN_URL",
    "http://localhost:5173/dashboard",
).strip()

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


PLAN_FREE = "free"
PLAN_PRO = "pro"
PLAN_ULTRA = "ultra"
PLAN_SUPER_PRO = "super_pro"

PLAN_ORDER = {PLAN_FREE: 0, PLAN_PRO: 1, PLAN_ULTRA: 2, PLAN_SUPER_PRO: 3}
PAID_PLANS = {PLAN_PRO, PLAN_ULTRA, PLAN_SUPER_PRO}

# Planes con acceso al agente de verificacion FEVER (/verify).
PLANS_WITH_VERIFY = {PLAN_SUPER_PRO}


def _price_for_plan(plan: str) -> str:
    """Devuelve el price_id de Stripe configurado para el plan dado."""
    if plan == PLAN_PRO:
        return STRIPE_PRICE_PRO
    if plan == PLAN_ULTRA:
        return STRIPE_PRICE_ULTRA
    if plan == PLAN_SUPER_PRO:
        return STRIPE_PRICE_SUPER_PRO
    raise HTTPException(status_code=400, detail=f"Plan no soportado para Stripe: {plan}")


def _plan_for_price(price_id: Optional[str]) -> Optional[str]:
    """Inversa de _price_for_plan: traduce price_id a clave de plan local."""
    if not price_id:
        return None
    if STRIPE_PRICE_PRO and price_id == STRIPE_PRICE_PRO:
        return PLAN_PRO
    if STRIPE_PRICE_ULTRA and price_id == STRIPE_PRICE_ULTRA:
        return PLAN_ULTRA
    if STRIPE_PRICE_SUPER_PRO and price_id == STRIPE_PRICE_SUPER_PRO:
        return PLAN_SUPER_PRO
    return None


def _ensure_stripe_config() -> None:
    """Valida configuracion mínima de Stripe antes de operar."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Falta STRIPE_SECRET_KEY en backend.")
    if not STRIPE_PRICE_PRO or not STRIPE_PRICE_ULTRA:
        raise HTTPException(
            status_code=500,
            detail="Faltan STRIPE_PRICE_PRO o STRIPE_PRICE_ULTRA en backend.",
        )


# ---------------------------------------------------------------------------
# Helpers de perfil (usan service_role para no depender de RLS del usuario)
# ---------------------------------------------------------------------------

PROFILE_SELECT = (
    "id,plan,role,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,"
    "current_period_end,scheduled_plan,scheduled_plan_change_at,cancel_at_period_end"
)


def _load_profile_with_service(user_id: str) -> Dict[str, Any]:
    """Carga el perfil completo usando service role (saltando RLS)."""
    status, payload = _supabase_service_json_request(
        "/rest/v1/profiles",
        method="GET",
        query={"id": f"eq.{user_id}", "select": PROFILE_SELECT, "limit": "1"},
    )
    if status != 200:
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, f"No se pudo cargar el perfil (status={status})."),
        )
    if not isinstance(payload, list) or not payload:
        raise HTTPException(
            status_code=404,
            detail=f"No existe un perfil para el usuario {user_id}.",
        )
    return payload[0]


def _patch_profile_with_service(user_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Actualiza columnas restringidas del perfil usando service role."""
    status, payload = _supabase_service_json_request(
        "/rest/v1/profiles",
        method="PATCH",
        query={"id": f"eq.{user_id}"},
        body=body,
        prefer="return=representation",
    )
    if status not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo actualizar el perfil del usuario."),
        )
    if isinstance(payload, list) and payload:
        return payload[0]
    return body


def _resolve_user_email(user_payload: Dict[str, Any]) -> Optional[str]:
    """Extrae email verificado del payload de usuario de Supabase Auth."""
    email = user_payload.get("email")
    if isinstance(email, str) and email.strip():
        return email.strip()
    return None


def _get_or_create_stripe_customer(
    *, profile: Dict[str, Any], user_id: str, email: Optional[str]
) -> str:
    """Reutiliza el stripe_customer_id existente o crea uno nuevo enlazado al perfil."""
    existing = profile.get("stripe_customer_id")
    if isinstance(existing, str) and existing.strip():
        return existing.strip()

    customer = stripe.Customer.create(
        email=email,
        metadata={"supabase_user_id": user_id},
    )
    customer_id = customer["id"]
    _patch_profile_with_service(user_id, {"stripe_customer_id": customer_id})
    return customer_id


# ---------------------------------------------------------------------------
# Helpers temporales
# ---------------------------------------------------------------------------

def _epoch_to_iso(epoch: Optional[int]) -> Optional[str]:
    """Convierte epoch en segundos (Stripe) a ISO-8601 UTC para columnas timestamptz."""
    if epoch is None:
        return None
    try:
        return datetime.fromtimestamp(int(epoch), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _subscription_period(subscription: Dict[str, Any]) -> Tuple[Optional[int], Optional[int]]:
    """Devuelve (current_period_start, current_period_end) compatible con APIs Stripe pre/post 2024-09-30.

    En APIs nuevas estos campos estan a nivel de item, no de suscripcion.
    """
    start = subscription.get("current_period_start")
    end = subscription.get("current_period_end")
    if start and end:
        return start, end
    items = subscription.get("items", {}).get("data", []) or []
    if items:
        item = items[0]
        return item.get("current_period_start") or start, item.get("current_period_end") or end
    return start, end


def _iso_to_days_remaining(iso_value: Optional[str]) -> Optional[int]:
    """Devuelve días enteros restantes hasta la fecha ISO indicada (0 si ya pasó)."""
    if not iso_value:
        return None
    try:
        dt = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = dt - datetime.now(timezone.utc)
    return max(0, math.ceil(diff.total_seconds() / 86400))


def _build_snapshot(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Calcula el snapshot que consume el frontend a partir del perfil persistido."""
    scheduled_at = profile.get("scheduled_plan_change_at")
    period_end = profile.get("current_period_end")
    days_remaining = _iso_to_days_remaining(scheduled_at) if scheduled_at else _iso_to_days_remaining(period_end)
    return {
        "plan": profile.get("plan") or PLAN_FREE,
        "scheduled_plan": profile.get("scheduled_plan"),
        "scheduled_plan_change_at": scheduled_at,
        "current_period_end": period_end,
        "cancel_at_period_end": bool(profile.get("cancel_at_period_end")),
        "stripe_customer_id": profile.get("stripe_customer_id"),
        "stripe_subscription_id": profile.get("stripe_subscription_id"),
        "stripe_subscription_status": profile.get("stripe_subscription_status"),
        "days_remaining": days_remaining,
    }


# ---------------------------------------------------------------------------
# Auth wrapper local
# ---------------------------------------------------------------------------

def _require_authenticated_user(authorization: Optional[str]) -> Tuple[str, Optional[str]]:
    """Resuelve user_id (+email) desde la cabecera Authorization Bearer."""
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Falta el token JWT en la cabecera Authorization.")

    user_payload = _validate_user_with_supabase(token)
    user_id = str(user_payload.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="No se pudo validar la identidad del usuario.")
    return user_id, _resolve_user_email(user_payload)


# ---------------------------------------------------------------------------
# Idempotencia de webhooks
# ---------------------------------------------------------------------------

def _record_billing_event(event_id: str, event_type: str, payload: Any) -> bool:
    """Inserta el evento en billing_events; devuelve False si ya estaba registrado."""
    status, body = _supabase_service_json_request(
        "/rest/v1/billing_events",
        method="POST",
        body={
            "stripe_event_id": event_id,
            "type": event_type,
            "payload": payload,
        },
        prefer="return=minimal,resolution=ignore-duplicates",
    )
    if status in (200, 201, 204):
        return True
    if status == 409:
        return False
    if isinstance(body, dict) and body.get("code") == "23505":
        return False
    raise HTTPException(
        status_code=502,
        detail=_extract_detail(body, "No se pudo registrar el evento de facturación."),
    )


# ---------------------------------------------------------------------------
# Modelos de request
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    plan: str


class ConfirmRequest(BaseModel):
    session_id: str


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/snapshot")
def billing_snapshot(authorization: Optional[str] = Header(default=None)):
    """Devuelve el estado de suscripción actual del usuario autenticado."""
    user_id, _ = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    profile = _load_profile_with_service(user_id)
    return _build_snapshot(profile)


@router.post("/checkout")
def billing_checkout(
    payload: CheckoutRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Inicia checkout, programa downgrade o aplica upgrade prorrateado segun el caso."""
    user_id, email = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    _ensure_stripe_config()

    target_plan = (payload.plan or "").strip().lower()
    if target_plan not in PAID_PLANS:
        raise HTTPException(status_code=400, detail="El plan objetivo debe ser 'pro' o 'ultra'.")

    profile = _load_profile_with_service(user_id)
    current_plan = (profile.get("plan") or PLAN_FREE).lower()
    subscription_id = profile.get("stripe_subscription_id")

    if target_plan == current_plan and not profile.get("scheduled_plan"):
        raise HTTPException(status_code=409, detail="Ya tienes ese plan activo.")

    customer_id = _get_or_create_stripe_customer(profile=profile, user_id=user_id, email=email)
    target_price = _price_for_plan(target_plan)

    # Caso 1: sin suscripcion activa -> Stripe Checkout hospedado
    if not subscription_id:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": target_price, "quantity": 1}],
            client_reference_id=user_id,
            success_url=BILLING_SUCCESS_URL,
            cancel_url=BILLING_CANCEL_URL,
            metadata={"supabase_user_id": user_id, "target_plan": target_plan},
            subscription_data={
                "metadata": {"supabase_user_id": user_id, "target_plan": target_plan}
            },
        )
        return {
            "status": "checkout",
            "checkout_url": session.get("url"),
            "session_id": session.get("id"),
        }

    subscription = stripe.Subscription.retrieve(subscription_id)
    items = subscription["items"]["data"]
    if not items:
        raise HTTPException(status_code=502, detail="La suscripción Stripe no tiene items.")
    current_item_id = items[0]["id"]

    target_order = PLAN_ORDER[target_plan]
    current_order = PLAN_ORDER.get(current_plan, 0)

    # Caso 2: upgrade inmediato prorrateado
    if target_order > current_order:
        updated = stripe.Subscription.modify(
            subscription_id,
            items=[{"id": current_item_id, "price": target_price}],
            proration_behavior="create_prorations",
            payment_behavior="error_if_incomplete",
            cancel_at_period_end=False,
            metadata={"supabase_user_id": user_id, "target_plan": target_plan},
        )
        _, period_end = _subscription_period(updated)
        period_end_iso = _epoch_to_iso(period_end)
        _patch_profile_with_service(
            user_id,
            {
                "plan": target_plan,
                "stripe_subscription_status": updated.get("status"),
                "current_period_end": period_end_iso,
                "scheduled_plan": None,
                "scheduled_plan_change_at": None,
                "cancel_at_period_end": False,
            },
        )
        return {
            "status": "upgraded",
            "plan": target_plan,
            "prorated": True,
            "current_period_end": period_end_iso,
        }

    # Caso 3: downgrade programado al final del periodo via Subscription Schedule
    schedule = stripe.SubscriptionSchedule.create(from_subscription=subscription_id)
    current_period_start, current_period_end = _subscription_period(subscription)

    schedule = stripe.SubscriptionSchedule.modify(
        schedule["id"],
        end_behavior="release",
        phases=[
            {
                "items": [{"price": _price_for_plan(current_plan), "quantity": 1}],
                "start_date": current_period_start,
                "end_date": current_period_end,
                "proration_behavior": "none",
            },
            {
                "items": [{"price": target_price, "quantity": 1}],
                "iterations": 1,
                "proration_behavior": "none",
            },
        ],
    )

    period_end_iso = _epoch_to_iso(current_period_end)
    _patch_profile_with_service(
        user_id,
        {
            "plan": current_plan,
            "scheduled_plan": target_plan,
            "scheduled_plan_change_at": period_end_iso,
            "current_period_end": period_end_iso,
            "cancel_at_period_end": False,
        },
    )
    return {
        "status": "scheduled_downgrade",
        "plan": current_plan,
        "scheduled_plan": target_plan,
        "scheduled_plan_change_at": period_end_iso,
        "days_remaining": _iso_to_days_remaining(period_end_iso),
        "schedule_id": schedule.get("id"),
    }


@router.post("/cancel")
def billing_cancel(authorization: Optional[str] = Header(default=None)):
    """Programa la cancelación de la suscripción al final del periodo actual."""
    user_id, _ = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    _ensure_stripe_config()

    profile = _load_profile_with_service(user_id)
    subscription_id = profile.get("stripe_subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=409, detail="No tienes una suscripción activa que cancelar.")

    subscription = stripe.Subscription.retrieve(subscription_id)
    schedule_id = subscription.get("schedule")

    if schedule_id:
        # La suscripción está gestionada por un Schedule (ej. downgrade ULTRA→PRO programado).
        # Stripe no permite cancel_at_period_end directo: hay que cancelar a través del schedule.
        # Estrategia: liberar el schedule y luego marcar cancel_at_period_end en la suscripción.
        stripe.SubscriptionSchedule.release(schedule_id)
        subscription = stripe.Subscription.retrieve(subscription_id)

    updated = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
    _, period_end = _subscription_period(updated)
    period_end_iso = _epoch_to_iso(period_end)

    _patch_profile_with_service(
        user_id,
        {
            "scheduled_plan": PLAN_FREE,
            "scheduled_plan_change_at": period_end_iso,
            "current_period_end": period_end_iso,
            "cancel_at_period_end": True,
            "stripe_subscription_status": updated.get("status"),
        },
    )
    return {
        "status": "scheduled_cancel",
        "scheduled_plan": PLAN_FREE,
        "scheduled_plan_change_at": period_end_iso,
        "days_remaining": _iso_to_days_remaining(period_end_iso),
    }


@router.post("/resume")
def billing_resume(authorization: Optional[str] = Header(default=None)):
    """Revierte una cancelación o downgrade programados que aún no han surtido efecto."""
    user_id, _ = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    _ensure_stripe_config()

    profile = _load_profile_with_service(user_id)
    subscription_id = profile.get("stripe_subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=409, detail="No tienes una suscripción activa.")

    if profile.get("cancel_at_period_end"):
        updated = stripe.Subscription.modify(subscription_id, cancel_at_period_end=False)
        _patch_profile_with_service(
            user_id,
            {
                "cancel_at_period_end": False,
                "scheduled_plan": None,
                "scheduled_plan_change_at": None,
                "stripe_subscription_status": updated.get("status"),
            },
        )
        return {"status": "resumed", "plan": profile.get("plan")}

    if profile.get("scheduled_plan"):
        subscription = stripe.Subscription.retrieve(subscription_id)
        schedule_id = subscription.get("schedule")
        if schedule_id:
            stripe.SubscriptionSchedule.release(schedule_id)
        _patch_profile_with_service(
            user_id,
            {"scheduled_plan": None, "scheduled_plan_change_at": None},
        )
        return {"status": "resumed", "plan": profile.get("plan")}

    raise HTTPException(status_code=409, detail="No hay cambios programados que revertir.")


@router.post("/confirm")
def billing_confirm(
    payload: ConfirmRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Confirma una sesion de Stripe Checkout para sincronizar el perfil sin esperar al webhook."""
    user_id, _ = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    _ensure_stripe_config()

    session_id = (payload.session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id es obligatorio.")

    session = stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
    if session.get("client_reference_id") != user_id:
        raise HTTPException(status_code=403, detail="Esa sesión de Stripe no pertenece a este usuario.")
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        raise HTTPException(status_code=409, detail="El pago aún no se ha completado.")

    subscription = session.get("subscription")
    if isinstance(subscription, str):
        subscription = stripe.Subscription.retrieve(subscription)
    if not isinstance(subscription, dict):
        raise HTTPException(status_code=502, detail="No se pudo recuperar la suscripción de Stripe.")

    items = subscription.get("items", {}).get("data", [])
    price_id = items[0]["price"]["id"] if items else None
    plan = _plan_for_price(price_id) or PLAN_FREE

    _patch_profile_with_service(
        user_id,
        {
            "plan": plan,
            "stripe_customer_id": subscription.get("customer") or session.get("customer"),
            "stripe_subscription_id": subscription.get("id"),
            "stripe_subscription_status": subscription.get("status"),
            "current_period_end": _epoch_to_iso(_subscription_period(subscription)[1]),
            "scheduled_plan": None,
            "scheduled_plan_change_at": None,
            "cancel_at_period_end": bool(subscription.get("cancel_at_period_end")),
        },
    )
    return {"status": "confirmed", "plan": plan}


@router.post("/portal")
def billing_portal(authorization: Optional[str] = Header(default=None)):
    """Crea una sesión del Customer Portal de Stripe para autoservicio."""
    user_id, email = _require_authenticated_user(authorization)
    _ensure_supabase_service_config()
    _ensure_stripe_config()

    profile = _load_profile_with_service(user_id)
    customer_id = _get_or_create_stripe_customer(profile=profile, user_id=user_id, email=email)

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=BILLING_PORTAL_RETURN_URL,
    )
    return {"url": session.get("url")}


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

def _profile_id_from_customer(customer_id: Optional[str]) -> Optional[str]:
    """Resuelve el id de profile a partir de un stripe_customer_id."""
    if not customer_id:
        return None
    status, payload = _supabase_service_json_request(
        "/rest/v1/profiles",
        method="GET",
        query={
            "stripe_customer_id": f"eq.{customer_id}",
            "select": "id",
            "limit": "1",
        },
    )
    if status == 200 and isinstance(payload, list) and payload:
        return payload[0].get("id")
    return None


def _apply_subscription_to_profile(profile_id: str, subscription: Dict[str, Any]) -> None:
    """Reconcilia los campos del perfil con el estado actual de la suscripcion en Stripe."""
    items = subscription.get("items", {}).get("data", [])
    price_id = items[0]["price"]["id"] if items else None
    plan = _plan_for_price(price_id) or PLAN_FREE
    cancel_at_period_end = bool(subscription.get("cancel_at_period_end"))
    _, period_end = _subscription_period(subscription)
    period_end_iso = _epoch_to_iso(period_end)

    update: Dict[str, Any] = {
        "plan": plan,
        "stripe_subscription_id": subscription.get("id"),
        "stripe_subscription_status": subscription.get("status"),
        "current_period_end": period_end_iso,
        "cancel_at_period_end": cancel_at_period_end,
    }

    if cancel_at_period_end:
        update["scheduled_plan"] = PLAN_FREE
        update["scheduled_plan_change_at"] = period_end_iso
    else:
        update["scheduled_plan"] = None
        update["scheduled_plan_change_at"] = None

    _patch_profile_with_service(profile_id, update)


def _clear_subscription_for_profile(profile_id: str) -> None:
    """Marca el perfil como FREE limpiando referencias a la suscripcion eliminada."""
    _patch_profile_with_service(
        profile_id,
        {
            "plan": PLAN_FREE,
            "stripe_subscription_id": None,
            "stripe_subscription_status": "canceled",
            "current_period_end": None,
            "scheduled_plan": None,
            "scheduled_plan_change_at": None,
            "cancel_at_period_end": False,
        },
    )


def _handle_checkout_session_completed(event_object: Dict[str, Any]) -> None:
    """Procesa checkout.session.completed para alta de suscripcion."""
    user_id = event_object.get("client_reference_id")
    if not user_id and isinstance(event_object.get("metadata"), dict):
        user_id = event_object["metadata"].get("supabase_user_id")
    subscription_id = event_object.get("subscription")
    customer_id = event_object.get("customer")

    if not user_id:
        user_id = _profile_id_from_customer(customer_id)
    if not user_id or not subscription_id:
        return

    subscription = stripe.Subscription.retrieve(subscription_id)
    _apply_subscription_to_profile(user_id, subscription)


def _handle_subscription_updated(event_object: Dict[str, Any]) -> None:
    """Procesa customer.subscription.updated para reconciliar plan y estado."""
    customer_id = event_object.get("customer")
    profile_id = _profile_id_from_customer(customer_id)
    if not profile_id:
        return
    _apply_subscription_to_profile(profile_id, event_object)


def _handle_subscription_deleted(event_object: Dict[str, Any]) -> None:
    """Procesa customer.subscription.deleted bajando al plan FREE."""
    customer_id = event_object.get("customer")
    profile_id = _profile_id_from_customer(customer_id)
    if not profile_id:
        return
    _clear_subscription_for_profile(profile_id)


WEBHOOK_HANDLERS = {
    "checkout.session.completed": _handle_checkout_session_completed,
    "customer.subscription.updated": _handle_subscription_updated,
    "customer.subscription.deleted": _handle_subscription_deleted,
}


@router.post("/webhook")
async def billing_webhook(request: Request):
    """Recibe eventos firmados de Stripe y reconcilia el estado en Supabase."""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Falta STRIPE_WEBHOOK_SECRET en backend.")
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Falta STRIPE_SECRET_KEY en backend.")

    payload_bytes = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Falta cabecera Stripe-Signature.")

    try:
        event = stripe.Webhook.construct_event(payload_bytes, sig_header, STRIPE_WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError) as error:
        raise HTTPException(status_code=400, detail=f"Firma de webhook inválida: {error}")

    event_id = event.get("id")
    event_type = event.get("type")
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Evento de Stripe sin id/type.")

    raw_payload: Any
    try:
        raw_payload = json.loads(payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raw_payload = None

    is_new = _record_billing_event(event_id, event_type, raw_payload)
    if not is_new:
        return {"received": True, "duplicate": True}

    handler = WEBHOOK_HANDLERS.get(event_type)
    if handler is not None:
        event_object = event.get("data", {}).get("object", {}) or {}
        handler(event_object)

    return {"received": True}


# Suprimimos referencias no usadas para silenciar linters (helper compartido).
_ = _supabase_json_request
