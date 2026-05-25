-- =====================================================================
-- Migracion 007: guardado manual de batches CSV en historial
-- Aplicar tras 006_verification_run_types_and_batches.sql
--
-- Permite marcar lotes CSV completos como entradas guardadas del historial
-- sin promocionar individualmente cada fila hija.
-- =====================================================================

alter table public.verification_batches
  add column if not exists saved_to_history boolean not null default false,
  add column if not exists saved_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'verification_runs_batch_id_fkey'
  ) then
    alter table public.verification_runs
      add constraint verification_runs_batch_id_fkey
      foreign key (batch_id)
      references public.verification_batches (id)
      on delete cascade;
  end if;
end $$;

create index if not exists verification_batches_saved_idx
  on public.verification_batches (user_id, saved_to_history, created_at desc);