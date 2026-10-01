-- The Charlatan — moderation flag for oracle sessions (applied to project TMI
-- as migration charlatan_sessions_listed on 2026-10-01).
-- listed = false hides a session from everything visitors see: the "Others asked"
-- echoes after the reveal and the running number. Hide one with:
--   update public.charlatan_sessions set listed = false where id = '<uuid>';
alter table public.charlatan_sessions add column listed boolean not null default true;

create index charlatan_sessions_echoes on public.charlatan_sessions (created_at desc)
  where listed and question is not null and felt_meaning is not null;

create or replace function public.charlatan_meaning_stats()
returns table (answered bigint, felt_meaning bigint, pct numeric)
language sql stable
set search_path = ''
as $$
  select count(*) filter (where s.felt_meaning is not null),
         count(*) filter (where s.felt_meaning),
         round(100.0 * count(*) filter (where s.felt_meaning)
               / nullif(count(*) filter (where s.felt_meaning is not null), 0), 0)
  from public.charlatan_sessions s
  where s.listed;
$$;
