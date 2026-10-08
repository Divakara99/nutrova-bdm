/* Online store — Supabase backend (auth + database) via the official JS client.
   Accounts: Supabase Auth, so passwords are hashed on the server, never on the phone.
   Data: one table `nutrova_store` where every row is locked to its owner (RLS). */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface BackendConfig {
  url: string;
  key: string;
}
export interface BackendSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  email: string;
  name: string;
  hq?: string;
}

const CFG_KEY = "nutrova-backend-cfg-v1";
const SESSION_KEY = "nutrova-backend-session-v1";
const SB_STORAGE_PREFIX = "sb-";
const RECOVERY_INTENT_KEY = "nutrova-password-reset-pending-v1";

/* Nutrova Supabase project. The publishable key is public by design — it is meant to
   ship inside the app. Data stays private because every row is protected by RLS.
   VERCEL DEPLOY: set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
   (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in Vercel → Project → Settings →
   Environment Variables, then redeploy. If those are set they win; otherwise
   the built-in Nutrova project below is used. To use a different Supabase
   project, just send the new URL + anon/publishable key and set those vars. */
const BUILTIN_URL = "https://defrdyzvtoestbjiqkaj.supabase.co";
const BUILTIN_KEY = "sb_publishable__3FND446FELWD9zzaNjKbw_arjawQLP";
const ENV_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) || "";
const ENV_KEY =
  (typeof process !== "undefined" &&
    (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  "";
const DEFAULT_URL = ENV_URL.trim() || BUILTIN_URL;
const DEFAULT_KEY = ENV_KEY.trim() || BUILTIN_KEY;

export const SETUP_SQL = `-- ============================================================
-- Nutrova Doctor Tracker — Supabase setup (safe to re-run)
-- Owner: M Divakar Reddy <divakar.reddy@nutrova.com>
--   Role: Business Development Manager · HQ: Bangalore 2
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Every account only reads/writes its own rows (RLS).
-- New accounts automatically start with a fresh, empty workspace.
-- Re-running also enables the owner's Users tab (read-only view of all accounts).
-- ============================================================

-- 1) App data table: one row per account per data key
create table if not exists public.nutrova_store (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 2) Lock every row to its owner (this is what keeps accounts separate)
alter table public.nutrova_store enable row level security;

drop policy if exists "own rows" on public.nutrova_store;
create policy "own rows" on public.nutrova_store
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2b) Project owner (M Divakar Reddy) can READ every account's rows so the
-- owner's Users tab can list accounts and view their doctors/invoices.
-- Nobody else is affected: teammates still only see their own rows, and the
-- owner still cannot write or delete anyone else's data through this policy.
drop policy if exists "owner reads all" on public.nutrova_store;
create policy "owner reads all" on public.nutrova_store
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'divakar.reddy@nutrova.com');

-- 3) Owner account details (safe: touches ONLY divakar.reddy@nutrova.com)
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || '{"name": "M Divakar Reddy", "hq": "Bangalore 2"}'::jsonb
where lower(email) = 'divakar.reddy@nutrova.com';

-- 4) Verify: RLS must be ON, and confirm who exists (read-only checks)
select relname as table_name, relrowsecurity as rls_enabled
from pg_class where relname = 'nutrova_store';
select email, created_at from auth.users order by created_at;
select count(*) as total_rows, count(distinct user_id) as accounts
from public.nutrova_store;`;

const clean = (u: string) => u.trim().replace(/\/+$/, "");

/* Supabase publishable keys always start lowercase "sb_publishable_".
   A copy/paste can capitalise the prefix, so try both spellings before giving up. */
function keyCandidates(key: string): string[] {
  const k = key.trim();
  const out = [k];
  if (/^sb_/i.test(k)) {
    out.push("sb_" + k.slice(3));
    out.push("Sb_" + k.slice(3));
  }
  return out.filter((v, i, a) => a.indexOf(v) === i);
}
const isKeyError = (msg: string) => /invalid api key|api key|apikey|bad_jwt|bad jwk|no api key/i.test(msg || "");

/* Plain-English errors for the banner + setup screen */
function friendly(msg: string): string {
  const m = msg || "";
  if (/nutrova_store|does not exist|PGRST205|42P01|schema cache/i.test(m))
    return "Table nutrova_store not found — run the SQL setup in Supabase";
  if (/row-level security|row level security|violates|new row/i.test(m))
    return "Not allowed — run the SQL setup so each user only sees their own data";
  if (/jwt|expired|not signed in|session|auth/i.test(m))
    return "Session expired — please sign in again";
  if (/failed to fetch|network|load failed|timeout/i.test(m))
    return "Cannot reach the online store — check your internet";
  return m || "Online store error";
}
const finalError = (msg: string) =>
  isKeyError(msg) ? "The online store rejected the key — check it in Setup" : friendly(msg);

/* ------------------------------- clients ------------------------------- */
const clients = new Map<string, SupabaseClient>();

function clientFor(url: string, key: string): SupabaseClient {
  const id = `${url}::${key}`;
  let c = clients.get(id);
  if (!c) {
    c = createClient(url, key, {
      // The app explicitly parses and exchanges recovery callbacks before rendering
      // the signed-in workspace. This prevents an email reset link from silently
      // taking a user straight into an existing signed-in session.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    clients.set(id, c);
  }
  return c;
}

type Ready = { ok: true; client: SupabaseClient; userId: string } | { ok: false; error: string };

/* Returns a client that has a valid session (restores ours if the app just reloaded) */
async function ready(c: SupabaseClient): Promise<Ready> {
  try {
    const cur = await c.auth.getSession();
    if (cur.data.session) return { ok: true, client: c, userId: cur.data.session.user?.id || "" };
  } catch {
    /* fall through to restoring our stored copy */
  }
  const mine = loadSession();
  if (!mine) return { ok: false, error: "Not signed in" };
  try {
    const r = await c.auth.setSession({ access_token: mine.access_token, refresh_token: mine.refresh_token });
    if (r.error || !r.data.session) return { ok: false, error: r.error?.message || "Session expired" };
    return { ok: true, client: c, userId: r.data.session.user?.id || "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Session expired" };
  }
}

function toSession(
  s: { access_token: string; refresh_token?: string; expires_at?: number; expires_in?: number },
  user?: { email?: string; user_metadata?: { name?: string; hq?: string } },
  fallbackName = ""
): BackendSession {
  const out: BackendSession = {
    access_token: s.access_token,
    refresh_token: s.refresh_token || "",
    expires_at: Number(s.expires_at) || Math.floor(Date.now() / 1000) + Number(s.expires_in || 3600),
    email: user?.email || "",
    name: user?.user_metadata?.name || fallbackName || "",
    hq: user?.user_metadata?.hq || "",
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

/* ------------------------------- config ------------------------------- */
/* The connection resolves once: Vercel env vars win, else the built-in Nutrova
   project. It can't be edited in the app, saved over on the phone, or overridden
   by a link, so the URL and key stay stable on every device. */
const LOCKED_CONFIG: BackendConfig = { url: clean(DEFAULT_URL), key: DEFAULT_KEY };

/* Vercel/Supabase status helper for Settings + deploy checks (no secrets leaked). */
export function backendSource(): { url: string; maskedKey: string; fromEnv: boolean } {
  const fromEnv = Boolean(ENV_URL.trim() && ENV_KEY.trim());
  return { url: clean(DEFAULT_URL), maskedKey: maskKey(DEFAULT_KEY), fromEnv };
}

export function readConfig(): BackendConfig {
  try {
    /* older versions could save a different connection on the phone — drop it */
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) {
      localStorage.removeItem(CFG_KEY);
      const old = JSON.parse(raw);
      if (old?.url && clean(String(old.url)) !== LOCKED_CONFIG.url) clearSession();
    }
  } catch {
    /* ignore */
  }
  try {
    /* older share links carried a connection in the address (#cfg=…) — ignore it and tidy the address */
    if (/cfg=/.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch {
    /* ignore */
  }
  return { ...LOCKED_CONFIG };
}

/* For display only, e.g. "sb_publishable_••••••••wQLP" */
export function maskKey(key: string): string {
  const k = (key || "").trim();
  if (k.length <= 12) return "••••••••";
  const head = k.match(/^sb_(publishable|secret)_/i)?.[0] || k.slice(0, 6);
  return `${head}••••••••${k.slice(-4)}`;
}

/* ------------------------------- session ------------------------------- */
export function loadSession(): BackendSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as BackendSession;
  } catch {
    /* ignore */
  }
  return null;
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SB_STORAGE_PREFIX)) drop.push(k);
    }
    drop.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/* ------------------------------- auth ------------------------------- */
export async function signUpRemote(
  cfg: BackendConfig,
  name: string,
  email: string,
  password: string,
  hq = ""
): Promise<{ session: BackendSession | null; needsConfirm: boolean }> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.signUp({ email, password, options: { data: { name, hq } } });
      if (!error) {
        if (data.session) return { session: toSession(data.session, data.user ?? undefined, name), needsConfirm: false };
        return { session: null, needsConfirm: true };
      }
      last = error.message;
      if (!isKeyError(last)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : "Could not create account";
      if (!isKeyError(last)) break;
    }
  }
  throw new Error(finalError(last));
}

export async function signInRemote(cfg: BackendConfig, email: string, password: string): Promise<BackendSession> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (!error && data.session) return toSession(data.session, data.user ?? undefined);
      last = error?.message || "Sign in failed";
      if (!isKeyError(last)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : "Sign in failed";
      if (!isKeyError(last)) break;
    }
  }
  throw new Error(finalError(last));
}

