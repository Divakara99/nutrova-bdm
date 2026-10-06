"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Download,
  FileText,
  IndianRupee,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Stethoscope,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

/* ---------------------------------- types ---------------------------------- */

type ReminderKind = "Visit" | "Call" | "Follow-up" | "Payment" | "Sample Drop";
type PaymentStatus = "pending" | "paid" | "overdue";

/* Patch = an area name only (e.g. Koramangala, HSR Layout) */
interface Patch {
  id: string;
  name: string;
  color: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  clinic: string;
  area: string;
  patchId: string;
  city: string;
  phone: string;
  email: string;
  frequency: string;
  lastVisit: string;
  nextVisit: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
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
}

interface Reminder {
  id: string;
  doctorName: string;
  doctorArea: string;
  title: string;
  date: string;
  time: string;
  kind: ReminderKind;
  notes: string;
  done: boolean;
}

interface Payment {
  id: string;
  invoiceNo: string;
  doctorName: string;
  doctorArea: string;
  purpose: string;
  amount: number;
  dueDate: string;
  paidDate: string;
  status: PaymentStatus;
  mode: string;
}

interface Bio {
  name: string;
  role: string;
  city: string;
  state: string;
  hq: string;
  phone: string;
  email: string;
}

/* ------------------------------ schedule consts ----------------------------- */

const WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const JS_DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_WEEKS = ["1st", "2nd", "3rd", "4th", "Last"];

const SPECIALTIES = [
  "Cosmetic Dermatologist",
  "Aesthetic",
  "Dermatologist",
  "Plastic Surgeon",
  "Cosmetologist",
  "Trichologist",
  "Other",
];

const PRESETS: { label: string; days: string[] }[] = [
  { label: "Mon – Sat", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
  { label: "Mon – Fri", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Tue – Sat", days: ["Tue", "Wed", "Thu", "Fri", "Sat"] },
  { label: "Tue – Fri", days: ["Tue", "Wed", "Thu", "Fri"] },
  { label: "Only Tue", days: ["Tue"] },
  { label: "Only Thu", days: ["Thu"] },
  { label: "Only Fri", days: ["Fri"] },
  { label: "All days", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
];

/* Appointment — how to take appointment (as discussed: walk-in / phone / reception / prior booking) */
const APPOINTMENT_MODES = [
  "Walk-in",
  "Phone Call",
  "WhatsApp",
  "Reception / Front Desk",
  "Secretary / PA",
  "Prior Appointment",
  "Practo / Online",
];
const APPOINTMENT_LEAD_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Same / Quick",
    options: ["Same day", "1 day before", "2–3 days before"],
  },
  {
    label: "Book in advance",
    options: ["1 week in advance", "2 weeks in advance", "1 month in advance", "Weekly slot", "Monthly slot"],
  },
  {
    label: "Book before month date",
    options: [
      "Before 5th of month",
      "Before 10th of month",
      "Before 15th of month",
      "Before 20th of month",
      "Before 25th of month",
      "Before month-end",
    ],
  },
];
const APPOINTMENT_MONTH_CUTOFFS = [
  "Before 5th of month",
  "Before 10th of month",
  "Before 15th of month",
  "Before 20th of month",
  "Before 25th of month",
  "Before month-end",
];

/* ---------------- Nutrova products — full names from uploaded sheet ------------- */
/* Deduplicated to 25 unique SKUs (original file had repeat rows) */

const NUTROVA_PRODUCTS: { name: string; category: string; form: string }[] = [
  { name: "Nutrova Collagen+Antioxidants (Cranberry Flavour)", category: "Collagen Range", form: "Powder" },
  { name: "Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)", category: "Collagen Range", form: "Powder" },
  { name: "Nutrova Poultry Collagen Peptides", category: "Collagen Range", form: "Powder" },
  { name: "Nutrova Marine Collagen Peptides", category: "Collagen Range", form: "Powder" },
  { name: "Nutrova Kerastrength", category: "Hair Health", form: "Capsules" },
  { name: "Nutrova Caroshield", category: "Skin Brightening & Acne", form: "Capsules" },
  { name: "Nutrova Melatace", category: "Skin Brightening & Acne", form: "Tablets" },
  { name: "Nutrova Glutalume", category: "Skin Brightening & Acne", form: "Tablets" },
  { name: "Nutrova Akniflora", category: "Skin Brightening & Acne", form: "Capsules" },
  { name: "Nutrova Fish Oil 84", category: "Omega-3", form: "Softgels" },
  { name: "Nutrova Complete Omega 3", category: "Omega-3", form: "Capsules" },
  { name: "Nutrova Whey Protein Isolate - Unflavoured", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Whey Protein Isolate - Dark Chocolate Flavour", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Whey Protein Isolate - Vanilla Flavour", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Whey Protein Isolate - Mango Flavour", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Whey Protein Isolate - Strawberry Flavour", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Pea Protein - Unflavoured", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Vegan Protein - Mango Flavour", category: "Protein Range", form: "Powder" },
  { name: "Nutrova Magnesium+D3", category: "Daily Wellness", form: "Tablets" },
  { name: "Nutrova Calcium+Magnesium", category: "Daily Wellness", form: "Tablets" },
  { name: "Nutrova Multivitamin For Women", category: "Daily Wellness", form: "Tablets" },
  { name: "Nutrova Multivitamin For Men", category: "Daily Wellness", form: "Tablets" },
  { name: "Nutrova Elderberry Plus", category: "Daily Wellness", form: "Gummies" },
  { name: "Nutrova Functional Fibre - Unflavoured", category: "Daily Wellness", form: "Powder" },
  { name: "Nutrova Functional Fibre - Lemon Flavour", category: "Daily Wellness", form: "Powder" },
];
const PRODUCT_CATS = ["Collagen Range", "Hair Health", "Skin Brightening & Acne", "Omega-3", "Protein Range", "Daily Wellness"];

/* short label for chips (drops "Nutrova " prefix, keeps full flavour info) */
const shortProduct = (n: string) => n.replace(/^Nutrova\s+/, "");

/* migrate old short names -> new full names from sheet */
const PRODUCT_MIGRATION: Record<string, string> = {
  "Collagen + Antioxidants": "Nutrova Collagen+Antioxidants (Cranberry Flavour)",
  "Collagen+Antioxidants": "Nutrova Collagen+Antioxidants (Cranberry Flavour)",
  "Marine Collagen Peptides": "Nutrova Marine Collagen Peptides",
  "Poultry Collagen Peptides": "Nutrova Poultry Collagen Peptides",
  "Kerastrength": "Nutrova Kerastrength",
  "Caroshield": "Nutrova Caroshield",
  "Melatace": "Nutrova Melatace",
  "Glutalume": "Nutrova Glutalume",
  "Akniflora": "Nutrova Akniflora",
  "Fish Oil 84": "Nutrova Fish Oil 84",
  "Complete Omega 3": "Nutrova Complete Omega 3",
  "Whey Protein Isolate": "Nutrova Whey Protein Isolate - Dark Chocolate Flavour",
  "Pea Protein": "Nutrova Pea Protein - Unflavoured",
  "Vegan Protein": "Nutrova Vegan Protein - Mango Flavour",
  "Magnesium + D3": "Nutrova Magnesium+D3",
  "Magnesium+D3": "Nutrova Magnesium+D3",
  "Calcium + Magnesium": "Nutrova Calcium+Magnesium",
  "Calcium+Magnesium": "Nutrova Calcium+Magnesium",
  "Functional Fibre": "Nutrova Functional Fibre - Unflavoured",
  "Multivitamin For Men": "Nutrova Multivitamin For Men",
  "Multivitamin For Women": "Nutrova Multivitamin For Women",
  "Elderberry+": "Nutrova Elderberry Plus",
  "Elderberry Plus": "Nutrova Elderberry Plus",
};
const migrateProducts = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const valid = new Set(NUTROVA_PRODUCTS.map((p) => p.name));
  const out: string[] = [];
  for (const raw of list) {
    const s = String(raw || "").trim();
    if (!s) continue;
    if (valid.has(s)) { if (!out.includes(s)) out.push(s); continue; }
    const mapped = PRODUCT_MIGRATION[s];
    if (mapped && valid.has(mapped) && !out.includes(mapped)) out.push(mapped);
    /* unknown legacy names (e.g. Creatine — not in sheet) are dropped */
  }
  return out;
};

const PATCH_COLORS = ["emerald", "violet", "amber", "sky", "rose", "teal"];

