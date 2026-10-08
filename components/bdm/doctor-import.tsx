"use client";

import { useRef, useState } from "react";
import { Check, Download, Upload, X } from "lucide-react";

/* Doctor CSV bulk upload — light emerald theme, matches the rest of the app.
   Required: Name. Everything else is optional with safe defaults. */

export const DOCTOR_TEMPLATE_HEADER = [
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

const TEMPLATE_ROWS: string[][] = [
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

export function buildDoctorTemplateCSV(): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [DOCTOR_TEMPLATE_HEADER.map(esc).join(","), ...TEMPLATE_ROWS.map((r) => r.map(esc).join(","))].join("\n");
}

/* Robust CSV parser: handles quoted commas, escaped quotes, CRLF */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const clean = text.replace(/^﻿/, "");
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      // skip, handled by \n
    } else {
      cell += c;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

const normHeader = (h: string) =>
  String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ");

function colIndex(header: string[], names: string[]): number {
  const nh = header.map(normHeader);
  for (const n of names) {
    const i = nh.indexOf(normHeader(n));
    if (i >= 0) return i;
  }
  for (const n of names) {
    const nn = normHeader(n);
    const i = nh.findIndex((h) => h.includes(nn) || nn.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

const splitList = (v: string): string[] =>
  String(v ?? "")
    .split(/[+|;]/)
    .map((s) => s.trim())
    .filter(Boolean);

function normDate(v: string): string {
  const s = String(v ?? "").trim();
  if (!s || s === "—" || s === "-") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    if (y >= 2000 && y <= 2100) return `${y}-${mo}-${d}`;
  }
  return "";
}

function normCallDays(v: string): string[] {
  const s = String(v ?? "").trim();
  if (!s) return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const found = days.filter((d) => new RegExp(`\\b${d}`, "i").test(s));
  if (found.length > 0) return found;
  if (/mon.*sat/i.test(s)) return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (/mon.*fri/i.test(s)) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

function normTime(v: string): { from: string; to: string } {
  const s = String(v ?? "").trim();
  if (!s) return { from: "10:00", to: "13:00" };
  const times = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/g) || [];
  const to24 = (t: string): string => {
    const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
    if (!m) return "";
    let h = parseInt(m[1], 10);
    const min = m[2] || "00";
    const ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  };
  if (times.length >= 2) return { from: to24(times[0] as string) || "10:00", to: to24(times[1] as string) || "13:00" };
  if (times.length === 1) return { from: to24(times[0] as string) || "10:00", to: "13:00" };
  return { from: "10:00", to: "13:00" };
}

function normPriority(v: string): "High" | "Medium" | "Low" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.startsWith("high")) return "High";
  if (s.startsWith("low")) return "Low";
  return "Medium";
}

export interface ParsedDoctor {
  name: string;
  specialty: string;
  qualification: string;
  clinic: string;
  area: string;
  city: string;
  phone: string;
  email: string;
  priority: "High" | "Medium" | "Low";
  frequency: string;
  callDays: string[];
  monthlyCalls: string[];
  callTimeFrom: string;
  callTimeTo: string;
  focusProducts: string[];
  followProducts: string[];
  appointmentModes: string[];
  appointmentContact: string;
  appointmentPhone: string;
  appointmentLead: string;
  appointmentNote: string;
  lastVisit: string;
  nextVisit: string;
  notes: string;
  _row: number;
}

export function parseDoctorsCSV(text: string): { doctors: ParsedDoctor[]; errors: string[] } {
  return rowsToDoctors(parseCSV(text));
}

/* Shared mapper used by BOTH CSV and Excel (.xlsx/.xls) imports, so the two
   paths can never drift apart. Takes a plain grid of cells. */
export function rowsToDoctors(grid: string[][]): { doctors: ParsedDoctor[]; errors: string[] } {
  // Excel exports often start with blank/title rows — find the real header:
  // the first row that actually contains a Name-like column.
  let startAt = 0;
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    if (colIndex(grid[i] || [], ["name", "doctor name", "dr name", "doctor"]) >= 0) {
      startAt = i;
      break;
    }
  }
  const rows = grid.slice(startAt);
  const errors: string[] = [];
  if (rows.length < 2) {
    return { doctors: [], errors: ["File is empty — add a header row + at least 1 doctor row."] };
  }
  const header = rows[0];
  const idx = {
    name: colIndex(header, ["name", "doctor name", "dr name", "doctor"]),
    specialty: colIndex(header, ["specialty", "speciality"]),
    qualification: colIndex(header, ["qualification", "degree"]),
    clinic: colIndex(header, ["clinic", "hospital", "centre", "center"]),
    area: colIndex(header, ["area / patch", "area", "patch"]),
    city: colIndex(header, ["city"]),
    phone: colIndex(header, ["phone", "mobile", "contact"]),
    email: colIndex(header, ["email"]),
    priority: colIndex(header, ["priority"]),
    frequency: colIndex(header, ["frequency"]),
    callDays: colIndex(header, ["call days", "days"]),
    monthlyCalls: colIndex(header, ["monthly calls"]),
    callTime: colIndex(header, ["call time", "time", "timing"]),
    apptModes: colIndex(header, ["appointment modes", "appointment mode"]),
    apptLead: colIndex(header, ["appointment lead", "lead"]),
    apptContact: colIndex(header, ["appointment contact", "contact person"]),
    apptPhone: colIndex(header, ["appointment phone"]),
    apptNote: colIndex(header, ["appointment note"]),
    focus: colIndex(header, ["focus products", "focus"]),
    follow: colIndex(header, ["follow-up products", "followup products", "follow up products"]),
    lastVisit: colIndex(header, ["last visit"]),
    nextVisit: colIndex(header, ["next visit"]),
    notes: colIndex(header, ["notes", "remarks"]),
  };
  if (idx.name < 0) {
    const seen = header.filter(Boolean).slice(0, 8).join(", ");
    return {
      doctors: [],
      errors: [
        `No "Name" column found.${seen ? ` Columns detected: ${seen}.` : ""} Make sure the first row has a column called Name.`,
      ],
    };
  }
  const get = (r: string[], i: number) => (i >= 0 && i < r.length ? String(r[i] ?? "").trim() : "");
  const doctors: ParsedDoctor[] = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const name = get(r, idx.name);
    if (!name) {
      errors.push(`Row ${ri + 1}: skipped — Name is empty.`);
      continue;
    }
    const { from, to } = normTime(get(r, idx.callTime));
    doctors.push({
      name,
      specialty: get(r, idx.specialty) || "Dermatologist",
      qualification: get(r, idx.qualification),
      clinic: get(r, idx.clinic),
      area: get(r, idx.area),
      city: get(r, idx.city) || "Bangalore",
      phone: get(r, idx.phone),
      email: get(r, idx.email),
      priority: normPriority(get(r, idx.priority)),
      frequency: get(r, idx.frequency) || "Weekly",
      callDays: normCallDays(get(r, idx.callDays)),
      monthlyCalls: splitList(get(r, idx.monthlyCalls)),
      callTimeFrom: from,
      callTimeTo: to,
      focusProducts: splitList(get(r, idx.focus)),
      followProducts: splitList(get(r, idx.follow)),
      appointmentModes: splitList(get(r, idx.apptModes)),
      appointmentContact: get(r, idx.apptContact),
      appointmentPhone: get(r, idx.apptPhone),
      appointmentLead: get(r, idx.apptLead) || "Same day",
      appointmentNote: get(r, idx.apptNote),
      lastVisit: normDate(get(r, idx.lastVisit)),
      nextVisit: normDate(get(r, idx.nextVisit)),
      notes: get(r, idx.notes),
      _row: ri + 1,
    });
  }
  return { doctors, errors };
}

