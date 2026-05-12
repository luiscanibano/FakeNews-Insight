"""Configuracion comun de tests del backend."""

from __future__ import annotations

import os


os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "anon-test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-test")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_dummy")
os.environ.setdefault("STRIPE_PRICE_PRO", "price_pro_test")
os.environ.setdefault("STRIPE_PRICE_ULTRA", "price_ultra_test")
os.environ.setdefault(
    "BILLING_SUCCESS_URL",
    "http://localhost:5173/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
)
os.environ.setdefault("BILLING_CANCEL_URL", "http://localhost:5173/dashboard?billing=cancel")
os.environ.setdefault("BILLING_PORTAL_RETURN_URL", "http://localhost:5173/dashboard")