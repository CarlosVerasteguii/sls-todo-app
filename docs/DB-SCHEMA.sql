-- ======================================================================
-- SLS To-Do — Database Schema (Supabase / PostgreSQL)
-- Version: 1.0
-- Source of truth: PRD, ARCHITECTURE.md, ERD.md, API-SPEC.md
-- Notes:
--  - Partitioning by user-provided Identifier (no traditional auth in v1.0)
--  - Server boundary enforced at app layer; RLS optional (see bottom)
--  - Includes normalization triggers for identifier/tags and updated_at
-- ======================================================================

-- ----------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------
create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- Optional helpers used below
-- (These functions are safe to create repeatedly due to CREATE OR REPLACE.)

-- Collapse all whitespace runs to a single space and trim ends.
create or replace function public.collapse_ws(t text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'));
$$;

-- Normalize identifier: lowercase + collapsed whitespace + trim.
create or replace function public.normalize_identifier(id_raw text)
returns text
language sql
immutable
as $$
  select lower(public.collapse_ws(id_raw));
$$;

-- Ensure tags is a lowercase, unique, length-bounded array (≤20 items, each 1–24 chars).
create or replace function public.sanitize_tags(in_tags jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v text;
  seen text[];
  out_arr text[] := '{}';
  cnt int := 0;
begin
  if in_tags is null or jsonb_typeof(in_tags) is distinct from 'array' then
    return '[]'::jsonb;
  end if;

  for v in select value::text from jsonb_array_elements_text(in_tags)
  loop
    v := lower(public.collapse_ws(v));
    if v is null or length(v) < 1 or length(v) > 24 then
      continue;
    end if;
    -- dedupe (case-insensitive already lowercased)
    if not (v = any (coalesce(seen, '{}'))) then
      out_arr := out_arr || v;
      seen := array_append(coalesce(seen, '{}'), v);
      cnt := cnt + 1;
    end if;
    exit when cnt >= 20; -- cap size
  end loop;

  return to_jsonb(out_arr);
end;
$$;

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enforce identifier normalization from identifier_raw
create or replace function public.enforce_identifier_norm()
returns trigger
language plpgsql
as $$
begin
  -- Always derive identifier_norm from identifier_raw (defense-in-depth).
  if new.identifier_raw is null then
    raise exception 'identifier_raw cannot be null';
  end if;
  new.identifier_norm := public.normalize_identifier(new.identifier_raw);
  return new;
end;
$$;

-- Sanitize tags array before write
create or replace function public.enforce_tags_sanitization()
returns trigger
language plpgsql
as $$
begin
  new.tags := public.sanitize_tags(new.tags);
  return new;
end;
$$;

-- ----------------------------------------------------------------------
-- Core table
-- ----------------------------------------------------------------------
create table if not exists public.todos (
  id                     uuid primary key default gen_random_uuid(),

  -- Partition key (derived from identifier_raw via trigger)
  identifier_norm        text not null,
  identifier_raw         text not null,

  -- Business fields
  title                  text not null,
  description            text,
  priority               text not null default 'P2',  -- P0 | P1 | P2 | P3
  project                text,
  tags                   jsonb not null default '[]'::jsonb, -- array of strings (sanitized by trigger)
  completed              boolean not null default false,

  -- LLM enrichment (forward-compat)
  enhanced_description   text,
  steps                  jsonb,

  -- Timestamps
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Constraints
  constraint chk_priority
    check (priority in ('P0','P1','P2','P3')),

  constraint chk_tags_array
    check (jsonb_typeof(tags) = 'array'),

  -- Length constraints (defense-in-depth; UI/server also validate)
  constraint chk_title_len
    check (char_length(title) between 1 and 200),

  constraint chk_desc_len
    check (description is null or char_length(description) <= 2000),

  constraint chk_project_len
    check (project is null or char_length(project) <= 80)
);

-- ----------------------------------------------------------------------
-- Indexes (query patterns: partition, completion filter, recent first)
-- ----------------------------------------------------------------------
create index if not exists idx_todos_identifier_norm
  on public.todos (identifier_norm);

create index if not exists idx_todos_identifier_completed
  on public.todos (identifier_norm, completed);

-- Optional: created_at DESC for recent-first ordering
-- (Postgres doesn't store DESC order, but planner benefits from btree)
create index if not exists idx_todos_created_at
  on public.todos (created_at);

-- ----------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------
-- Keep updated_at fresh
drop trigger if exists trg_set_updated_at on public.todos;
create trigger trg_set_updated_at
before update on public.todos
for each row
execute function public.set_updated_at();

-- Always normalize identifier_norm from identifier_raw
drop trigger if exists trg_enforce_identifier_norm_ins on public.todos;
create trigger trg_enforce_identifier_norm_ins
before insert on public.todos
for each row
execute function public.enforce_identifier_norm();

drop trigger if exists trg_enforce_identifier_norm_upd on public.todos;
create trigger trg_enforce_identifier_norm_upd
before update of identifier_raw on public.todos
for each row
execute function public.enforce_identifier_norm();

-- Sanitize tags on insert/update
drop trigger if exists trg_sanitize_tags_ins on public.todos;
create trigger trg_sanitize_tags_ins
before insert on public.todos
for each row
execute function public.enforce_tags_sanitization();

drop trigger if exists trg_sanitize_tags_upd on public.todos;
create trigger trg_sanitize_tags_upd
before update of tags on public.todos
for each row
execute function public.enforce_tags_sanitization();

-- ----------------------------------------------------------------------
-- Optional convenience views (comment in if you want)
-- ----------------------------------------------------------------------
-- create or replace view public.todos_active as
--   select * from public.todos where completed = false;
-- create or replace view public.todos_completed as
--   select * from public.todos where completed = true;

-- ----------------------------------------------------------------------
-- Seed data (OPTIONAL) — comment out in production environments
-- ----------------------------------------------------------------------
-- insert into public.todos (identifier_raw, title, priority, tags)
-- values
--   ('john@example.com', 'Write PRD', 'P1', '["docs","prd"]'),
--   ('john@example.com', 'Buy milk',  'P2', '["grocery","dairy"]');

-- ----------------------------------------------------------------------
-- (Optional) Event logs table for observability (not required v1.0)
-- ----------------------------------------------------------------------
-- create table if not exists public.event_logs (
--   id               uuid primary key default gen_random_uuid(),
--   request_id       text,
--   route            text,
--   op               text,
--   identifier_hash  text,
--   payload          jsonb,
--   created_at       timestamptz not null default now()
-- );
-- create index if not exists idx_event_logs_created_at
--   on public.event_logs (created_at);

-- ----------------------------------------------------------------------
-- RLS Posture (FUTURE, NOT REQUIRED FOR v1.0)
-- Keep disabled for the assessment unless explicitly requested.
-- ----------------------------------------------------------------------
-- -- enable row level security
-- alter table public.todos enable row level security;
--
-- -- Example policy using a request header set by an Edge Function / server:
-- -- select policy: identifier_norm must match GUC/claim 'app.identifier_norm'
-- do $$
-- begin
--   if not exists (
--     select 1 from pg_policies where schemaname='public' and tablename='todos' and policyname='select_by_identifier'
--   ) then
--     execute $pol$
--       create policy select_by_identifier on public.todos
--       for select
--       using (identifier_norm = current_setting('request.jwt.claims.identifier_norm', true));
--     $pol$;
--   end if;
-- end$$;
--
-- -- similar policies for insert/update/delete as needed
--
-- -- In v1.0 we rely on the application server boundary and strict query filters.

-- ======================================================================
-- End of Schema
-- ======================================================================
