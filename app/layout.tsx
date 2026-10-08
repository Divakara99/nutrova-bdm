// STYLE LOCK — Do not wrap {children} in sidebars/headers or change body colors.
// This layout must stay identical to https://v0-nutrova.vercel.app:
// light theme, bg-background, Inter + Plus Jakarta Sans. The BDM app
// (components/bdm/bdm-app.tsx) ships its own header/tabs and expects a
// plain white page. Any global dark wrapper WILL break it again.
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} bg-background`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
