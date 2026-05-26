-- =====================================================================
-- Migracion 008: lectura global de verification_runs para administradores
-- Aplicar en Supabase SQL Editor despues de las migraciones previas.
--
-- Mantiene la policy de "ver lo propio" y añade una policy adicional para
-- usuarios autenticados cuya fila en public.profiles tenga role = 'admin'.
-- =====================================================================

drop policy if exists "verification_runs_select_admin" on public.verification_runs;

create policy "verification_runs_select_admin"
  on public.verification_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where public.profiles.id = auth.uid()
        and public.profiles.role = 'admin'
    )
  );