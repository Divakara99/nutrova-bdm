// STYLE LOCK — Do not wrap {children} in sidebars/headers or change body colors.
// This layout must stay identical to https://v0-nutrova.vercel.app:
// light theme, bg-background, Inter + Plus Jakarta Sans. The BDM app
// (components/bdm/bdm-app.tsx) ships its own header/tabs and expects a
// plain white page. Any global dark wrapper WILL break it again.
import type { Metadata, Viewport } from "next";
import "./globals.css";

/* FONTS — no longer fetched from Google Fonts at build time.
   next/font/google contacted fonts.googleapis.com during `next build`, which
   hard-failed the build whenever that host was unreachable (offline machines,
   locked-down CI, preview sandboxes) and added a blocking network dependency to
   every cold build. globals.css now defines --font-inter / --font-jakarta with
   Inter + Plus Jakarta Sans first and a system stack as the fallback, so the
   light theme and type scale stay identical without the build-time fetch. */

export const metadata: Metadata = {
  title: "Nutrova Doctor Tracker",
  description:
    "Doctor call, visit, reminder and payment tracker for Nutrova MR M Divakar Reddy, Bangalore.",
  generator: "v0.app",
  applicationName: "Nutrova Doctor Tracker",
  appleWebApp: { capable: true, title: "Nutrova MR", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#065f46",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* Self-healing watchdog. Lives in the HTML itself, so it still runs even if
   the React bundle fails to execute (e.g. a stale service worker served HTML
   in place of a JS chunk — the exact cause of the stuck "Loading your
   workspace…" screen). If the app has not mounted within 20s it unregisters
   every service worker, clears all caches, and reloads ONCE. */
const RECOVERY_SCRIPT = `
(function () {
  try {
    var KEY = 'nutrova-sw-recovered-v1';
    window.__NUTROVA_MOUNTED__ = false;
    setTimeout(function () {
      if (window.__NUTROVA_MOUNTED__) return;
      var already = false;
      try { already = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
      if (already) return;
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      var jobs = [];
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          }));
        }
      } catch (e) {}
      try {
        if (window.caches && caches.keys) {
          jobs.push(caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          }));
        }
      } catch (e) {}
      Promise.all(jobs).catch(function () {}).then(function () {
        location.reload();
      });
    }, 20000);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <script dangerouslySetInnerHTML={{ __html: RECOVERY_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
