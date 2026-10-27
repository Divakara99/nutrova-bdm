-- ============================================================================
-- NUTROVA DOCTOR TRACKER — BACKUP, REPAIR & RESTORE
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Ordered steps. Run 1 before anything else. Steps 2+ are WRITES — read the
-- comment above each one. Everything here is idempotent (safe to re-run).
-- ============================================================================


-- ===========================================================================
-- STEP 1 — BACKUP FIRST (writes copies only; touches no live data)
-- ===========================================================================

-- 1a. Full copy of every row in the store
create table if not exists public.nutrova_store_backup (
  like public.nutrova_store including defaults
);
insert into public.nutrova_store_backup (user_id, key, value, updated_at)
select user_id, key, value, updated_at from public.nutrova_store;

-- 1b. Point-in-time doctor snapshots (keeps history, one row per save)
create table if not exists public.nutrova_doctor_snapshots (
  snapshot_id bigserial primary key,
  user_id     uuid,
  user_email  text,
  taken_at    timestamptz not null default now(),
  doctors     jsonb not null
);
insert into public.nutrova_doctor_snapshots (user_id, user_email, doctors)
select s.user_id, u.email, s.value
from public.nutrova_store s
join auth.users u on u.id = s.user_id
where s.key = 'nutrova-doctors-v3';

-- 1c. Confirm the backups
select 'nutrova_store_backup' as backup, count(*) as rows from public.nutrova_store_backup
union all
select 'nutrova_doctor_snapshots', count(*) from public.nutrova_doctor_snapshots;


-- ===========================================================================
-- STEP 2 — RE-ASSERT SCHEMA + RLS (this is the app's own SETUP_SQL, re-run safe)
-- Fixes: "Table nutrova_store not found", "Not allowed" / RLS write errors,
--        empty lists caused by a missing or dropped policy.
-- ===========================================================================

create table if not exists public.nutrova_store (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.nutrova_store enable row level security;

-- each account: full access to its OWN rows only
drop policy if exists "own rows" on public.nutrova_store;
create policy "own rows" on public.nutrova_store
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- owner: read-only across all accounts (Users tab). Also made case-insensitive.
drop policy if exists "owner reads all" on public.nutrova_store;
create policy "owner reads all" on public.nutrova_store
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'divakar.reddy@nutrova.com');

-- owner profile metadata
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || '{"name": "M Divakar Reddy", "hq": "Bangalore 2"}'::jsonb
where lower(email) = 'divakar.reddy@nutrova.com';


-- ===========================================================================
-- STEP 3 — VERIFY (read-only: expect rls_enabled = true and 2 policies)
-- ===========================================================================
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'nutrova_store';

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'nutrova_store'
order by policyname;


-- ===========================================================================
-- STEP 4 — OPTIONAL: fix the owner's email casing (only if step 4 of
-- 01-diagnose.sql flagged has_case_or_space = true). The app's owner-read
-- policy compares the JWT email string, so casing must match exactly.
-- ===========================================================================
-- update auth.users set email = lower(trim(email))
-- where email <> lower(trim(email));


-- ===========================================================================
-- STEP 5 — OPTIONAL RESTORE: put a saved snapshot back as the live doctor list
-- Use when the live row exists but has fewer doctors than the snapshot
-- (e.g. live = 8 demo doctors, snapshot = 101 real ones).
--
-- Read the counts FIRST, then uncomment ONE update.
-- ===========================================================================

-- 5a. Compare live vs newest snapshot
select 'LIVE' as src,
       jsonb_array_length(case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end) as doctors,
       updated_at as when_
from public.nutrova_store
where key = 'nutrova-doctors-v3'
union all
select 'SNAPSHOT #' || snapshot_id,
       jsonb_array_length(case when jsonb_typeof(doctors) = 'array' then doctors else '[]'::jsonb end),
       taken_at
from public.nutrova_doctor_snapshots
order by when_ desc nulls last;

-- 5b. Restore the newest snapshot for the owner (REPLACES the live array)
-- begin;
-- update public.nutrova_store s
-- set value = snap.doctors, updated_at = now()
-- from (
--   select doctors from public.nutrova_doctor_snapshots
--   where lower(user_email) = 'divakar.reddy@nutrova.com'
--   order by taken_at desc limit 1
-- ) snap
-- where s.key = 'nutrova-doctors-v3'
--   and s.user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com');
-- select jsonb_array_length(value) as doctors_after_restore
-- from public.nutrova_store
-- where key = 'nutrova-doctors-v3'
--   and user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com');
-- commit;


-- ===========================================================================
-- STEP 6 — OPTIONAL MERGE (usually better than a replace): unify the LIVE
-- array with an older backup array, de-duplicating on name + phone.
-- Never deletes a live record; only appends doctors it doesn't already have.
-- ===========================================================================
-- begin;
-- with live as (
--   select s.user_id, s.value as doctors
--   from public.nutrova_store s
--   where s.key = 'nutrova-doctors-v3'
--     and s.user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com')
-- ), old as (
--   select b.value as doctors
--   from public.nutrova_store_backup b
--   where b.key = 'nutrova-doctors-v3'
--     and b.user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com')
--   order by b.updated_at desc limit 1
-- ), merged as (
--   select jsonb_agg(d) as doctors from (
--     select d,
--            row_number() over (
--              partition by lower(trim(coalesce(d ->> 'name',''))),
--                           regexp_replace(coalesce(d ->> 'phone',''), '\D', '', 'g')
--              order by ord
--            ) as rn
--     from (
--       select d, row_number() over () as ord
--       from jsonb_array_elements(case when jsonb_typeof((select doctors from live)) = 'array'
--                                      then (select doctors from live) else '[]'::jsonb end) d
--       union all
--       select d, 100000 + row_number() over ()
--       from jsonb_array_elements(case when jsonb_typeof((select doctors from old)) = 'array'
--                                      then (select doctors from old) else '[]'::jsonb end) d
--     ) all_docs
--   ) deduped
--   where rn = 1
-- )
-- update public.nutrova_store s
-- set value = (select doctors from merged), updated_at = now()
-- where s.key = 'nutrova-doctors-v3'
--   and s.user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com');
--
-- select jsonb_array_length(value) as doctors_after_merge
-- from public.nutrova_store
-- where key = 'nutrova-doctors-v3'
--   and user_id = (select id from auth.users where lower(email) = 'divakar.reddy@nutrova.com');
-- commit;
