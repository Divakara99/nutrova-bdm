/* Reliable CSV template download.
   The in-browser Blob download silently fails inside installed PWAs /
   some mobile WebViews, so this route serves the same template as a real
   file download (Content-Disposition: attachment). The dialog tries the
   instant client-side Blob first, then falls back to this URL. */

const HEADER = [
  "Name",
  "Specialty",
  "Qualification",
  "Clinic",
  "Area / Patch",
  "City",
  "Phone",
  "Email",
  "Priority",
  "Frequency",
  "Call Days",
  "Monthly Calls",
  "Call Time",
  "Appointment Modes",
  "Appointment Lead",
  "Appointment Contact",
  "Appointment Phone",
  "Appointment Note",
  "Focus Products",
  "Follow-up Products",
  "Last Visit",
  "Next Visit",
  "Notes",
];

const ROWS: string[][] = [
  [
    "Dr. Ananya Sharma",
    "Cosmetic Dermatologist",
    "MBBS, MD Derma",
    "SkinGlow Aesthetics",
    "Koramangala",
    "Bangalore",
    "98450 12345",
    "ananya@skinglow.in",
    "High",
    "Weekly",
    "Mon + Tue + Wed + Thu + Fri + Sat",
    "",
    "10:30 - 13:30",
    "Walk-in + Reception / Front Desk",
    "Same day",
    "Reception",
    "080 4111 2233",
    "Walk in before 11 AM",
    "Nutrova Collagen+Antioxidants (Cranberry Flavour) + Nutrova Kerastrength",
    "Nutrova Marine Collagen Peptides",
    "2026-09-20",
    "2026-10-10",
    "Prefers samples on Tuesday mornings",
  ],
  [
    "Dr. Meera Iyer",
    "Dermatologist",
    "MBBS, DDVL",
    "DermaCare Clinic",
    "HSR Layout",
    "Bangalore",
    "98860 23456",
    "",
    "Medium",
    "Weekly",
    "Tue + Wed + Thu + Fri",
    "",
    "11:00 - 14:00",
    "Phone Call + Prior Appointment",
    "1 day before",
    "Clinic Manager",
    "98860 23456",
    "",
    "Nutrova Kerastrength + Nutrova Akniflora",
    "Nutrova Complete Omega 3",
    "2026-09-25",
    "2026-10-12",
    "",
  ],
];

const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const csv = [HEADER.map(esc).join(","), ...ROWS.map((r) => r.map(esc).join(","))].join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": 'attachment; filename="nutrova-doctors-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
