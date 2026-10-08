import type { MetadataRoute } from "next";

// STYLE LOCK — keep in sync with layout.tsx viewport theme (#065f46) and
// light background (#ffffff). Matches https://v0-nutrova.vercel.app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutrova Doctor Tracker",
    short_name: "Nutrova MR",
    description:
      "Doctor call tracker for Nutrova Medical Representative M Divakar Reddy, Bangalore.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#065f46",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