/* Forgot password: Supabase emails the user a reset link.
   The link opens this app again (redirectTo), carrying a recovery session in the URL hash. */
export async function requestPasswordReset(cfg: BackendConfig, email: string): Promise<void> {
  let redirectTo: string | undefined;
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    // Marker keeps the app on the reset flow even if an old Supabase session exists.
    url.searchParams.set("auth", "recovery");
    redirectTo = url.toString();
  } catch {
    redirectTo = undefined;
  }
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      // Preserve the reset intent across the Supabase email redirect. This prevents
      // an older cached login session from skipping straight into the app.
      try { localStorage.setItem(RECOVERY_INTENT_KEY, email.toLowerCase()); } catch { /* ignore */ }
      const { error } = await c.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      if (!error) return;
      try { localStorage.removeItem(RECOVERY_INTENT_KEY); } catch { /* ignore */ }
      last = error.message;
      if (!isKeyError(last)) break;
    } catch (e) {
      try { localStorage.removeItem(RECOVERY_INTENT_KEY); } catch { /* ignore */ }
      last = e instanceof Error ? e.message : "Could not send reset link";
      if (!isKeyError(last)) break;
    }
  }
  if (/redirect|url/i.test(last)) throw new Error("Reset email blocked — add this app's address in Supabase Authentication → URL Configuration");
  throw new Error(finalError(last));
}

