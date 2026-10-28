"use client";

/* ZERO-BLINK FIRST PAINT + SELF-HEALING LOADER.

   Why the page used to flash/blink on refresh:
   1) Server HTML previously rendered a full-screen dark emerald (#022c22)
      centered splash card ("Loading your workspace…"), then swapped to the
      white .app-shell after mount — flashing dark green -> white on every
      refresh for signed-in users.
   2) BdmAppLoader also gated <BdmApp /> behind BOTH a `mounted` useEffect
      state flip AND `next/dynamic(..., { ssr: false })`, forcing a double
      client waterfall before the app chunk even started downloading, and
      prematurely setting window.__NUTROVA_MOUNTED__ = true before BdmApp loaded.

   How it works now:
   - app/layout.tsx sets html[data-nutrova-boot="in"|"out"] synchronously in
     <head> before <body> paints.
   - BootShell renders both shells in static HTML; pure CSS reveals ONLY the
     matching shell on Frame 1 (0ms) with zero React hydration mismatch:
       * signed in  -> pixel-identical white .app-shell + header + nav + footer
       * signed out -> pixel-identical emerald login card shell
   - We kick off `import("./bdm-app")` immediately on client module evaluation
     in parallel with hydration, and BdmApp sets window.__NUTROVA_MOUNTED__
     only after it actually mounts. */

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Clock, Cloud, Mail, Menu, Sparkles, Stethoscope, UserPlus, Wallet } from "lucide-react";

if (typeof window !== "undefined") {
  void import("./bdm-app");
}

const BdmApp = dynamic(() => import("./bdm-app"), {
  ssr: false,
  loading: () => <BootShell />,
});

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

export function DashboardSkeleton() {
  return (
    <>
      <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                <CalendarClock className="h-4 w-4" /> Giving calls today
              </p>
              <div className="mt-2 h-4 w-48 animate-pulse rounded-lg bg-emerald-100/80" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-emerald-200/70" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-emerald-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-emerald-100 pt-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="h-7 w-28 animate-pulse rounded-full bg-emerald-50 ring-1 ring-emerald-200/60" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-emerald-50 ring-1 ring-emerald-200/60" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-50 ring-1 ring-slate-200/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-700">
                <Wallet className="h-4 w-4" /> Payment pending days
              </p>
              <div className="mt-2 h-4 w-52 animate-pulse rounded-lg bg-amber-100/70" />
            </div>
            <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/60 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
              <Clock className="h-4 w-4" /> Today&apos;s field plan
            </p>
            <div className="mt-2.5 h-4 w-56 max-w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </>
  );
}

function SlowResetCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-center sm:p-6">
      <p className="text-sm font-extrabold text-slate-900">
        Still loading — old cached files may be stuck.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 w-full max-w-xs rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800"
      >
        Reset &amp; reload
      </button>
      <p className="mt-2 text-[11px] font-medium text-slate-500">
        Clears cached files only. Your account and data stay safe in the cloud.
      </p>
    </div>
  );
}

