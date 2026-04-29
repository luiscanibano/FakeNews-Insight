-- =====================================================================
-- Migracion 001: Integracion de Stripe Billing
-- Aplicar en Supabase SQL Editor (proyecto > SQL > New query > Run)
-- =====================================================================

-- 1) Columnas nuevas en profiles para enlazar con Stripe y reflejar estado
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists scheduled_plan text,
  add column if not exists scheduled_plan_change_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);

-- 2) Tabla de eventos de Stripe (idempotencia del webhook)
create table if not exists public.billing_events (
  id bigserial primary key,
  stripe_event_id text not null unique,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

-- Solo el service_role (backend) puede leer/escribir eventos.
drop policy if exists "billing_events_service_only_select" on public.billing_events;
drop policy if exists "billing_events_service_only_insert" on public.billing_events;

-- (No se crean policies para anon/authenticated: sin policies + RLS on = denegado por defecto.)

-- 3) Endurecer RLS de profiles: el usuario authenticated solo puede actualizar display_name.
--    El backend usa service_role y por tanto NO esta sujeto a estas reglas.
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_self_display_name_only" on public.profiles;

create policy "profiles_update_self_display_name_only"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Bloquea cambios de plan, rol y campos de billing desde el cliente.
    and plan is not distinct from (select plan from public.profiles where id = auth.uid())
    and role is not distinct from (select role from public.profiles where id = auth.uid())
    and stripe_customer_id is not distinct from (select stripe_customer_id from public.profiles where id = auth.uid())
    and stripe_subscription_id is not distinct from (select stripe_subscription_id from public.profiles where id = auth.uid())
    and stripe_subscription_status is not distinct from (select stripe_subscription_status from public.profiles where id = auth.uid())
    and current_period_end is not distinct from (select current_period_end from public.profiles where id = auth.uid())
    and scheduled_plan is not distinct from (select scheduled_plan from public.profiles where id = auth.uid())
    and scheduled_plan_change_at is not distinct from (select scheduled_plan_change_at from public.profiles where id = auth.uid())
    and cancel_at_period_end is not distinct from (select cancel_at_period_end from public.profiles where id = auth.uid())
  );