/* When the user opens the reset link, the URL hash holds a recovery session.
   Pick it up once (without signing in yet) so the app can show a "set new password" screen. */
export function pendingRecoveryTokens(): { access_token: string; refresh_token: string } | null {
  try {
    const h = window.location.hash || "";
    if (!/type=recovery/.test(h)) return null;
    const params = new URLSearchParams(h.replace(/^#/, ""));
    const at = params.get("access_token") || "";
    const rt = params.get("refresh_token") || "";
    if (at && rt) return { access_token: at, refresh_token: rt };
  } catch {
    /* ignore */
  }
  return null;
}

export function clearUrlHash() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    /* ignore */
  }
}

/* Adopt the recovery session, then the new password can be set via updatePasswordRemote */
export async function adoptRecoverySession(
  cfg: BackendConfig,
  tokens: { access_token: string; refresh_token: string }
): Promise<BackendSession> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.setSession(tokens);
      if (!error && data.session) {
        clearUrlAuthParams();
        return toSession(data.session, data.session.user ?? undefined);
      }
      last = error?.message || "Reset link expired";
      if (!isKeyError(last)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : "Reset link expired";
      if (!isKeyError(last)) break;
    }
  }
  if (/expired|invalid/i.test(last)) throw new Error("Reset link expired — please request a new one");
  throw new Error(finalError(last));
}

