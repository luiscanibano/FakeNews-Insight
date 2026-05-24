-- =====================================================================
-- Migracion 004: cola asincrona para verificaciones FEVER
-- Aplicar tras 003_verification_history_saved.sql
--
-- Anade metadatos de ejecucion asincrona a verification_runs para poder
-- encolar, consultar estado y reflejar errores/progreso en la UI.
-- =====================================================================

alter table public.verification_runs
  add column if not exists status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists job_id text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists error_message text,
  add column if not exists selected_claims integer;

create index if not exists verification_runs_status_idx
  on public.verification_runs (user_id, status, created_at desc);

create index if not exists verification_runs_job_id_idx
  on public.verification_runs (job_id);