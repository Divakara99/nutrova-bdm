-- ############################################################################
-- NUTROVA DOCTOR TRACKER — ONE-SHOT CHECK  (copy once, paste once)
--
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--
--   READ-ONLY. Creates nothing, changes nothing, deletes nothing.
--   You will get 6 result tables. Read the "VERDICT" table (last one) first.
--
--   Answers, in order:
--     A. Is the table healthy and is RLS on?
--     B. Which accounts exist, and how many doctors each one owns?
--     C. Do my 101 doctors exist in the cloud?
--     D. Has any other account been contaminated with MY data?
--     E. Any duplicate / nameless / malformed doctor records?
--     F. VERDICT — plain English: what to do next.
-- ############################################################################


-- ===========================================================================
-- A. TABLE + RLS HEALTH
-- ===========================================================================
select
  c.relname            as table_name,
  c.relrowsecurity     as rls_enabled,
  (select count(*) from public.nutrova_store) as total_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'nutrova_store';

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'nutrova_store'
order by policyname;


-- ===========================================================================
-- B. ACCOUNTS + HOW MUCH DATA EACH ONE OWNS
--    A brand-new account must show 0 doctors.
-- ===========================================================================
select
  u.email,
  u.id                                                          as user_id,
  u.created_at,
  count(s.key)                                                  as rows_owned,
  coalesce(max(case when s.key = 'nutrova-doctors-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)         as doctors,
  coalesce(max(case when s.key = 'nutrova-payments-v3'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)         as payments,
  coalesce(max(case when s.key = 'nutrova-reminders-v1'
                    and jsonb_typeof(s.value) = 'array'
               then jsonb_array_length(s.value) end), 0)         as reminders,
  max(s.updated_at)                                              as last_write
from auth.users u
left join public.nutrova_store s on s.user_id = u.id
group by u.email, u.id, u.created_at
order by doctors desc, u.created_at desc;


-- ===========================================================================
-- C. MY DATA — the raw doctor list size and payload for the owner
-- ===========================================================================
select
  s.key,
  jsonb_typeof(s.value)                                             as value_type,
  case when jsonb_typeof(s.value) = 'array'
       then jsonb_array_length(s.value) end                         as items,
  pg_size_pretty(length(s.value::text)::bigint)                     as payload,
  s.updated_at
from public.nutrova_store s
join auth.users u on u.id = s.user_id
where lower(u.email) = 'divakar.reddy@nutrova.com'
order by s.key;


-- ===========================================================================
-- D. CONTAMINATION CHECK — did anyone else inherit MY data?
--    Flags a non-owner account whose doctor list is byte-identical to mine,
--    or whose bio carries my name / email.
-- ===========================================================================
with owner_row as (
  select s.value as doctors
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = 'divakar.reddy@nutrova.com'
    and s.key = 'nutrova-doctors-v3'
  limit 1
)
select
  u.email                                    as account,
  case
    when lower(u.email) = 'divakar.reddy@nutrova.com'             then 'owner (expected to have data)'
    when d.value is null                                          then 'fresh - no doctor row (good)'
    when (select doctors from owner_row) is not null
         and md5(d.value::text) = md5((select doctors from owner_row)::text)
                                                                  then 'CONTAMINATED - identical to owner'
    when jsonb_array_length(case when jsonb_typeof(d.value) = 'array'
                            then d.value else '[]'::jsonb end) = 0 then 'empty array (good)'
    else 'has their own doctors (good)'
  end                                        as doctors_status,
  case
    when lower(u.email) = 'divakar.reddy@nutrova.com'             then '-'
    when b.value is null                                          then 'no bio row (good)'
    when lower(coalesce(b.value ->> 'email','')) = 'divakar.reddy@nutrova.com'
                                                                  then 'CONTAMINATED - owner email in bio'
    when coalesce(b.value ->> 'name','') ilike '%divakar%'        then 'CONTAMINATED - owner name in bio'
    else 'own profile (good)'
  end                                        as bio_status
from auth.users u
left join public.nutrova_store d on d.user_id = u.id and d.key = 'nutrova-doctors-v3'
left join public.nutrova_store b on b.user_id = u.id and b.key = 'nutrova-bio-v1'
order by doctors_status, u.created_at;


-- ===========================================================================
-- E. DATA QUALITY — duplicates, missing names, duplicate phones
-- ===========================================================================
with docs as (
  select u.email,
         d ->> 'name'                                        as name,
         nullif(trim(coalesce(d ->> 'phone','')), '')        as phone
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) d
  where s.key = 'nutrova-doctors-v3'
    and lower(u.email) = 'divakar.reddy@nutrova.com'
)
select
  count(*)                                                       as total_doctors,
  count(*) filter (where trim(coalesce(name,'')) = '')           as missing_name,
  count(*) - count(distinct trim(coalesce(name,'')))              as duplicate_name_rows,
  count(*) filter (where phone is not null)
    - count(distinct phone) filter (where phone is not null)      as duplicate_phone_rows
from docs;


-- ===========================================================================
-- F. VERDICT — plain English
-- ===========================================================================
with owner_row as (
  select s.value as doctors
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = 'divakar.reddy@nutrova.com'
    and s.key = 'nutrova-doctors-v3'
  limit 1
),
owner_count as (
  select coalesce(jsonb_array_length(
           case when jsonb_typeof((select doctors from owner_row)) = 'array'
                then (select doctors from owner_row) else '[]'::jsonb end), 0) as n
),
bad_teammates as (
  select count(*) as n
  from auth.users u
  left join public.nutrova_store d on d.user_id = u.id and d.key = 'nutrova-doctors-v3'
  where lower(u.email) <> 'divakar.reddy@nutrova.com'
    and d.value is not null
    and (select doctors from owner_row) is not null
    and md5(d.value::text) = md5((select doctors from owner_row)::text)
)
select
  (select n from owner_count)                                    as my_doctors_in_cloud,
  (select n from bad_teammates)                                  as teammates_with_my_data,
  case
    when (select n from bad_teammates) > 0
      then 'ACTION: run sql/04-fresh-accounts.sql section 4 to wipe those accounts back to empty'
    when (select n from owner_count) >= 100
      then 'HEALTHY: all your doctors are in the cloud. Any missing rows in the app are a client problem - deploy the latest fixes.'
    when (select n from owner_count) > 0
      then 'PARTIAL: fewer doctors than expected. Back up first (03 section 1), then check 02 for what is actually stored.'
    else 'EMPTY: no doctor row for the owner. Restore from a nutrova_doctor_snapshots backup (03 section 5) or re-import your CSV.'
  end                                                            as what_to_do;
