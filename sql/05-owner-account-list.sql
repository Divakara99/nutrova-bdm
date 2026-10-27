-- ============================================================================
-- NUTROVA DOCTOR TRACKER — OWNER ACCOUNT LIST  (run once)
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- WHY THIS IS NEEDED
-- The Users tab is fed by fetchOwnerRoster(), which selects rows from
-- public.nutrova_store where key = 'nutrova-bio-v1'. An account that signed up
-- but never saved a workspace has NO rows, so it could never appear — e.g.
-- sneha.k@nutrova.com was confirmed and had signed in, yet was invisible.
--
-- The browser cannot read auth.users (only a service_role key can, and that
-- must never ship to a client). So this function exposes exactly the fields
-- the Users tab needs, and ONLY to the project owner.
--
-- Safety:
--   * SECURITY DEFINER  — runs with the privilege to read auth.users.
--   * search_path pinned — a caller cannot hijack it with their own schema.
--   * Ownership check INSIDE the function — the JWT email must match, so a
--     teammate calling it directly gets zero rows, not an error they could
--     probe with.
--   * Read-only: returns email / dates / booleans. No password hashes, no
--     provider tokens, no user metadata beyond the display name.
-- ============================================================================

create or replace function public.owner_list_accounts()
returns table (
  user_id          uuid,
  email            text,
  display_name     text,
  hq               text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  email_confirmed  boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'name', '')::text,
    coalesce(u.raw_user_meta_data ->> 'hq', '')::text,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at is not null)
  from auth.users u
  where lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'divakar.reddy@nutrova.com'
  order by u.created_at;
$$;

revoke all on function public.owner_list_accounts() from public;
grant execute on function public.owner_list_accounts() to authenticated;

-- VERIFY: expect a single row for the owner that returns the account list.
select * from public.owner_list_accounts();
