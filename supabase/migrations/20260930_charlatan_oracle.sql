-- The Charlatan — oracle sessions + cached AI vocabularies (P02).
-- Already applied to the Supabase project "TMI" (ref dsfqnjdhkknnxbdeqdml)
-- as migrations charlatan_vocabularies_and_sessions, charlatan_theme_moderation
-- and charlatan_lang_default_en. This file is the consolidated result, kept
-- in the repo for reference and to recreate the schema elsewhere.

create extension if not exists pg_trgm with schema extensions;

-- Cached AI vocabularies, one row per (theme, language, prompt version, variant)
create table public.charlatan_vocabularies (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null,            -- normalized in the app: lowercase, no accents, single spaces
  theme text not null,                -- as the visitor typed it
  lang text not null default 'en',
  variant smallint not null default 1 check (variant between 1 and 3),
  provider text,
  model text,
  prompt_version text not null,
  graph jsonb not null,
  hits integer not null default 0,
  listed boolean not null default true, -- false = never offered as a suggestion (moderation)
  created_at timestamptz not null default now(),
  unique (theme_key, lang, prompt_version, variant)
);
create index charlatan_vocabularies_theme_trgm
  on public.charlatan_vocabularies using gin (theme_key extensions.gin_trgm_ops);

-- One row per oracle consultation
create table public.charlatan_sessions (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid references public.charlatan_vocabularies(id) on delete set null, -- null = seed graph
  question text check (char_length(question) <= 500), -- null if the visitor opted out
  answer text not null,
  steps jsonb,                        -- per word: chosen node, candidates, probabilities
  seed bigint,
  felt_meaning boolean,               -- "Did it speak to you?"; null until answered
  lang text not null default 'en',
  created_at timestamptz not null default now()
);
create index charlatan_sessions_vocabulary_id on public.charlatan_sessions (vocabulary_id);
create index charlatan_sessions_created_at on public.charlatan_sessions (created_at);

-- Server-only access: RLS on, no policies, no grants for public roles.
-- (The Supabase advisor "RLS enabled, no policy" is expected and intended.)
alter table public.charlatan_vocabularies enable row level security;
alter table public.charlatan_sessions enable row level security;
revoke all on public.charlatan_vocabularies, public.charlatan_sessions from anon, authenticated;

-- Autocomplete: prefix matches first, then fuzzy (trigram) matches, then most used.
-- Hiding any variant (listed = false) hides the whole theme.
create function public.charlatan_suggest_themes(q text, p_lang text default 'en', p_limit int default 8)
returns table (theme_key text, theme text, hits bigint)
language sql stable
set search_path = ''
as $$
  select v.theme_key,
         (array_agg(v.theme order by v.created_at))[1] as theme,
         sum(v.hits)::bigint as hits
  from public.charlatan_vocabularies v
  where v.lang = p_lang
    and (starts_with(v.theme_key, q) or v.theme_key operator(extensions.%) q)
  group by v.theme_key
  having bool_and(v.listed)
  order by bool_or(starts_with(v.theme_key, q)) desc,
           max(extensions.similarity(v.theme_key, q)) desc,
           sum(v.hits) desc
  limit least(greatest(p_limit, 1), 20);
$$;

-- Atomic hit counter for a reused vocabulary
create function public.charlatan_vocabulary_hit(p_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.charlatan_vocabularies set hits = hits + 1 where id = p_id;
$$;

-- The number for Act II: how many felt the random answer spoke to them
create function public.charlatan_meaning_stats()
returns table (answered bigint, felt_meaning bigint, pct numeric)
language sql stable
set search_path = ''
as $$
  select count(*) filter (where s.felt_meaning is not null),
         count(*) filter (where s.felt_meaning),
         round(100.0 * count(*) filter (where s.felt_meaning)
               / nullif(count(*) filter (where s.felt_meaning is not null), 0), 0)
  from public.charlatan_sessions s;
$$;

revoke execute on function public.charlatan_suggest_themes(text, text, int),
                           public.charlatan_vocabulary_hit(uuid),
                           public.charlatan_meaning_stats()
  from public, anon, authenticated;
grant execute on function public.charlatan_suggest_themes(text, text, int),
                          public.charlatan_vocabulary_hit(uuid),
                          public.charlatan_meaning_stats()
  to service_role;
