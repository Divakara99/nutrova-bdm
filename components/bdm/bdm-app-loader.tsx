"use client";

/* HYDRATION + STUCK-SCREEN FIX.

   1) Hydration: bdm-app.tsx reads localStorage inside useState initialisers,
      so the server renders the login screen while the client renders the
      signed-in dashboard. We therefore render the SAME splash on the server
      and on the first client render, then mount the real app afterwards.

   2) Stuck "Loading your workspace…": if the app chunk fails to execute
      (a stale service worker serving HTML in place of JS was the cause),
      the splash would hang forever. Now:
        - we flag window.__NUTROVA_MOUNTED__ so the layout watchdog stands down
        - a 6s timer surfaces a visible "Reset & reload" escape hatch
        - an error boundary catches render crashes instead of hanging */

import { Component, useEffect, useState, type ReactNode } from "react";
import BdmApp from "./bdm-app";

async function hardReset() {
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem("nutrova-sw-recovered-v1");
  } catch {
    /* ignore */
  }
  location.reload();
}

function Splash({ slow, onReset }: { slow?: boolean; onReset?: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/95 px-8 py-10 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M11 2v2" />
            <path d="M5 2v2" />
            <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
            <path d="M8 15a6 6 0 0 0 12 0v-3" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Nutrova Doctor Tracker</p>
        <p className="mt-1 text-xs font-semibold text-emerald-800">
          {slow ? "Still loading — old cached files may be stuck." : "Loading your workspace…"}
        </p>
        {slow && (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800"
          >
            Reset &amp; reload
          </button>
        )}
        {slow && (
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            Clears cached files only. Your account and data stay safe in the cloud.
          </p>
        )}
      </div>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <Splash slow onReset={hardReset} />;
    return this.props.children;
  }
}

export function BdmAppLoader() {
  const [mounted, setMounted] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      (window as unknown as { __NUTROVA_MOUNTED__?: boolean }).__NUTROVA_MOUNTED__ = true;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (mounted) return;
    const t = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(t);
  }, [mounted]);

  if (!mounted) return <Splash slow={slow} onReset={hardReset} />;
  return (
    <Boundary>
      <BdmApp />
    </Boundary>
  );
}
