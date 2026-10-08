"use client";

// VISIBILITY FIX — Never use dynamic(ssr:false) here again. That pattern
// ships an empty "Loading…" div as the entire server HTML, so if the JS
// bundle is slow/blocked the page looks blank forever. bdm-app.tsx is
// SSR-safe (all localStorage/window access is try/catch wrapped), so we
// render it directly: server HTML already contains the login UI.
import BdmApp from "./bdm-app";

export function BdmAppLoader() {
  return (
    <div suppressHydrationWarning>
      <BdmApp />
    </div>
  );
}
