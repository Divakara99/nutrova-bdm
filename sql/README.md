# SQL kit — Nutrova Doctor Tracker

Queries for the Supabase project behind the app. Open **Supabase Dashboard → SQL Editor → New query**, paste a file's contents, press **Run**. Each file is independent; run them in the order below.

Schema (from `components/bdm/backend.ts` → `SETUP_SQL`):

```
public.nutrova_store (
  user_id     uuid  default auth.uid(),  -- references auth.users(id)
  key         text,                      -- which dataset
  value       jsonb,                     -- the whole array/object
  updated_at  timestamptz,
  primary key (user_id, key)
)
```

| `key` | Contents |
|---|---|
| `nutrova-doctors-v3` | jsonb **array** of doctor objects — your 101 |
| `nutrova-patches-v2` | jsonb array of patches/areas |
| `nutrova-reminders-v1` | jsonb array of reminders |
| `nutrova-payments-v3` | jsonb array of invoices / POs |
| `nutrova-bio-v1` | jsonb object (profile) |

## Start here

| File | Writes? | Use it to |
|---|---|---|
| `01-diagnose.sql` | No | Find out whether the 101 doctors are actually in the cloud, and whether RLS is healthy |
| `02-extract-doctors.sql` | No | Flatten the jsonb into one row per doctor; sort, inspect, **download as CSV** |
| `03-backup-repair-restore.sql` | Yes | Backup, re-assert schema + RLS, then restore/merge if data got replaced |

## Decision tree

Run `01-diagnose.sql` first. Step 3 of it is the decisive one:

- **doctors = 101** but the app shows fewer → the data is fine; it's a client/RLS visibility problem. Go to `03` (Step 2 re-asserts the policies; also check that the signed-in email is exactly `divakar.reddy@nutrova.com`).
- **doctors = 8** → the live row holds only the built-in sample doctors. Your real list never reached the cloud, or was overwritten. `03` Step 1 snapshots what's there, Step 6 merges an older backup back in.
- **doctors = 0 / no row** → the row was never written, or was deleted. Restore from `03` Step 1b snapshots, or re-import the CSV you exported with `02`.
- **policy missing / `rls_enabled = false`** → run `03` Step 2.
- **`has_case_or_space = true`** → the owner-read policy compares the JWT email string; fix with `03` Step 4.

## Things to know

- The SQL Editor connects as `postgres`, so **RLS is bypassed** and you see every account's rows. That's intentional — it's how you separate "data is gone" from "app can't see it".
- `01` and `02` are read-only. `03` writes, but every write starts with a backup and is idempotent, and the destructive restore/merge blocks are **commented out** — uncomment deliberately.
- Restoring overwrites the live array. The app saves on every edit, so do restores while the app is closed on all devices, otherwise a stale browser tab can save its old copy back over your restore.
- The optional restore/merge steps are wrapped in `begin; … commit;`. The `select` between them is your check — if the count looks wrong, run `rollback;` instead of `commit;`.
- `xlsx`/CSV re-import path: the app accepts the same columns as `02` outputs (Name, Specialty, Qualification, Clinic, Area/Patch, City, Phone, Email, Priority, Frequency, Call Days, Monthly Calls, Call Time, Appointment Modes, Appointment Lead, Appointment Contact, Appointment Phone, Appointment Note, Focus Products, Follow-up Products, Last Visit, Next Visit, Notes).

## Validated

All three files were executed against a real PostgreSQL 16 instance with a stubbed `auth` schema, 101 seeded doctors, a second teammate account, and a deliberately malformed jsonb value. Result: 0 errors, `01` reports `rls_enabled = t`, `02` returns all 101 rows flattened with arrays joined to readable text, `03` creates both backup tables and both policies, and the doctor count query returns **101**.