function BootShell({ forceSlow = false }: { forceSlow?: boolean }) {
  const [slow, setSlow] = useState(forceSlow);

  useEffect(() => {
    if (forceSlow) return;
    const t = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(t);
  }, [forceSlow]);

  return (
    <>
      {/* 1) Signed-in first-paint shell: matches BdmApp's .app-shell 1:1 */}
      <div className="boot-signed-in app-shell bg-white text-slate-900">
        <div className="sticky top-0 z-40">
          <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white">
            <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                <div className="mt-0.5 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-black leading-[1.15] tracking-tight text-[24px] break-words sm:text-[31px]">
                    Nutrova Doctor Tracker
                  </h1>
                  <p className="text-emerald-100/90 mt-1 text-[13px] leading-relaxed sm:text-[15px]">
                    <span className="block">
                      Created by{" "}
                      <span className="font-bold text-white underline decoration-emerald-300/60 underline-offset-2">
                        M Divakar Reddy
                      </span>
                    </span>
                    <span className="block">
                      Business Development Manager
                      <span className="mx-1.5 text-emerald-300/60">·</span>
                      <span className="font-bold text-white">Nutrova</span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-100/90 bg-white/10 px-3 py-1.5 rounded-full ring-1 ring-white/15">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  <span className="max-w-[190px] truncate">divakar.reddy@nutrova.com</span>
                </span>
              </div>
            </div>
          </header>

          <nav className="border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-8 py-3">
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-700 px-3.5 sm:px-5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-200">
                Dashboard
              </span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 sm:px-5 py-2 text-sm font-bold text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                AI Copilot
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 sm:px-4 py-2 text-sm font-bold text-white">
                  <Menu className="h-4 w-4" />
                  <span className="hidden sm:inline">Menu</span>
                </span>
              </div>
            </div>
          </nav>
        </div>

        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 pb-32 sm:pb-40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              <Cloud className="h-3.5 w-3.5 text-emerald-600 anim-pulse-soft" /> Syncing…
            </span>
          </div>
          {slow && <SlowResetCard onReset={hardReset} />}
          <DashboardSkeleton />
        </main>

        <footer className="mt-10 sm:mt-14 bg-emerald-950 text-white">
          <div className="mx-auto w-full max-w-7xl px-5 py-5 text-center sm:px-8">
            <p className="flex items-center justify-center gap-2 text-sm font-extrabold">
              <Stethoscope className="h-4 w-4 shrink-0 text-emerald-300" /> Nutrova Doctor Tracker
            </p>
            <p className="mt-1 text-[11px] leading-snug text-emerald-100/70">
              App created by <span className="font-extrabold text-amber-300">M Divakar Reddy</span>
              <span className="mx-1 text-emerald-300/60">·</span>
              Business Development Manager
            </p>
            <p className="mt-1 text-[11px] font-medium">
              <a
                className="break-words text-emerald-50 underline underline-offset-2 hover:text-emerald-200"
                href="mailto:divakar.reddy@nutrova.com"
              >
                divakar.reddy@nutrova.com
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* 2) Signed-out first-paint shell: matches BdmApp's Login card 1:1 */}
      <div className="boot-signed-out min-h-screen min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4 sm:p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-emerald-950 px-6 pb-6 pt-7 text-white sm:px-8 sm:pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Stethoscope className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">Nutrova Doctor Tracker</p>
                <p className="mt-1 text-xs leading-snug text-emerald-200/80">
                  App created by{" "}
                  <span className="font-extrabold uppercase tracking-wide text-amber-300">
                    M Divakar Reddy
                  </span>
                </p>
                <p className="text-[11px] font-semibold leading-snug text-emerald-100/70">
                  Business Development Manager at Bangalore 2 HQ
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/15">
              <span className="rounded-xl bg-white px-2 py-2.5 text-center text-xs font-extrabold text-emerald-900 shadow sm:text-sm">
                Sign in
              </span>
              <span className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-extrabold text-emerald-100/70 sm:text-sm">
                <UserPlus className="h-4 w-4 shrink-0" /> Create account
              </span>
            </div>
          </div>

          <div className="px-6 pt-4 sm:px-8">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-100">
              <Cloud className="h-4 w-4 shrink-0" /> Online store connected — your data is saved in the cloud
            </p>
          </div>

          <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
            {slow ? (
              <SlowResetCard onReset={hardReset} />
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 rounded bg-slate-200" />
                  <div className="h-11 w-full animate-pulse rounded-2xl border border-emerald-200 bg-emerald-50/50" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 rounded bg-slate-200" />
                  <div className="h-11 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                </div>
                <div className="h-12 w-full animate-pulse rounded-2xl bg-emerald-700/90" />
              </>
            )}
          </div>
        </div>
      </div>
    </>
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
    if (this.state.failed) return <BootShell forceSlow />;
    return this.props.children;
  }
}

export function BdmAppLoader() {
  return (
    <Boundary>
      <BdmApp />
    </Boundary>
  );
}