/* Which password-recovery link (if any) did this page load with?
   Supabase sends different shapes depending on project/client flow:
   - #access_token=…&refresh_token=…&type=recovery (older implicit flow)
   - ?code=… (current PKCE flow)
   - ?token_hash=…&type=recovery (some email templates)
   - #error=… or ?error=… (expired / already-used link) */
export type UrlRecoverySignal =
  | { kind: "hash-tokens"; access_token: string; refresh_token: string }
  | { kind: "code"; code: string }
  | { kind: "token-hash"; token_hash: string }
  | { kind: "marker" }
  | { kind: "error"; message: string };

export function getUrlRecoverySignal(): UrlRecoverySignal | null {
  try {
    const pendingIntent = !!localStorage.getItem(RECOVERY_INTENT_KEY);
    const h = window.location.hash || "";
    if (h) {
      const hp = new URLSearchParams(h.replace(/^#/, ""));
      const herr = hp.get("error_description") || hp.get("error") || "";
      if (herr) return { kind: "error", message: herr };
      const hType = hp.get("type") || hp.get("auth") || "";
      const at = hp.get("access_token") || "";
      const rt = hp.get("refresh_token") || "";
      if (at && rt && (hType === "recovery" || hType === "reset" || pendingIntent)) return { kind: "hash-tokens", access_token: at, refresh_token: rt };
      const hc = hp.get("code") || "";
      if (hc && (hType === "recovery" || hType === "reset" || pendingIntent)) return { kind: "code", code: hc };
      if (hType === "recovery" || hType === "reset" || pendingIntent) return { kind: "marker" };
    }
    const q = window.location.search || "";
    if (q) {
      const qp = new URLSearchParams(q);
      const qerr = qp.get("error_description") || qp.get("error_message") || qp.get("error") || "";
      if (qerr) return { kind: "error", message: qerr };
      const qType = qp.get("type") || qp.get("auth") || "";
      // Supabase implicit-flow/custom templates may put the recovery tokens in
      // the query string instead of the fragment.
      const qat = qp.get("access_token") || "";
      const qrt = qp.get("refresh_token") || "";
      if (qat && qrt && (qType === "recovery" || qType === "reset" || pendingIntent)) return { kind: "hash-tokens", access_token: qat, refresh_token: qrt };
      const code = qp.get("code") || "";
      if (code && (qType === "recovery" || qType === "reset" || pendingIntent)) return { kind: "code", code };
      const th = qp.get("token_hash") || "";
      if (th && (qType === "recovery" || qType === "reset" || pendingIntent)) return { kind: "token-hash", token_hash: th };
      if (qType === "recovery" || qType === "reset" || pendingIntent) return { kind: "marker" };
    }
    // Same-device recovery marker: handles Supabase redirects that strip auth params.
    if (pendingIntent) return { kind: "marker" };
  } catch {
    /* ignore */
  }
  return null;
}

/* Wipe single-use auth leftovers (codes, tokens, errors) from the address bar */
export function clearUrlAuthParams() {
  try {
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    /* ignore */
  }
  try { localStorage.removeItem(RECOVERY_INTENT_KEY); } catch { /* ignore */ }
}

/* Exchange a ?code= recovery link for a session (must open on the same phone/browser that requested it) */
export async function exchangeRecoveryCode(cfg: BackendConfig, code: string): Promise<BackendSession> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        clearUrlAuthParams();
        return toSession(data.session, data.session.user ?? undefined);
      }
      last = error?.message || "Reset link expired";
      if (!isKeyError(last)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : "Reset link expired";
      if (!isKeyError(last)) break;
    }
  }
  if (/expired|invalid|used|verifier|non-empty|not found/i.test(last))
    throw new Error("Reset link expired or was opened on a different phone — please request a new link");
  throw new Error(finalError(last));
}

