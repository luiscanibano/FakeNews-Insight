-- =====================================================================
-- Migracion 002: Agente FEVER de verificacion de afirmaciones
-- Aplicar en Supabase SQL Editor (proyecto > SQL > New query > Run)
--
-- Anade:
--   * Cuota diaria de verificaciones para el plan Super Pro.
--   * Tablas para persistir runs/claims/evidencias del agente.
--   * RLS: el usuario solo ve sus propias verificaciones.
-- =====================================================================

-- 1) Cuota diaria de /verify (paralela a daily_analysis_*)
alter table public.profiles
  add column if not exists daily_verification_limit integer,
  add column if not exists daily_verification_used integer not null default 0,
  add column if not exists daily_verification_date date;

-- 2) Tabla raiz: una fila por ejecucion del agente
create table if not exists public.verification_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_text text not null,
  overall_label text not null check (overall_label in
    ('SUPPORTED','REFUTED','NOT_ENOUGH_INFO','CONFLICTING')),
  summary text,
  model_version text not null,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists verification_runs_user_idx
  on public.verification_runs (user_id, created_at desc);

-- 3) Claims extraidos por run
create table if not exists public.verification_claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.verification_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claim_text text not null,
  label text not null check (label in
    ('SUPPORTED','REFUTED','NOT_ENOUGH_INFO','CONFLICTING')),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  rationale text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists verification_claims_run_idx
  on public.verification_claims (run_id, position);

-- 4) Evidencias por claim
create table if not exists public.verification_evidences (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.verification_claims (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text,
  snippet text,
  nli_label text not null check (nli_label in ('SUPPORTS','REFUTES','NOT ENOUGH INFO')),
  nli_score numeric(5,4) check (nli_score is null or (nli_score >= 0 and nli_score <= 1)),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists verification_evidences_claim_idx
  on public.verification_evidences (claim_id, position);

-- =====================================================================
-- 5) Row Level Security: cada usuario ve solo sus propias verificaciones.
--    El backend escribe via service_role (no esta sujeto a RLS).
-- =====================================================================

alter table public.verification_runs enable row level security;
alter table public.verification_claims enable row level security;
alter table public.verification_evidences enable row level security;

drop policy if exists "verification_runs_select_own" on public.verification_runs;
create policy "verification_runs_select_own"
  on public.verification_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "verification_claims_select_own" on public.verification_claims;
create policy "verification_claims_select_own"
  on public.verification_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "verification_evidences_select_own" on public.verification_evidences;
create policy "verification_evidences_select_own"
  on public.verification_evidences
  for select
  to authenticated
  using (auth.uid() = user_id);
