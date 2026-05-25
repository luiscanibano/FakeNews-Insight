-- =====================================================================
-- Migracion 006: tipado de verification_runs y batches CSV
-- Aplicar tras 005_profile_verification_limit_defaults.sql
--
-- Prepara el modelo FEVER para ejecuciones de tipo text/url/csv y añade
-- un root de lote para futuras verificaciones CSV asincronas.
-- =====================================================================

create table if not exists public.verification_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  job_id text,
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  success_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_message text,
  input_origin text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists verification_batches_user_idx
  on public.verification_batches (user_id, created_at desc);

create index if not exists verification_batches_status_idx
  on public.verification_batches (user_id, status, created_at desc);

create index if not exists verification_batches_job_id_idx
  on public.verification_batches (job_id);

alter table public.verification_runs
  add column if not exists run_type text not null default 'text'
    check (run_type in ('text', 'url', 'csv')),
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists batch_id uuid,
  add column if not exists batch_row_index integer,
  add column if not exists input_origin text;

update public.verification_runs
set run_type = 'text'
where run_type is null;

create index if not exists verification_runs_type_idx
  on public.verification_runs (user_id, run_type, created_at desc);

create index if not exists verification_runs_batch_idx
  on public.verification_runs (batch_id, batch_row_index);

alter table public.verification_batches enable row level security;

drop policy if exists "verification_batches_select_own" on public.verification_batches;
create policy "verification_batches_select_own"
  on public.verification_batches
  for select
  to authenticated
  using (auth.uid() = user_id);