export function DoctorImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (docs: ParsedDoctor[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedDoctor[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    setBusy(true);
    setFileName(f.name);
    try {
      const isExcel = /\.(xlsx|xlsm|xlsb|xls)$/i.test(f.name);
      let result: { doctors: ParsedDoctor[]; errors: string[] };
      if (isExcel) {
        // Excel files are binary — reading them as text produces garbage,
        // which is why an .xlsx used to report "No Name column found".
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
        if (!sheet) {
          setParsed([]);
          setErrors(["This Excel file has no sheets."]);
          return;
        }
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          blankrows: false,
          defval: "",
          raw: false,
        });
        const cells: string[][] = grid.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []));
        result = rowsToDoctors(cells.filter((r) => r.some((c) => c !== "")));
      } else {
        result = parseDoctorsCSV(await f.text());
      }
      setParsed(result.doctors);
      setErrors(result.errors);
    } catch {
      setParsed([]);
      setErrors(["Could not read this file — please upload a .csv or .xlsx file."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="anim-pop max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Upload doctors</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Bulk add from Excel (.xlsx) or CSV — same columns as Download. Only Name is required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/api/doctor-template"
            download="nutrova-doctors-template.csv"
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Download className="h-4 w-4" /> 1. Download template
          </a>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800"
          >
            <Upload className="h-4 w-4" /> 2. Choose Excel / CSV file
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xlsm,.xlsb,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {busy && <p className="mt-4 text-sm font-bold text-slate-500">Reading file…</p>}

        {fileName && !busy && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="truncate text-sm font-extrabold text-slate-800">{fileName}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              <span className="font-extrabold text-emerald-700">{parsed.length}</span> doctor
              {parsed.length !== 1 ? "s" : ""} ready
              {errors.length > 0 && (
                <span className="text-amber-700"> · {errors.length} warning{errors.length !== 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            {errors.slice(0, 20).map((e, i) => (
              <p key={i} className="text-xs font-semibold text-amber-800">{e}</p>
            ))}
            {errors.length > 20 && (
              <p className="text-xs font-bold text-amber-700">+ {errors.length - 20} more…</p>
            )}
          </div>
        )}

        {parsed.length > 0 && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-white">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Area</th>
                  <th className="px-3 py-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((d, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold text-slate-400">{d._row}</td>
                    <td className="px-3 py-2 font-extrabold text-slate-800">{d.name}</td>
                    <td className="px-3 py-2 text-slate-600">{d.area || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{d.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 100 && (
              <p className="bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-500">
                + {parsed.length - 100} more rows (all will be imported)
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onImport(parsed)}
            disabled={parsed.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> Import {parsed.length > 0 ? `${parsed.length} doctor${parsed.length !== 1 ? "s" : ""}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
