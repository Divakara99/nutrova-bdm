"use client";

import { useSyncExternalStore } from "react";
import BdmApp from "./bdm-app";

// BdmApp seeds its state (session, users, settings) from localStorage, so the
// server can never produce matching HTML for a signed-in user. We render a
// visible branded splash on the server and during hydration, then mount the
// real app immediately after hydration on the client.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-emerald-950 px-6 text-center text-white">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-300/30 border-t-emerald-300"
        aria-hidden="true"
      />
      <p className="text-lg font-semibold">Nutrova Doctor Tracker</p>
      <p className="text-sm text-emerald-200" role="status">
        Loading your workspace…
      </p>
    </div>
  );
}

export function BdmAppLoader() {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  return hydrated ? <BdmApp /> : <Splash />;
}
