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
}

const CFG_KEY = "nutrova-backend-cfg-v1";
const SESSION_KEY = "nutrova-backend-session-v1";
const SB_STORAGE_PREFIX = "sb-";

/* Nutrova Supabase project. The publishable key is public by design — it is meant to
   ship inside the app. Data stays private because every row is protected by RLS. */
const DEFAULT_URL = "https://defrdyzvtoestbjiqkaj.supabase.co";
const DEFAULT_KEY = "sb_publishable__3FND446FELWD9zzaNjKbw_arjawQLP";

export const SETUP_SQL = `create table if not exists public.nutrova_store (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.nutrova_store enable row level security;

drop policy if exists "own rows" on public.nutrova_store;
create policy "own rows" on public.nutrova_store
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

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
  user?: { email?: string; user_metadata?: { name?: string } },
  fallbackName = ""
): BackendSession {
  const out: BackendSession = {
    access_token: s.access_token,
    refresh_token: s.refresh_token || "",
    expires_at: Number(s.expires_at) || Math.floor(Date.now() / 1000) + Number(s.expires_in || 3600),
    email: user?.email || "",
    name: user?.user_metadata?.name || fallbackName || "",
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

/* ------------------------------- config ------------------------------- */
export function readConfig(): BackendConfig | null {
  /* a shared link can carry the connection: #cfg=<base64 json> */
  try {
    const m = window.location.hash.match(/cfg=([^&]+)/);
    if (m) {
      const json = JSON.parse(atob(decodeURIComponent(m[1])));
      if (json?.url && json?.key) {
        localStorage.setItem(CFG_KEY, JSON.stringify({ url: clean(json.url), key: String(json.key).trim() }));
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c?.url && c?.key) return { url: clean(c.url), key: String(c.key).trim() };
    }
  } catch {
    /* ignore */
  }
  if (DEFAULT_URL && DEFAULT_KEY) return { url: clean(DEFAULT_URL), key: DEFAULT_KEY };
  return null;
}
export function saveConfig(c: BackendConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: clean(c.url), key: c.key.trim() }));
}
export function clearConfig() {
  localStorage.removeItem(CFG_KEY);
  clearSession();
}
export function shareHash(c: BackendConfig): string {
  return "#cfg=" + encodeURIComponent(btoa(JSON.stringify({ url: clean(c.url), key: c.key.trim() })));
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
  password: string
): Promise<{ session: BackendSession | null; needsConfirm: boolean }> {
  let last = "";
  for (const key of keyCandidates(cfg.key)) {
    const c = clientFor(cfg.url, key);
    try {
      const { data, error } = await c.auth.signUp({ email, password, options: { data: { name } } });
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
