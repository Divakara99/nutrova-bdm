// STYLE LOCK — Do not wrap {children} in sidebars/headers or change body colors.
// This layout must stay identical to https://v0-nutrova.vercel.app:
// light theme, bg-background, Inter + Plus Jakarta Sans. The BDM app
// (components/bdm/bdm-app.tsx) ships its own header/tabs and expects a
// plain white page. Any global dark wrapper WILL break it again.
import type { Metadata, Viewport } from "next";
import "./globals.css";

/* FONTS — self-hosted variable woff2 files in /public/fonts (defined in
   globals.css). Preloaded in <head> below so the first paint already uses
   Inter + Plus Jakarta Sans without a system-font FOUT swap or any build-time
   network dependency on fonts.googleapis.com. */

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

/* Synchronous pre-paint boot + self-healing watchdog.
   1) Runs in <head> BEFORE <body> paints, setting:
      - html.android-phone (so Android phone font scaling never jumps post-mount)
      - html[data-nutrova-boot="in"|"out"] from localStorage + URL recovery params,
        so CSS immediately reveals the matching shell (white Dashboard shell when
        signed in, emerald Login shell when signed out) on the very first paint —
        eliminating the dark-emerald splash -> white page flash on refresh.
   2) Watchdog: if the real BDM app has not mounted within 20s (e.g. a stale
      service worker served HTML in place of a JS chunk), unregisters all
      service workers, clears caches, and reloads ONCE. */
const BOOT_AND_RECOVERY_SCRIPT = `
(function () {
  var boot = 'out';
  try {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua) && /Mobile/i.test(ua) && window.innerWidth < 640) {
      document.documentElement.classList.add('android-phone');
    }
  } catch (e) {}
  try {
    var pendingRec = false;
    try { pendingRec = !!localStorage.getItem('nutrova-password-reset-pending-v1'); } catch (e) {}
    var h = window.location.hash || '';
    var q = window.location.search || '';
    var inRec = pendingRec ||
      /[#?&](error|error_description|error_message)=/i.test(h + q) ||
      /[#?&](type|auth)=(recovery|reset)(?:&|$)/i.test(h + q);
    if (!inRec) {
      var rawSess = localStorage.getItem('nutrova-backend-session-v1');
      if (rawSess) {
        var parsed = JSON.parse(rawSess);
        if (parsed && typeof parsed.access_token === 'string' && parsed.access_token.length > 0) {
          boot = 'in';
        }
      }
    }
  } catch (e) {}
  try {
    document.documentElement.setAttribute('data-nutrova-boot', boot);
  } catch (e) {}
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
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/inter-latin-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/plus-jakarta-sans-latin-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: BOOT_AND_RECOVERY_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
