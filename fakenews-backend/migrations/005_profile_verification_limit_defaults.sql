-- =====================================================================
-- Migracion 005: limites FEVER por plan en perfiles
-- Aplicar tras 004_async_verification_queue.sql
--
-- Corrige perfiles con daily_verification_limit nulo o heredado de la
-- logica antigua de analisis y garantiza que las nuevas altas reciban
-- el limite FEVER correcto segun el plan.
-- =====================================================================

create or replace function public.profile_verification_limit_for_plan(raw_plan text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(trim(raw_plan), 'free'))
    when 'pro' then 50
    when 'pro_user' then 50
    when 'ultra' then 200
    when 'ultra_user' then 200
    else 5
  end
$$;

create or replace function public.sync_profile_verification_limit()
returns trigger
language plpgsql
as $$
declare
  normalized_plan text;
begin
  normalized_plan := lower(coalesce(trim(new.plan), 'free'));

  if normalized_plan = 'pro_user' then
    normalized_plan := 'pro';
  elsif normalized_plan = 'ultra_user' then
    normalized_plan := 'ultra';
  elsif normalized_plan not in ('free', 'pro', 'ultra') then
    normalized_plan := 'free';
  end if;

  new.plan := normalized_plan;
  new.daily_verification_used := coalesce(new.daily_verification_used, 0);

  if tg_op = 'INSERT'
     or new.daily_verification_limit is null
     or new.daily_verification_limit <= 0
     or coalesce(old.plan, '') is distinct from new.plan then
    new.daily_verification_limit := public.profile_verification_limit_for_plan(new.plan);
  end if;

  return new;
end;
$$;

update public.profiles
set
  plan = case lower(coalesce(trim(plan), 'free'))
    when 'pro_user' then 'pro'
    when 'ultra_user' then 'ultra'
    when 'pro' then 'pro'
    when 'ultra' then 'ultra'
    else 'free'
  end,
  daily_verification_limit = public.profile_verification_limit_for_plan(plan),
  daily_verification_used = coalesce(daily_verification_used, 0)
where daily_verification_limit is null
   or daily_verification_limit <= 0
   or daily_verification_limit <> public.profile_verification_limit_for_plan(plan)
   or lower(coalesce(trim(plan), 'free')) not in ('free', 'pro', 'ultra');

alter table public.profiles
  alter column daily_verification_limit set default 5;

update public.profiles
set daily_verification_limit = 5
where daily_verification_limit is null;

alter table public.profiles
  alter column daily_verification_limit set not null;

alter table public.profiles
  alter column daily_verification_used set default 0;

drop trigger if exists profiles_sync_verification_limit on public.profiles;
create trigger profiles_sync_verification_limit
before insert or update of plan, daily_verification_limit
on public.profiles
for each row
execute function public.sync_profile_verification_limit();