-- =====================================================================
-- Migracion 003: Guardado manual de verificaciones FEVER en historial
-- Aplicar en Supabase SQL Editor tras 002_fever.sql
--
-- Añade banderas de historial manual para que una verificacion solo aparezca
-- en el historial visible cuando el usuario la guarda expresamente.
-- =====================================================================

alter table public.verification_runs
  add column if not exists saved_to_history boolean not null default false,
  add column if not exists saved_at timestamptz;

create index if not exists verification_runs_saved_history_idx
  on public.verification_runs (user_id, saved_to_history, created_at desc);