"use client";

import dynamic from "next/dynamic";

const BdmApp = dynamic(() => import("./bdm-app"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center text-sm text-nutrova-800">
      Loading Nutrova Doctor Tracker…
    </div>
  ),
});

export function BdmAppLoader() {
  return <BdmApp />;
}