function patchStyles(color: string) {
  switch (color) {
    case "violet":
      return { dot: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700", ring: "ring-violet-200", soft: "bg-violet-50" };
    case "amber":
      return { dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-800", ring: "ring-amber-200", soft: "bg-amber-50" };
    case "sky":
      return { dot: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700", ring: "ring-sky-200", soft: "bg-sky-50" };
    case "rose":
      return { dot: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700", ring: "ring-rose-200", soft: "bg-rose-50" };
    case "teal":
      return { dot: "bg-teal-500", badge: "border-teal-200 bg-teal-50 text-teal-700", ring: "ring-teal-200", soft: "bg-teal-50" };
    default:
      return { dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50" };
  }
}

/* --------------------------------- helpers --------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isToday = (iso: string) => iso === todayISO();
const isPast = (iso: string) => !!iso && iso < todayISO();
/* 30-day rule: RED only when overdue / pending for MORE than 30 days */
const daysSince = (iso: string) => {
  if (!iso) return 0;
  try {
    const a = new Date(iso + "T00:00:00").getTime();
    const b = new Date(todayISO() + "T00:00:00").getTime();
    return Math.floor((b - a) / 86400000);
  } catch {
    return 0;
  }
};
const daysOverdue = (iso: string) => (isPast(iso) ? daysSince(iso) : 0);
const isCriticalOverdue = (iso: string) => daysOverdue(iso) > 30;
/* pending-days helper — same 30-day rule: red only when >30 days past due */
const daysUntilDue = (iso: string) => {
  if (!iso) return 0;
  return -daysSince(iso);
};
type PendingInfo = { text: string; tone: "red" | "amber" | "green" | "slate" | "paid"; days: number };
const pendingDaysInfo = (p: { dueDate: string; status: string }): PendingInfo => {
  if (p.status === "paid") return { text: "Paid", tone: "paid", days: 0 };
  if (!p.dueDate) return { text: "No due date", tone: "slate", days: 0 };
  const od = daysOverdue(p.dueDate);
  if (od > 30) return { text: `${od}d pending`, tone: "red", days: od };
  if (od > 0) return { text: `${od}d pending`, tone: "amber", days: od };
  if (isToday(p.dueDate)) return { text: "Due today", tone: "green", days: 0 };
  const until = daysUntilDue(p.dueDate);
  if (until > 0) return { text: `Due in ${until}d`, tone: "slate", days: 0 };
  return { text: "Pending", tone: "amber", days: 0 };
};
const pendingBadgeCls = (tone: PendingInfo["tone"]) => {
  switch (tone) {
    case "red":
      return "bg-rose-600 text-white";
    case "amber":
      return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
    case "green":
      return "bg-emerald-600 text-white";
    case "paid":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
};
const downloadCSV = (filename: string, header: string[], rows: string[][]) => {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtShort = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const fmtDayName = (iso: string) => {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
};
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const genInvoiceNo = () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmtTime = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const am = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${am}`;
};

function useLocal<T>(key: string, seed: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return seed();
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/* ------------------------- call-schedule date logic ------------------------ */

function shortOfDate(d: Date): string {
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[d.getDay()];
}

function matchesMonthlyRule(date: Date, rule: string): boolean {
  const parts = rule.trim().split(/\s+/);
  if (parts.length < 2) return false;
  const week = parts[0];
  const dayName = parts.slice(1).join(" ");
  const targetIdx = JS_DAY_FULL.indexOf(dayName);
  if (targetIdx === -1) return false;
  if (date.getDay() !== targetIdx) return false;
  const year = date.getFullYear();
  const month = date.getMonth();
  if (week === "Last") {
    const test = new Date(date);
    test.setDate(test.getDate() + 7);
    return test.getMonth() !== month;
  }
  const nMap: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5 };
  const n = nMap[week];
  if (!n) return false;
  let count = 0;
  for (let d = 1; d <= date.getDate(); d++) {
    if (new Date(year, month, d).getDay() === targetIdx) count++;
  }
  return count === n;
}

function doctorCallsOn(doctor: Doctor, date: Date): boolean {
  const weekly = (doctor.callDays || []).includes(shortOfDate(date));
  if (weekly) return true;
  return (doctor.monthlyCalls || []).some((r) => matchesMonthlyRule(date, r));
}

function nextCallDate(doctor: Doctor): { iso: string; label: string; isToday: boolean } | null {
  for (let i = 0; i < 45; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (doctorCallsOn(doctor, d)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { iso, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), isToday: i === 0 };
    }
  }
  return null;
}

const fullFromShort = (s: string) => WEEK_FULL[WEEK_SHORT.indexOf(s)] || s;

function describeWeekly(days: string[]): string {
  if (!days || days.length === 0) return "No weekly calls";
  const sorted = [...days].sort((a, b) => WEEK_SHORT.indexOf(a) - WEEK_SHORT.indexOf(b));
  if (sorted.length === 7) return "Mon – Sun · All days";
  if (sorted.length === 1) return `Only ${fullFromShort(sorted[0])}`;
  const idx = sorted.map((d) => WEEK_SHORT.indexOf(d));
  let contiguous = true;
  for (let i = 1; i < idx.length; i++) if (idx[i] !== idx[i - 1] + 1) contiguous = false;
  if (contiguous) return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
  return sorted.join(" · ");
}

function describeTime(d: Doctor): string {
  if (d.callTimeFrom && d.callTimeTo) return `${fmtTime(d.callTimeFrom)} – ${fmtTime(d.callTimeTo)}`;
  if (d.callTimeFrom) return `From ${fmtTime(d.callTimeFrom)}`;
  return "Time not set";
}

/* --------------------------------- seed data -------------------------------- */

const seedBio = (): Bio => ({
  name: "Divakar Reddy",
  role: "Medical Representative",
  city: "Bangalore",
  state: "Karnataka",
  hq: "Bangalore",
  phone: "",
  email: "divakar.reddy@nutrova.com",
});

/* Patches are area names only */
const seedPatches = (): Patch[] => {
  try {
    const rawV1 = localStorage.getItem("nutrova-patches-v1");
    if (rawV1) {
      const old = JSON.parse(rawV1);
      if (Array.isArray(old) && old.length > 0) {
        const names: string[] = [];
        old.forEach((p: { name?: string; areas?: string[] }) => {
          if (Array.isArray(p.areas) && p.areas.length > 0) p.areas.forEach((a) => names.push(a));
          else if (p.name) names.push(p.name);
        });
        const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
        if (unique.length > 0) {
          return unique.map((n, i) => ({ id: uid() + i, name: n, color: PATCH_COLORS[i % PATCH_COLORS.length] }));
        }
      }
    }
  } catch {
    /* ignore */
  }
  return [
    { id: "a1", name: "Koramangala", color: "emerald" },
    { id: "a2", name: "HSR Layout", color: "violet" },
    { id: "a3", name: "Jayanagar", color: "amber" },
    { id: "a4", name: "Indiranagar", color: "sky" },
    { id: "a5", name: "Whitefield", color: "rose" },
    { id: "a6", name: "Malleshwaram", color: "teal" },
    { id: "a7", name: "Peenya", color: "emerald" },
    { id: "a8", name: "Electronic City", color: "violet" },
    { id: "a9", name: "JP Nagar", color: "amber" },
    { id: "a10", name: "Marathahalli", color: "sky" },
    { id: "a11", name: "BTM Layout", color: "rose" },
    { id: "a12", name: "Rajajinagar", color: "teal" },
  ];
};

const freshDoctors = (): Doctor[] => [
  { id: "d1", name: "Dr. Ananya Sharma", specialty: "Cosmetic Dermatologist", qualification: "MBBS, MD Derma", clinic: "SkinGlow Aesthetics", area: "Koramangala", patchId: "a1", city: "Bangalore", phone: "98450 12345", email: "ananya.sharma@skinglow.in", frequency: "Weekly", lastVisit: addDays(-2), nextVisit: todayISO(), notes: "Prefers Nutrova samples on Tuesday mornings. Strong Rx for derma-nutrition range.", priority: "High", callDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], monthlyCalls: [], callTimeFrom: "10:30", callTimeTo: "13:30", focusProducts: ["Nutrova Collagen+Antioxidants (Cranberry Flavour)", "Nutrova Kerastrength"], followProducts: ["Nutrova Marine Collagen Peptides"], appointmentModes: ["Walk-in", "Reception / Front Desk"], appointmentContact: "Reception", appointmentPhone: "080 4111 2233", appointmentLead: "Same day", appointmentNote: "Walk in before 11 AM, inform front desk" },
  { id: "d2", name: "Dr. Meera Iyer", specialty: "Dermatologist", qualification: "MBBS, DDVL", clinic: "DermaCare Clinic", area: "HSR Layout", patchId: "a2", city: "Bangalore", phone: "98860 23456", email: "", frequency: "Weekly", lastVisit: addDays(-6), nextVisit: addDays(1), notes: "High prescriber — gives calls Tue to Fri only.", priority: "High", callDays: ["Tue", "Wed", "Thu", "Fri"], monthlyCalls: [], callTimeFrom: "11:00", callTimeTo: "14:00", focusProducts: ["Nutrova Kerastrength", "Nutrova Akniflora"], followProducts: ["Nutrova Complete Omega 3"], appointmentModes: ["Phone Call", "Prior Appointment"], appointmentContact: "Clinic Manager", appointmentPhone: "98860 23456", appointmentLead: "1 day before", appointmentNote: "Call previous evening to block MR slot" },
  { id: "d3", name: "Dr. Priya Nair", specialty: "Aesthetic", qualification: "MBBS, FAM", clinic: "Lumière Aesthetic Studio", area: "Indiranagar", patchId: "a4", city: "Bangalore", phone: "97420 34567", email: "", frequency: "Fortnightly", lastVisit: addDays(-4), nextVisit: todayISO(), notes: "Only Tuesday OPD + 1st Thursday aesthetic camp.", priority: "Medium", callDays: ["Tue"], monthlyCalls: ["1st Thursday"], callTimeFrom: "12:00", callTimeTo: "16:00", focusProducts: ["Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)", "Nutrova Poultry Collagen Peptides"], followProducts: ["Nutrova Glutalume"], appointmentModes: ["WhatsApp", "Prior Appointment"], appointmentContact: "Dr. Priya (direct)", appointmentPhone: "97420 34567", appointmentLead: "2–3 days before", appointmentNote: "WhatsApp Tue slot request, confirm Monday" },
  { id: "d4", name: "Dr. Vikram Malhotra", specialty: "Plastic Surgeon", qualification: "MBBS, MS, MCh Plastic", clinic: "Renew Plastic Surgery Centre", area: "Whitefield", patchId: "a5", city: "Bangalore", phone: "99010 45678", email: "", frequency: "Monthly", lastVisit: addDays(-7), nextVisit: addDays(2), notes: "Only Friday calls + last Thursday OT review meet.", priority: "Medium", callDays: ["Fri"], monthlyCalls: ["Last Thursday"], callTimeFrom: "10:00", callTimeTo: "12:00", focusProducts: ["Nutrova Poultry Collagen Peptides", "Nutrova Whey Protein Isolate - Dark Chocolate Flavour"], followProducts: ["Nutrova Magnesium+D3"], appointmentModes: ["Secretary / PA", "Prior Appointment"], appointmentContact: "Arun (PA)", appointmentPhone: "99010 45679", appointmentLead: "Weekly slot", appointmentNote: "PA allots Friday 10–12 MR window" },
  { id: "d5", name: "Dr. Sneha Kulkarni", specialty: "Cosmetic Dermatologist", qualification: "MBBS, MD DVL", clinic: "Radiance Skin & Hair", area: "Jayanagar", patchId: "a3", city: "Bangalore", phone: "96200 56789", email: "", frequency: "Weekly", lastVisit: addDays(-9), nextVisit: addDays(3), notes: "Mon–Fri OPD + 1st Tuesday seminar day.", priority: "Medium", callDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], monthlyCalls: ["1st Tuesday"], callTimeFrom: "09:30", callTimeTo: "12:30", focusProducts: ["Nutrova Marine Collagen Peptides", "Nutrova Multivitamin For Women"], followProducts: ["Nutrova Calcium+Magnesium"], appointmentModes: ["Reception / Front Desk", "Phone Call"], appointmentContact: "Front Desk", appointmentPhone: "080 2666 7788", appointmentLead: "Before 20th of month", appointmentNote: "Book next month slot before 20th" },
  { id: "d6", name: "Dr. Arjun Desai", specialty: "Dermatologist", qualification: "MBBS, DDV", clinic: "ClearSkin Clinic", area: "Malleshwaram", patchId: "a6", city: "Bangalore", phone: "98110 67890", email: "", frequency: "Weekly", lastVisit: addDays(-1), nextVisit: addDays(6), notes: "Mon–Sat OPD, walk-in mornings.", priority: "Low", callDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], monthlyCalls: [], callTimeFrom: "10:00", callTimeTo: "13:00", focusProducts: ["Nutrova Kerastrength", "Nutrova Functional Fibre - Unflavoured"], followProducts: ["Nutrova Caroshield"], appointmentModes: ["Walk-in"], appointmentContact: "", appointmentPhone: "", appointmentLead: "Same day", appointmentNote: "Direct walk-in, no prior booking" },
  { id: "d7", name: "Dr. Kavya Reddy", specialty: "Aesthetic", qualification: "MBBS, PGDCC", clinic: "Aurelle Aesthetics", area: "Electronic City", patchId: "a8", city: "Bangalore", phone: "97310 78901", email: "", frequency: "Monthly", lastVisit: addDays(-12), nextVisit: addDays(5), notes: "Prospect — meets Tue/Thu/Sat + 1st Tue & 3rd Thu camps.", priority: "High", callDays: ["Tue", "Thu", "Sat"], monthlyCalls: ["1st Tuesday", "3rd Thursday"], callTimeFrom: "15:00", callTimeTo: "18:00", focusProducts: ["Nutrova Collagen+Antioxidants (Cranberry Flavour)", "Nutrova Melatace"], followProducts: ["Nutrova Vegan Protein - Mango Flavour", "Nutrova Complete Omega 3"], appointmentModes: ["WhatsApp", "Phone Call"], appointmentContact: "Kavya Clinic", appointmentPhone: "97310 78901", appointmentLead: "Before 25th of month", appointmentNote: "Share agenda on WhatsApp first, book before 25th" },
  { id: "d8", name: "Dr. Farhan Khan", specialty: "Plastic Surgeon", qualification: "MBBS, MS, MCh", clinic: "Elite Cosmetic Surgery", area: "Peenya", patchId: "a7", city: "Bangalore", phone: "98440 89012", email: "", frequency: "Monthly", lastVisit: addDays(-15), nextVisit: todayISO(), notes: "Only Thursday OPD + last Friday review.", priority: "Medium", callDays: ["Thu"], monthlyCalls: ["Last Friday"], callTimeFrom: "11:00", callTimeTo: "13:00", focusProducts: ["Nutrova Poultry Collagen Peptides", "Nutrova Whey Protein Isolate - Vanilla Flavour"], followProducts: ["Nutrova Whey Protein Isolate - Mango Flavour", "Nutrova Fish Oil 84"], appointmentModes: ["Prior Appointment", "Secretary / PA"], appointmentContact: "Secretary", appointmentPhone: "98440 89013", appointmentLead: "Weekly slot", appointmentNote: "Thursday slot via secretary only" },
];

function normalizeDoctor(raw: Record<string, unknown>): Doctor {
  const r = raw as Partial<Doctor> & { category?: string };
  return {
    id: String(r.id || uid()),
    name: String(r.name || ""),
    specialty: String(r.specialty || "Dermatologist"),
    qualification: String(r.qualification || ""),
    clinic: String(r.clinic || ""),
    area: String(r.area || ""),
    patchId: String(r.patchId || ""),
    city: String(r.city || "Bangalore"),
    phone: String(r.phone || ""),
    email: String(r.email || ""),
    frequency: String(r.frequency || "Weekly"),
    lastVisit: String(r.lastVisit || ""),
    nextVisit: String(r.nextVisit || ""),
    notes: String(r.notes || ""),
    priority: (r.priority as Doctor["priority"]) || "Medium",
    callDays: Array.isArray(r.callDays) ? r.callDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    monthlyCalls: Array.isArray(r.monthlyCalls) ? r.monthlyCalls : [],
    callTimeFrom: String(r.callTimeFrom || "10:00"),
    callTimeTo: String(r.callTimeTo || "13:00"),
    focusProducts: migrateProducts(r.focusProducts),
    followProducts: migrateProducts(r.followProducts),
    appointmentModes: Array.isArray(r.appointmentModes) ? (r.appointmentModes as string[]) : [],
    appointmentContact: String(r.appointmentContact || ""),
    appointmentPhone: String(r.appointmentPhone || ""),
    appointmentLead: String(r.appointmentLead || "Same day"),
    appointmentNote: String(r.appointmentNote || ""),
  };
}

const seedDoctors = (): Doctor[] => {
  for (const key of ["nutrova-doctors-v2", "nutrova-doctors-v1"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const old = JSON.parse(raw);
        if (Array.isArray(old) && old.length > 0) return old.map((d) => normalizeDoctor(d));
      }
    } catch {
      /* ignore */
    }
  }
  return freshDoctors();
};

const seedReminders = (): Reminder[] => [
  { id: "r1", doctorName: "Dr. Ananya Sharma", doctorArea: "Koramangala", title: "Morning visit — derma-nutrition samples", date: todayISO(), time: "10:30", kind: "Visit", notes: "Carry new product visual aid.", done: false },
  { id: "r2", doctorName: "Dr. Priya Nair", doctorArea: "Indiranagar", title: "Tuesday OPD — aesthetic range detailing", date: todayISO(), time: "12:00", kind: "Sample Drop", notes: "", done: false },
  { id: "r3", doctorName: "Dr. Farhan Khan", doctorArea: "Peenya", title: "Introductory call — post-care nutrition", date: todayISO(), time: "16:00", kind: "Call", notes: "Confirm Thursday OPD timing first.", done: false },
  { id: "r4", doctorName: "Dr. Meera Iyer", doctorArea: "HSR Layout", title: "Follow-up on Kerastrength Rx feedback", date: todayISO(), time: "17:30", kind: "Follow-up", notes: "", done: false },
  { id: "r5", doctorName: "Dr. Vikram Malhotra", doctorArea: "Whitefield", title: "Friday OPD — collagen range follow-up", date: addDays(1), time: "11:00", kind: "Follow-up", notes: "", done: false },
  { id: "r6", doctorName: "Dr. Kavya Reddy", doctorArea: "Electronic City", title: "Share aesthetic nutrition deck", date: addDays(2), time: "15:00", kind: "Visit", notes: "", done: false },
];

const seedPayments = (): Payment[] => {
  try {
    const raw = localStorage.getItem("nutrova-payments-v1");
    if (raw) {
      const old = JSON.parse(raw);
      if (Array.isArray(old) && old.length > 0) {
        return old.map((p: Partial<Payment>, i: number) => ({
          id: String(p.id || uid()),
          invoiceNo: String(p.invoiceNo || `INV-${new Date().getFullYear()}-${1040 + i}`),
          doctorName: String(p.doctorName || ""),
          doctorArea: String(p.doctorArea || ""),
          purpose: String(p.purpose || ""),
          amount: Number(p.amount || 0),
          dueDate: String(p.dueDate || ""),
          paidDate: String(p.paidDate || ""),
          status: (p.status as PaymentStatus) || "pending",
          mode: String(p.mode || "UPI"),
        }));
      }
    }
  } catch {
    /* ignore */
  }
  return [
    { id: "p1", invoiceNo: `INV-${new Date().getFullYear()}-1041`, doctorName: "Dr. Meera Iyer", doctorArea: "HSR Layout", purpose: "CME sponsorship — Derma meet", amount: 15000, dueDate: addDays(-2), paidDate: "", status: "pending", mode: "UPI" },
    { id: "p2", invoiceNo: `INV-${new Date().getFullYear()}-1042`, doctorName: "Dr. Priya Nair", doctorArea: "Indiranagar", purpose: "Sample stock settlement", amount: 8500, dueDate: addDays(3), paidDate: "", status: "pending", mode: "Bank Transfer" },
    { id: "p3", invoiceNo: `INV-${new Date().getFullYear()}-1039`, doctorName: "Dr. Ananya Sharma", doctorArea: "Koramangala", purpose: "Conference registration support", amount: 22000, dueDate: addDays(-10), paidDate: addDays(-9), status: "paid", mode: "Cheque" },
  ];
};

const KIND_COLORS: Record<ReminderKind, string> = {
  Visit: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Call: "bg-sky-100 text-sky-800 border-sky-200",
  "Follow-up": "bg-violet-100 text-violet-800 border-violet-200",
  Payment: "bg-amber-100 text-amber-800 border-amber-200",
  "Sample Drop": "bg-rose-100 text-rose-800 border-rose-200",
};

/* ---------------------------------- app ---------------------------------- */

type Tab = "dashboard" | "doctors" | "reminders" | "payments" | "bio";

const emptyDoctor = (): Doctor => ({
  id: uid(), name: "", specialty: "Cosmetic Dermatologist", qualification: "", clinic: "", area: "",
  patchId: "", city: "Bangalore", phone: "", email: "", frequency: "Weekly",
  lastVisit: "", nextVisit: todayISO(), notes: "", priority: "Medium",
  callDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], monthlyCalls: [], callTimeFrom: "10:00", callTimeTo: "13:00",
  focusProducts: [], followProducts: [],
  appointmentModes: [], appointmentContact: "", appointmentPhone: "", appointmentLead: "Same day", appointmentNote: "",
});
const emptyReminder = (): Reminder => ({ id: uid(), doctorName: "", doctorArea: "", title: "", date: todayISO(), time: "10:00", kind: "Visit", notes: "", done: false });
const emptyPayment = (): Payment => ({ id: uid(), invoiceNo: genInvoiceNo(), doctorName: "", doctorArea: "", purpose: "", amount: 0, dueDate: todayISO(), paidDate: "", status: "pending", mode: "UPI" });

export default function App() {
  const [signedIn, setSignedIn] = useState(true);
  const [loginEmail, setLoginEmail] = useState("divakar.reddy@nutrova.com");
  const [bio, setBio] = useLocal<Bio>("nutrova-bio-v1", seedBio);
  const [doctors, setDoctors] = useLocal<Doctor[]>("nutrova-doctors-v3", seedDoctors);
  const [patches, setPatches] = useLocal<Patch[]>("nutrova-patches-v2", seedPatches);
  const [reminders, setReminders] = useLocal<Reminder[]>("nutrova-reminders-v1", seedReminders);
  const [payments, setPayments] = useLocal<Payment[]>("nutrova-payments-v2", seedPayments);

  const [bioDraft, setBioDraft] = useState<Bio>(bio);
  useEffect(() => setBioDraft(bio), [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /* one-time reconcile: link doctors to area patches + migrate products + appointment defaults */
  useEffect(() => {
    setDoctors((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        let rec: Doctor = { ...d } as Doctor;
        if (!(d.patchId && patches.some((p) => p.id === d.patchId))) {
          const match = patches.find((p) => p.name.toLowerCase() === (d.area || "").trim().toLowerCase());
          if (match && d.patchId !== match.id) { rec = { ...rec, patchId: match.id }; changed = true; }
          else if (!match && d.patchId) { rec = { ...rec, patchId: "" }; changed = true; }
        }
        const f = migrateProducts(rec.focusProducts);
        const fl = migrateProducts(rec.followProducts);
        if (JSON.stringify(f) !== JSON.stringify(rec.focusProducts || []) || JSON.stringify(fl) !== JSON.stringify(rec.followProducts || [])) {
          rec = { ...rec, focusProducts: f, followProducts: fl };
          changed = true;
        }
        if (!Array.isArray((rec as Partial<Doctor>).appointmentModes)) { rec = { ...rec, appointmentModes: [] }; changed = true; }
        if (typeof (rec as Partial<Doctor>).appointmentContact !== "string") { rec = { ...rec, appointmentContact: "" }; changed = true; }
        if (typeof (rec as Partial<Doctor>).appointmentPhone !== "string") { rec = { ...rec, appointmentPhone: "" }; changed = true; }
        if (typeof (rec as Partial<Doctor>).appointmentLead !== "string" || !(rec as Doctor).appointmentLead) { rec = { ...rec, appointmentLead: "Same day" }; changed = true; }
        if (typeof (rec as Partial<Doctor>).appointmentNote !== "string") { rec = { ...rec, appointmentNote: "" }; changed = true; }
        return rec;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [frozenScrolled, setFrozenScrolled] = useState(false);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");
  const [patchFilter, setPatchFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState("All");
  const [callsTodayOnly, setCallsTodayOnly] = useState(false);
  const [remFilter, setRemFilter] = useState<"all" | "today" | "upcoming" | "done">("all");
  const [payFilter, setPayFilter] = useState<"all" | PaymentStatus>("all");
  const [paySearch, setPaySearch] = useState("");
  const [payPendingBucket, setPayPendingBucket] = useState<"all" | "upcoming" | "1-15" | "16-30" | "30plus">("all");
  const [paySort, setPaySort] = useState<"mostPending" | "dueDate" | "amountHigh">("mostPending");
  const [apptFilter, setApptFilter] = useState("All");

  const [doctorModal, setDoctorModal] = useState<{ open: boolean; draft: Doctor; editing: boolean }>({ open: false, draft: emptyDoctor(), editing: false });
  const [reminderModal, setReminderModal] = useState<{ open: boolean; draft: Reminder; editing: boolean }>({ open: false, draft: emptyReminder(), editing: false });
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; draft: Payment; editing: boolean }>({ open: false, draft: emptyPayment(), editing: false });
  const [patchModal, setPatchModal] = useState(false);
  const [patchDraft, setPatchDraft] = useState<{ id: string; name: string; color: string }>({ id: "", name: "", color: "emerald" });
  const [quickArea, setQuickArea] = useState("");
  const [monWeek, setMonWeek] = useState("1st");
  const [monDay, setMonDay] = useState("Tuesday");
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; label: string; detail: string; confirmText: string; onYes: () => void }>({ open: false, title: "", label: "", detail: "", confirmText: "", onYes: () => {} });

  /* every delete goes through this confirmation — nothing deletes instantly */
  const closeConfirm = () => setConfirmDelete({ open: false, title: "", label: "", detail: "", confirmText: "", onYes: () => {} });
  const askConfirm = (opts: { title: string; label: string; detail?: string; confirmText?: string; onYes: () => void }) => {
    setConfirmDelete({ open: true, title: opts.title, label: opts.label, detail: opts.detail || "", confirmText: opts.confirmText || "Yes, remove", onYes: opts.onYes });
  };

  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "info" } | null>(null);
  const showToast = (msg: string, kind: "ok" | "info" = "ok") => {
    setToast({ msg, kind });
    window.setTimeout(() => setToast(null), 2600);
  };

  /* tab navigation — each tab is its own separate page (Bio shifted out of Dashboard) */
  const goTo = (id: Tab) => {
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* frozen header shadow + compact mode */
  useEffect(() => {
    const onScroll = () => setFrozenScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* derived */
  const patchOf = (id: string) => patches.find((p) => p.id === id);
  const doctorByName = (name: string) => doctors.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());
  const todaysReminders = useMemo(() => reminders.filter((r) => isToday(r.date) && !r.done), [reminders]);
  const visitsToday = useMemo(() => doctors.filter((d) => isToday(d.nextVisit)), [doctors]);
  const callsTodayList = useMemo(() => doctors.filter((d) => doctorCallsOn(d, new Date())), [doctors]);
  const pendingPayments = useMemo(() => payments.filter((p) => p.status !== "paid"), [payments]);
  const overduePayments = useMemo(() => payments.filter((p) => p.status !== "paid" && isCriticalOverdue(p.dueDate)), [payments]);
  const overdueAnyPayments = useMemo(() => payments.filter((p) => p.status !== "paid" && isPast(p.dueDate)), [payments]);
  const paidTotal = useMemo(() => payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0), [payments]);
  const pendingTotal = useMemo(() => pendingPayments.reduce((s, p) => s + p.amount, 0), [pendingPayments]);
  /* pending-days sorted: most overdue first (for dashboard widget) */
  const pendingByDays = useMemo(
    () => [...pendingPayments].sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate)),
    [pendingPayments]
  );

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (specFilter !== "All" && d.specialty !== specFilter) return false;
      if (productFilter !== "All" && !(d.focusProducts || []).includes(productFilter) && !(d.followProducts || []).includes(productFilter)) return false;
      if (apptFilter !== "All" && !(d.appointmentModes || []).includes(apptFilter)) return false;
      if (patchFilter === "none" && d.patchId) return false;
      if (patchFilter !== "all" && patchFilter !== "none" && d.patchId !== patchFilter) return false;
      if (callsTodayOnly && !doctorCallsOn(d, new Date())) return false;
      if (!q) return true;
      const patchName = patchOf(d.patchId)?.name || "";
      return [d.name, d.specialty, d.area, d.city, d.clinic, d.phone, patchName, describeWeekly(d.callDays || []), (d.monthlyCalls || []).join(" "), (d.focusProducts || []).join(" "), (d.followProducts || []).join(" "), (d.appointmentModes || []).join(" "), d.appointmentContact || "", d.appointmentPhone || "", d.appointmentNote || ""].join(" ").toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, search, specFilter, productFilter, apptFilter, patchFilter, callsTodayOnly, patches]);

  const filteredReminders = useMemo(() => {
    const t = todayISO();
    let list = [...reminders];
    if (remFilter === "today") list = list.filter((r) => r.date === t && !r.done);
    if (remFilter === "upcoming") list = list.filter((r) => r.date > t && !r.done);
    if (remFilter === "done") list = list.filter((r) => r.done);
    return list.sort((a, b) => (a.done === b.done ? (a.date + a.time).localeCompare(b.date + b.time) : a.done ? 1 : -1));
  }, [reminders, remFilter]);

  const filteredPayments = useMemo(() => {
    let list = [...payments];
    if (payFilter === "overdue") list = list.filter((p) => p.status !== "paid" && isCriticalOverdue(p.dueDate));
    else if (payFilter !== "all") list = list.filter((p) => (payFilter === "pending" ? p.status !== "paid" && !isCriticalOverdue(p.dueDate) : p.status === payFilter));
    /* pending-days bucket (payment page) */
    if (payPendingBucket === "upcoming") list = list.filter((p) => p.status !== "paid" && daysOverdue(p.dueDate) === 0 && !isToday(p.dueDate));
    else if (payPendingBucket === "1-15") list = list.filter((p) => p.status !== "paid" && daysOverdue(p.dueDate) >= 1 && daysOverdue(p.dueDate) <= 15);
    else if (payPendingBucket === "16-30") list = list.filter((p) => p.status !== "paid" && daysOverdue(p.dueDate) >= 16 && daysOverdue(p.dueDate) <= 30);
    else if (payPendingBucket === "30plus") list = list.filter((p) => p.status !== "paid" && daysOverdue(p.dueDate) > 30);
    /* payment search */
    const q = paySearch.trim().toLowerCase();
    if (q) list = list.filter((p) => [p.doctorName, p.doctorArea, p.invoiceNo, p.purpose, p.mode, String(p.amount)].join(" ").toLowerCase().includes(q));
    /* sort */
    if (paySort === "mostPending") list.sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate) || a.dueDate.localeCompare(b.dueDate));
    else if (paySort === "amountHigh") list.sort((a, b) => b.amount - a.amount);
    else list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list;
  }, [payments, payFilter, payPendingBucket, paySearch, paySort]);

  const payBuckets = useMemo(() => {
    const open = payments.filter((p) => p.status !== "paid");
    const b = {
      upcoming: open.filter((p) => daysOverdue(p.dueDate) === 0 && !isToday(p.dueDate)),
      d1_15: open.filter((p) => daysOverdue(p.dueDate) >= 1 && daysOverdue(p.dueDate) <= 15),
      d16_30: open.filter((p) => daysOverdue(p.dueDate) >= 16 && daysOverdue(p.dueDate) <= 30),
      d30plus: open.filter((p) => daysOverdue(p.dueDate) > 30),
    };
    return b;
  }, [payments]);

  const specialtiesInUse = useMemo(() => ["All", ...Array.from(new Set(doctors.map((d) => d.specialty)))], [doctors]);

  /* actions */
  const saveBio = () => {
    if (!bioDraft.name.trim()) return showToast("Please enter employee name", "info");
    setBio({ ...bioDraft });
    showToast("Bio saved — banner & footer updated");
  };

  const openDoctorModal = (editing: boolean, draft: Doctor) => {
    setMonWeek("1st");
    setMonDay("Tuesday");
    setQuickArea("");
    setDoctorModal({ open: true, draft, editing });
  };

  const setDraft = (patch: Partial<Doctor>) =>
    setDoctorModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const pickPatchForDraft = (patchId: string) => {
    const p = patches.find((x) => x.id === patchId);
    if (!p) setDraft({ patchId: "", area: "" });
    else setDraft({ patchId: p.id, area: p.name });
  };

  const quickAddArea = () => {
    const name = quickArea.trim();
    if (!name) return;
    const existing = patches.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setDraft({ patchId: existing.id, area: existing.name });
      setQuickArea("");
      return showToast(`Area "${existing.name}" selected`, "info");
    }
    const np: Patch = { id: uid(), name, color: PATCH_COLORS[patches.length % PATCH_COLORS.length] };
    setPatches((prev) => [...prev, np]);
    setDraft({ patchId: np.id, area: np.name });
    setQuickArea("");
    showToast(`Area "${name}" created & selected`);
  };

  const toggleProduct = (field: "focusProducts" | "followProducts", name: string) => {
    setDoctorModal((m) => {
      const list = m.draft[field] || [];
      return { ...m, draft: { ...m.draft, [field]: list.includes(name) ? list.filter((x) => x !== name) : [...list, name] } };
    });
  };

  const toggleAppointmentMode = (mode: string) => {
    setDoctorModal((m) => {
      const list = m.draft.appointmentModes || [];
      return { ...m, draft: { ...m.draft, appointmentModes: list.includes(mode) ? list.filter((x) => x !== mode) : [...list, mode] } };
    });
  };

  const saveDoctor = () => {
    const d = doctorModal.draft;
    if (!d.name.trim()) return showToast("Doctor name is required", "info");
    if (!d.area.trim()) return showToast("Area is required — pick an area patch", "info");
    if ((d.callDays || []).length === 0 && (d.monthlyCalls || []).length === 0)
      return showToast("Select at least one call day or monthly rule", "info");
    /* keep patch + area in sync (patch = area name) */
    let patchId = d.patchId;
    let area = d.area.trim();
    const byId = patches.find((p) => p.id === patchId);
    if (byId) area = byId.name;
    else {
      const byName = patches.find((p) => p.name.toLowerCase() === area.toLowerCase());
      if (byName) patchId = byName.id;
    }
    const rec = { ...d, area, patchId };
    if (doctorModal.editing) setDoctors((prev) => prev.map((x) => (x.id === rec.id ? rec : x)));
    else setDoctors((prev) => [{ ...rec, id: uid() }, ...prev]);
    setDoctorModal({ open: false, draft: emptyDoctor(), editing: false });
    showToast(doctorModal.editing ? "Doctor updated" : "Doctor added to patch");
  };

  const toggleCallDay = (day: string) => {
    setDoctorModal((m) => {
      const has = (m.draft.callDays || []).includes(day);
      return { ...m, draft: { ...m.draft, callDays: has ? m.draft.callDays.filter((x) => x !== day) : [...(m.draft.callDays || []), day] } };
    });
  };

  const applyPreset = (days: string[]) => {
    setDoctorModal((m) => ({ ...m, draft: { ...m.draft, callDays: [...days] } }));
  };

  const addMonthlyRule = () => {
    const rule = `${monWeek} ${monDay}`;
    setDoctorModal((m) => {
      if ((m.draft.monthlyCalls || []).includes(rule)) return m;
      return { ...m, draft: { ...m.draft, monthlyCalls: [...(m.draft.monthlyCalls || []), rule] } };
    });
  };

  const removeMonthlyRule = (rule: string) => {
    askConfirm({
      title: "Remove monthly rule?",
      label: `"${rule}"`,
      detail: "This call rule will be removed from this doctor.",
      confirmText: "Yes, remove rule",
      onYes: () => {
        setDoctorModal((m) => ({ ...m, draft: { ...m.draft, monthlyCalls: (m.draft.monthlyCalls || []).filter((x) => x !== rule) } }));
        closeConfirm();
        showToast(`Removed ${rule}`);
      },
    });
  };

  const clearDoctorProducts = (field: "focusProducts" | "followProducts") => {
    const label = field === "focusProducts" ? "Focus products" : "Follow-up products";
    const count = (doctorModal.draft[field] || []).length;
    if (count === 0) return;
    askConfirm({
      title: `Clear ${label.toLowerCase()}?`,
      label: `${count} product${count !== 1 ? "s" : ""} in ${label}`,
      detail: "All selected products in this section will be removed from this doctor.",
      confirmText: "Yes, clear all",
      onYes: () => {
        setDoctorModal((m) => ({ ...m, draft: { ...m.draft, [field]: [] } }));
        closeConfirm();
        showToast(`${label} cleared`);
      },
    });
  };

  const deleteDoctor = (d: Doctor) => {
    askConfirm({
      title: "Delete doctor?",
      label: d.name,
      detail: `${d.specialty || "Doctor"}${d.area ? ` · ${d.area}` : ""} — this removes the doctor, call schedule and product links.`,
      confirmText: "Yes, delete doctor",
      onYes: () => {
        setDoctors((pr) => pr.filter((x) => x.id !== d.id));
        closeConfirm();
        setDoctorModal((m) => (m.open && m.draft.id === d.id ? { open: false, draft: emptyDoctor(), editing: false } : m));
        showToast("Doctor removed");
      },
    });
  };

  const deleteReminder = (r: Reminder) => {
    askConfirm({
      title: "Delete reminder?",
      label: `"${r.title}"`,
      detail: `${r.doctorName || "General"}${r.date ? ` · ${fmtDate(r.date)}${r.time ? ` at ${r.time}` : ""}` : ""}`,
      confirmText: "Yes, delete reminder",
      onYes: () => {
        setReminders((p) => p.filter((x) => x.id !== r.id));
        closeConfirm();
        setReminderModal((m) => (m.open && m.draft.id === r.id ? { open: false, draft: emptyReminder(), editing: false } : m));
        showToast("Reminder deleted");
      },
    });
  };

  const markVisitDone = (doc: Doctor) => {
    const t = todayISO();
    const next = new Date();
    next.setDate(next.getDate() + 7);
    setDoctors((prev) => prev.map((d) => (d.id === doc.id ? { ...d, lastVisit: t, nextVisit: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}` } : d)));
    showToast(`Visit logged for ${doc.name}`);
  };

  const saveReminder = () => {
    const r = reminderModal.draft;
    if (!r.title.trim()) return showToast("Reminder title is required", "info");
    if (!r.date) return showToast("Please pick a date", "info");
    if (reminderModal.editing) setReminders((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    else setReminders((prev) => [{ ...r, id: uid() }, ...prev]);
    setReminderModal({ open: false, draft: emptyReminder(), editing: false });
    showToast(reminderModal.editing ? "Reminder updated" : "Reminder added");
  };

  const savePayment = () => {
    const p = paymentModal.draft;
    if (!p.doctorName.trim()) return showToast("Please select a doctor", "info");
    if (!p.amount || p.amount <= 0) return showToast("Enter a valid amount", "info");
    const status: PaymentStatus = p.status === "paid" ? "paid" : isCriticalOverdue(p.dueDate) ? "overdue" : "pending";
    const rec = { ...p, invoiceNo: p.invoiceNo.trim() || genInvoiceNo(), status, paidDate: p.status === "paid" ? p.paidDate || todayISO() : "" };
    if (paymentModal.editing) setPayments((prev) => prev.map((x) => (x.id === rec.id ? rec : x)));
    else setPayments((prev) => [{ ...rec, id: uid() }, ...prev]);
    setPaymentModal({ open: false, draft: emptyPayment(), editing: false });
    showToast(paymentModal.editing ? "Invoice updated" : "Invoice added");
  };

  const deleteInvoice = (p: Payment) => {
    askConfirm({
      title: "Delete invoice?",
      label: `${p.invoiceNo} · ${inr(p.amount)}`,
      detail: `${p.doctorName}${p.purpose ? ` — ${p.purpose}` : ""}`,
      confirmText: "Yes, delete invoice",
      onYes: () => {
        setPayments((prev) => prev.filter((x) => x.id !== p.id));
        closeConfirm();
        setPaymentModal((m) => (m.open && m.draft.id === p.id ? { open: false, draft: emptyPayment(), editing: false } : m));
        showToast("Invoice deleted");
      },
    });
  };

  const deletePatchAsk = (p: Patch) => {
    const binned = doctors.filter((d) => d.patchId === p.id).length;
    askConfirm({
      title: "Delete area patch?",
      label: `"${p.name}"`,
      detail: binned > 0 ? `${binned} doctor${binned !== 1 ? "s" : ""} will move to No patch.` : "No doctors are assigned to this area.",
      confirmText: "Yes, delete patch",
      onYes: () => {
        deletePatch(p);
        closeConfirm();
      },
    });
  };

  const markPaid = (p: Payment) => {
    setPayments((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "paid", paidDate: todayISO() } : x)));
    showToast(`Marked paid — ${inr(p.amount)}`);
  };

  const savePatch = () => {
    const name = patchDraft.name.trim();
    if (!name) return showToast("Area name is required", "info");
    const dup = patches.find((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== patchDraft.id);
    if (dup) return showToast(`"${name}" already exists`, "info");
    if (patchDraft.id) {
      setPatches((prev) => prev.map((p) => (p.id === patchDraft.id ? { ...p, name, color: patchDraft.color } : p)));
      setDoctors((prev) => prev.map((d) => (d.patchId === patchDraft.id ? { ...d, area: name } : d)));
      showToast("Area patch updated");
    } else {
      setPatches((prev) => [...prev, { id: uid(), name, color: patchDraft.color }]);
      showToast("Area patch created");
    }
    setPatchDraft({ id: "", name: "", color: "emerald" });
  };

  const editPatch = (p: Patch) => {
    setPatchDraft({ id: p.id, name: p.name, color: p.color });
  };

  const deletePatch = (p: Patch) => {
    setPatches((prev) => prev.filter((x) => x.id !== p.id));
    setDoctors((prev) => prev.map((d) => (d.patchId === p.id ? { ...d, patchId: "" } : d)));
    if (patchFilter === p.id) setPatchFilter("all");
    showToast(`Patch "${p.name}" deleted — doctors moved to No patch`);
  };

  const exportDoctors = () => {
    if (filteredDoctors.length === 0) return showToast("No doctors to download", "info");
    const header = ["Name", "Specialty", "Qualification", "Clinic", "Area / Patch", "City", "Phone", "Email", "Priority", "Frequency", "Call Days", "Monthly Calls", "Call Time", "Appointment Modes", "Appointment Lead", "Appointment Contact", "Appointment Phone", "Appointment Note", "Focus Products", "Follow-up Products", "Last Visit", "Days Since Last Visit", "Next Visit", "Days Overdue (Next)", "Notes"];
    const rows = filteredDoctors.map((d) => [
      d.name, d.specialty, d.qualification || "", d.clinic, d.area, d.city, d.phone, d.email || "",
      d.priority, d.frequency, describeWeekly(d.callDays || []), (d.monthlyCalls || []).join(" + "), describeTime(d),
      (d.appointmentModes || []).join(" + "), d.appointmentLead || "", d.appointmentContact || "", d.appointmentPhone || "", d.appointmentNote || "",
      (d.focusProducts || []).join(" + "), (d.followProducts || []).join(" + "),
      d.lastVisit ? fmtDate(d.lastVisit) : "", d.lastVisit ? String(daysSince(d.lastVisit)) : "",
      d.nextVisit ? fmtDate(d.nextVisit) : "", String(daysOverdue(d.nextVisit)), d.notes || "",
    ]);
    downloadCSV(`nutrova-doctors-${todayISO()}.csv`, header, rows);
    showToast(`Downloaded ${filteredDoctors.length} doctors as CSV`);
  };

  const exportPayments = () => {
    if (filteredPayments.length === 0) return showToast("No invoices to download", "info");
    const header = ["Invoice No", "Doctor", "Area", "Purpose", "Amount (INR)", "Due Date", "Pending Days", "Days Overdue", "Status", "Paid Date", "Mode"];
    const rows = filteredPayments.map((p) => {
      const st = p.status === "paid" ? "paid" : isCriticalOverdue(p.dueDate) ? "overdue (30+ days)" : isPast(p.dueDate) ? `pending (${daysOverdue(p.dueDate)}d)` : "pending";
      const pend = pendingDaysInfo(p);
      return [
        p.invoiceNo || "", p.doctorName, p.doctorArea || "", p.purpose, String(p.amount),
        p.dueDate ? fmtDate(p.dueDate) : "", pend.text, String(daysOverdue(p.dueDate)), st,
        p.paidDate ? fmtDate(p.paidDate) : "", p.mode,
      ];
    });
    downloadCSV(`nutrova-payments-${todayISO()}.csv`, header, rows);
    showToast(`Downloaded ${filteredPayments.length} invoices as CSV`);
  };

  /* ------------------------------- login gate ------------------------------ */
  if (!signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6">
        <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-emerald-950 px-8 pb-6 pt-8 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Stethoscope className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-tight">Nutrova Doctor Tracker</p>
                <p className="text-xs text-emerald-200/80">Medical Representative Workspace</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-8 py-7">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Work email</label>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="you@nutrova.com" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <input type="password" defaultValue="nutrova123" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="••••••••" />
            </div>
            <button
              onClick={() => {
                if (loginEmail.trim()) setBio((b) => ({ ...b, email: loginEmail.trim() }));
                setSignedIn(true);
                showToast(`Welcome back, ${bio.name.split(" ")[0] || "Rep"}`);
              }}
              className="w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99]"
            >
              Sign in to Tracker
            </button>
            <p className="text-center text-xs text-slate-400">Secure workspace for Nutrova field team · Bangalore HQ</p>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "doctors", label: "Doctors" },
    { id: "reminders", label: "Reminders" },
    { id: "payments", label: "Payments" },
    { id: "bio", label: "Bio" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* --------------------- FROZEN: top banner + nav pills (upto marked line) --------------------- */}
      <div className={`sticky top-0 z-40 transition-shadow duration-200 ${frozenScrolled ? "shadow-lg shadow-slate-900/10" : ""}`}>
        <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white">
          <div className={`mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 transition-all duration-200 sm:px-8 ${frozenScrolled ? "py-2.5" : "py-4 sm:py-5"}`}>
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
              <div className={`mt-0.5 flex shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-all duration-200 ${frozenScrolled ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11"}`}>
                <Stethoscope className={`${frozenScrolled ? "h-5 w-5" : "h-5 w-5 sm:h-6 sm:w-6"} text-emerald-300`} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={`font-extrabold leading-tight tracking-tight transition-all duration-200 ${frozenScrolled ? "text-[15px] sm:text-lg" : "text-[17px] sm:text-2xl"}`}>Nutrova Doctor Tracker</h1>
                {/* tagline — always fully visible, wraps to 2 lines on mobile instead of cutting */}
                <p className={`text-emerald-100/90 transition-all duration-200 ${frozenScrolled ? "mt-0.5 text-[11px] leading-snug sm:text-xs" : "mt-1 text-xs leading-snug sm:text-sm"}`}>
                  Created by <span className="font-bold text-white underline decoration-emerald-300/60 underline-offset-2">{bio.name || "—"}</span>
                  <span className="mx-1.5 text-emerald-300/60">·</span><span className="whitespace-nowrap">{bio.role || "Medical Representative"}</span>
                  <span className="mx-1.5 text-emerald-300/60">·</span><span className="font-bold text-white">Nutrova</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-2 pt-0.5 sm:gap-3">
              <span className="hidden items-center gap-2 pt-2 text-sm font-medium text-emerald-100/90 xl:flex">
                <Mail className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="max-w-[220px] truncate">{bio.email || "—"}</span>
              </span>
              <button onClick={() => setSignedIn(false)} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 sm:gap-2 sm:text-sm ${frozenScrolled ? "px-3 py-1.5 text-xs sm:px-4" : "px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm"}`}>
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Sign out
              </button>
            </div>
          </div>
        </header>

        <nav className={`border-b border-slate-200 bg-white/95 backdrop-blur transition-all duration-200 ${frozenScrolled ? "shadow-sm" : ""}`}>
          <div className={`mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-5 sm:px-8 no-scrollbar ${frozenScrolled ? "py-2" : "py-3"}`}>
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${
                  activeTab === n.id
                    ? "bg-emerald-700 text-white shadow-md shadow-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {n.label}
              </button>
            ))}
            <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-slate-400 md:flex">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500 anim-pulse-soft" />
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* ------------------------------- dashboard ------------------------------ */}
        {activeTab === "dashboard" && (
        <section id="dashboard" key="tab-dashboard" className="anim-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h2>

          {/* calls by schedule today */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                    <CalendarClock className="h-4 w-4" /> Giving calls today · by OPD schedule
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Auto-matched from each doctor's weekly call days + monthly rules ({new Date().toLocaleDateString("en-IN", { weekday: "long" })}).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-extrabold text-white">{callsTodayList.length} doctors</span>
                  <button onClick={() => { setCallsTodayOnly(true); setPatchFilter("all"); goTo("doctors"); }} className="rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-50">
                    View all
                  </button>
                </div>
              </div>
              {callsTodayList.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">No doctor has a scheduled call today.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {callsTodayList.slice(0, 6).map((d) => {
                    const p = patchOf(d.patchId);
                    const ps = patchStyles(p?.color || "emerald");
                    const appts = d.appointmentModes || [];
                    return (
                      <button key={d.id} onClick={() => { setSearch(d.name); setCallsTodayOnly(false); goTo("doctors"); }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-300 hover:shadow">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-xs font-extrabold text-white">{initials(d.name)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-slate-900">{d.name}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{d.specialty} · {d.area}</p>
                          {appts.length > 0 && <p className="mt-0.5 truncate text-[11px] font-bold text-sky-700">Appt: {appts.slice(0, 2).join(" · ")}{appts.length > 2 ? " +" + (appts.length - 2) : ""}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="flex items-center justify-end gap-1 text-xs font-extrabold text-emerald-700"><Clock className="h-3 w-3" />{describeTime(d)}</p>
                          {p && <p className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${ps.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${ps.dot}`} />{p.name}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* patch quick summary */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-100 pt-4">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-400"><Layers className="h-3.5 w-3.5" /> {patches.length} area patches</span>
                {patches.map((p) => {
                  const ps = patchStyles(p.color);
                  const count = doctors.filter((d) => d.patchId === p.id).length;
                  return (
                    <button key={p.id} onClick={() => { setPatchFilter(p.id); goTo("doctors"); }} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:shadow ${ps.badge}`}>
                      <span className={`h-2 w-2 rounded-full ${ps.dot}`} /> {p.name} · {count}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NOTE: Dashboard intentionally has NO bio card and NO products coverage — bio lives in Bio tab only */}

          {/* payment pending days — as per 30-day rule: red only when >30 days pending */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-700">
                    <Wallet className="h-4 w-4" /> Payment pending days
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Red = pending 30+ days · below 30 days normal colour · most overdue first
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-extrabold text-white">{pendingPayments.length} open · {inr(pendingTotal)}</span>
                  {overduePayments.length > 0 && (
                    <span className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-extrabold text-white">{overduePayments.length} red · 30+ days</span>
                  )}
                  <button onClick={() => { setPayFilter("all"); goTo("payments"); }} className="rounded-full border border-amber-200 bg-white px-4 py-1.5 text-xs font-extrabold text-amber-800 transition hover:bg-amber-50">
                    View all
                  </button>
                </div>
              </div>
              {pendingByDays.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">No pending invoices — all settled.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {pendingByDays.slice(0, 6).map((p) => {
                    const info = pendingDaysInfo(p);
                    const critical = info.tone === "red";
                    return (
                      <button key={p.id} onClick={() => { setPayFilter(critical ? "overdue" : "pending"); goTo("payments"); }} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:shadow ${critical ? "border-rose-300 bg-rose-50/60 hover:border-rose-400" : "border-slate-200 bg-white hover:border-amber-300"}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white ${critical ? "bg-rose-600" : "bg-emerald-700"}`}>{initials(p.doctorName || "?")}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-slate-900">{p.doctorName}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{p.invoiceNo} · {inr(p.amount)}</p>
                          <p className="truncate text-[11px] font-medium text-slate-400">Due {fmtShort(p.dueDate)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${pendingBadgeCls(info.tone)}`}>
                          {info.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pendingByDays.length > 6 && (
                <p className="mt-3 text-xs font-bold text-slate-400">Showing 6 of {pendingByDays.length} open invoices — open Payments for the full list.</p>
              )}
            </div>
          </div>

          {/* today's plan strip */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/60 shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                  <Clock className="h-4 w-4" /> Today's field plan
                </p>
                {todaysReminders.length === 0 && visitsToday.length === 0 ? (
                  <p className="mt-2 text-sm font-medium text-slate-500">Nothing scheduled for today — enjoy the breather or add a visit.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {todaysReminders.slice(0, 4).map((r) => (
                      <button key={r.id} onClick={() => goTo("reminders")} className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:shadow">
                        <Bell className="h-3.5 w-3.5 text-emerald-600" /> {r.time} · {r.doctorName.replace("Dr. ", "")}
                      </button>
                    ))}
                    {visitsToday.slice(0, 4).map((d) => (
                      <button key={d.id} onClick={() => goTo("doctors")} className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:shadow">
                        <MapPin className="h-3.5 w-3.5 text-amber-600" /> Visit · {d.name.replace("Dr. ", "")} — {d.area}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setReminderModal({ open: true, draft: emptyReminder(), editing: false })} className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-800">
                  <Plus className="h-4 w-4" /> Reminder
                </button>
                <button onClick={() => openDoctorModal(false, emptyDoctor())} className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-amber-950 shadow-md shadow-amber-200 transition hover:bg-amber-300">
                  <Plus className="h-4 w-4" /> Doctor
                </button>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ------------------------------ employee bio — own short tab, shifted out of Dashboard ------------------------------ */}
        {activeTab === "bio" && (
        <section id="bio" key="tab-bio" className="anim-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Bio</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Short employee profile · shown in banner and footer</p>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
            {/* short bio ID card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-6 pb-5 pt-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-extrabold ring-1 ring-white/25">
                    {initials(bio.name || "MR")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold leading-tight">{bio.name || "—"}</p>
                    <p className="truncate text-sm text-emerald-100/80">{bio.role || "Medical Representative"}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-100 ring-1 ring-white/20">
                      <Building2 className="h-3 w-3" /> Nutrova
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 p-5 text-sm">
                <p className="flex items-center gap-2.5 font-medium text-slate-700"><MapPin className="h-4 w-4 shrink-0 text-emerald-600" /> {bio.city || "—"}, {bio.state || "—"} <span className="text-slate-300">·</span> HQ: {bio.hq || "—"}</p>
                <p className="flex items-center gap-2.5 font-medium text-slate-700"><Phone className="h-4 w-4 shrink-0 text-emerald-600" /> {bio.phone || "Phone not set"}</p>
                <p className="flex items-center gap-2.5 font-medium text-slate-700"><Mail className="h-4 w-4 shrink-0 text-emerald-600" /> <a href={`mailto:${bio.email}`} className="truncate underline decoration-slate-200 underline-offset-2 hover:text-emerald-700">{bio.email || "—"}</a></p>
                <div className="mt-1 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div className="rounded-2xl bg-emerald-50 px-2 py-2.5 ring-1 ring-emerald-100">
                    <p className="text-lg font-extrabold text-emerald-800">{doctors.length}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Doctors</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-200">
                    <p className="text-lg font-extrabold text-slate-800">{patches.length}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Patches</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-2 py-2.5 ring-1 ring-amber-100">
                    <p className="text-lg font-extrabold text-amber-800">{callsTodayList.length}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">Calls today</p>
                  </div>
                </div>
              </div>
            </div>

            {/* edit form */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-l-4 border-emerald-500 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Employee Bio Data</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">Auto-updates banner + footer</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BioInput label="Full name" value={bioDraft.name} onChange={(v) => setBioDraft({ ...bioDraft, name: v })} placeholder="Divakar Reddy" />
                  <BioInput label="Role" value={bioDraft.role} onChange={(v) => setBioDraft({ ...bioDraft, role: v })} placeholder="Medical Representative" />
                  <BioInput label="City" value={bioDraft.city} onChange={(v) => setBioDraft({ ...bioDraft, city: v })} placeholder="Bangalore" />
                  <BioInput label="State" value={bioDraft.state} onChange={(v) => setBioDraft({ ...bioDraft, state: v })} placeholder="Karnataka" />
                  <BioInput label="HQ" value={bioDraft.hq} onChange={(v) => setBioDraft({ ...bioDraft, hq: v })} placeholder="Bangalore" />
                  <BioInput label="Phone" value={bioDraft.phone} onChange={(v) => setBioDraft({ ...bioDraft, phone: v })} placeholder="Phone" />
                  <div className="sm:col-span-2">
                    <BioInput label="Email" value={bioDraft.email} onChange={(v) => setBioDraft({ ...bioDraft, email: v })} placeholder="you@nutrova.com" />
                  </div>
                </div>
                <button onClick={saveBio} className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] sm:w-auto sm:px-10">
                  Save Bio
                </button>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* -------------------------------- doctors -------------------------------- */}
        {activeTab === "doctors" && (
        <section id="doctors" key="tab-doctors" className="anim-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Doctors</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{doctors.length} doctors · {patches.length} area patches · <span className="font-bold text-slate-600">Red = 30+ days overdue only</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportDoctors} title={`Download ${filteredDoctors.length} doctors as CSV`} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-100">
                <Download className="h-4 w-4" /> Download <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] text-white">{filteredDoctors.length}</span>
              </button>
              <button onClick={() => openDoctorModal(false, emptyDoctor())} className="flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2 text-sm font-extrabold text-amber-950 shadow-md shadow-amber-200 transition hover:bg-amber-300">
                <Plus className="h-4 w-4" /> Add Doctor
              </button>
            </div>
          </div>

          {/* patch filter bar */}
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-1 text-xs font-extrabold uppercase tracking-widest text-slate-500"><Layers className="h-4 w-4 text-emerald-600" /> Area patches</span>
              <button onClick={() => setPatchFilter("all")} className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${patchFilter === "all" ? "bg-emerald-700 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700"}`}>
                All · {doctors.length}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {patches.map((p) => {
                  const ps = patchStyles(p.color);
                  const count = doctors.filter((d) => d.patchId === p.id).length;
                  const active = patchFilter === p.id;
                  return (
                    <button key={p.id} onClick={() => setPatchFilter(active ? "all" : p.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${active ? "border-emerald-600 bg-emerald-700 text-white shadow" : `${ps.badge} hover:shadow`}`}>
                      {!active && <span className={`h-2 w-2 rounded-full ${ps.dot}`} />}
                      {p.name} · {count}
                    </button>
                  );
                })}
                <button onClick={() => setPatchFilter(patchFilter === "none" ? "all" : "none")} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${patchFilter === "none" ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-500 ring-slate-200 hover:text-slate-800"}`}>
                  No patch · {doctors.filter((d) => !d.patchId).length}
                </button>
              </div>
              <button onClick={() => { setPatchDraft({ id: "", name: "", color: "emerald" }); setPatchModal(true); }} className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-50">
                <Plus className="h-3.5 w-3.5" /> Manage patches
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
              <button onClick={() => setCallsTodayOnly(!callsTodayOnly)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${callsTodayOnly ? "bg-emerald-700 text-white ring-emerald-700 shadow" : "bg-white text-slate-600 ring-slate-200 hover:ring-emerald-300 hover:text-emerald-700"}`}>
                <CalendarClock className="h-3.5 w-3.5" /> {callsTodayOnly ? "Showing: calls today ✕" : `Calls today · ${callsTodayList.length}`}
              </button>
              {productFilter !== "All" && (
                <button onClick={() => setProductFilter("All")} title={productFilter} className="flex max-w-full items-center gap-1.5 rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-extrabold text-white shadow">
                  <Package className="h-3.5 w-3.5 shrink-0" /> <span className="max-w-[260px] truncate">{shortProduct(productFilter)}</span> ✕
                </button>
              )}
              {apptFilter !== "All" && (
                <button onClick={() => setApptFilter("All")} title={apptFilter} className="flex max-w-full items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" /> <span className="max-w-[220px] truncate">{apptFilter}</span> ✕
                </button>
              )}
              {(patchFilter !== "all" || callsTodayOnly || specFilter !== "All" || productFilter !== "All" || apptFilter !== "All" || search) && (
                <button onClick={() => { setPatchFilter("all"); setCallsTodayOnly(false); setSpecFilter("All"); setProductFilter("All"); setApptFilter("All"); setSearch(""); }} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline">
                  Clear all filters
                </button>
              )}
              <span className="ml-auto hidden text-xs font-semibold text-slate-400 sm:block">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""} shown</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <Search className="h-5 w-5 shrink-0 text-emerald-600" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor / area / specialty / product / appointment" className="w-full bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400" />
              {search && <button onClick={() => setSearch("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-emerald-500">
                {specialtiesInUse.map((s) => <option key={s} value={s}>{s === "All" ? "All specialties" : s}</option>)}
              </select>
              <select value={apptFilter} onChange={(e) => setApptFilter(e.target.value)} title="Filter by appointment mode" className="rounded-2xl border border-sky-200 bg-sky-50/50 px-4 py-3 text-sm font-bold text-sky-900 shadow-sm outline-none focus:border-sky-500">
                <option value="All">All appointment modes</option>
                {APPOINTMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-emerald-500 md:max-w-[280px]">
                <option value="All">All Nutrova products (25)</option>
                {PRODUCT_CATS.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {NUTROVA_PRODUCTS.filter((p) => p.category === cat).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Stethoscope className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-extrabold text-slate-700">No doctors found</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search or add a new doctor to your territory.</p>
              <button onClick={() => openDoctorModal(false, emptyDoctor())} className="mt-4 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Add Doctor</button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((d) => {
                const p = patchOf(d.patchId);
                const ps = patchStyles(p?.color || "emerald");
                const givesToday = doctorCallsOn(d, new Date());
                const next = nextCallDate(d);
                return (
                  <article key={d.id} className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 font-extrabold text-white">
                        {initials(d.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[16px] font-extrabold text-slate-900">{d.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
                          <Stethoscope className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{d.specialty}</span>
                          {d.qualification && <span className="hidden truncate font-medium text-slate-400 xl:inline">· {d.qualification}</span>}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {p ? (
                            <button onClick={() => setPatchFilter(p.id)} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${ps.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${ps.dot}`} /> {p.name}
                            </button>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-500">{d.area || "No patch"}</span>
                          )}
                          {d.priority === "High" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600 ring-1 ring-rose-100">High priority</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[13px] font-medium text-slate-600">
                      <p className="flex items-center gap-2 truncate"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.clinic || "—"}</p>
                      <p className="flex items-center gap-2 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.area}{d.city ? `, ${d.city}` : ""} <span className="text-slate-300">·</span> {d.frequency}</p>
                      <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.phone || "—"}</p>
                    </div>

                    {/* call schedule block */}
                    <div className={`mt-3 rounded-2xl border p-3 ${givesToday ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-slate-50/70"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5 text-emerald-600" /> Call days
                        </p>
                        {givesToday
                          ? <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white anim-pulse-soft">Gives call today</span>
                          : next && <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-500 ring-1 ring-slate-200">Next: {next.label}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {WEEK_SHORT.map((day) => {
                          const on = (d.callDays || []).includes(day);
                          return (
                            <span key={day} title={fullFromShort(day)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-extrabold transition ${on ? "bg-emerald-700 text-white shadow-sm" : "bg-white text-slate-300 ring-1 ring-slate-200"}`}>
                              {day[0]}
                            </span>
                          );
                        })}
                        <span className="ml-1.5 truncate text-[11px] font-extrabold text-slate-600">{describeWeekly(d.callDays || [])}</span>
                      </div>
                      {(d.monthlyCalls || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(d.monthlyCalls || []).map((r) => (
                            <span key={r} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-700">{r}</span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> {describeTime(d)}
                      </p>
                    </div>

                    {/* Appointment — how to take appointment */}
                    {((d.appointmentModes || []).length > 0 || d.appointmentContact || d.appointmentPhone || d.appointmentNote) && (
                      <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-800">
                          <CalendarDays className="h-3.5 w-3.5" /> Appointment · {d.appointmentLead || "Same day"}
                        </p>
                        {(d.appointmentModes || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(d.appointmentModes || []).map((m) => (
                              <button key={m} onClick={() => setApptFilter(m)} title="Filter by this appointment mode" className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-sky-800 transition hover:bg-sky-100">{m}</button>
                            ))}
                          </div>
                        )}
                        {(d.appointmentContact || d.appointmentPhone) && (
                          <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-bold text-slate-600">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{d.appointmentContact}{d.appointmentContact && d.appointmentPhone ? " · " : ""}{d.appointmentPhone}</span>
                          </p>
                        )}
                        {d.appointmentNote && <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{d.appointmentNote}</p>}
                      </div>
                    )}

                    {/* Nutrova products block — full names from sheet */}
                    {((d.focusProducts || []).length > 0 || (d.followProducts || []).length > 0) && (
                      <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                        {(d.focusProducts || []).length > 0 && (
                          <div>
                            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                              <Target className="h-3 w-3" /> Focus · {(d.focusProducts || []).length}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {(d.focusProducts || []).slice(0, 3).map((pr) => (
                                <button key={pr} onClick={() => setProductFilter(pr)} title={`${pr} — tap to filter`} className="max-w-full truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-left text-[11px] font-extrabold text-emerald-800 transition hover:bg-emerald-100">{shortProduct(pr)}</button>
                              ))}
                              {(d.focusProducts || []).length > 3 && <span className="px-1 py-1 text-[11px] font-extrabold text-slate-400">+{(d.focusProducts || []).length - 3} more</span>}
                            </div>
                          </div>
                        )}
                        {(d.followProducts || []).length > 0 && (
                          <div>
                            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                              <RefreshCcw className="h-3 w-3" /> Follow-up · {(d.followProducts || []).length}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {(d.followProducts || []).slice(0, 3).map((pr) => (
                                <button key={pr} onClick={() => setProductFilter(pr)} title={`${pr} — tap to filter`} className="max-w-full truncate rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-left text-[11px] font-extrabold text-amber-800 transition hover:bg-amber-100">{shortProduct(pr)}</button>
                              ))}
                              {(d.followProducts || []).length > 3 && <span className="px-1 py-1 text-[11px] font-extrabold text-slate-400">+{(d.followProducts || []).length - 3} more</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {d.notes && <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium leading-relaxed text-slate-500">{d.notes}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                      {(() => {
                        const since = d.lastVisit ? daysSince(d.lastVisit) : 0;
                        const stale = d.lastVisit ? since > 30 : false;
                        return (
                          <span title={d.lastVisit ? `${since} days ago` : "No visit logged"} className={`rounded-lg px-2.5 py-1.5 ${stale ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                            Last: {fmtShort(d.lastVisit)}{stale ? ` · ${since}d ago` : ""}
                          </span>
                        );
                      })()}
                      {(() => {
                        const od = daysOverdue(d.nextVisit);
                        const critical = od > 30;
                        const past = od > 0;
                        const today = isToday(d.nextVisit);
                        return (
                          <span title={critical ? `${od} days overdue — needs attention` : past ? `${od} days overdue` : today ? "Due today" : "Upcoming"} className={`rounded-lg px-2.5 py-1.5 ${critical ? "bg-rose-600 text-white" : past ? "bg-amber-100 text-amber-800" : today ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                            Next: {fmtShort(d.nextVisit)}{today ? " · Today" : critical ? ` · ${od}d overdue` : past ? ` · ${od}d late` : ""}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => markVisitDone(d)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                        <Check className="h-3.5 w-3.5" /> Visit Done
                      </button>
                      <IconBtn title="Add reminder" onClick={() => setReminderModal({ open: true, draft: { ...emptyReminder(), doctorName: d.name, doctorArea: d.area }, editing: false })}><Bell className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Edit" onClick={() => openDoctorModal(true, { ...d, callDays: [...(d.callDays || [])], monthlyCalls: [...(d.monthlyCalls || [])], focusProducts: [...(d.focusProducts || [])], followProducts: [...(d.followProducts || [])], appointmentModes: [...(d.appointmentModes || [])] })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => deleteDoctor(d)}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* ------------------------------- reminders ------------------------------- */}
        {activeTab === "reminders" && (
        <section id="reminders" key="tab-reminders" className="anim-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Reminders</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {todaysReminders.length} due today · {reminders.filter((r) => !r.done).length} open · {reminders.filter((r) => r.done).length} completed
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full bg-slate-100 p-1">
                {(["all", "today", "upcoming", "done"] as const).map((f) => (
                  <button key={f} onClick={() => setRemFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize transition ${remFilter === f ? "bg-emerald-700 text-white shadow" : "text-slate-500 hover:text-emerald-800"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={() => setReminderModal({ open: true, draft: emptyReminder(), editing: false })} className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-800">
                <Plus className="h-4 w-4" /> Add Reminder
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredReminders.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center lg:col-span-2">
                <Bell className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-extrabold text-slate-700">No reminders here</p>
                <p className="mt-1 text-sm text-slate-500">Add one to stay on top of your field visits.</p>
              </div>
            )}
            {filteredReminders.map((r) => {
              const overdue = !r.done && isPast(r.date);
              const critical = !r.done && isCriticalOverdue(r.date);
              const od = daysOverdue(r.date);
              const area = r.doctorArea || doctorByName(r.doctorName)?.area || "";
              return (
                <div key={r.id} className={`flex gap-3.5 rounded-3xl border p-4 shadow-sm transition ${r.done ? "border-slate-200 bg-slate-50/70" : critical ? "border-rose-300 bg-rose-50/60" : overdue ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md"}`}>
                  <button
                    onClick={() => { setReminders((p) => p.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x))); if (!r.done) showToast("Reminder completed"); }}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${r.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent hover:border-emerald-500"}`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                      {isToday(r.date) && !r.done && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">Today</span>}
                      {critical && <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">Overdue · {od}d</span>}
                      {overdue && !critical && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 ring-1 ring-amber-200">Overdue · {od}d</span>}
                      {r.done && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">Done</span>}
                      {area && <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600"><MapPin className="h-3 w-3" />{area}</span>}
                    </div>
                    <p className={`mt-1.5 text-[15px] font-extrabold ${r.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{r.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {r.doctorName || "General"}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtDate(r.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.time}</span>
                    </p>
                    {r.notes && <p className="mt-1.5 text-[13px] font-medium text-slate-500">{r.notes}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <IconBtn title="Edit" onClick={() => setReminderModal({ open: true, draft: { ...r }, editing: true })}><Pencil className="h-4 w-4" /></IconBtn>
                    <IconBtn title="Delete" danger onClick={() => deleteReminder(r)}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* -------------------------------- payments ------------------------------- */}
        {activeTab === "payments" && (
        <section id="payments" key="tab-payments" className="anim-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Payments</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Invoices · <span className="font-bold text-slate-600">Red = overdue 30+ days only</span> · below 30 days shows normal colour</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full bg-slate-100 p-1">
                {(["all", "pending", "overdue", "paid"] as const).map((f) => {
                  const c = f === "all" ? payments.length : f === "pending" ? payments.filter((x) => x.status !== "paid" && !isCriticalOverdue(x.dueDate)).length : f === "overdue" ? overduePayments.length : payments.filter((x) => x.status === "paid").length;
                  return (
                    <button key={f} title={f === "overdue" ? "Overdue more than 30 days" : f} onClick={() => setPayFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize transition ${payFilter === f ? "bg-emerald-700 text-white shadow" : "text-slate-500 hover:text-emerald-800"}`}>
                      {f} · {c}
                    </button>
                  );
                })}
              </div>
              <button onClick={exportPayments} title={`Download ${filteredPayments.length} invoices as CSV`} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-100">
                <Download className="h-4 w-4" /> Download <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] text-white">{filteredPayments.length}</span>
              </button>
              <button onClick={() => setPaymentModal({ open: true, draft: emptyPayment(), editing: false })} className="flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2 text-sm font-extrabold text-amber-950 shadow-md shadow-amber-200 transition hover:bg-amber-300">
                <Plus className="h-4 w-4" /> Add Invoice
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-700"><Wallet className="h-4 w-4" /> Outstanding</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">{inr(pendingTotal)}</p>
              <p className="mt-0.5 text-xs font-bold text-amber-700">{pendingPayments.length} open invoices · {overdueAnyPayments.length} past due (normal)</p>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-rose-700"><Clock className="h-4 w-4" /> Overdue 30+ days</p>
              <p className="mt-1 text-3xl font-extrabold text-rose-600">{overduePayments.length}</p>
              <p className="mt-0.5 text-xs font-bold text-rose-600">{inr(overduePayments.reduce((s, p) => s + p.amount, 0))} red — needs action</p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700"><IndianRupee className="h-4 w-4" /> Paid out</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">{inr(paidTotal)}</p>
              <p className="mt-0.5 text-xs font-bold text-emerald-700">{payments.filter((p) => p.status === "paid").length} settled</p>
            </div>
          </div>

          {/* Pending days — in payment page (buckets + search + sort) */}
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-1 text-xs font-extrabold uppercase tracking-widest text-slate-500"><Clock className="h-4 w-4 text-amber-600" /> Pending days</span>
              <button onClick={() => setPayPendingBucket("all")} className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${payPendingBucket === "all" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900"}`}>
                All · {pendingPayments.length}
              </button>
              <button onClick={() => setPayPendingBucket(payPendingBucket === "upcoming" ? "all" : "upcoming")} title="Due today or in future" className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${payPendingBucket === "upcoming" ? "bg-emerald-700 text-white ring-emerald-700 shadow" : "bg-white text-slate-600 ring-slate-200 hover:ring-emerald-300"}`}>
                Upcoming · {payBuckets.upcoming.length}
              </button>
              <button onClick={() => setPayPendingBucket(payPendingBucket === "1-15" ? "all" : "1-15")} title="1 to 15 days pending — normal colour" className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${payPendingBucket === "1-15" ? "bg-amber-500 text-white ring-amber-500 shadow" : "bg-amber-50 text-amber-800 ring-amber-200 hover:shadow"}`}>
                1–15d · {payBuckets.d1_15.length}
              </button>
              <button onClick={() => setPayPendingBucket(payPendingBucket === "16-30" ? "all" : "16-30")} title="16 to 30 days pending — normal colour" className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${payPendingBucket === "16-30" ? "bg-amber-600 text-white ring-amber-600 shadow" : "bg-amber-50 text-amber-800 ring-amber-200 hover:shadow"}`}>
                16–30d · {payBuckets.d16_30.length}
              </button>
              <button onClick={() => setPayPendingBucket(payPendingBucket === "30plus" ? "all" : "30plus")} title="More than 30 days pending — RED" className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${payPendingBucket === "30plus" ? "bg-rose-600 text-white ring-rose-600 shadow" : "bg-rose-50 text-rose-700 ring-rose-200 hover:shadow"}`}>
                30+d RED · {payBuckets.d30plus.length}
              </button>
              <span className="ml-auto hidden text-xs font-semibold text-slate-400 sm:block">{filteredPayments.length} shown · {inr(filteredPayments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0))} open in view</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input value={paySearch} onChange={(e) => setPaySearch(e.target.value)} placeholder="Search invoice / doctor / area / amount" className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
                {paySearch && <button onClick={() => setPaySearch("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
              </div>
              <select value={paySort} onChange={(e) => setPaySort(e.target.value as typeof paySort)} title="Sort invoices" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-emerald-500">
                <option value="mostPending">Sort: Most pending days first</option>
                <option value="dueDate">Sort: Due date (oldest first)</option>
                <option value="amountHigh">Sort: Amount (high first)</option>
              </select>
              {(payPendingBucket !== "all" || paySearch || payFilter !== "all") && (
                <button onClick={() => { setPayPendingBucket("all"); setPaySearch(""); setPayFilter("all"); }} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline">
                  Clear payment filters
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.2fr_0.9fr_1.3fr_0.7fr_0.8fr_0.9fr_0.7fr_auto] gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 lg:grid">
              <span>Doctor</span><span>Invoice</span><span>Purpose</span><span>Amount</span><span>Due date</span><span>Pending days</span><span>Status</span><span className="text-right">Actions</span>
            </div>
            {filteredPayments.length === 0 && (
              <div className="p-10 text-center">
                <Wallet className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-extrabold text-slate-700">No invoices here</p>
              </div>
            )}
            {filteredPayments.map((p) => {
              const od = daysOverdue(p.dueDate);
              const critical = p.status !== "paid" && od > 30;
              const pastSmall = p.status !== "paid" && od > 0 && od <= 30;
              const st = p.status === "paid" ? "paid" : critical ? "overdue" : "pending";
              const pend = pendingDaysInfo(p);
              return (
                <div key={p.id} className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-5 py-4 last:border-0 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_1.3fr_0.7fr_0.8fr_0.9fr_0.7fr_auto] lg:items-center lg:gap-3 ${critical ? "bg-rose-50/50" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold text-white ${critical ? "bg-rose-600" : "bg-emerald-700"}`}>{initials(p.doctorName || "?")}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">{p.doctorName}</p>
                      <p className="text-xs font-medium text-slate-400">{p.mode}{p.doctorArea ? ` · ${p.doctorArea}` : ""}</p>
                    </div>
                  </div>
                  <p>
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-extrabold ${critical ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                      <FileText className={`h-3.5 w-3.5 ${critical ? "text-rose-500" : "text-slate-400"}`} />{p.invoiceNo || "—"}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-slate-600">{p.purpose}</p>
                  <p className={`text-base font-extrabold ${critical ? "text-rose-700" : "text-slate-900"}`}>{inr(p.amount)}</p>
                  <p className={`text-sm font-bold ${critical ? "text-rose-700" : "text-slate-600"}`}>
                    {fmtDate(p.dueDate)}
                    {p.status === "paid" && p.paidDate && <span className="block text-xs font-medium text-emerald-600">Paid {fmtShort(p.paidDate)}</span>}
                  </p>
                  <div>
                    <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 lg:hidden">Pending days</span>
                    <span title={critical ? `${od} days pending — over 30 days, red` : pastSmall ? `${od} days pending — under 30 days, normal colour` : pend.text} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${pendingBadgeCls(pend.tone)}`}>
                      <Clock className="h-3 w-3" />{pend.text}
                    </span>
                  </div>
                  <div>
                    <span title={critical ? `${od} days overdue — over 30 days` : pastSmall ? `${od} days overdue — under 30 days, normal colour` : st} className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ${st === "paid" ? "bg-emerald-100 text-emerald-800" : st === "overdue" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800"}`}>
                      {st}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 lg:justify-end">
                    {p.status !== "paid" && (
                      <button onClick={() => markPaid(p)} className="flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                        <Check className="h-3.5 w-3.5" /> Mark paid
                      </button>
                    )}
                    <IconBtn title="Edit invoice" onClick={() => setPaymentModal({ open: true, draft: { ...p }, editing: true })}><Pencil className="h-4 w-4" /></IconBtn>
                    <IconBtn title="Delete invoice" danger onClick={() => deleteInvoice(p)}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}
      </main>

      {/* --------------------------------- footer --------------------------------- */}
      <footer className="mt-12 bg-emerald-950 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 sm:px-8 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-base font-extrabold"><Stethoscope className="h-5 w-5 text-emerald-300" /> Nutrova Doctor Tracker</p>
            <p className="mt-1.5 text-sm text-emerald-100/70">Field companion for {bio.name || "MR"} · {bio.role} · {bio.city}, {bio.state}</p>
          </div>
          <div className="text-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/70">Territory summary</p>
            <p className="mt-1.5 font-medium text-emerald-50">{doctors.length} doctors · {patches.length} patches · {callsTodayList.length} calls today · {inr(pendingTotal)} pending</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/70">Contact</p>
            <p className="mt-1.5 font-medium text-emerald-50">{bio.phone || "Phone not set"} · <a className="underline underline-offset-2 hover:text-emerald-200" href={`mailto:${bio.email}`}>{bio.email}</a></p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs font-medium text-emerald-100/50">
          Crafted for Nutrova · {bio.city} HQ · All data stays on this device
        </div>
      </footer>

      {/* ------------------------------- doctor modal ------------------------------ */}
      {doctorModal.open && (
        <Modal title={doctorModal.editing ? "Edit Doctor" : "Add Doctor"} wide onClose={() => setDoctorModal({ open: false, draft: emptyDoctor(), editing: false })}>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Basic details</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Doctor name *" span><input value={doctorModal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="Dr. Full Name" className={inputCls} /></Field>
            <Field label="Specialty *"><select value={doctorModal.draft.specialty} onChange={(e) => setDraft({ specialty: e.target.value })} className={inputCls}>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Qualification"><input value={doctorModal.draft.qualification} onChange={(e) => setDraft({ qualification: e.target.value })} placeholder="MBBS, MD Derma" className={inputCls} /></Field>
            <Field label="Hospital / Clinic"><input value={doctorModal.draft.clinic} onChange={(e) => setDraft({ clinic: e.target.value })} placeholder="SkinGlow Aesthetics" className={inputCls} /></Field>
            <Field label="Phone"><input value={doctorModal.draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} placeholder="98XXX XXXXX" className={inputCls} /></Field>
            <Field label="Email"><input value={doctorModal.draft.email} onChange={(e) => setDraft({ email: e.target.value })} placeholder="doctor@clinic.in" className={inputCls} /></Field>
          </div>

          {/* patch = area name only */}
          <p className="mb-3 mt-6 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400"><Layers className="h-3.5 w-3.5 text-emerald-600" /> Area patch — area name only *</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Select area patch">
              <select value={doctorModal.draft.patchId} onChange={(e) => pickPatchForDraft(e.target.value)} className={inputCls}>
                <option value="">— Select area —</option>
                {patches.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="City"><input value={doctorModal.draft.city} onChange={(e) => setDraft({ city: e.target.value })} placeholder="Bangalore" className={inputCls} /></Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Or create new area on the spot</span>
              <div className="flex gap-2">
                <input value={quickArea} onChange={(e) => setQuickArea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAddArea()} placeholder="Type new area name, e.g. Sarjapur" className={inputCls} />
                <button type="button" onClick={quickAddArea} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-800">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
            {patches.length > 0 && (
              <div className="sm:col-span-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="py-1 text-[11px] font-bold text-slate-400">Tap to select:</span>
                  {patches.map((p) => (
                    <button key={p.id} type="button" onClick={() => pickPatchForDraft(p.id)} className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition ${doctorModal.draft.patchId === p.id ? "border-emerald-600 bg-emerald-700 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* call schedule */}
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-widest text-emerald-800">
              <CalendarClock className="h-4 w-4" /> Call schedule — which days doctor gives calls *
            </p>

            <p className="mb-2 mt-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Weekly call days — tap to toggle</p>
            <div className="flex flex-wrap gap-2">
              {WEEK_SHORT.map((day) => {
                const on = (doctorModal.draft.callDays || []).includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleCallDay(day)} className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${on ? "bg-emerald-700 text-white shadow-md shadow-emerald-200" : "bg-white text-slate-400 ring-1 ring-slate-200 hover:ring-emerald-300 hover:text-emerald-700"}`}>
                    {day}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Quick patterns</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => applyPreset(p.days)} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-700 hover:text-white">
                  {p.label}
                </button>
              ))}
              <button type="button" onClick={() => applyPreset([])} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-400 transition hover:border-rose-300 hover:text-rose-600">
                Clear
              </button>
            </div>

            <p className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Monthly rules — e.g. 1st Tuesday, 1st Thursday, Last Thursday</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={monWeek} onChange={(e) => setMonWeek(e.target.value)} className={`${inputCls} sm:max-w-[130px]`}>
                {MONTH_WEEKS.map((w) => <option key={w}>{w}</option>)}
              </select>
              <select value={monDay} onChange={(e) => setMonDay(e.target.value)} className={`${inputCls} sm:max-w-[180px]`}>
                {WEEK_FULL.map((d) => <option key={d}>{d}</option>)}
              </select>
              <button type="button" onClick={addMonthlyRule} className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-violet-700">
                <Plus className="h-4 w-4" /> Add {monWeek} {monDay}
              </button>
            </div>
            {(doctorModal.draft.monthlyCalls || []).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(doctorModal.draft.monthlyCalls || []).map((r) => (
                  <span key={r} className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-1 pl-3 pr-1.5 text-xs font-extrabold text-violet-700">
                    {r}
                    <button type="button" onClick={() => removeMonthlyRule(r)} className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-200/60 text-violet-700 hover:bg-violet-300"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Call time from"><input type="time" value={doctorModal.draft.callTimeFrom} onChange={(e) => setDraft({ callTimeFrom: e.target.value })} className={inputCls} /></Field>
              <Field label="Call time to"><input type="time" value={doctorModal.draft.callTimeTo} onChange={(e) => setDraft({ callTimeTo: e.target.value })} className={inputCls} /></Field>
            </div>

            {/* live preview */}
            <div className="mt-3 rounded-xl bg-emerald-900 px-4 py-3 text-white">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Schedule preview</p>
              <p className="mt-0.5 text-sm font-extrabold">
                {describeWeekly(doctorModal.draft.callDays || [])}
                {(doctorModal.draft.monthlyCalls || []).length > 0 && <span className="font-bold text-violet-200"> + {(doctorModal.draft.monthlyCalls || []).join(" · ")}</span>}
              </p>
              <p className="text-xs font-semibold text-emerald-200">{describeTime(doctorModal.draft)} · Next call: {nextCallDate(doctorModal.draft)?.label || "—"} {nextCallDate(doctorModal.draft) ? `(${fmtShort(nextCallDate(doctorModal.draft)!.iso)} · ${fmtDayName(nextCallDate(doctorModal.draft)!.iso)})` : ""}</p>
            </div>
          </div>

          {/* Appointment — how to take appointment */}
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-widest text-sky-900">
              <CalendarDays className="h-4 w-4" /> Appointment — how to take appointment
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Select one or more ways MR should book the visit · as discussed earlier</p>
            <p className="mb-2 mt-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Ways to take appointment — tap to select</p>
            <div className="flex flex-wrap gap-1.5">
              {APPOINTMENT_MODES.map((mode) => {
                const on = (doctorModal.draft.appointmentModes || []).includes(mode);
                return (
                  <button key={mode} type="button" onClick={() => toggleAppointmentMode(mode)} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${on ? "border-sky-600 bg-sky-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-700"}`}>
                    {on ? "✓ " : ""}{mode}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="When to book / Book in advance">
                <select value={doctorModal.draft.appointmentLead} onChange={(e) => setDraft({ appointmentLead: e.target.value })} className={inputCls}>
                  {APPOINTMENT_LEAD_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((l) => <option key={l} value={l}>{l}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Contact person"><input value={doctorModal.draft.appointmentContact} onChange={(e) => setDraft({ appointmentContact: e.target.value })} placeholder="e.g. Reception / Arun (PA)" className={inputCls} /></Field>
              <Field label="Appointment phone"><input value={doctorModal.draft.appointmentPhone} onChange={(e) => setDraft({ appointmentPhone: e.target.value })} placeholder="Phone / WhatsApp number" className={inputCls} /></Field>
              <Field label="Appointment note"><input value={doctorModal.draft.appointmentNote} onChange={(e) => setDraft({ appointmentNote: e.target.value })} placeholder="e.g. Call previous evening" className={inputCls} /></Field>
            </div>
            <div className="mt-3 rounded-xl border border-sky-200 bg-white/70 p-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-sky-800">Book in advance — before month date · tap to select</p>
              <div className="flex flex-wrap gap-1.5">
                {APPOINTMENT_MONTH_CUTOFFS.map((opt) => {
                  const on = doctorModal.draft.appointmentLead === opt;
                  const short = opt.replace(" of month", "").replace("Before ", "Before ");
                  return (
                    <button key={opt} type="button" onClick={() => setDraft({ appointmentLead: opt })} title={opt} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${on ? "border-sky-600 bg-sky-600 text-white shadow-sm" : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"}`}>
                      {on ? "✓ " : ""}{short}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">e.g. Before 20th = book next month slot before 20th · Before 25th = before 25th · all cutoffs available</p>
            </div>
            {(doctorModal.draft.appointmentModes || []).length > 0 && (
              <div className="mt-3 rounded-xl bg-sky-900 px-4 py-3 text-white">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300">Appointment preview</p>
                <p className="mt-0.5 text-sm font-extrabold">{(doctorModal.draft.appointmentModes || []).join(" · ")}</p>
                <p className="text-xs font-semibold text-sky-200">{doctorModal.draft.appointmentLead}{doctorModal.draft.appointmentContact ? ` · ${doctorModal.draft.appointmentContact}` : ""}{doctorModal.draft.appointmentPhone ? ` · ${doctorModal.draft.appointmentPhone}` : ""}</p>
              </div>
            )}
          </div>

          {/* Nutrova products */}
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-widest text-teal-900">
              <Package className="h-4 w-4" /> Nutrova products — focus & follow-up
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Full names from your uploaded sheet · 25 products · tap to select. Duplicates in the file were merged.</p>
            <ProductSelector label="Focus products" hint="detail on every visit" icon={<Target className="h-3.5 w-3.5" />} selected={doctorModal.draft.focusProducts || []} onToggle={(n) => toggleProduct("focusProducts", n)} onClear={() => clearDoctorProducts("focusProducts")} accent="emerald" />
            <ProductSelector label="Follow-up products" hint="Track Rx / feedback" icon={<RefreshCcw className="h-3.5 w-3.5" />} selected={doctorModal.draft.followProducts || []} onToggle={(n) => toggleProduct("followProducts", n)} onClear={() => clearDoctorProducts("followProducts")} accent="amber" />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Visit tracking</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Visit frequency"><select value={doctorModal.draft.frequency} onChange={(e) => setDraft({ frequency: e.target.value })} className={inputCls}>{["Weekly", "Fortnightly", "Monthly", "Quarterly"].map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Priority"><select value={doctorModal.draft.priority} onChange={(e) => setDraft({ priority: e.target.value as Doctor["priority"] })} className={inputCls}><option>High</option><option>Medium</option><option>Low</option></select></Field>
            <Field label="Last visit"><input type="date" value={doctorModal.draft.lastVisit} onChange={(e) => setDraft({ lastVisit: e.target.value })} className={inputCls} /></Field>
            <Field label="Next visit"><input type="date" value={doctorModal.draft.nextVisit} onChange={(e) => setDraft({ nextVisit: e.target.value })} className={inputCls} /></Field>
            <Field label="Notes" span><textarea value={doctorModal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} placeholder="Preferences, timings, Rx behaviour…" rows={2} className={inputCls} /></Field>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {doctorModal.editing && (
              <button onClick={() => deleteDoctor(doctorModal.draft)} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-extrabold text-rose-600 transition hover:bg-rose-100">
                <Trash2 className="h-4 w-4" /> Delete doctor
              </button>
            )}
            <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setDoctorModal({ open: false, draft: emptyDoctor(), editing: false })} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={saveDoctor} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">{doctorModal.editing ? "Update Doctor" : "Add Doctor"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------- patch modal ------------------------------ */}
      {patchModal && (
        <Modal title="Manage Area Patches" wide onClose={() => setPatchModal(false)}>
          <p className="text-sm font-medium text-slate-500">Patches are <span className="font-extrabold text-slate-800">area names only</span> — e.g. Koramangala, HSR Layout. Doctors get binned under their area automatically.</p>

          {/* create / edit form */}
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">{patchDraft.id ? "Edit area patch" : "Create new area patch"}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Area name *"><input value={patchDraft.name} onChange={(e) => setPatchDraft({ ...patchDraft, name: e.target.value })} placeholder="e.g. Koramangala" className={inputCls} /></Field>
              <div>
                <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Colour</span>
                <div className="flex gap-2">
                  {PATCH_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setPatchDraft({ ...patchDraft, color: c })} className={`h-9 w-9 rounded-full ${patchStyles(c).dot} transition ${patchDraft.color === c ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-60 hover:opacity-100"}`} title={c} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={savePatch} className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-800">
                {patchDraft.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {patchDraft.id ? "Update area" : "Create area"}
              </button>
              {patchDraft.id && (
                <button onClick={() => setPatchDraft({ id: "", name: "", color: "emerald" })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel edit</button>
              )}
            </div>
          </div>

          {/* patch list with binned doctors */}
          <div className="mt-4 space-y-3">
            {patches.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No patches yet — create your first area above.</p>}
            {patches.map((p) => {
              const ps = patchStyles(p.color);
              const binned = doctors.filter((d) => d.patchId === p.id);
              return (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${ps.dot}`} />
                    <p className="flex items-center gap-1.5 text-[15px] font-extrabold text-slate-900"><MapPin className="h-4 w-4 text-slate-400" />{p.name}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${ps.badge}`}>{binned.length} doctor{binned.length !== 1 ? "s" : ""}</span>
                    <div className="ml-auto flex gap-1.5">
                      <IconBtn title="Edit area" onClick={() => editPatch(p)}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Delete area" danger onClick={() => deletePatchAsk(p)}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </div>
                  {binned.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 border-t border-slate-100 pt-2.5 sm:grid-cols-2">
                      {binned.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-[10px] font-extrabold text-white">{initials(d.name)}</div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold text-slate-800">{d.name}</p>
                            <p className="truncate text-[11px] font-semibold text-slate-500">{describeWeekly(d.callDays || [])}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {doctors.filter((d) => !d.patchId).length > 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-extrabold text-slate-600">No patch · {doctors.filter((d) => !d.patchId).length} doctor(s) — edit them to assign an area.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={() => setPatchModal(false)} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">Done</button>
          </div>
        </Modal>
      )}

      {/* ------------------------------ reminder modal ----------------------------- */}
      {reminderModal.open && (
        <Modal title={reminderModal.editing ? "Edit Reminder" : "Add Reminder"} onClose={() => setReminderModal({ open: false, draft: emptyReminder(), editing: false })}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title *" span><input value={reminderModal.draft.title} onChange={(e) => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, title: e.target.value } })} placeholder="e.g. Morning visit with samples" className={inputCls} /></Field>
            <Field label="Doctor — search by name or area" span>
              <DoctorPicker
                value={reminderModal.draft.doctorName}
                doctors={doctors}
                onPick={(name, area) => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, doctorName: name, doctorArea: area || reminderModal.draft.doctorArea } })}
                placeholder="Type doctor name or area (e.g. Koramangala)"
              />
              {(reminderModal.draft.doctorArea || doctorByName(reminderModal.draft.doctorName)?.area) && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-emerald-700"><MapPin className="h-3.5 w-3.5" />{reminderModal.draft.doctorArea || doctorByName(reminderModal.draft.doctorName)?.area}</p>
              )}
              {(() => {
                const doc = doctorByName(reminderModal.draft.doctorName);
                if (!doc) return null;
                const modes = doc.appointmentModes || [];
                if (modes.length === 0 && !doc.appointmentContact && !doc.appointmentPhone) return null;
                return (
                  <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50/70 p-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-800"><CalendarDays className="h-3 w-3" /> How to take appointment</p>
                    {modes.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {modes.map((m) => <span key={m} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-sky-800 ring-1 ring-sky-200">{m}</span>)}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">{doc.appointmentLead || "Same day"}{doc.appointmentContact ? ` · ${doc.appointmentContact}` : ""}{doc.appointmentPhone ? ` · ${doc.appointmentPhone}` : ""}</p>
                    {doc.appointmentNote && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{doc.appointmentNote}</p>}
                  </div>
                );
              })()}
            </Field>
            <Field label="Date"><input type="date" value={reminderModal.draft.date} onChange={(e) => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, date: e.target.value } })} className={inputCls} /></Field>
            <Field label="Time"><input type="time" value={reminderModal.draft.time} onChange={(e) => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, time: e.target.value } })} className={inputCls} /></Field>
            <Field label="Type" span>
              <div className="flex flex-wrap gap-2">
                {(["Visit", "Call", "Follow-up", "Payment", "Sample Drop"] as ReminderKind[]).map((k) => (
                  <button key={k} onClick={() => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, kind: k } })} className={`rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition ${reminderModal.draft.kind === k ? "border-emerald-600 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"}`}>{k}</button>
                ))}
              </div>
            </Field>
            <Field label="Notes" span><textarea value={reminderModal.draft.notes} onChange={(e) => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, notes: e.target.value } })} rows={2} placeholder="Anything to carry or confirm…" className={inputCls} /></Field>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {reminderModal.editing && (
              <button onClick={() => deleteReminder(reminderModal.draft)} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-extrabold text-rose-600 transition hover:bg-rose-100">
                <Trash2 className="h-4 w-4" /> Delete reminder
              </button>
            )}
            <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setReminderModal({ open: false, draft: emptyReminder(), editing: false })} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={saveReminder} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">{reminderModal.editing ? "Update Reminder" : "Add Reminder"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------ payment modal ------------------------------ */}
      {paymentModal.open && (
        <Modal title={paymentModal.editing ? "Edit Invoice" : "Add Invoice"} onClose={() => setPaymentModal({ open: false, draft: emptyPayment(), editing: false })}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Doctor — search by name or area *" span>
              <DoctorPicker
                value={paymentModal.draft.doctorName}
                doctors={doctors}
                onPick={(name, area) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, doctorName: name, doctorArea: area || paymentModal.draft.doctorArea } })}
                placeholder="Type doctor name or area"
              />
            </Field>
            <Field label="Invoice no *">
              <div className="flex gap-2">
                <input value={paymentModal.draft.invoiceNo} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, invoiceNo: e.target.value } })} placeholder="INV-2026-1001" className={`${inputCls} font-mono`} />
                <button type="button" title="Generate new invoice no" onClick={() => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, invoiceNo: genInvoiceNo() } })} className="flex h-[42px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-700">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            </Field>
            <Field label="Purpose *" span><input value={paymentModal.draft.purpose} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, purpose: e.target.value } })} placeholder="e.g. CME sponsorship" className={inputCls} /></Field>
            <Field label="Amount (₹) *"><input type="number" min={0} value={paymentModal.draft.amount || ""} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, amount: Number(e.target.value) } })} placeholder="10000" className={inputCls} /></Field>
            <Field label="Mode"><select value={paymentModal.draft.mode} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, mode: e.target.value } })} className={inputCls}>{["UPI", "Bank Transfer", "Cheque", "Cash"].map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={paymentModal.draft.dueDate} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, dueDate: e.target.value } })} className={inputCls} /></Field>
            <Field label="Status"><select value={paymentModal.draft.status} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, status: e.target.value as PaymentStatus } })} className={inputCls}><option value="pending">Pending</option><option value="paid">Paid</option></select></Field>
          </div>
          {/* pending-days live preview — same 30-day rule */}
          {(() => {
            const info = pendingDaysInfo(paymentModal.draft);
            const od = daysOverdue(paymentModal.draft.dueDate);
            return (
              <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${info.tone === "red" ? "border-rose-300 bg-rose-50" : info.tone === "amber" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"}`}>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Pending days:</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${pendingBadgeCls(info.tone)}`}>
                  <Clock className="h-3 w-3" />{info.text}
                </span>
                {paymentModal.draft.status !== "paid" && od > 0 && (
                  <span className="text-xs font-semibold text-slate-500">{od > 30 ? "RED — over 30 days, needs action" : `${od} days — normal colour (under 30)`}</span>
                )}
                {paymentModal.draft.status !== "paid" && od === 0 && paymentModal.draft.dueDate && (
                  <span className="text-xs font-semibold text-slate-500">Not yet overdue</span>
                )}
              </div>
            );
          })()}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {paymentModal.editing && (
              <button onClick={() => deleteInvoice(paymentModal.draft)} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-extrabold text-rose-600 transition hover:bg-rose-100">
                <Trash2 className="h-4 w-4" /> Delete invoice
              </button>
            )}
            <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setPaymentModal({ open: false, draft: emptyPayment(), editing: false })} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={savePayment} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">{paymentModal.editing ? "Update Invoice" : "Add Invoice"}</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete.open && (
        <ConfirmDialog
          title={confirmDelete.title || "Please confirm"}
          label={confirmDelete.label}
          detail={confirmDelete.detail}
          confirmText={confirmDelete.confirmText || "Yes, remove"}
          onCancel={closeConfirm}
          onYes={confirmDelete.onYes}
        />
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 anim-toast">
          <div className="flex items-center gap-2.5 rounded-full bg-emerald-950 py-3 pl-4 pr-6 text-sm font-bold text-white shadow-2xl ring-1 ring-white/10">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${toast.kind === "ok" ? "bg-emerald-500" : "bg-amber-400 text-amber-950"}`}>
              {toast.kind === "ok" ? <Check className="h-4 w-4" strokeWidth={3} /> : <Bell className="h-4 w-4" strokeWidth={2.5} />}
            </span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- subcomponents ------------------------------ */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function BioInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${danger ? "border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" : "border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"}`}>
      {children}
    </button>
  );
}

function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <label className={`block ${span ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function DoctorPicker({ value, doctors, onPick, placeholder }: { value: string; doctors: Doctor[]; onPick: (name: string, area: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q
      ? doctors.filter((d) => [d.name, d.area, d.specialty, d.clinic].join(" ").toLowerCase().includes(q))
      : doctors;
    return list.slice(0, 7);
  }, [doctors, q]);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Search className="h-4 w-4 shrink-0 text-emerald-600" />
        <input
          value={value}
          onChange={(e) => { onPick(e.target.value, ""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || "Type doctor name or area…"}
          className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        />
        {value && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick("", "")} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(d.name, d.area); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-emerald-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-[10px] font-extrabold text-white">{initials(d.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-800">{d.name}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">{d.specialty}{d.clinic ? ` · ${d.clinic}` : ""}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">
                <MapPin className="h-3 w-3" />{d.area || "—"}
              </span>
            </button>
          ))}
          {q && (
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-400">
              Tip: keep typing to filter by area (e.g. “{value.trim()}”) — or pick a doctor above.
            </p>
          )}
        </div>
      )}
      {open && results.length === 0 && (
        <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xl">
          <p className="text-xs font-bold text-slate-500">No doctor matches “{value.trim()}”.</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Try another name or area, or add the doctor first.</p>
        </div>
      )}
    </div>
  );
}

function ProductSelector({ label, hint, icon, selected, onToggle, onClear, accent }: {
  label: string; hint: string; icon: ReactNode; selected: string[];
  onToggle: (name: string) => void; onClear: () => void; accent: "emerald" | "amber";
}) {
  const isE = accent === "emerald";
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = (name: string) => !query || name.toLowerCase().includes(query);
  const hitCount = NUTROVA_PRODUCTS.filter((p) => matches(p.name)).length;
  return (
    <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest ${isE ? "text-emerald-800" : "text-amber-800"}`}>
          {icon} {label}
        </p>
        <span className="text-[11px] font-semibold text-slate-400">· {hint}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${isE ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {selected.length} selected
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search 25 products — e.g. collagen, whey, glutalume…`} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
        {q && <button type="button" onClick={() => setQ("")} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100"><X className="h-3 w-3" /></button>}
      </div>
      {query && <p className="mt-1.5 text-[11px] font-bold text-slate-400">{hitCount} match{hitCount !== 1 ? "es" : ""} for “{q.trim()}”</p>}
      {PRODUCT_CATS.map((cat) => {
        const items = NUTROVA_PRODUCTS.filter((p) => p.category === cat && matches(p.name));
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mt-2.5">
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{cat} · {items.length}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {items.map((p) => {
                const on = selected.includes(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    title={`${p.name} · ${p.form}`}
                    onClick={() => onToggle(p.name)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-extrabold leading-snug transition ${
                      on
                        ? isE
                          ? "border-emerald-600 bg-emerald-700 text-white shadow-sm"
                          : "border-amber-500 bg-amber-400 text-amber-950 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] ${on ? (isE ? "bg-white/20 text-white" : "bg-amber-900/15 text-amber-950") : "bg-slate-100 text-slate-400"}`}>
                      {on ? "✓" : "+"}
                    </span>
                    <span className="min-w-0 flex-1">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {query && hitCount === 0 && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-bold text-slate-500">No product matches “{q.trim()}”.</p>
      )}
      {selected.length > 0 && (
        <button type="button" onClick={onClear} className="mt-2.5 text-xs font-bold text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline">
          Clear {label.toLowerCase()} ({selected.length})
        </button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className={`anim-pop max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7 ${wide ? "max-w-3xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Dedicated delete confirmation — sits above every other modal (z-70) and never deletes instantly */
function ConfirmDialog({ title, label, detail, confirmText, onCancel, onYes }: {
  title: string; label: string; detail: string; confirmText: string; onCancel: () => void; onYes: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                This will permanently remove <span className="font-extrabold text-slate-900">{label}</span>.
              </p>
              {detail && <p className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-500">{detail}</p>}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button onClick={onCancel} autoFocus className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel — keep it</button>
            <button onClick={onYes} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700">{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