/* Verify a ?token_hash= recovery link */
export async function verifyRecoveryTokenHash(cfg: BackendConfig, token_hash: string): Promise<BackendSession> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.verifyOtp({ type: "recovery", token_hash });
      if (!error && data.session) {
        clearUrlAuthParams();
        return toSession(data.session, data.session.user ?? undefined);
      }
      last = error?.message || "Reset link expired";
      if (!isKeyError(last)) break;
    } catch (e) {
      last = e instanceof Error ? e.message : "Reset link expired";
      if (!isKeyError(last)) break;
    }
  }
  if (/expired|invalid|used/i.test(last)) throw new Error("Reset link expired — please request a new one");
  throw new Error(finalError(last));
}

/* Some email templates complete the Supabase verify step before redirecting and
   return to the app with a recovery session already established but no URL token. */
export async function getRecoverySession(cfg: BackendConfig): Promise<BackendSession | null> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.getSession();
      if (!error && data.session) return toSession(data.session, data.session.user ?? undefined);
      if (error) {
        last = error.message;
        if (!isKeyError(last)) break;
      }
    } catch (e) {
      last = e instanceof Error ? e.message : "Could not read recovery session";
      if (!isKeyError(last)) break;
    }
  }
  if (last && isKeyError(last)) throw new Error(finalError(last));
  return null;
}

/* React to Supabase's recovery event as an additional safety net for email links. */
export function listenForPasswordRecovery(
  cfg: BackendConfig,
  onRecovery: (session: BackendSession) => void
): () => void {
  const c = clientFor(cfg.url, cfg.key);
  const { data } = c.auth.onAuthStateChange((event, session) => {
    let hasPendingIntent = false;
    try { hasPendingIntent = !!localStorage.getItem(RECOVERY_INTENT_KEY); } catch { /* ignore */ }
    // Supabase normally emits PASSWORD_RECOVERY. Some email callback flows emit
    // SIGNED_IN instead; the pending reset marker safely disambiguates that path.
    if ((event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && hasPendingIntent)) && session) {
      onRecovery(toSession(session, session.user ?? undefined));
    }
  });
  return () => data.subscription.unsubscribe();
}

/* Clear any old SDK session before beginning a password reset. */
export async function signOutRemote(cfg: BackendConfig): Promise<void> {
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    const { error } = await c.auth.signOut({ scope: "local" });
    if (!error || !isKeyError(error.message)) break;
  }
  clearSession();
}

/* Change the signed-in user's password on the server */
export async function updatePasswordRemote(cfg: BackendConfig, password: string): Promise<void> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const r = await ready(clientFor(cfg.url, key));
    if (!r.ok) {
      last = r.error;
      if (isKeyError(last)) continue;
      throw new Error(friendly(last));
    }
    const { error } = await r.client.auth.updateUser({ password }).catch((e: unknown) => ({
      error: { message: e instanceof Error ? e.message : "Could not update password" },
    }));
    if (!error) return;
    last = error.message || "Could not update password";
    if (isKeyError(last)) continue;
    if (/different from the old|same.?password/i.test(last)) throw new Error("New password must be different from your current password");
    if (/reauthenticat/i.test(last)) throw new Error("For security, sign out and sign in again, then change your password");
    throw new Error(friendly(last));
  }
  throw new Error(finalError(last));
}

