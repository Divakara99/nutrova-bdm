-- ============================================================================
-- NUTROVA DOCTOR TRACKER — FRESH ACCOUNTS & ISOLATION PROOF
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Goal: a brand-new account opens EMPTY. It must never inherit the owner's
-- doctors, payments, reminders or profile.
--
-- How isolation is supposed to work (from backend.ts -> SETUP_SQL):
--   "own rows"        for all,    auth.uid() = user_id     <- read AND write
--   "owner reads all" for select, lower(jwt email) = owner <- READ ONLY
-- Policies are permissive and OR'd, so a teammate gets only "own rows".
-- A new account has no rows at all until it saves something.
--
-- Sections:
--   1. Who exists, and how much data each account really has
--   2. Is any account contaminated with the owner's data? (content hashes)
--   3. PROVE isolation by impersonating a teammate inside a transaction
--   4. Reset one polluted account back to a genuinely fresh workspace
--   5. Validate shape of a fresh workspace (sanity check after the reset)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Every account + how much data it owns.  A fresh account = 0 doctors.
-- ---------------------------------------------------------------------------
select
  u.email,
  u.id                                                            as user_id,
  u.created_at,
  count(s.key)                                                    as rows_owned,
  coalesce(max(case when s.key = 'nutrova-doctors-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)           as doctors,
  coalesce(max(case when s.key = 'nutrova-payments-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)           as payments,
  coalesce(max(case when s.key = 'nutrova-reminders-v1'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)           as reminders,
  max(s.updated_at)                                                as last_write
from auth.users u
left join public.nutrova_store s on s.user_id = u.id
group by u.email, u.id, u.created_at
order by doctors desc, u.created_at desc;


-- ---------------------------------------------------------------------------
-- 2) CONTAMINATION CHECK.
--    Flags any non-owner account whose doctor list is byte-identical to the
--    owner's — the signature of "a new account opened with my data".
--    Also flags the owner's *profile* (name / email / phone) leaking into
--    another account's bio row.
-- ---------------------------------------------------------------------------
with owner_row as (
  select s.value as doctors
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = 'divakar.reddy@nutrova.com'
    and s.key = 'nutrova-doctors-v3'
  limit 1
),
owner_bio as (
  select s.value as bio
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = 'divakar.reddy@nutrova.com'
    and s.key = 'nutrova-bio-v1'
  limit 1
)
select
  u.email                                            as account,
  case
    when lower(u.email) = 'divakar.reddy@nutrova.com' then 'owner (expected to have data)'
    when d.value is null                              then 'fresh — no doctor row'
    when (select doctors from owner_row) is not null
         and md5(d.value::text) = md5((select doctors from owner_row)::text)
                                                      then 'CONTAMINATED — identical to owner'
    when jsonb_array_length(case when jsonb_typeof(d.value)='array' then d.value else '[]'::jsonb end) > 0
                                                      then 'has their own doctors (ok)'
    else 'empty array (ok)'
  end                                               as doctors_status,
  case
    when lower(u.email) = 'divakar.reddy@nutrova.com' then '-'
    when b.value is null                              then 'no bio row'
    when (select bio from owner_bio) is not null
         and coalesce(b.value ->> 'email','') <> ''
         and lower(b.value ->> 'email') = 'divakar.reddy@nutrova.com'
                                                      then 'CONTAMINATED — owner email in bio'
    when coalesce(b.value ->> 'name','') ilike '%divakar%'
                                                      then 'CONTAMINATED — owner name in bio'
    else 'own profile (ok)'
  end                                               as bio_status
from auth.users u
left join public.nutrova_store d on d.user_id = u.id and d.key = 'nutrova-doctors-v3'
left join public.nutrova_store b on b.user_id = u.id and b.key = 'nutrova-bio-v1'
order by doctors_status, u.created_at;


-- ---------------------------------------------------------------------------
-- 3) PROVE ISOLATION — impersonate a teammate, then roll back.
--    The SQL editor runs as `postgres` and bypasses RLS, so step 1 can see
--    everyone. This block is the only way to see what a TEAMMATE's browser
--    can actually read. Replace the uuid + email with a real non-owner row
--    from step 1. Expected: only that account's own rows (0 for a new one),
--    and ZERO rows belonging to divakar.reddy@nutrova.com.
-- ---------------------------------------------------------------------------
-- begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub',  'PUT-TEAMMATE-UUID-HERE',
--                       'email','teammate@nutrova.com',
--                       'role', 'authenticated')::text, true);
--   set local role authenticated;
--
--   -- must equal that teammate's own row count, never the owner's 101
--   select count(*) as visible_rows, count(distinct user_id) as distinct_users
--   from public.nutrova_store;
--
--   -- must return 0
--   select count(*) as owner_rows_visible
--   from public.nutrova_store
--   where user_id = (select id from auth.users
--                    where lower(email) = 'divakar.reddy@nutrova.com');
-- rollback;


-- ---------------------------------------------------------------------------
-- 4) RESET ONE ACCOUNT TO A GENUINELY FRESH WORKSPACE.
--    Use this if step 2 reported CONTAMINATED. Deletes only that account's
--    rows; the account and its password are untouched. The app recreates an
--    empty workspace on next sign-in. Back up first (03-backup-repair-restore).
-- ---------------------------------------------------------------------------
-- begin;
--   delete from public.nutrova_store
--   where user_id = (select id from auth.users
--                    where lower(email) = 'teammate@nutrova.com');
--
--   -- expect 0
--   select count(*) as rows_left
--   from public.nutrova_store
--   where user_id = (select id from auth.users
--                    where lower(email) = 'teammate@nutrova.com');
-- commit;


-- ---------------------------------------------------------------------------
-- 5) Post-reset sanity check: what the app will render for that account.
--    All five keys missing/empty == a clean first-run experience.
-- ---------------------------------------------------------------------------
-- select k.key,
--        coalesce(jsonb_typeof(s.value), '(no row)') as value_type,
--        case when jsonb_typeof(s.value) = 'array'
--             then jsonb_array_length(s.value) end as items
-- from (values ('nutrova-bio-v1'), ('nutrova-doctors-v3'), ('nutrova-patches-v2'),
--              ('nutrova-reminders-v1'), ('nutrova-payments-v3')) as k(key)
-- left join public.nutrova_store s
--        on s.key = k.key
--       and s.user_id = (select id from auth.users
--                        where lower(email) = 'teammate@nutrova.com');
