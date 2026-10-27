-- ============================================================================
-- NUTROVA DOCTOR TRACKER — EXTRACT ALL DOCTORS (READ-ONLY)
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Turns the jsonb array in nutrova_store.value into one clean ROW PER DOCTOR,
-- so you can eyeball all 101, sort, or download them as CSV
-- (SQL Editor has a "Download CSV" / export button on the results grid).
--
-- >>> To export EVERY account's doctors, set the email below to null. <<<
-- ============================================================================

with params as (
  select 'divakar.reddy@nutrova.com'::text as email   -- <-- null = all accounts
),
docs as (
  select
    u.email                                              as account,
    s.updated_at,
    d                                                    as doc
  from public.nutrova_store s
  join auth.users u  on u.id = s.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
  ) d
  cross join params p
  where s.key = 'nutrova-doctors-v3'
    and (p.email is null or lower(u.email) = lower(p.email))
)
select
  row_number() over (order by account, trim(doc ->> 'name'))          as "#",
  trim(coalesce(doc ->> 'name', ''))                                  as doctor_name,
  coalesce(doc ->> 'specialty', '')                                   as specialty,
  coalesce(doc ->> 'qualification', '')                               as qualification,
  coalesce(doc ->> 'clinic', '')                                      as clinic,
  coalesce(doc ->> 'area', '')                                        as area_patch,
  coalesce(doc ->> 'city', '')                                        as city,
  coalesce(doc ->> 'phone', '')                                       as phone,
  coalesce(doc ->> 'email', '')                                       as email,
  coalesce(doc ->> 'priority', '')                                    as priority,
  coalesce(doc ->> 'frequency', '')                                   as frequency,
  coalesce(doc ->> 'patchId', '')                                     as patch_id,

  -- call days: ["Mon","Tue"] -> "Mon · Tue"
  (select string_agg(t, ' · ' order by ord)
     from jsonb_array_elements_text(
            case when jsonb_typeof(doc -> 'callDays') = 'array'
                 then doc -> 'callDays' else '[]'::jsonb end
          ) with ordinality as a(t, ord))                             as call_days,

  -- monthly calls: ["1st Tuesday"] -> "1st Tuesday"
  (select string_agg(t, ' · ' order by ord)
     from jsonb_array_elements_text(
            case when jsonb_typeof(doc -> 'monthlyCalls') = 'array'
                 then doc -> 'monthlyCalls' else '[]'::jsonb end
          ) with ordinality as a(t, ord))                             as monthly_calls,

  coalesce(doc ->> 'callTimeFrom', '') || ' - ' ||
  coalesce(doc ->> 'callTimeTo', '')                                  as call_time,

  -- appointment modes
  (select string_agg(t, ' · ' order by ord)
     from jsonb_array_elements_text(
            case when jsonb_typeof(doc -> 'appointmentModes') = 'array'
                 then doc -> 'appointmentModes' else '[]'::jsonb end
          ) with ordinality as a(t, ord))                             as appointment_modes,
  coalesce(doc ->> 'appointmentContact', '')                          as appointment_contact,
  coalesce(doc ->> 'appointmentPhone', '')                            as appointment_phone,
  coalesce(doc ->> 'appointmentLead', '')                             as appointment_lead,
  coalesce(doc ->> 'appointmentNote', '')                             as appointment_note,

  -- focus / follow-up products
  (select string_agg(t, ' · ' order by ord)
     from jsonb_array_elements_text(
            case when jsonb_typeof(doc -> 'focusProducts') = 'array'
                 then doc -> 'focusProducts' else '[]'::jsonb end
          ) with ordinality as a(t, ord))                             as focus_products,
  (select string_agg(t, ' · ' order by ord)
     from jsonb_array_elements_text(
            case when jsonb_typeof(doc -> 'followProducts') = 'array'
                 then doc -> 'followProducts' else '[]'::jsonb end
          ) with ordinality as a(t, ord))                             as follow_products,

  coalesce(doc ->> 'lastVisit', '')                                   as last_visit,
  coalesce(doc ->> 'nextVisit', '')                                   as next_visit,
  coalesce(doc ->> 'notes', '')                                       as notes,
  coalesce(doc ->> 'id', '')                                          as doctor_id,
  updated_at                                                          as cloud_updated_at,
  account
from docs
order by account, doctor_name;

-- ---------------------------------------------------------------------------
-- TOTALS — confirm the count the app should be showing
-- ---------------------------------------------------------------------------
with docs as (
  select u.email as account, d as doc
  from public.nutrova_store s
  join auth.users u on u.id = s.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
  ) d
  where s.key = 'nutrova-doctors-v3'
)
select account,
       count(*)                                    as doctors,
       count(*) filter (where trim(coalesce(doc ->> 'name','')) = '') as missing_name,
       count(distinct trim(coalesce(doc ->> 'name','')))              as distinct_names
from docs
group by account
order by doctors desc;

-- ---------------------------------------------------------------------------
-- ONE-CELL EXPORT — the whole array as a single jsonb value you can copy
-- out in one click (useful for a manual backup before any change).
-- ---------------------------------------------------------------------------
select jsonb_pretty(s.value) as doctors_json
from public.nutrova_store s
join auth.users u on u.id = s.user_id
where s.key = 'nutrova-doctors-v3'
  and lower(u.email) = 'divakar.reddy@nutrova.com';