/* ------------------------------- data ------------------------------- */
export async function fetchAll(cfg: BackendConfig): Promise<Record<string, unknown>> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const r = await ready(clientFor(cfg.url, key));
    if (!r.ok) {
      last = r.error;
      if (isKeyError(last)) continue;
      throw new Error(friendly(last));
    }
    try {
      const res = await r.client.from("nutrova_store").select("key,value");
      if (res.error) {
        last = res.error.message;
        if (isKeyError(last)) continue;
        throw new Error(friendly(last));
      }
      const out: Record<string, unknown> = {};
      (res.data || []).forEach((row) => {
        const k = String((row as { key: string }).key);
        out[k] = (row as { value: unknown }).value;
      });
      return out;
    } catch (e) {
      if (e instanceof Error && isKeyError(e.message)) {
        last = e.message;
        continue;
      }
      throw e instanceof Error ? new Error(friendly(e.message)) : e;
    }
  }
  throw new Error(finalError(last));
}

export async function saveKey(cfg: BackendConfig, rowKey: string, value: unknown): Promise<void> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const r = await ready(clientFor(cfg.url, key));
    if (!r.ok) {
      last = r.error;
      if (isKeyError(last)) continue;
      throw new Error(friendly(last));
    }
    try {
      const { error } = await r.client.from("nutrova_store").upsert(
        { user_id: r.userId, key: rowKey, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );
      if (error) {
        last = error.message;
        if (isKeyError(last)) continue;
        throw new Error(friendly(last));
      }
      return;
    } catch (e) {
      if (e instanceof Error && isKeyError(e.message)) {
        last = e.message;
        continue;
      }
      throw e instanceof Error ? new Error(friendly(e.message)) : e;
    }
  }
  throw new Error(finalError(last));
}

/* ------------------------- owner: all-users view ------------------------- */
export interface TeamRosterRow {
  userId: string;
  bio: Record<string, unknown>;
  updatedAt: string;
}

/* Owner-only: list every account's profile row. Works only after the
   "owner reads all" policy from SETUP_SQL has been run in Supabase. */
export async function fetchOwnerRoster(cfg: BackendConfig): Promise<TeamRosterRow[]> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const r = await ready(clientFor(cfg.url, key));
    if (!r.ok) {
      last = r.error;
      if (isKeyError(last)) continue;
      throw new Error(friendly(last));
    }
    try {
      const res = await r.client
        .from("nutrova_store")
        .select("user_id,value,updated_at")
        .eq("key", "nutrova-bio-v1")
        .order("updated_at", { ascending: false });
      if (res.error) {
        last = res.error.message;
        if (isKeyError(last)) continue;
        throw new Error(friendly(last));
      }
      return (res.data || []).map((row) => ({
        userId: String((row as { user_id: string }).user_id),
        bio: (((row as { value: unknown }).value || {}) as Record<string, unknown>),
        updatedAt: String((row as { updated_at: string }).updated_at || ""),
      }));
    } catch (e) {
      if (e instanceof Error && isKeyError(e.message)) {
        last = e.message;
        continue;
      }
      throw e instanceof Error ? new Error(friendly(e.message)) : e;
    }
  }
  throw new Error(finalError(last));
}

/* Owner-only: load one team member's full workspace (bio, doctors, patches, reminders, payments). */
export async function fetchUserWorkspace(cfg: BackendConfig, userId: string): Promise<Record<string, unknown>> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const r = await ready(clientFor(cfg.url, key));
    if (!r.ok) {
      last = r.error;
      if (isKeyError(last)) continue;
      throw new Error(friendly(last));
    }
    try {
      const res = await r.client.from("nutrova_store").select("key,value").eq("user_id", userId);
      if (res.error) {
        last = res.error.message;
        if (isKeyError(last)) continue;
        throw new Error(friendly(last));
      }
      const out: Record<string, unknown> = {};
      (res.data || []).forEach((row) => {
        out[String((row as { key: string }).key)] = (row as { value: unknown }).value;
      });
      return out;
    } catch (e) {
      if (e instanceof Error && isKeyError(e.message)) {
        last = e.message;
        continue;
      }
      throw e instanceof Error ? new Error(friendly(e.message)) : e;
    }
  }
  throw new Error(finalError(last));
}
