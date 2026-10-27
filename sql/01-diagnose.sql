-- ============================================================================
-- NUTROVA DOCTOR TRACKER — DIAGNOSE (READ-ONLY, changes nothing)
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- WHY THIS IS SAFE: the SQL Editor connects as `postgres`, so RLS is bypassed
-- and you can see ALL accounts' rows. This is how you tell the difference
-- between "the data is gone" and "the app can't see the data".
--
-- Table: public.nutrova_store (user_id uuid, key text, value jsonb, updated_at)
--   one row per account per data key. Known keys:
--     nutrova-doctors-v3    -> jsonb ARRAY of doctor objects   <-- your 101
--     nutrova-patches-v2    -> jsonb array of patches (areas)
--     nutrova-reminders-v1  -> jsonb array of reminders
--     nutrova-payments-v3   -> jsonb array of invoices/POs
--     nutrova-bio-v1        -> jsonb object (profile)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Is the table there, and is RLS on?
--    Expected: table_exists = 1, rls_enabled = true
-- ---------------------------------------------------------------------------
select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  c.relforcerowsecurity                       as rls_forced,
  (select count(*) from public.nutrova_store) as total_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'nutrova_store';


-- ---------------------------------------------------------------------------
-- 2) Which RLS policies exist?  (you need BOTH of these)
--      "own rows"       -> for all,    auth.uid() = user_id
--      "owner reads all"-> for select, jwt email = divakar.reddy@nutrova.com
-- ---------------------------------------------------------------------------
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'nutrova_store'
order by policyname;


-- ---------------------------------------------------------------------------
-- 3) THE MAIN QUESTION: how many doctors does each account actually have?
--    Your own row should show doctors = 101 here.
--    If this says 101 but the app shows fewer -> it is a CLIENT/RLS problem.
--    If this says 0/8      -> the data never reached the cloud (see file 03).
-- ---------------------------------------------------------------------------
select
  u.email,
  u.id                                        as user_id,
  count(s.key)                                as keys_present,
  coalesce(max(case when s.key = 'nutrova-doctors-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)   as doctors,
  coalesce(max(case when s.key = 'nutrova-payments-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)   as payments,
  coalesce(max(case when s.key = 'nutrova-reminders-v1'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)   as reminders,
  max(s.updated_at)                           as last_write
from auth.users u
left join public.nutrova_store s on s.user_id = u.id
group by u.email, u.id
order by doctors desc, last_write desc nulls last;


-- ---------------------------------------------------------------------------
-- 4) Email case check — a classic silent failure.
--    The app matches rows by (user_id), but the owner-read policy compares the
--    JWT email as a STRING. If the auth email is stored with different case or
--    whitespace, "owner reads all" silently stops matching.
-- ---------------------------------------------------------------------------
select id, email,
       length(email)                                              as len,
       email <> lower(trim(email))                                as has_case_or_space,
       raw_user_meta_data ->> 'name'                              as name,
       raw_user_meta_data ->> 'hq'                                as hq
from auth.users
order by created_at;


-- ---------------------------------------------------------------------------
-- 5) Raw rows for the owner, with sizes — proves the payload is really there
-- ---------------------------------------------------------------------------
select s.key,
       jsonb_typeof(s.value)                   as value_type,
       case when jsonb_typeof(s.value) = 'array'
            then jsonb_array_length(s.value) end as array_len,
       pg_size_pretty(length(s.value::text)::bigint) as payload,
       s.updated_at
from public.nutrova_store s
join auth.users u on u.id = s.user_id
where lower(u.email) = 'divakar.reddy@nutrova.com'
order by s.key;


-- ---------------------------------------------------------------------------
-- 6) Duplicate / malformed doctor guard
--    Shows duplicate names (same doctor entered twice) and rows with no name.
-- ---------------------------------------------------------------------------
with docs as (
  select u.email, d
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
  ) d
  where s.key = 'nutrova-doctors-v3'
),
named as (
  select email,
         coalesce(nullif(trim(d ->> 'name'), ''), '')            as name,
         nullif(trim(coalesce(d ->> 'phone', '')), '')           as phone,
         nullif(trim(coalesce(d ->> 'patchId', '')), '')         as patch_id
  from docs
)
select
  (select count(*) from named where name = '')                   as doctors_without_name,
  (select count(*) from named)                                   as total_doctors,
  (select count(*) from (
      select name from named where name <> '' group by name having count(*) > 1
   ) x)                                                          as duplicate_names,
  (select count(*) from (
      select phone from named where phone is not null group by phone having count(*) > 1
   ) y)                                                          as duplicate_phones;


-- ---------------------------------------------------------------------------
-- 7) Exact duplicate list, if step 6 found any
-- ---------------------------------------------------------------------------
with docs as (
  select d
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
  ) d
  where s.key = 'nutrova-doctors-v3'
    and lower(u.email) = 'divakar.reddy@nutrova.com'
)
select trim(d ->> 'name') as name,
       count(*)           as copies,
       string_agg(coalesce(d ->> 'id', '?'), ', ') as ids
from docs
group by trim(d ->> 'name')
having count(*) > 1
order by copies desc, name;
