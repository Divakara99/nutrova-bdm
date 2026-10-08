"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlarmClock,
  Bell,
  BellRing,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  IndianRupee,
  Layers,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Menu,
  Settings as SettingsIcon,
  Share2,
  Smartphone,
  Stethoscope,
  Target,
  Trash2,
  Upload,
  User,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DoctorImportDialog, type ParsedDoctor } from "./doctor-import";
import {
  SETUP_SQL,
  adoptRecoverySession,
  clearSession,
  clearUrlAuthParams,
  exchangeRecoveryCode,
  fetchAll,
  fetchOwnerRoster,
  fetchUserWorkspace,
  getRecoverySession,
  getUrlRecoverySignal,
  loadSession,
  listenForPasswordRecovery,
  maskKey,
  readConfig,
  requestPasswordReset,
  saveKey,
  signInRemote,
  signOutRemote,
  signUpRemote,
  updatePasswordRemote,
  verifyRecoveryTokenHash,
  type BackendConfig,
  type BackendSession,
  type UrlRecoverySignal,
} from "./backend";

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
  alarm?: boolean;
}

/* A purchase order line — Nutrova product ordered by the doctor */
interface OrderItem {
  product: string;
  qty: number;
  rate: number;
}

interface Payment {
  id: string;
  invoiceNo: string;
  orderDate: string;
  items: OrderItem[];
  doctorName: string;
  doctorArea: string;
  billingName: string;
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
  rev?: number;
}

/* ------------------ Option B auth (login stays until signout) ----------------- */
interface AppUser {
  name: string;
  email: string;
  pass: string;
  createdAt: string;
  hq?: string;
}
const AUTH_USERS_KEY = "nutrova-optionB-users-v1";
const AUTH_SESSION_KEY = "nutrova-optionB-session-v1";
const loadUsers = (): AppUser[] => {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* ignore */ }
  return [];
};
const loadSessionEmail = (): string => {
  try {
    return localStorage.getItem(AUTH_SESSION_KEY) || "";
  } catch { return ""; }
};

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

/* Starting rates (₹) from nutrova.com listings — editable on every order line. 0 = enter your own rate */
const DEFAULT_RATES: Record<string, number> = {
  "Nutrova Collagen+Antioxidants (Cranberry Flavour)": 2575,
  "Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)": 2575,
  "Nutrova Poultry Collagen Peptides": 3120,
  "Nutrova Marine Collagen Peptides": 2140,
  "Nutrova Kerastrength": 1070,
  "Nutrova Fish Oil 84": 1600,
  "Nutrova Complete Omega 3": 1070,
  "Nutrova Whey Protein Isolate - Unflavoured": 1800,
  "Nutrova Whey Protein Isolate - Dark Chocolate Flavour": 1800,
  "Nutrova Whey Protein Isolate - Vanilla Flavour": 1800,
  "Nutrova Whey Protein Isolate - Mango Flavour": 1800,
  "Nutrova Whey Protein Isolate - Strawberry Flavour": 1800,
  "Nutrova Pea Protein - Unflavoured": 850,
  "Nutrova Vegan Protein - Mango Flavour": 2230,
  "Nutrova Magnesium+D3": 760,
  "Nutrova Calcium+Magnesium": 850,
  "Nutrova Multivitamin For Women": 710,
  "Nutrova Multivitamin For Men": 710,
  "Nutrova Elderberry Plus": 760,
  "Nutrova Functional Fibre - Unflavoured": 800,
  "Nutrova Functional Fibre - Lemon Flavour": 800,
};
const orderTotal = (items: OrderItem[]) => items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
const orderQty = (items: OrderItem[]) => items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
const normPay = (p: Partial<Payment>): Payment => ({
  id: String(p.id || Math.random().toString(36).slice(2, 10)),
  invoiceNo: String(p.invoiceNo || ""),
  orderDate: String(p.orderDate || ""),
  items: Array.isArray(p.items) ? p.items.map((i) => ({ product: String(i.product || ""), qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 })) : [],
  doctorName: String(p.doctorName || ""),
  doctorArea: String(p.doctorArea || ""),
  billingName: String(p.billingName || ""),
  purpose: String(p.purpose || ""),
  amount: Number(p.amount) || 0,
  dueDate: String(p.dueDate || ""),
  paidDate: String(p.paidDate || ""),
  status: (p.status as PaymentStatus) || "pending",
  mode: String(p.mode || "UPI"),
});

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

/* Patches have no colour option — single emerald style everywhere */
function patchStyles(_color?: string) {
  void _color;
  return { dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50" };
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
const genInvoiceNo = () => `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

/* Online-synced state.

   CLOUD IS THE ONLY SOURCE OF TRUTH for a signed-in account.
   Previously each device also kept a localStorage copy and seeded from it on
   open. That caused deleted records to reappear: phone B still had the old
   array cached, showed it, and on the next edit pushed that stale array back
   to Supabase — resurrecting doctors deleted on phone A.

   Now, when signed in online: we never read and never write the device cache
   for data keys, and any old cached copy is purged. Writes are debounced so
   typing stays smooth. (A local-only account with no cloud session still uses
   localStorage, otherwise it would have nowhere to store anything.) */
interface SyncCtx {
  remote: Record<string, unknown> | null;
  remoteOwnerKey: string;
  ownerKey: string;
  onlineOwner: boolean;
  canSave: boolean;
  push: (key: string, value: unknown) => void;
}
const STORE_KEYS = ["nutrova-bio-v1", "nutrova-doctors-v3", "nutrova-patches-v2", "nutrova-reminders-v1", "nutrova-payments-v3"];

function useSynced<T>(
  key: string,
  seed: () => T,
  sync: SyncCtx,
  norm?: (v: T) => T,
  emptyForNewAccount?: () => T,
) {
  // Keep each account's offline cache separate as well as its RLS-protected cloud rows.
  const localKey = sync.ownerKey ? `${key}::${sync.ownerKey}` : key;
  const loadLocal = (fallback: T): T => {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        return norm ? norm(parsed) : parsed;
      }
      // Older versions used one unscoped cache. Only migrate it into the
      // creator's account, never into a teammate's newly created account.
      const creatorKeys = [
        `cloud:${APP_OWNER.email.toLowerCase()}`,
        `local:${APP_OWNER.email.toLowerCase()}`,
      ];
      if (creatorKeys.includes(sync.ownerKey.toLowerCase())) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const parsed = JSON.parse(legacy) as T;
          return norm ? norm(parsed) : parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return fallback;
  };
  const [value, setValue] = useState<T>(() => {
    const fallback = sync.ownerKey && emptyForNewAccount ? emptyForNewAccount() : seed();
    // Cloud account: start empty and wait for the server copy. Seeding from
    // this device is what made deleted records come back.
    if (sync.onlineOwner) return fallback;
    return loadLocal(fallback);
  });
  const ref = useRef(sync);
  ref.current = sync;
  const ownerRef = useRef(sync.ownerKey);
  useLayoutEffect(() => {
    if (ownerRef.current === sync.ownerKey) return;
    ownerRef.current = sync.ownerKey;
    const fallback = emptyForNewAccount ? emptyForNewAccount() : seed();
    setValue(sync.onlineOwner ? fallback : loadLocal(fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localKey, sync.ownerKey, sync.onlineOwner]);
  useLayoutEffect(() => {
    // Never hydrate from the previous user's map while a new account is loading.
    if (!sync.ownerKey || sync.remoteOwnerKey !== sync.ownerKey || !sync.remote) return;
    if (Object.prototype.hasOwnProperty.call(sync.remote, key)) {
      const v = sync.remote[key] as T;
      setValue(norm ? norm(v) : v);
    } else {
      // An account with no row yet starts with its own profile/workspace, never
      // whatever account happened to use this browser before it.
      setValue(emptyForNewAccount ? emptyForNewAccount() : seed());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.remote, sync.remoteOwnerKey, sync.ownerKey]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (ref.current.onlineOwner) {
        // Cloud-only: never cache data on the device, and clear anything an
        // older build left behind so it can never be read again.
        try {
          localStorage.removeItem(localKey);
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      } else {
        try {
          localStorage.setItem(localKey, JSON.stringify(value));
        } catch {
          /* ignore */
        }
      }
      if (ref.current.canSave) ref.current.push(key, value);
    }, 250);
    return () => window.clearTimeout(t);
  }, [key, localKey, value, sync.canSave, sync.onlineOwner]);
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

/* Neutral fallback profile — deliberately contains NO owner details, so a new
   account can never inherit them. The owner identity lives only in APP_OWNER
   (heading, footer, login, About) and in each account's own saved Bio. */
const seedBio = (): Bio => ({
  name: "",
  role: "Business Development Manager",
  city: "",
  state: "",
  hq: "",
  phone: "",
  email: "",
});

/* App creator — highlighted on the login screen */
const APP_OWNER = {
  name: "M Divakar Reddy",
  role: "Business Development Manager",
  hq: "Bangalore 2",
  email: "divakar.reddy@nutrova.com",
};

/* Project-wide rename of the old role title to "Business Development Manager" */
const renameRole = (s: string) =>
  (s || "")
    .replace(/medical\s+representatives/gi, "Business Development Managers")
    .replace(/medical\s+representative/gi, "Business Development Manager")
    .replace(/\bmedical\s+reps\b/gi, "Business Development Managers")
    .replace(/\bmedical\s+rep\b/gi, "Business Development Manager");

/* Display first name — skips a leading initial, so "M Divakar Reddy" greets as "Divakar" */
const firstName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return parts.find((p) => p.replace(/\./g, "").length > 1) || parts[0] || "";
};

/* One-time profile updates — each runs only once, so later edits in the Bio tab stick:
   rev 2 — creator's own account (name contains "Divakar"): old default name / HQ → M Divakar Reddy · Bangalore 2 HQ
   rev 3 — every profile: role title renamed to "Business Development Manager" */
const BIO_REV = 3;
const normBio = (b: Bio): Bio => {
  if (!b || typeof b !== "object") return seedBio();
  const rev = b.rev || 0;
  if (rev >= BIO_REV) return b;
  const out: Bio = { ...b, rev: BIO_REV };
  out.role = renameRole(out.role) || APP_OWNER.role;
  if (rev < 2 && /divakar/i.test(out.name || "")) {
    if (/^\s*divakar\s+reddy\s*$/i.test(out.name)) out.name = APP_OWNER.name;
    if (!out.hq || out.hq === "Bangalore") out.hq = APP_OWNER.hq;
  }
  return out;
};

/* Sample appointment notes written by the app used the short form of the old title — update them.
   Exact matches only: notes you typed yourself are never changed. */
const OLD_SAMPLE_NOTES: Record<string, string> = {
  "Call previous evening to block MR slot": "Call previous evening to block the BDM slot",
  "PA allots Friday 10–12 MR window": "PA allots Friday 10–12 BDM window",
};
const normDoctors = (arr: Doctor[]): Doctor[] =>
  Array.isArray(arr)
    ? arr.map((d) => {
        const fixed = d ? OLD_SAMPLE_NOTES[d.appointmentNote] : undefined;
        return fixed ? { ...d, appointmentNote: fixed } : d;
      })
    : [];

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
          return unique.map((n, i) => ({ id: uid() + i, name: n, color: "emerald" }));
        }
      }
    }
  } catch {
    /* ignore */
  }
  return [
    { id: "a1", name: "Koramangala", color: "emerald" },
    { id: "a2", name: "HSR Layout", color: "emerald" },
    { id: "a3", name: "Jayanagar", color: "emerald" },
    { id: "a4", name: "Indiranagar", color: "emerald" },
    { id: "a5", name: "Whitefield", color: "emerald" },
    { id: "a6", name: "Malleshwaram", color: "emerald" },
    { id: "a7", name: "Peenya", color: "emerald" },
    { id: "a8", name: "Electronic City", color: "emerald" },
    { id: "a9", name: "JP Nagar", color: "emerald" },
    { id: "a10", name: "Marathahalli", color: "emerald" },
    { id: "a11", name: "BTM Layout", color: "emerald" },
    { id: "a12", name: "Rajajinagar", color: "emerald" },
  ];
};

const freshDoctors = (): Doctor[] => [
  { id: "d1", name: "Dr. Ananya Sharma", specialty: "Cosmetic Dermatologist", qualification: "MBBS, MD Derma", clinic: "SkinGlow Aesthetics", area: "Koramangala", patchId: "a1", city: "Bangalore", phone: "98450 12345", email: "ananya.sharma@skinglow.in", frequency: "Weekly", lastVisit: addDays(-2), nextVisit: todayISO(), notes: "Prefers Nutrova samples on Tuesday mornings. Strong Rx for derma-nutrition range.", priority: "High", callDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], monthlyCalls: [], callTimeFrom: "10:30", callTimeTo: "13:30", focusProducts: ["Nutrova Collagen+Antioxidants (Cranberry Flavour)", "Nutrova Kerastrength"], followProducts: ["Nutrova Marine Collagen Peptides"], appointmentModes: ["Walk-in", "Reception / Front Desk"], appointmentContact: "Reception", appointmentPhone: "080 4111 2233", appointmentLead: "Same day", appointmentNote: "Walk in before 11 AM, inform front desk" },
  { id: "d2", name: "Dr. Meera Iyer", specialty: "Dermatologist", qualification: "MBBS, DDVL", clinic: "DermaCare Clinic", area: "HSR Layout", patchId: "a2", city: "Bangalore", phone: "98860 23456", email: "", frequency: "Weekly", lastVisit: addDays(-6), nextVisit: addDays(1), notes: "High prescriber — gives calls Tue to Fri only.", priority: "High", callDays: ["Tue", "Wed", "Thu", "Fri"], monthlyCalls: [], callTimeFrom: "11:00", callTimeTo: "14:00", focusProducts: ["Nutrova Kerastrength", "Nutrova Akniflora"], followProducts: ["Nutrova Complete Omega 3"], appointmentModes: ["Phone Call", "Prior Appointment"], appointmentContact: "Clinic Manager", appointmentPhone: "98860 23456", appointmentLead: "1 day before", appointmentNote: "Call previous evening to block the BDM slot" },
  { id: "d3", name: "Dr. Priya Nair", specialty: "Aesthetic", qualification: "MBBS, FAM", clinic: "Lumière Aesthetic Studio", area: "Indiranagar", patchId: "a4", city: "Bangalore", phone: "97420 34567", email: "", frequency: "Fortnightly", lastVisit: addDays(-4), nextVisit: todayISO(), notes: "Only Tuesday OPD + 1st Thursday aesthetic camp.", priority: "Medium", callDays: ["Tue"], monthlyCalls: ["1st Thursday"], callTimeFrom: "12:00", callTimeTo: "16:00", focusProducts: ["Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)", "Nutrova Poultry Collagen Peptides"], followProducts: ["Nutrova Glutalume"], appointmentModes: ["WhatsApp", "Prior Appointment"], appointmentContact: "Dr. Priya (direct)", appointmentPhone: "97420 34567", appointmentLead: "2–3 days before", appointmentNote: "WhatsApp Tue slot request, confirm Monday" },
  { id: "d4", name: "Dr. Vikram Malhotra", specialty: "Plastic Surgeon", qualification: "MBBS, MS, MCh Plastic", clinic: "Renew Plastic Surgery Centre", area: "Whitefield", patchId: "a5", city: "Bangalore", phone: "99010 45678", email: "", frequency: "Monthly", lastVisit: addDays(-7), nextVisit: addDays(2), notes: "Only Friday calls + last Thursday OT review meet.", priority: "Medium", callDays: ["Fri"], monthlyCalls: ["Last Thursday"], callTimeFrom: "10:00", callTimeTo: "12:00", focusProducts: ["Nutrova Poultry Collagen Peptides", "Nutrova Whey Protein Isolate - Dark Chocolate Flavour"], followProducts: ["Nutrova Magnesium+D3"], appointmentModes: ["Secretary / PA", "Prior Appointment"], appointmentContact: "Arun (PA)", appointmentPhone: "99010 45679", appointmentLead: "Weekly slot", appointmentNote: "PA allots Friday 10–12 BDM window" },
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
  const yr = new Date().getFullYear();
  const samples: Payment[] = [
    normPay({ id: "p1", invoiceNo: `PO-${yr}-1041`, orderDate: addDays(-12), doctorName: "Dr. Meera Iyer", doctorArea: "HSR Layout", billingName: "DermaCare Clinic", purpose: "Clinic stock order", items: [{ product: "Nutrova Kerastrength", qty: 10, rate: 1070 }, { product: "Nutrova Complete Omega 3", qty: 4, rate: 1070 }], amount: 14980, dueDate: addDays(-2), status: "pending", mode: "UPI" }),
    normPay({ id: "p2", invoiceNo: `PO-${yr}-1042`, orderDate: addDays(-4), doctorName: "Dr. Priya Nair", doctorArea: "Indiranagar", billingName: "Lumière Aesthetic Studio", purpose: "Aesthetic studio order", items: [{ product: "Nutrova Collagen+Antioxidants (Cranberry Flavour)", qty: 2, rate: 2575 }, { product: "Nutrova Poultry Collagen Peptides", qty: 1, rate: 3120 }], amount: 8270, dueDate: addDays(3), status: "pending", mode: "Bank Transfer" }),
    normPay({ id: "p3", invoiceNo: `PO-${yr}-1039`, orderDate: addDays(-20), doctorName: "Dr. Ananya Sharma", doctorArea: "Koramangala", billingName: "SkinGlow Aesthetics", purpose: "Monthly derma-nutrition order", items: [{ product: "Nutrova Marine Collagen Peptides", qty: 6, rate: 2140 }, { product: "Nutrova Kerastrength", qty: 8, rate: 1070 }], amount: 21400, dueDate: addDays(-10), paidDate: addDays(-9), status: "paid", mode: "Cheque" }),
    normPay({ id: "p4", invoiceNo: `PO-${yr}-1031`, orderDate: addDays(-60), doctorName: "Dr. Vikram Malhotra", doctorArea: "Whitefield", billingName: "Renew Plastic Surgery Centre", purpose: "Post-op nutrition range", items: [{ product: "Nutrova Whey Protein Isolate - Dark Chocolate Flavour", qty: 5, rate: 1800 }], amount: 9000, dueDate: addDays(-45), status: "pending", mode: "Cheque" }),
    normPay({ id: "p5", invoiceNo: `PO-${yr}-1036`, orderDate: addDays(-35), doctorName: "Dr. Farhan Khan", doctorArea: "Peenya", billingName: "Elite Cosmetic Surgery", purpose: "Clinic stock order", items: [{ product: "Nutrova Poultry Collagen Peptides", qty: 2, rate: 3120 }, { product: "Nutrova Whey Protein Isolate - Vanilla Flavour", qty: 2, rate: 1800 }], amount: 9840, dueDate: addDays(-20), status: "pending", mode: "UPI" }),
  ];
  /* keep anything the user added themselves in older versions */
  const extra: Payment[] = [];
  for (const key of ["nutrova-payments-v2", "nutrova-payments-v1"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const old = JSON.parse(raw);
        if (Array.isArray(old)) {
          old.forEach((p: Partial<Payment>, i: number) => {
            if (["p1", "p2", "p3"].includes(String(p.id))) return;
            const n = normPay(p);
            if (!n.invoiceNo) n.invoiceNo = `PO-${yr}-${1000 + i}`;
            extra.push(n);
          });
          break;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return [...samples, ...extra];
};

const KIND_COLORS: Record<ReminderKind, string> = {
  Visit: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Call: "bg-sky-100 text-sky-800 border-sky-200",
  "Follow-up": "bg-violet-100 text-violet-800 border-violet-200",
  Payment: "bg-amber-100 text-amber-800 border-amber-200",
  "Sample Drop": "bg-rose-100 text-rose-800 border-rose-200",
};

/* ---------------------------------- app ---------------------------------- */

type Tab = "dashboard" | "doctors" | "reminders" | "payments" | "bio" | "settings" | "users";

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  hq: string;
  city: string;
  phone: string;
  updatedAt: string;
}
interface TeamWorkspace {
  bio: Bio;
  doctors: Doctor[];
  patches: Patch[];
  reminders: Reminder[];
  payments: Payment[];
}

const emptyDoctor = (): Doctor => ({
  id: uid(), name: "", specialty: "Cosmetic Dermatologist", qualification: "", clinic: "", area: "",
  patchId: "", city: "Bangalore", phone: "", email: "", frequency: "Weekly",
  lastVisit: "", nextVisit: "", notes: "", priority: "Medium",
  callDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], monthlyCalls: [], callTimeFrom: "10:00", callTimeTo: "13:00",
  focusProducts: [], followProducts: [],
  appointmentModes: [], appointmentContact: "", appointmentPhone: "", appointmentLead: "Same day", appointmentNote: "",
});
const emptyReminder = (): Reminder => ({ id: uid(), doctorName: "", doctorArea: "", title: "", date: todayISO(), time: "10:00", kind: "Visit", notes: "", done: false, alarm: true });
const emptyPayment = (): Payment => ({ id: uid(), invoiceNo: genInvoiceNo(), orderDate: todayISO(), items: [{ product: "", qty: 1, rate: 0 }], doctorName: "", doctorArea: "", billingName: "", purpose: "", amount: 0, dueDate: addDays(30), paidDate: "", status: "pending", mode: "" });

/* Android PHONE only — never tablets, never web/desktop.
   Phones send "Mobile" in the UA (tablets don't) and have a small screen.
   Desktop with a narrow window won't match (no Android UA). */
function isAndroidPhoneDevice(): boolean {
  try {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isMobileUA = /Mobile/i.test(ua);
    const smallScreen = window.innerWidth < 640;
    return isAndroid && isMobileUA && smallScreen;
  } catch {
    return false;
  }
}
function useIsAndroidPhone(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(() =>
    typeof window === "undefined" ? false : isAndroidPhoneDevice()
  );
  useEffect(() => {
    const check = () => setIsPhone(isAndroidPhoneDevice());
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("android-phone", isPhone);
    } catch {
      /* ignore */
    }
  }, [isPhone]);
  return isPhone;
}

/* ---------- Reminder alarm: selectable sounds + phone notification (no audio files needed) ---------- */
type AlarmSoundId = "sunrise" | "classic" | "siren" | "bell";
const ALARM_SOUNDS: { id: AlarmSoundId; label: string; hint: string }[] = [
  { id: "sunrise", label: "Sunrise Chime", hint: "Gentle rising chime — best for mornings" },
  { id: "classic", label: "Classic Beep", hint: "The original two-tone beep" },
  { id: "siren", label: "Siren Call", hint: "Loud wailing siren — hard to miss" },
  { id: "bell", label: "Temple Bell", hint: "Deep resonant bell" },
];
const ALARM_SOUND_KEY = "nutrova-alarm-sound-v1";
function getAlarmSound(): AlarmSoundId {
  try {
    const v = localStorage.getItem(ALARM_SOUND_KEY);
    if (v === "classic" || v === "siren" || v === "bell" || v === "sunrise") return v;
  } catch {
    /* ignore */
  }
  return "sunrise";
}
function setAlarmSoundStorage(id: AlarmSoundId) {
  try {
    localStorage.setItem(ALARM_SOUND_KEY, id);
  } catch {
    /* ignore */
  }
}
let alarmAudioCtx: AudioContext | null = null;
/* Track every live oscillator so X / Dismiss / Snooze / Done can kill the
   sound instantly — ctx.close() alone can leave already-scheduled tones
   playing on some phones, which is why the popup hid but audio continued. */
const liveOscillators = new Set<OscillatorNode>();
function alarmCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!alarmAudioCtx) alarmAudioCtx = new AC();
    if (alarmAudioCtx.state === "suspended") void alarmAudioCtx.resume();
    return alarmAudioCtx;
  } catch {
    return null;
  }
}
function alarmTone(
  ctx: AudioContext,
  dest: AudioNode,
  opts: { freq: number; freqEnd?: number; type: OscillatorType; at: number; dur: number; vol: number }
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    liveOscillators.add(osc);
    osc.onended = () => liveOscillators.delete(osc);
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, opts.at);
    if (opts.freqEnd) osc.frequency.linearRampToValueAtTime(opts.freqEnd, opts.at + opts.dur);
    gain.gain.setValueAtTime(0.001, opts.at);
    gain.gain.exponentialRampToValueAtTime(opts.vol, opts.at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, opts.at + opts.dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(opts.at);
    osc.stop(opts.at + opts.dur + 0.05);
    // Safety: force-remove from tracking shortly after it should have ended
    window.setTimeout(() => liveOscillators.delete(osc), (opts.at - ctx.currentTime + opts.dur + 0.5) * 1000 + 500);
  } catch {
    /* ignore */
  }
}
const ALARM_MUTED_KEY = "nutrova-alarm-muted-v1";
function isAlarmMuted(): boolean {
  try {
    return localStorage.getItem(ALARM_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}
function setAlarmMutedStorage(muted: boolean) {
  try {
    localStorage.setItem(ALARM_MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}
/* Immediately silence any scheduled alarm audio — stops every oscillator
   first (scheduled future tones), then suspends + closes the context.
   Called by X / Dismiss / Snooze / Done / Mute so popup-hide ALWAYS = silence. */
function stopAlarmSound() {
  try {
    liveOscillators.forEach((osc) => {
      try {
        osc.onended = null;
        try { osc.stop(0); } catch { /* already stopped */ }
        try { osc.disconnect(); } catch { /* ignore */ }
      } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
  liveOscillators.clear();
  try {
    if (alarmAudioCtx) {
      const ctx = alarmAudioCtx;
      alarmAudioCtx = null;
      try { void ctx.suspend?.().catch(() => {}); } catch { /* ignore */ }
      void ctx.close().catch(() => {});
    }
  } catch {
    alarmAudioCtx = null;
  }
}
function playAlarmSound(repeats = 3, soundId: AlarmSoundId = getAlarmSound(), ignoreMute = false) {
  try {
    if (!ignoreMute && isAlarmMuted()) return;
    const ctx = alarmCtx();
    if (!ctx) return;
    const start = ctx.currentTime + 0.05;
    if (soundId === "sunrise") {
      // Rising major arpeggio, warm triangle tone
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < repeats; i++) {
        const t0 = start + i * (notes.length * 0.3 + 0.5);
        notes.forEach((freq, j) => alarmTone(ctx, ctx.destination, { freq, type: "triangle", at: t0 + j * 0.3, dur: 0.34, vol: 0.5 }));
      }
    } else if (soundId === "siren") {
      // Wailing siren: two up-down sweeps per repeat
      for (let i = 0; i < repeats; i++) {
        const t0 = start + i * 1.1;
        alarmTone(ctx, ctx.destination, { freq: 650, freqEnd: 950, type: "sawtooth", at: t0, dur: 0.5, vol: 0.22 });
        alarmTone(ctx, ctx.destination, { freq: 950, freqEnd: 650, type: "sawtooth", at: t0 + 0.5, dur: 0.5, vol: 0.22 });
      }
    } else if (soundId === "bell") {
      // Resonant bell: fundamental + harmonics with long decay
      for (let i = 0; i < repeats; i++) {
        const t0 = start + i * 1.5;
        alarmTone(ctx, ctx.destination, { freq: 660, type: "sine", at: t0, dur: 1.4, vol: 0.55 });
        alarmTone(ctx, ctx.destination, { freq: 990, type: "sine", at: t0, dur: 1.1, vol: 0.25 });
        alarmTone(ctx, ctx.destination, { freq: 1320, type: "sine", at: t0, dur: 0.8, vol: 0.12 });
      }
    } else {
      // Classic two-tone beep
      for (let i = 0; i < repeats; i++) {
        const t0 = start + i * 0.55;
        [880, 660].forEach((freq, j) => {
          alarmTone(ctx, ctx.destination, { freq, type: "sine", at: t0 + j * 0.22, dur: 0.2, vol: 0.6 });
        });
      }
    }
  } catch {
    /* audio not available on this device */
  }
}
function reminderDueAt(r: { date: string; time: string }): number {
  try {
    const t = new Date(`${r.date}T${r.time || "09:00"}:00`).getTime();
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
}
function showBrowserNotification(title: string, body: string, tag: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag });
    }
  } catch {
    /* ignore */
  }
}

/* ---------- Morning briefing alarm (rings before 8 AM) ---------- */
const MORNING_ALARM_KEY = "nutrova-morning-alarm-v1";
const MORNING_FIRED_KEY = "nutrova-morning-fired-v1";
const DEFAULT_MORNING_TIME = "07:45";
function loadMorningSettings(): { enabled: boolean; time: string } {
  try {
    const raw = localStorage.getItem(MORNING_ALARM_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { enabled?: boolean; time?: string };
      return {
        enabled: p.enabled !== false,
        time: typeof p.time === "string" && /^\d{2}:\d{2}$/.test(p.time) ? p.time : DEFAULT_MORNING_TIME,
      };
    }
  } catch {
    /* ignore */
  }
  return { enabled: true, time: DEFAULT_MORNING_TIME };
}
function saveMorningSettings(s: { enabled: boolean; time: string }) {
  try {
    localStorage.setItem(MORNING_ALARM_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function morningFiredFor(ownerKey: string): string {
  try {
    const raw = localStorage.getItem(MORNING_FIRED_KEY);
    if (raw) return (JSON.parse(raw) as Record<string, string>)[ownerKey] || "";
  } catch {
    /* ignore */
  }
  return "";
}
function markMorningFired(ownerKey: string, day: string) {
  try {
    const raw = localStorage.getItem(MORNING_FIRED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[ownerKey] = day;
    localStorage.setItem(MORNING_FIRED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
function morningTimeTodayMs(timeHHMM: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(timeHHMM || "");
  const d = new Date();
  d.setHours(m ? Number(m[1]) : 7, m ? Number(m[2]) : 45, 0, 0);
  return d.getTime();
}

export interface MorningBriefing {
  date: string;
  title: string;
  body: string;
  calls: number;
  reminders: number;
  pendingCount: number;
  pendingTotal: number;
}
function buildMorningBriefing(args: {
  date: string;
  calls: number;
  reminders: number;
  pendingCount: number;
  pendingTotal: number;
}): MorningBriefing {
  const { date, calls, reminders, pendingCount, pendingTotal } = args;
  const parts = [
    `${calls} call${calls === 1 ? "" : "s"} today`,
    `${reminders} reminder${reminders === 1 ? "" : "s"} due`,
    pendingCount > 0 ? `${pendingCount} payment${pendingCount === 1 ? "" : "s"} pending (${inr(pendingTotal)})` : "no pending payments",
  ];
  return {
    date,
    title: "Nutrova morning briefing",
    body: parts.join(" · "),
    calls,
    reminders,
    pendingCount,
    pendingTotal,
  };
}

/* Cache the briefing where the service worker can read it for background alarms */
async function writeBriefingCache(b: MorningBriefing) {
  try {
    if (!("caches" in window)) return;
    const cache = await caches.open("nutrova-sw-v1");
    await cache.put("/__nutrova_briefing", new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } }));
  } catch {
    /* ignore */
  }
}

/* Service workers are DISABLED on purpose.
   A caching worker repeatedly served stale HTML in place of hashed JS chunks
   after a redeploy, which showed up as a blank / stuck screen. Instead of
   registering one, we now actively remove any worker left on the device and
   clear its caches. Reminder alarms run in-app and do not need a worker. */
async function ensureServiceWorker(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    return false;
  } catch {
    return false;
  }
}

export default function App() {
  /* Auth — first time shows an empty login screen, then stays signed in until Sign out */
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const [sessionEmail, setSessionEmail] = useState<string>(() => loadSessionEmail());
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);
  /* Password-reset link detection — Supabase sends several URL shapes, handle them all */
  const [urlSignal] = useState<UrlRecoverySignal | null>(() =>
    typeof window === "undefined" ? null : getUrlRecoverySignal()
  );
  const [recoveryTokens, setRecoveryTokens] = useState<{ access_token: string; refresh_token: string } | null>(() =>
    urlSignal?.kind === "hash-tokens"
      ? { access_token: urlSignal.access_token, refresh_token: urlSignal.refresh_token }
      : null
  );
  const [recoverySession, setRecoverySession] = useState<BackendSession | null>(null);
  const [recoveryExchanging, setRecoveryExchanging] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const recoveryExchangeTried = useRef(false);
  const [recoveryPw, setRecoveryPw] = useState("");
  const [recoveryPw2, setRecoveryPw2] = useState("");
  const [showRecoveryPw, setShowRecoveryPw] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupHq, setSignupHq] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [authError, setAuthError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  /* Android phone only — fonts + sentences adjust, tablets & web untouched */
  const isAndroidPhone = useIsAndroidPhone();
  /* ---------- Online store (backend) — connection is locked, URL + key never change ---------- */
  const [cfg] = useState<BackendConfig | null>(() => readConfig());
  const online = !!cfg;
  const [session, setSession] = useState<BackendSession | null>(() => loadSession());
  const [remote, setRemote] = useState<Record<string, unknown> | null>(null);
  const [remoteOwnerKey, setRemoteOwnerKey] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "loading" | "synced" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);
  const [authInfo, setAuthInfo] = useState("");
  /* Settings page */
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const signedIn = online ? !!session : !!sessionEmail;
  const currentEmail = online ? session?.email || "" : sessionEmail;
  const dataOwnerKey = currentEmail
    ? `${online ? "cloud" : "local"}:${currentEmail.trim().toLowerCase()}`
    : "";
  const isOwner = currentEmail.trim().toLowerCase() === APP_OWNER.email.toLowerCase();
  /* Owner-only team view state */
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<TeamWorkspace | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState("");
  const pendingAccountProfileRef = useRef<Bio | null>(null);
  const accountDisplayName = online
    ? session?.name || currentEmail.split("@")[0] || ""
    : users.find((u) => u.email.toLowerCase() === currentEmail.toLowerCase())?.name || currentEmail.split("@")[0] || "";
  const accountHq = online
    ? session?.hq || ""
    : users.find((u) => u.email.toLowerCase() === currentEmail.toLowerCase())?.hq || "";
  const emptyProfileForAccount = (): Bio => {
    const pending = pendingAccountProfileRef.current;
    if (pending && pending.email.toLowerCase() === currentEmail.toLowerCase()) return { ...pending };
    return ({
    name: accountDisplayName,
    role: APP_OWNER.role,
    city: "",
    state: "",
    hq: accountHq,
    phone: "",
    email: currentEmail,
    rev: BIO_REV,
    });
  };

  /* Supabase can finish recovery before React reads the returned URL. Always
     give PASSWORD_RECOVERY priority over an existing saved sign-in session. */
  useEffect(() => {
    if (!cfg) return;
    return listenForPasswordRecovery(cfg, (s) => {
      recoveryExchangeTried.current = true;
      setRecoveryDismissed(false);
      setRecoverySession(s);
      setRecoveryTokens(null);
      setRecoveryExchanging(false);
      clearUrlAuthParams();
    });
  }, [cfg]);

  useEffect(() => {
    if (!cfg || !session) {
      setRemote(null);
      setRemoteOwnerKey("");
      setSyncState("idle");
      return;
    }
    const requestOwner = `cloud:${(session.email || "").trim().toLowerCase()}`;
    let cancelled = false;
    // A previous account's map must never hydrate the newly signed-in account.
    setRemote(null);
    setRemoteOwnerKey("");
    setSyncState("loading");
    setSyncError("");
    fetchAll(cfg)
      .then((map) => {
        if (cancelled) return;
        setRemote(map);
        setRemoteOwnerKey(requestOwner);
        setSyncState("synced");
        setLastSync(Date.now());
      })
      .catch((e) => {
        if (cancelled) return;
        setSyncState("error");
        setSyncError(e instanceof Error ? e.message : "Could not load from online store");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, session?.email, retryTick]);

  const syncCtx = useMemo<SyncCtx>(
    () => ({
      remote: remoteOwnerKey === dataOwnerKey ? remote : null,
      remoteOwnerKey,
      ownerKey: dataOwnerKey,
      onlineOwner: online && !!session,
      canSave: online && !!session && remoteOwnerKey === dataOwnerKey && remote !== null,
      push: (key, value) => {
        if (!cfg) return;
        saveKey(cfg, key, value)
          .then(() => {
            setSyncState("synced");
            setLastSync(Date.now());
          })
          .catch((e) => {
            setSyncState("error");
            setSyncError(e instanceof Error ? e.message : "Could not save to online store");
          });
      },
    }),
    [remote, remoteOwnerKey, dataOwnerKey, online, session, cfg]
  );

  const [bio, setBio] = useSynced<Bio>(
    "nutrova-bio-v1", seedBio, syncCtx, normBio, emptyProfileForAccount
  );
  const [doctors, setDoctors] = useSynced<Doctor[]>(
    "nutrova-doctors-v3", seedDoctors, syncCtx, normDoctors, () => []
  );
  const [patches, setPatches] = useSynced<Patch[]>(
    "nutrova-patches-v2", seedPatches, syncCtx, undefined, () => []
  );
  const [reminders, setReminders] = useSynced<Reminder[]>(
    "nutrova-reminders-v1", seedReminders, syncCtx, undefined, () => []
  );
  const [payments, setPayments] = useSynced<Payment[]>(
    "nutrova-payments-v3", seedPayments, syncCtx,
    (arr) => (Array.isArray(arr) ? arr.map(normPay) : []),
    () => []
  );

  // Consume the sign-up profile after that account's own cloud workspace loads.
  useEffect(() => {
    const pending = pendingAccountProfileRef.current;
    if (pending && remote && remoteOwnerKey === dataOwnerKey && pending.email.toLowerCase() === currentEmail.toLowerCase()) {
      pendingAccountProfileRef.current = null;
    }
  }, [remote, remoteOwnerKey, dataOwnerKey, currentEmail]);

  const [bioDraft, setBioDraft] = useState<Bio>(bio);
  useEffect(() => setBioDraft(bio), [currentEmail, bio]); // eslint-disable-line react-hooks/exhaustive-deps

  /* persist local-mode users (only used while no online store is connected) */
  useEffect(() => {
    try { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); } catch { /* ignore */ }
  }, [users]);

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
  const [menuOpen, setMenuOpen] = useState(false);
  /* Settings sub-view: menu buttons open the password form / online store detail */
  const [settingsView, setSettingsView] = useState<"menu" | "account" | "password" | "online" | "alarms">("menu");
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
  const [doctorImportOpen, setDoctorImportOpen] = useState(false);
  /* Doctor cards: collapsed by default, tap to expand. Multi-select for bulk delete. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /* Area filter row collapses to one line until expanded */
  const [areaOpen, setAreaOpen] = useState(false);
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };
  /* Bulk delete — one confirmation that lists the names before deleting */
  const deleteSelectedDoctors = () => {
    const picked = doctors.filter((d) => selectedIds.has(d.id));
    if (picked.length === 0) return;
    const names = picked.slice(0, 8).map((d) => d.name).join(", ");
    askConfirm({
      title: `Delete ${picked.length} doctor${picked.length !== 1 ? "s" : ""}?`,
      label: `${picked.length} doctor${picked.length !== 1 ? "s" : ""}`,
      detail: `${names}${picked.length > 8 ? ` + ${picked.length - 8} more` : ""}. Their reminders stay, but the doctor cards are removed permanently.`,
      confirmText: `Yes, delete ${picked.length}`,
      onYes: () => {
        setDoctors((prev) => prev.filter((x) => !selectedIds.has(x.id)));
        setExpandedIds((prev) => {
          const next = new Set(prev);
          selectedIds.forEach((id) => next.delete(id));
          return next;
        });
        closeConfirm();
        exitSelectMode();
        showToast(`${picked.length} doctor${picked.length !== 1 ? "s" : ""} deleted`);
      },
    });
  };
  const [reminderModal, setReminderModal] = useState<{ open: boolean; draft: Reminder; editing: boolean }>({ open: false, draft: emptyReminder(), editing: false });
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; draft: Payment; editing: boolean }>({ open: false, draft: emptyPayment(), editing: false });
  const [patchModal, setPatchModal] = useState(false);
  const [patchDraft, setPatchDraft] = useState<{ id: string; name: string }>({ id: "", name: "" });
  const [quickArea, setQuickArea] = useState("");
  const [monWeek, setMonWeek] = useState("1st");
  const [monDay, setMonDay] = useState("Tuesday");
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; label: string; detail: string; confirmText: string; onYes: () => void }>({ open: false, title: "", label: "", detail: "", confirmText: "", onYes: () => {} });

  /* Pull fresh cloud data when the app regains focus, reconnects, or every 60s.
     Without this a second phone keeps showing doctors deleted on the first one,
     because the workspace was only fetched once at sign-in. This is a SOFT
     refresh: it never blanks the screen, and it pauses while a modal is open
     so it can't overwrite something you are editing. */
  const modalOpenRef = useRef(false);
  modalOpenRef.current =
    doctorModal.open ||
    reminderModal.open ||
    paymentModal.open ||
    patchModal ||
    doctorImportOpen ||
    confirmDelete.open;

  useEffect(() => {
    if (!cfg || !session) return;
    const requestOwner = `cloud:${(session.email || "").trim().toLowerCase()}`;
    let busy = false;
    let last = Date.now();
    const pull = async (force: boolean) => {
      if (busy || modalOpenRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (!force && Date.now() - last < 15000) return;
      busy = true;
      try {
        const map = await fetchAll(cfg);
        setRemote(map);
        setRemoteOwnerKey(requestOwner);
        setSyncState("synced");
        setLastSync(Date.now());
        last = Date.now();
      } catch {
        /* offline or blocked — keep showing what we already have */
      } finally {
        busy = false;
      }
    };
    const onFocus = () => void pull(false);
    const onVis = () => {
      if (document.visibilityState === "visible") void pull(false);
    };
    const onOnline = () => void pull(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    const iv = window.setInterval(() => void pull(false), 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, session?.email]);

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

  /* ---------- Reminder alarms: in-app ringing + sound + phone notification ---------- */
  const [ringing, setRinging] = useState<Reminder[]>([]);
  const [alertsOn, setAlertsOn] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());
  const snoozedRef = useRef<Map<string, number>>(new Map());
  const [alarmSound, setAlarmSound] = useState<AlarmSoundId>(() => getAlarmSound());
  const [morningCfg, setMorningCfgState] = useState(() => loadMorningSettings());
  const [swReady, setSwReady] = useState(false);
  const setMorningCfg = (next: { enabled: boolean; time: string }) => {
    setMorningCfgState(next);
    saveMorningSettings(next);
  };
  const changeAlarmSound = (id: AlarmSoundId) => {
    setAlarmSound(id);
    setAlarmSoundStorage(id);
  };
  const [muted, setMuted] = useState(() => isAlarmMuted());
  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    setAlarmMutedStorage(next);
    if (next) {
      stopAlarmSound();
      showToast("Alarm sound muted", "info");
    } else {
      showToast("Alarm sound on");
    }
  };
  /* X button: hide popup AND stop sound together — guaranteed.
     Runs stop twice (before + after state update) so even a tone scheduled
     in the same tick is killed. */
  const skipAllRinging = () => {
    stopAlarmSound();
    setRinging((prev) => {
      prev.forEach((r) => {
        dismissedRef.current.add(r.id);
        if (r.id.startsWith("morning-")) markMorningFired(dataOwnerKey, r.date);
      });
      return [];
    });
    // Second pass catches anything scheduled between click and re-render
    window.setTimeout(() => stopAlarmSound(), 0);
    window.setTimeout(() => stopAlarmSound(), 250);
  };

  const enableAlerts = async () => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
    const ok = await ensureServiceWorker();
    setSwReady(ok);
    playAlarmSound(1, alarmSound);
    setAlertsOn(true);
    showToast("Alerts on — reminders will ring with sound");
  };
  const testAlarmSound = () => {
    if (isAlarmMuted()) {
      showToast("Muted — tap Unmute to hear the test sound", "info");
      return;
    }
    playAlarmSound(2, alarmSound);
    const label = ALARM_SOUNDS.find((s) => s.id === alarmSound)?.label || "alarm";
    showToast(`Playing test alarm · ${label}`, "info");
  };
  /* ---------- Owner-only: team roster + per-user workspaces ---------- */
  const loadTeamRoster = async () => {
    if (!isOwner || !online || !cfg || !signedIn) return;
    setTeamLoading(true);
    setTeamError("");
    try {
      const rows = await fetchOwnerRoster(cfg);
      const members: TeamMember[] = rows.map((r) => {
        const b = (r.bio || {}) as Partial<Bio>;
        return {
          userId: r.userId,
          name: String(b.name || ""),
          email: String(b.email || ""),
          role: String(b.role || ""),
          hq: String(b.hq || ""),
          city: String(b.city || ""),
          phone: String(b.phone || ""),
          updatedAt: r.updatedAt,
        };
      });
      members.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
      setTeamRoster(members);
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Could not load users");
    } finally {
      setTeamLoading(false);
    }
  };
  const openTeamMember = async (userId: string) => {
    if (!isOwner || !online || !cfg) return;
    setSelectedUserId(userId);
    setSelectedWorkspace(null);
    setSelectedError("");
    setSelectedLoading(true);
    try {
      const ws = await fetchUserWorkspace(cfg, userId);
      const arr = (k: string) => (Array.isArray(ws[k]) ? (ws[k] as unknown[]) : []);
      setSelectedWorkspace({
        bio: (ws["nutrova-bio-v1"] as Bio) || ({} as Bio),
        doctors: (ws["nutrova-doctors-v3"] as Doctor[]) || [],
        patches: (ws["nutrova-patches-v2"] as Patch[]) || [],
        reminders: arr("nutrova-reminders-v1") as Reminder[],
        payments: arr("nutrova-payments-v3").map((p) => normPay(p as Partial<Payment>)),
      });
    } catch (e) {
      setSelectedError(e instanceof Error ? e.message : "Could not load this user's data");
    } finally {
      setSelectedLoading(false);
    }
  };
  /* Load the roster as soon as the owner is signed in (drawer badge + instant tab) */
  useEffect(() => {
    if (isOwner && online && signedIn && teamRoster.length === 0 && !teamLoading) {
      void loadTeamRoster();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, online, signedIn]);
  /* Register the service worker once so morning alarms can fire in the background */
  useEffect(() => {
    let cancelled = false;
    ensureServiceWorker().then((ok) => {
      if (!cancelled) setSwReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  /* Keep a fresh briefing cached for the service worker's background alarm */
  useEffect(() => {
    if (!signedIn) return;
    const t = window.setTimeout(() => {
      try {
        const today = todayISO();
        const rems = reminders.filter((r) => !r.done && r.date === today).length;
        const calls = doctors.filter((d) => doctorCallsOn(d, new Date())).length;
        const pend = payments.filter((p) => p.status !== "paid");
        const total = pend.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        void writeBriefingCache(buildMorningBriefing({ date: today, calls, reminders: rems, pendingCount: pend.length, pendingTotal: total }));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [reminders, doctors, payments, signedIn]);
  /* Safety net: whenever the popup is gone for ANY reason, kill the sound.
     This is what guarantees "hide = silence" even if data reloads. */
  useEffect(() => {
    if (ringing.length === 0) stopAlarmSound();
  }, [ringing.length]);
  /* Stop sound if the component unmounts (navigation / logout) */
  useEffect(() => () => stopAlarmSound(), []);

  const snoozeReminder = (id: string, mins = 10) => {
    stopAlarmSound();
    snoozedRef.current.set(id, Date.now() + mins * 60000);
    dismissedRef.current.delete(id);
    setRinging((prev) => prev.filter((x) => x.id !== id));
    window.setTimeout(() => stopAlarmSound(), 0);
    showToast(`Snoozed for ${mins} min`, "info");
  };
  const dismissRinging = (id: string) => {
    stopAlarmSound();
    dismissedRef.current.add(id);
    if (id.startsWith("morning-")) markMorningFired(dataOwnerKey, id.slice("morning-".length));
    setRinging((prev) => prev.filter((x) => x.id !== id));
    window.setTimeout(() => stopAlarmSound(), 0);
  };
  const completeRinging = (r: Reminder) => {
    stopAlarmSound();
    dismissedRef.current.delete(r.id);
    snoozedRef.current.delete(r.id);
    if (r.id.startsWith("morning-")) markMorningFired(dataOwnerKey, r.date);
    else setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: true } : x)));
    setRinging((prev) => prev.filter((x) => x.id !== r.id));
    window.setTimeout(() => stopAlarmSound(), 0);
    showToast(r.id.startsWith("morning-") ? "Morning briefing done — have a great day!" : "Reminder completed");
  };

  /* due-check: every 15s, ring reminders whose date + time has arrived */
  useEffect(() => {
    if (!signedIn) return;
    const check = () => {
      const now = Date.now();
      setRinging((prev) => {
        const ringingIds = new Set(prev.map((x) => x.id));
        const fresh: Reminder[] = [];
        for (const r of reminders) {
          if (r.done) continue;
          if (r.alarm === false) continue;
          const due = reminderDueAt(r);
          if (!due || due > now) continue;
          const snoozedUntil = snoozedRef.current.get(r.id) || 0;
          if (now < snoozedUntil) continue;
          if (snoozedUntil) snoozedRef.current.delete(r.id);
          if (dismissedRef.current.has(r.id)) continue;
          if (!ringingIds.has(r.id)) fresh.push(r);
        }
        /* Popup must NEVER auto-hide on cloud reload: only drop a ringing item
           when its reminder is explicitly marked done. A missing id means the
           list reloaded (owner switch / sync) — keep the popup visible instead
           of hiding it while the sound keeps playing in the background. */
        const alive = prev.filter((x) => {
          if (dismissedRef.current.has(x.id)) return false;
          const cur = reminders.find((rr) => rr.id === x.id);
          if (x.id.startsWith("morning-")) return true;
          if (!cur) return true;
          return !cur.done;
        });
        if (fresh.length > 0) {
          playAlarmSound(3, alarmSound);
          fresh.forEach((r) =>
            showBrowserNotification(
              `Reminder: ${r.title}`,
              `${r.doctorName || "General"}${r.doctorArea ? " · " + r.doctorArea : ""} · ${fmtDate(r.date)} ${r.time || ""}`.trim(),
              `nutrova-reminder-${r.id}`
            )
          );
          return [...alive, ...fresh.map((r) => ({ ...r }))];
        }
        /* Morning briefing: once per day, after the set time (default before 8 AM) */
        if (morningCfg.enabled && !ringingIds.has(`morning-${todayISO()}`)) {
          const today = todayISO();
          const mid = `morning-${today}`;
          const snoozedUntil = snoozedRef.current.get(mid) || 0;
          if (!(now < snoozedUntil) && morningFiredFor(dataOwnerKey) !== today && !dismissedRef.current.has(mid) && now >= morningTimeTodayMs(morningCfg.time)) {
            if (snoozedUntil) snoozedRef.current.delete(mid);
            const rems = reminders.filter((r) => !r.done && r.date === today);
            const calls = doctors.filter((d) => doctorCallsOn(d, new Date()));
            const pend = payments.filter((p) => p.status !== "paid");
            const briefing = buildMorningBriefing({
              date: today,
              calls: calls.length,
              reminders: rems.length,
              pendingCount: pend.length,
              pendingTotal: pend.reduce((s, p) => s + (Number(p.amount) || 0), 0),
            });
            const lines = [
              ...rems.slice(0, 3).map((r) => `• ${r.time || ""} ${r.title}`.trim()),
              ...calls.slice(0, 3).map((d) => `• Call: ${d.name} (${d.area || "—"})`),
            ];
            playAlarmSound(4, alarmSound);
            showBrowserNotification("☀️ Nutrova morning briefing", briefing.body, "nutrova-morning-briefing");
            return [
              ...alive,
              {
                id: mid,
                doctorName: "",
                doctorArea: "",
                title: `Good morning! ${briefing.body}`,
                date: today,
                time: morningCfg.time,
                kind: "Visit" as ReminderKind,
                notes: lines.length > 0 ? lines.join("\n") : "Nothing scheduled today.",
                done: false,
                alarm: true,
              },
            ];
          }
        }
        return alive.length === prev.length ? prev : alive;
      });
    };
    check();
    const t = window.setInterval(check, 15000);
    return () => window.clearInterval(t);
  }, [reminders, doctors, payments, signedIn, morningCfg, alarmSound, dataOwnerKey]);

  /* ---------- auth handlers: online store first, local fallback when not connected ---------- */
  const persistSession = (email: string) => {
    try {
      if (email) localStorage.setItem(AUTH_SESSION_KEY, email);
      else localStorage.removeItem(AUTH_SESSION_KEY);
    } catch { /* ignore */ }
    setSessionEmail(email);
  };
  const handleLoginLocal = () => {
    const email = loginEmail.trim().toLowerCase();
    setAuthError("");
    if (!email) return setAuthError("Please enter work email");
    if (!loginPassword) return setAuthError("Please enter password");
    const found = users.find((u) => u.email.toLowerCase() === email);
    if (!found) return setAuthError("Account not found — please Create account first");
    if (found.pass !== loginPassword) return setAuthError("Wrong password — try again");
    persistSession(found.email);
    setLoginPassword("");
    setShowLoginPass(false);
    showToast(`Welcome back${firstName(found.name) ? ", " + firstName(found.name) : ""} — stays signed in`);
  };
  const handleSignupLocal = () => {
    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    const hq = signupHq.trim();
    const nu: AppUser = { name, email, pass: signupPassword, createdAt: new Date().toISOString(), hq };
    setUsers((prev) => [...prev, nu]);
    pendingAccountProfileRef.current = {
      ...seedBio(),
      name,
      role: APP_OWNER.role,
      city: "",
      state: "",
      hq,
      email,
      rev: BIO_REV,
    };
    persistSession(email);
    setSignupPassword(""); setSignupConfirm("");
    setSignupHq("");
    setShowSignupPass(false); setShowSignupConfirm(false);
    showToast(`Account created — welcome, ${firstName(name)}! Your private workspace is ready.`);
  };
  const handleLogin = async () => {
    if (!online || !cfg) return handleLoginLocal();
    const email = loginEmail.trim().toLowerCase();
    setAuthError(""); setAuthInfo("");
    if (!email) return setAuthError("Please enter work email");
    if (!loginPassword) return setAuthError("Please enter password");
    setAuthBusy(true);
    try {
      const s = await signInRemote(cfg, email, loginPassword);
      setSession(s);
      setLoginPassword("");
      setShowLoginPass(false);
      showToast(`Welcome back${firstName(s.name) ? ", " + firstName(s.name) : ""} — stays signed in`);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setAuthBusy(false);
    }
  };
  const handleSignup = async () => {
    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    const hq = signupHq.trim();
    setAuthError(""); setAuthInfo("");
    if (!name) return setAuthError("Please enter full name");
    if (!email || !email.includes("@")) return setAuthError("Please enter valid work email");
    if (!signupPassword || signupPassword.length < 6) return setAuthError("Password must be 6+ characters");
    if (signupPassword !== signupConfirm) return setAuthError("Passwords do not match");
    if (!online || !cfg) {
      if (users.some((u) => u.email.toLowerCase() === email)) return setAuthError("Account already exists — please Sign in");
      return handleSignupLocal();
    }
    setAuthBusy(true);
    try {
      const r = await signUpRemote(cfg, name, email, signupPassword, hq);
      if (r.session) {
        pendingAccountProfileRef.current = {
          ...seedBio(),
          name,
          role: APP_OWNER.role,
          city: "",
          state: "",
          hq,
          email,
          rev: BIO_REV,
        };
        setSession(r.session);
        setSignupPassword(""); setSignupConfirm(""); setSignupHq("");
        showToast(`Account created online — welcome, ${firstName(name)}! Your private workspace is ready.`);
      } else {
        setAuthInfo("Account created. Open the confirmation email we sent, then come back and Sign in.");
        setAuthMode("login");
        setLoginEmail(email);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setAuthBusy(false);
    }
  };
  const handleForgotPassword = async () => {
    const email = loginEmail.trim().toLowerCase();
    setAuthError(""); setAuthInfo("");
    if (!email || !email.includes("@")) return setAuthError("Please enter your account email");
    if (!online || !cfg) return setAuthError("Password reset needs internet — the online store is not connected");
    setAuthBusy(true);
    try {
      // Leave a clean auth state so a previous account session cannot bypass reset.
      persistSession("");
      setSession(null);
      setRemote(null);
      try { await signOutRemote(cfg); } catch { /* reset request can still proceed */ }
      await requestPasswordReset(cfg, email);
      setForgotSent(true);
      setAuthInfo(`Reset link sent to ${email}. Open the newest email link on this phone to create a new password. You'll stay on the reset screen until you finish.`);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not send reset link");
    } finally {
      setAuthBusy(false);
    }
  };
  const handleSetNewPassword = async () => {
    setAuthError("");
    if (!recoveryPw || recoveryPw.length < 6) return setAuthError("Password must be 6+ characters");
    if (recoveryPw !== recoveryPw2) return setAuthError("Passwords do not match");
    if (!cfg || (!recoveryTokens && !recoverySession)) return setAuthError("Reset session missing — please request a new link");
    setRecovering(true);
    try {
      /* Prefer the session Supabase recovered from the email; fall back to adopting legacy hash tokens. */
      const s = recoverySession || (recoveryTokens ? await adoptRecoverySession(cfg, recoveryTokens) : null);
      if (!s) throw new Error("Reset session is missing — request a new reset link and open it on this device.");
      await updatePasswordRemote(cfg, recoveryPw);
      setSession(s);
      setRecoveryTokens(null);
      setRecoverySession(null);
      clearUrlAuthParams();
      setRecoveryPw(""); setRecoveryPw2(""); setShowRecoveryPw(false);
      showToast(`Password updated — welcome${firstName(s.name) ? ", " + firstName(s.name) : ""}`);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not reset password");
    } finally {
      setRecovering(false);
    }
  };
  const cancelRecovery = () => {
    setRecoveryDismissed(true);
    setRecoveryTokens(null);
    setRecoverySession(null);
    clearUrlAuthParams();
    setRecoveryPw(""); setRecoveryPw2("");
    setAuthError("");
  };
  const doSignOut = () => {
    if (online) {
      /* clear the cached copy so the next person on this phone never sees this account's data */
      clearSession();
      try { STORE_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
      window.location.reload();
      return;
    }
    persistSession("");
    goTo("dashboard");
  };
  const handleSignOut = () => {
    askConfirm({
      title: "Sign out?",
      label: currentEmail || "your account",
      detail: online
        ? "You will see the login screen next time. Everything is safe in the online store — sign in on any phone to get it back."
        : "You will see the login screen next time. Your data stays on this device.",
      confirmText: "Yes, sign out",
      onYes: () => { closeConfirm(); doSignOut(); },
    });
  };

  /* ---------- Settings handlers ---------- */
  /* Sync now: if your data has loaded, upload everything on this phone to the online store
     (so nothing typed while offline is lost); if it never loaded, fetch it again instead. */
  const syncNow = async () => {
    if (!cfg || !session) return;
    if (remote === null) {
      setRetryTick((n) => n + 1);
      return;
    }
    setSyncBusy(true);
    try {
      await Promise.all([
        saveKey(cfg, "nutrova-bio-v1", bio),
        saveKey(cfg, "nutrova-doctors-v3", doctors),
        saveKey(cfg, "nutrova-patches-v2", patches),
        saveKey(cfg, "nutrova-reminders-v1", reminders),
        saveKey(cfg, "nutrova-payments-v3", payments),
      ]);
      setSyncState("synced");
      setSyncError("");
      setLastSync(Date.now());
      showToast("All your data is saved in the online store");
    } catch (e) {
      setSyncState("error");
      setSyncError(e instanceof Error ? e.message : "Could not sync with the online store");
    } finally {
      setSyncBusy(false);
    }
  };
  const copySetupSql = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      showToast("Copy failed — select the SQL text and copy it", "info");
    }
  };
  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!newPw || newPw.length < 6) return setPwMsg({ ok: false, text: "Password must be 6+ characters" });
    if (newPw !== newPw2) return setPwMsg({ ok: false, text: "Passwords do not match" });
    if (online && cfg) {
      setPwBusy(true);
      try {
        await updatePasswordRemote(cfg, newPw);
        setNewPw(""); setNewPw2(""); setShowNewPw(false);
        setPwMsg({ ok: true, text: "Password updated — use the new password next time you sign in" });
        showToast("Password updated");
      } catch (e) {
        setPwMsg({ ok: false, text: e instanceof Error ? e.message : "Could not update password" });
      } finally {
        setPwBusy(false);
      }
      return;
    }
    setUsers((prev) => prev.map((u) => (u.email.toLowerCase() === currentEmail.toLowerCase() ? { ...u, pass: newPw } : u)));
    setNewPw(""); setNewPw2(""); setShowNewPw(false);
    setPwMsg({ ok: true, text: "Password updated on this phone" });
    showToast("Password updated");
  };

  /* Share link — the online store is built into the app, so the plain app address is enough */
  const appShareUrl =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "Nutrova Doctor Tracker";
  const appShareText = "Nutrova Doctor Tracker — Business Development Manager app for doctors, calls, reminders, purchase orders & payments";
  const handleNativeShare = async () => {
    const data = { title: "Nutrova Doctor Tracker", text: appShareText, url: appShareUrl };
    try {
      if ((navigator as unknown as { share?: (d: typeof data) => Promise<void> }).share) {
        await (navigator as unknown as { share: (d: typeof data) => Promise<void> }).share(data);
        showToast("Shared successfully");
      } else {
        await navigator.clipboard.writeText(`${appShareText}\n${appShareUrl}`);
        setShareCopied(true);
        showToast("Link copied — paste in WhatsApp");
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch { /* user cancelled */ }
  };
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appShareUrl);
      setShareCopied(true);
      showToast("App link copied");
      setTimeout(() => setShareCopied(false), 2000);
    } catch { setAuthError("Copy failed — long-press link to copy"); }
  };

  /* tab navigation — each tab is its own separate page (Bio shifted out of Dashboard) */
  const goTo = (id: Tab) => {
    if (id === "settings") setSettingsView("menu");
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  /* frozen header shadow only — header height never changes, so no vibration on scroll */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFrozenScrolled(window.scrollY > 8));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
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
    if (q) list = list.filter((p) => [p.doctorName, p.doctorArea, p.billingName, p.invoiceNo, p.purpose, p.mode, String(p.amount), p.items.map((i) => i.product).join(" ")].join(" ").toLowerCase().includes(q));
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
      showToast("Your account bio was saved");
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
    const np: Patch = { id: uid(), name, color: "emerald" };
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

  /* Bulk upload: CSV rows → doctors. Matches area names to existing patches
     (case-insensitive); brand-new areas auto-create their patch so the
     Area-patches filter stays correct. Skips exact name+phone duplicates. */
  const importDoctorsBulk = (parsed: ParsedDoctor[]) => {
    if (!parsed || parsed.length === 0) return;
    const patchByName = new Map(patches.map((p) => [p.name.trim().toLowerCase(), p]));
    const newPatches: Patch[] = [];
    const fresh: Doctor[] = [];
    let skipped = 0;
    const seen = new Set(doctors.map((d) => `${d.name.trim().toLowerCase()}|${(d.phone || "").replace(/\D/g, "")}`));
    for (const pd of parsed) {
      const area = (pd.area || "").trim();
      let patchId = "";
      if (area) {
        const hit = patchByName.get(area.toLowerCase());
        if (hit) patchId = hit.id;
        else {
          const created: Patch = { id: uid(), name: area, color: "emerald" };
          patchByName.set(area.toLowerCase(), created);
          newPatches.push(created);
          patchId = created.id;
        }
      }
      const dupKey = `${pd.name.trim().toLowerCase()}|${(pd.phone || "").replace(/\D/g, "")}`;
      if (seen.has(dupKey)) { skipped++; continue; }
      seen.add(dupKey);
      fresh.push({
        id: uid(),
        name: pd.name.trim(),
        specialty: pd.specialty || "Dermatologist",
        qualification: pd.qualification || "",
        clinic: pd.clinic || "",
        area,
        patchId,
        city: pd.city || "Bangalore",
        phone: pd.phone || "",
        email: pd.email || "",
        frequency: pd.frequency || "Weekly",
        lastVisit: pd.lastVisit || "",
        nextVisit: pd.nextVisit || "",
        notes: pd.notes || "",
        priority: pd.priority || "Medium",
        callDays: pd.callDays?.length ? pd.callDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        monthlyCalls: pd.monthlyCalls || [],
        callTimeFrom: pd.callTimeFrom || "10:00",
        callTimeTo: pd.callTimeTo || "13:00",
        focusProducts: pd.focusProducts || [],
        followProducts: pd.followProducts || [],
        appointmentModes: pd.appointmentModes || [],
        appointmentContact: pd.appointmentContact || "",
        appointmentPhone: pd.appointmentPhone || "",
        appointmentLead: pd.appointmentLead || "Same day",
        appointmentNote: pd.appointmentNote || "",
      });
    }
    if (newPatches.length > 0) setPatches((prev) => [...prev, ...newPatches]);
    if (fresh.length > 0) setDoctors((prev) => [...fresh, ...prev]);
    setDoctorImportOpen(false);
    showToast(
      fresh.length > 0
        ? `Imported ${fresh.length} doctor${fresh.length !== 1 ? "s" : ""}${newPatches.length > 0 ? ` · ${newPatches.length} new patch${newPatches.length !== 1 ? "es" : ""}` : ""}${skipped > 0 ? ` · ${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped` : ""}`
        : "Nothing imported — all rows were duplicates",
      fresh.length > 0 ? "ok" : "info"
    );
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
    dismissedRef.current.delete(r.id);
    snoozedRef.current.delete(r.id);
    stopAlarmSound();
    setRinging((prev) => prev.filter((x) => x.id !== r.id));
    setReminderModal({ open: false, draft: emptyReminder(), editing: false });
    showToast(reminderModal.editing ? "Reminder updated" : "Reminder added");
  };

  const savePayment = () => {
    const p = paymentModal.draft;
    if (!p.doctorName.trim()) return showToast("Please select a doctor", "info");
    if (!p.billingName.trim()) return showToast("Billing name is required", "info");
    if (!p.amount || p.amount <= 0) return showToast("Enter a valid amount", "info");
    const status: PaymentStatus = p.status === "paid" ? "paid" : isCriticalOverdue(p.dueDate) ? "overdue" : "pending";
    const cleanItems = (p.items || []).filter((i) => i.product && Number(i.qty) > 0).map((i) => ({ product: i.product, qty: Number(i.qty), rate: Number(i.rate) || 0 }));
    const rec = { ...p, items: cleanItems, invoiceNo: p.invoiceNo.trim() || genInvoiceNo(), status, paidDate: p.status === "paid" ? p.paidDate || todayISO() : "" };
    if (paymentModal.editing) setPayments((prev) => prev.map((x) => (x.id === rec.id ? rec : x)));
    else setPayments((prev) => [{ ...rec, id: uid() }, ...prev]);
    setPaymentModal({ open: false, draft: emptyPayment(), editing: false });
    showToast(paymentModal.editing ? "Invoice updated" : "Invoice added");
  };

  const deleteInvoice = (p: Payment) => {
    askConfirm({
      title: "Delete purchase order?",
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

  /* purchase-order lines: picking a product fills its nutrova.com rate; total is calculated automatically */
  const setPayItems = (items: OrderItem[]) =>
    setPaymentModal((m) => ({ ...m, draft: { ...m.draft, items, amount: items.some((i) => i.product) ? orderTotal(items) : m.draft.amount } }));
  const updatePayItem = (idx: number, patch: Partial<OrderItem>) =>
    setPayItems(paymentModal.draft.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const pickPayProduct = (idx: number, product: string) =>
    updatePayItem(idx, { product, rate: DEFAULT_RATES[product] ?? paymentModal.draft.items[idx]?.rate ?? 0 });
  const addPayItem = () => setPayItems([...paymentModal.draft.items, { product: "", qty: 1, rate: 0 }]);
  const removePayItem = (idx: number) => {
    const next = paymentModal.draft.items.filter((_, i) => i !== idx);
    setPayItems(next.length ? next : [{ product: "", qty: 1, rate: 0 }]);
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
      setPatches((prev) => prev.map((p) => (p.id === patchDraft.id ? { ...p, name } : p)));
      setDoctors((prev) => prev.map((d) => (d.patchId === patchDraft.id ? { ...d, area: name } : d)));
      showToast("Area patch updated");
    } else {
      setPatches((prev) => [...prev, { id: uid(), name, color: "emerald" }]);
      showToast("Area patch created");
    }
    setPatchDraft({ id: "", name: "" });
  };

  const editPatch = (p: Patch) => {
    setPatchDraft({ id: p.id, name: p.name });
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
    const header = ["PO / Invoice No", "Order Date", "Doctor", "Area", "Billing Name", "Products Ordered", "Total Qty", "Note", "Amount (INR)", "Due Date", "Pending Days", "Days Overdue", "Status", "Paid Date", "Mode"];
    const rows = filteredPayments.map((p) => {
      const st = p.status === "paid" ? "paid" : isCriticalOverdue(p.dueDate) ? "overdue (30+ days)" : isPast(p.dueDate) ? `pending (${daysOverdue(p.dueDate)}d)` : "pending";
      const pend = pendingDaysInfo(p);
      return [
        p.invoiceNo || "", p.orderDate ? fmtDate(p.orderDate) : "", p.doctorName, p.doctorArea || "", p.billingName || "",
        p.items.map((i) => `${i.product} x${i.qty} @${i.rate}`).join(" | "), String(orderQty(p.items)), p.purpose, String(p.amount),
        p.dueDate ? fmtDate(p.dueDate) : "", pend.text, String(daysOverdue(p.dueDate)), st,
        p.paidDate ? fmtDate(p.paidDate) : "", p.mode,
      ];
    });
    downloadCSV(`nutrova-payments-${todayISO()}.csv`, header, rows);
    showToast(`Downloaded ${filteredPayments.length} invoices as CSV`);
  };

  const exportCallsToday = () => {
    if (callsTodayList.length === 0) return showToast("No calls scheduled today", "info");
    const header = ["Name", "Specialty", "Clinic", "Area / Patch", "City", "Phone", "Call Time", "Call Days", "Appointment Modes", "Appointment Contact", "Appointment Phone", "Focus Products", "Follow-up Products", "Last Visit", "Notes"];
    const rows = callsTodayList.map((d) => [
      d.name, d.specialty, d.clinic || "", patchOf(d.patchId)?.name || d.area || "", d.city || "", d.phone || "",
      describeTime(d), describeWeekly(d.callDays || []),
      (d.appointmentModes || []).join(" + "), d.appointmentContact || "", d.appointmentPhone || "",
      (d.focusProducts || []).join(" + "), (d.followProducts || []).join(" + "),
      d.lastVisit ? fmtDate(d.lastVisit) : "", d.notes || "",
    ]);
    downloadCSV(`nutrova-calls-today-${todayISO()}.csv`, header, rows);
    showToast(`Downloaded ${callsTodayList.length} calls as CSV`);
  };

  /* Keep the reset flow in front of the app, even if Supabase leaves an old session cached. */
  useEffect(() => {
    if (!urlSignal || !cfg || recoveryExchangeTried.current) return;
    if (urlSignal.kind === "hash-tokens") return; // handled synchronously, no exchange needed
    if (urlSignal.kind === "error") {
      const m = urlSignal.message || "";
      setAuthError(
        /expired|invalid|used|denied|otp/i.test(m)
          ? "Reset link expired or already used — please request a new one"
          : m
      );
      clearUrlAuthParams();
      return;
    }
    recoveryExchangeTried.current = true;
    setRecoveryExchanging(true);
    const exchange = urlSignal.kind === "code"
      // Explicitly exchange before rendering the new-password form.
      ? exchangeRecoveryCode(cfg, urlSignal.code)
      : urlSignal.kind === "token-hash"
        ? verifyRecoveryTokenHash(cfg, urlSignal.token_hash)
        : getRecoverySession(cfg).then((s) => {
            if (!s) throw new Error("The reset email returned to the app without a recovery session. Request a new link and open the newest email on this same phone/browser.");
            return s;
          });
    exchange
      .then((s) => setRecoverySession(s))
      .catch((e) => {
        setAuthError(e instanceof Error ? e.message : "Reset link expired — please request a new one");
      })
      .finally(() => setRecoveryExchanging(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  /* Reset URL takes precedence over any older cached sign-in session. */
  const inRecovery = !recoveryDismissed && (!!urlSignal || !!recoveryTokens || !!recoverySession || recoveryExchanging);

  /* ---------------- Option B login gate — show/hide + create account + stay logged in ---------------- */
  if (!signedIn || inRecovery) {
    /* Arrived here from a password-reset email link → set a new password */
    if (inRecovery && urlSignal?.kind === "error") {
      const expired = /expired|invalid|used|otp/i.test(urlSignal.message || "");
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4 sm:p-6">
          <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-emerald-950 px-6 py-6 text-white sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 ring-1 ring-rose-400/40">
                  <Lock className="h-6 w-6 text-rose-200" />
                </div>
                <div>
                  <p className="text-lg font-extrabold leading-tight">Reset link couldn't be used</p>
                  <p className="text-xs text-emerald-200/80">Nutrova Doctor Tracker</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold leading-relaxed text-rose-800 ring-1 ring-rose-200">
                {expired
                  ? "This reset link has expired, was already used, or did not complete Supabase verification. Request a fresh link and open it on the same phone/browser."
                  : urlSignal.message || "The reset link is not valid."}
              </p>
              <ol className="space-y-1.5 text-xs font-medium leading-relaxed text-slate-500">
                <li>1. Return to sign in and tap “Forgot password?”.</li>
                <li>2. Request a new email, then open the newest link on this device.</li>
                <li>3. If the link keeps returning here, check Supabase Authentication → URL Configuration includes this app's exact address.</li>
              </ol>
              <button onClick={cancelRecovery} className="w-full rounded-2xl bg-emerald-700 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">
                Return to sign in
              </button>
              <button onClick={() => { cancelRecovery(); setAuthMode("signup"); setAuthError(""); setAuthInfo(""); }} className="w-full text-center text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                Create a new account instead
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (inRecovery) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4 sm:p-6">
          <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-emerald-950 px-6 pb-6 pt-7 text-white sm:px-8 sm:pt-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40">
                  <Lock className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">{recoveryExchanging && !recoveryTokens && !recoverySession ? "Verifying reset link…" : "Set new password"}</p>
                  <p className="text-xs text-emerald-200/80">Password reset · Nutrova Doctor Tracker</p>
                </div>
              </div>
            </div>
            {recoveryExchanging && !recoveryTokens && !recoverySession ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 sm:px-8">
                <RefreshCcw className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-bold text-slate-600">Verifying reset link…</p>
              </div>
            ) : (
            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">New password</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <input type={showRecoveryPw ? "text" : "password"} value={recoveryPw} onChange={(e) => setRecoveryPw(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="6+ characters" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowRecoveryPw(!showRecoveryPw)} title={showRecoveryPw ? "Hide password" : "Show password"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700">
                    {showRecoveryPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Confirm new password</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <input type={showRecoveryPw ? "text" : "password"} value={recoveryPw2} onChange={(e) => setRecoveryPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetNewPassword()} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="Repeat new password" autoComplete="new-password" />
                </div>
              </div>
              {authError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{authError}</p>}
              {recoveryExchanging && !recoveryTokens && !recoverySession && (
                <p className="rounded-xl bg-sky-50 px-4 py-2.5 text-center text-xs font-bold text-sky-800 ring-1 ring-sky-100">
                  Connecting this reset email to your account. Please keep this page open.
                </p>
              )}
              <button onClick={handleSetNewPassword} disabled={recovering || recoveryExchanging || (!recoveryTokens && !recoverySession)} className="w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-60">
                {recoveryExchanging || recovering ? "Please wait…" : "Update password & Sign in"}
              </button>
              <button onClick={cancelRecovery} className="w-full text-center text-xs font-bold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                Cancel — back to sign in
              </button>
              <button onClick={() => { cancelRecovery(); setAuthMode("signup"); setAuthError(""); setAuthInfo(""); }} className="w-full text-center text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                Create a fresh account instead
              </button>
            </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4 sm:p-6">
        <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-emerald-950 px-6 pb-6 pt-7 text-white sm:px-8 sm:pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Stethoscope className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">Nutrova Doctor Tracker</p>
                {/* app creator — simple lines below the title, name highlighted */}
                <p className="mt-1 text-xs leading-snug text-emerald-200/80">
                  App created by <span className="font-extrabold uppercase tracking-wide text-amber-300">{APP_OWNER.name}</span>
                </p>
                <p className="text-[11px] font-semibold leading-snug text-emerald-100/70">
                  {APP_OWNER.role} at {APP_OWNER.hq} HQ
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/15">
              <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className={`rounded-xl py-2.5 text-sm font-extrabold transition ${authMode === "login" ? "bg-white text-emerald-900 shadow" : "text-emerald-100/70 hover:text-white"}`}>
                Sign in
              </button>
              <button onClick={() => { setAuthMode("signup"); setAuthError(""); }} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold transition ${authMode === "signup" ? "bg-white text-emerald-900 shadow" : "text-emerald-100/70 hover:text-white"}`}>
                <UserPlus className="h-4 w-4" /> Create account
              </button>
            </div>
          </div>

          {/* online store status — connection is built in and locked */}
          <div className="px-6 pt-4 sm:px-8">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-100">
              <Cloud className="h-4 w-4 shrink-0" /> Online store connected — your data is saved in the cloud
            </p>
          </div>

          {authMode === "login" ? (
            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Work email</label>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="you@nutrova.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <input type={showLoginPass ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} title={showLoginPass ? "Hide password" : "Show password"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700">
                    {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthInfo(""); setForgotSent(false); }} className="text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                  Forgot password?
                </button>
              </div>
              {authInfo && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">{authInfo}</p>}
              {authError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{authError}</p>}
              <button onClick={handleLogin} disabled={authBusy} className="w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-60">
                {authBusy ? "Please wait…" : "Sign in to Tracker"}
              </button>
              <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-[11px] font-bold leading-relaxed text-emerald-800 ring-1 ring-emerald-100">
                Sign in once — you stay signed in until you tap Sign out.
              </p>
              <button onClick={() => setShareOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-200">
                <Share2 className="h-4 w-4" /> Share this app with others
              </button>
              <p className="text-center text-xs text-slate-400">Secure workspace for Nutrova field team</p>
            </div>
          ) : authMode === "signup" ? (
            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Full name</label>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <User className="h-4 w-4 shrink-0 text-emerald-600" />
                  <input value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="Your full name" autoComplete="name" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Work email</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="you@nutrova.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Your HQ / territory</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <input value={signupHq} onChange={(e) => setSignupHq(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="e.g. Bangalore 2" autoComplete="organization-title" />
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-400">This is saved in your account profile. You can change it later in Bio.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                    <input type={showSignupPass ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="6+ chars" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowSignupPass(!showSignupPass)} title={showSignupPass ? "Hide" : "Show"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-700">
                      {showSignupPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Confirm</label>
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                    <input type={showSignupConfirm ? "text" : "password"} value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignup()} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="Repeat" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowSignupConfirm(!showSignupConfirm)} title={showSignupConfirm ? "Hide" : "Show"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-700">
                      {showSignupConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              {authError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{authError}</p>}
              <button onClick={handleSignup} disabled={authBusy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-60">
                <UserPlus className="h-4 w-4" /> {authBusy ? "Please wait…" : "Create account & Sign in"}
              </button>
              <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="w-full text-center text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                Already have account? Sign in
              </button>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
                {online ? "Your account and data are saved securely in the online store." : "Online store not connected — account saves on this phone only."}
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
              <div>
                <p className="text-base font-extrabold text-slate-900">Forgot password?</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                  Enter your account email — we'll send a reset link. Open it on this phone to set a new password.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Account email</label>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" placeholder="you@nutrova.com" autoComplete="email" />
                </div>
              </div>
              {authInfo && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">{authInfo}</p>}
              {authError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{authError}</p>}
              <button onClick={handleForgotPassword} disabled={authBusy} className="w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-60">
                {authBusy ? "Sending…" : forgotSent ? "Resend reset link" : "Send reset link"}
              </button>
              {forgotSent && (
                <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-[11px] font-bold leading-relaxed text-amber-800 ring-1 ring-amber-100">
                  No email yet? Check the spam folder, then tap Resend.
                </p>
              )}
              <button onClick={() => { setAuthMode("login"); setAuthError(""); setAuthInfo(""); }} className="w-full text-center text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                Back to sign in
              </button>
            </div>
          )}
        </div>
        {shareOpen && (
          <ShareAppDialog
            url={appShareUrl}
            text={appShareText}
            copied={shareCopied}
            online={online}
            onClose={() => setShareOpen(false)}
            onNative={handleNativeShare}
            onCopy={handleCopyLink}
          />
        )}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 anim-toast">
            <div className="flex items-center gap-2.5 rounded-full bg-emerald-950 py-3 pl-4 pr-6 text-sm font-bold text-white shadow-2xl ring-1 ring-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    );
  }

  const navItems: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
  ];
  const drawerItems: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "doctors", label: "Doctors", icon: <Stethoscope className="h-5 w-5" /> },
    { id: "reminders", label: "Reminders", icon: <Bell className="h-5 w-5" /> },
    { id: "payments", label: "Payments", icon: <Wallet className="h-5 w-5" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-5 w-5" /> },
    ...(isOwner ? [{ id: "users" as Tab, label: "Users", icon: <Users className="h-5 w-5" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* --------------------- FROZEN: top banner + nav pills (upto marked line) --------------------- */}
      <div className={`sticky top-0 z-40 transition-shadow duration-200 ${frozenScrolled ? "shadow-lg shadow-slate-900/10" : ""}`}>
        <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-extrabold leading-tight tracking-tight text-[17px] sm:text-2xl">
                  Nutrova Doctor Tracker
                </h1>
                {/* tagline — always fully visible, wraps to 2 lines on mobile instead of cutting */}
                <p className="text-emerald-100/90 mt-1 text-xs leading-snug sm:text-sm">
                  Created by <span className="font-bold text-white underline decoration-emerald-300/60 underline-offset-2">{APP_OWNER.name}</span>
                  <span className="mx-1.5 text-emerald-300/60">·</span><span className="whitespace-nowrap">{APP_OWNER.role}</span>
                  <span className="mx-1.5 text-emerald-300/60">·</span><span className="font-bold text-white">Nutrova</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-2 pt-0.5 sm:gap-2">
              <span className="hidden items-center gap-2 pt-2 text-sm font-medium text-emerald-100/90 xl:flex">
                <Mail className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="max-w-[180px] truncate">{APP_OWNER.email}</span>
              </span>
              <button onClick={() => setShareOpen(true)} title="Share this app with others" className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 font-extrabold text-amber-950 shadow transition hover:bg-amber-300 sm:gap-2 sm:text-sm px-3.5 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm">
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Share</span>
              </button>
              <button onClick={handleSignOut} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 sm:gap-2 sm:text-sm px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Sign out
              </button>
            </div>
          </div>
        </header>

        <nav className={`border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow duration-200 ${frozenScrolled ? "shadow-sm" : ""}`}>
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 sm:px-8 py-3">
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
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 lg:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500 anim-pulse-soft" />
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              {/* Hamburger — Doctors / Reminders / Payments / Bio / Settings live here */}
              <button
                onClick={() => setMenuOpen(true)}
                title="Open menu"
                aria-label="Open menu"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Hamburger slide menu — all tabs except Dashboard */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-base font-extrabold text-slate-900">Menu</p>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {drawerItems.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setMenuOpen(false); goTo(d.id); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    activeTab === d.id ? "bg-emerald-700 text-white shadow" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {d.icon}
                  {d.label}
                  {d.id === "doctors" && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold ${activeTab === d.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{doctors.length}</span>
                  )}
                  {d.id === "reminders" && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold ${activeTab === d.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{reminders.filter((r) => !r.done).length}</span>
                  )}
                  {d.id === "payments" && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold ${activeTab === d.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{pendingPayments.length}</span>
                  )}
                  {d.id === "users" && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold ${activeTab === d.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{teamLoading ? "…" : teamRoster.length}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4">
              <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-extrabold text-rose-600 transition hover:bg-rose-100">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* online store status banner — only shown when something needs attention */}
        {online && syncState === "loading" && (
          <p className="mb-5 flex items-center gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            <Cloud className="h-4 w-4 shrink-0 anim-pulse-soft" /> Loading your data from the online store…
          </p>
        )}
        {online && syncState === "error" && (
          <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
            <CloudOff className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{syncError || "Online store problem"}</span>
            <button onClick={syncNow} disabled={syncBusy} className="rounded-full bg-rose-600 px-3 py-1 text-white hover:bg-rose-700 disabled:opacity-60">{syncBusy ? "Syncing…" : "Retry"}</button>
            {isOwner && <button onClick={() => goTo("settings")} className="rounded-full bg-white px-3 py-1 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">Settings</button>}
          </div>
        )}
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
                    <CalendarClock className="h-4 w-4" /> Giving calls today
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {isAndroidPhone
                      ? `Auto-matched · ${new Date().toLocaleDateString("en-IN", { weekday: "long" })}`
                      : `Auto-matched from each doctor's weekly call days + monthly rules (${new Date().toLocaleDateString("en-IN", { weekday: "long" })}).`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-extrabold text-white">{callsTodayList.length} doctors</span>
                  <button onClick={exportCallsToday} title="Download today's calls as CSV" className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-50">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
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
                    {isAndroidPhone
                      ? "Red = 30+ days · most overdue first"
                      : "Red = pending 30+ days · below 30 days normal colour · most overdue first"}
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
          <p className="mt-1 text-sm font-medium text-slate-500">Your Bio and HQ belong to this account. Its doctors, areas, reminders and purchase orders are kept separate from other accounts.</p>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
            {/* short bio ID card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-6 pb-5 pt-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-extrabold ring-1 ring-white/25">
                    {initials(bio.name || accountDisplayName || "User")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold leading-tight">{bio.name || "—"}</p>
                    <p className="truncate text-sm text-emerald-100/80">{bio.role || "Business Development Manager"}</p>
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
                <p className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100"><Check className="h-4 w-4 shrink-0" /> Signed in as {currentEmail || bio.email} · stays until Sign out</p>
                {isOwner && (
                <button onClick={() => goTo("settings")} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-extrabold ring-1 transition ${online ? (syncState === "error" ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-sky-50 text-sky-800 ring-sky-100 hover:bg-sky-100") : "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100"}`}>
                  {online ? <Cloud className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
                  {online ? (syncState === "error" ? "Online store — problem, open Settings" : syncState === "loading" ? "Online store — syncing…" : "Online store connected · data synced") : "Online store not connected"}
                </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShareOpen(true)} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-amber-950 transition hover:bg-amber-300">
                    <Share2 className="h-3.5 w-3.5" /> Share app
                  </button>
                  <button onClick={handleSignOut} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
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
                  <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Your Bio Data</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">Private to your account</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BioInput label="Full name" value={bioDraft.name} onChange={(v) => setBioDraft({ ...bioDraft, name: v })} placeholder="Your full name" />
                  <BioInput label="Role" value={bioDraft.role} onChange={(v) => setBioDraft({ ...bioDraft, role: v })} placeholder="Business Development Manager" />
                  <BioInput label="City" value={bioDraft.city} onChange={(v) => setBioDraft({ ...bioDraft, city: v })} placeholder="Your city" />
                  <BioInput label="State" value={bioDraft.state} onChange={(v) => setBioDraft({ ...bioDraft, state: v })} placeholder="Your state" />
                  <BioInput label="HQ" value={bioDraft.hq} onChange={(v) => setBioDraft({ ...bioDraft, hq: v })} placeholder="Your HQ" />
                  <BioInput label="Phone" value={bioDraft.phone} onChange={(v) => setBioDraft({ ...bioDraft, phone: v })} placeholder="Phone" />
                  <div className="sm:col-span-2">
                    <BioInput label="Email" value={bioDraft.email} onChange={(v) => setBioDraft({ ...bioDraft, email: v })} placeholder="you@nutrova.com" />
                  </div>
                </div>
                <button onClick={saveBio} className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800 active:scale-[0.99] sm:w-auto sm:px-10">
                  Save My Bio
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
              <p className="mt-1 text-sm font-medium text-slate-500">{isAndroidPhone ? <>{doctors.length} doctors · {patches.length} patches · <span className="font-bold text-slate-600">Red = 30+ days</span></> : <>{doctors.length} doctors · {patches.length} area patches · <span className="font-bold text-slate-600">Red = 30+ days overdue only</span></>}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportDoctors} title={`Download ${filteredDoctors.length} doctors as CSV`} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-100">
                <Download className="h-4 w-4" /> Download <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] text-white">{filteredDoctors.length}</span>
              </button>
              <button onClick={() => setDoctorImportOpen(true)} title="Bulk upload doctors from CSV" className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-extrabold text-emerald-700 shadow-sm transition hover:bg-emerald-50">
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                title="Select multiple doctors to delete"
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-extrabold shadow-sm transition ${selectMode ? "border-rose-300 bg-rose-600 text-white hover:bg-rose-700" : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-700"}`}
              >
                {selectMode ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />} {selectMode ? "Cancel" : "Select"}
              </button>
              <button onClick={() => openDoctorModal(false, emptyDoctor())} className="flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2 text-sm font-extrabold text-amber-950 shadow-md shadow-amber-200 transition hover:bg-amber-300">
                <Plus className="h-4 w-4" /> Add Doctor
              </button>
            </div>
          </div>

          {/* patch filter bar */}
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Collapsed header: tap to expand the area filter chips.
                  "Manage patches" is the only action button here. */}
              <button
                onClick={() => setAreaOpen((v) => !v)}
                aria-expanded={areaOpen}
                className="flex items-center gap-1.5 rounded-full px-1 text-xs font-extrabold uppercase tracking-widest text-slate-500 transition hover:text-emerald-700"
              >
                <Layers className="h-4 w-4 text-emerald-600" /> Filter by area
                <ChevronDown className={`h-4 w-4 transition ${areaOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Always-visible summary of the active area filter */}
              {!areaOpen && (
                <span className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white">
                  {patchFilter === "all"
                    ? `All areas · ${doctors.length}`
                    : patchFilter === "none"
                      ? `No patch · ${doctors.filter((d) => !d.patchId).length}`
                      : `${patches.find((p) => p.id === patchFilter)?.name || "Area"} · ${doctors.filter((d) => d.patchId === patchFilter).length}`}
                </span>
              )}
              {!areaOpen && patchFilter !== "all" && (
                <button onClick={() => setPatchFilter("all")} className="rounded-full px-2 py-1.5 text-xs font-bold text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline">
                  Clear
                </button>
              )}

              <button onClick={() => { setPatchDraft({ id: "", name: "" }); setPatchModal(true); }} className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-50">
                <Plus className="h-3.5 w-3.5" /> Manage patches
              </button>

              {/* Expanded chips — empty areas hidden to keep it short */}
              {areaOpen && (
                <div className="mt-1 flex w-full flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                  <button onClick={() => setPatchFilter("all")} className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${patchFilter === "all" ? "bg-emerald-700 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700"}`}>
                    All · {doctors.length}
                  </button>
                  {patches.map((p) => {
                    const ps = patchStyles(p.color);
                    const count = doctors.filter((d) => d.patchId === p.id).length;
                    const active = patchFilter === p.id;
                    /* Hide empty areas, but never hide the one you're filtering by */
                    if (count === 0 && !active) return null;
                    return (
                      <button key={p.id} onClick={() => setPatchFilter(active ? "all" : p.id)} title={`Show only doctors in ${p.name}`} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${active ? "border-emerald-600 bg-emerald-700 text-white shadow" : `${ps.badge} hover:shadow`}`}>
                        {!active && <span className={`h-2 w-2 rounded-full ${ps.dot}`} />}
                        {p.name} · {count}
                      </button>
                    );
                  })}
                  {(() => {
                    const noPatch = doctors.filter((d) => !d.patchId).length;
                    const active = patchFilter === "none";
                    if (noPatch === 0 && !active) return null;
                    return (
                      <button onClick={() => setPatchFilter(active ? "all" : "none")} title="Doctors with no area assigned" className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${active ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-500 ring-slate-200 hover:text-slate-800"}`}>
                        No patch · {noPatch}
                      </button>
                    );
                  })()}
                </div>
              )}
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAndroidPhone ? "Search doctors…" : "Search doctor / area / specialty / product / appointment"} className="w-full bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400" />
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

          {/* Red action bar — only while selecting */}
          {selectMode && (
            <div className="sticky top-16 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-white shadow-lg shadow-rose-200">
              <span className="text-sm font-extrabold">{selectedIds.size} selected</span>
              <button
                onClick={() => setSelectedIds(new Set(filteredDoctors.map((d) => d.id)))}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/25"
              >
                Select all ({filteredDoctors.length})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/25"
              >
                Clear
              </button>
              <button
                onClick={() => deleteSelectedDoctors()}
                disabled={selectedIds.size === 0}
                className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow transition hover:bg-rose-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size || ""}
              </button>
            </div>
          )}

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
                const open = expandedIds.has(d.id);
                const picked = selectedIds.has(d.id);
                return (
                  <article
                    key={d.id}
                    onClick={() => (selectMode ? toggleSelected(d.id) : toggleExpanded(d.id))}
                    className={`group flex cursor-pointer flex-col rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-lg hover:shadow-emerald-100/50 ${picked ? "border-rose-400 ring-2 ring-rose-200" : "border-slate-200 hover:border-emerald-200"}`}
                  >
                    <div className="flex items-start gap-3">
                      {selectMode ? (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition ${picked ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>
                          <Check className="h-6 w-6" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 font-extrabold text-white">
                          {initials(d.name)}
                        </div>
                      )}
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
                      {!selectMode && (
                        <span className={`mt-1 shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 text-[13px] font-medium text-slate-600">
                      <p className="flex items-center gap-2 truncate"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.clinic || "—"}</p>
                      <p className="flex items-center gap-2 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.area}{d.city ? `, ${d.city}` : ""} <span className="text-slate-300">·</span> {d.frequency}</p>
                      <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {d.phone || "—"}</p>
                    </div>

                    {!open && !selectMode && (
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                        <ChevronDown className="h-3.5 w-3.5" /> Tap for full details
                      </p>
                    )}

                    {open && !selectMode && (
                    <div onClick={(e) => e.stopPropagation()} className="cursor-default">
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
                    </div>
                    )}

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
                        if (!d.nextVisit) {
                          return (
                            <span title="No next visit planned — edit the doctor to set a date" className="rounded-lg px-2.5 py-1.5 bg-slate-100 text-slate-500">
                              Next: Not planned
                            </span>
                          );
                        }
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

                    {!selectMode && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-4 flex cursor-default items-center gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => markVisitDone(d)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                        <Check className="h-3.5 w-3.5" /> Visit Done
                      </button>
                      <IconBtn title="Add reminder" onClick={() => setReminderModal({ open: true, draft: { ...emptyReminder(), doctorName: d.name, doctorArea: d.area }, editing: false })}><Bell className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Edit" onClick={() => openDoctorModal(true, { ...d, callDays: [...(d.callDays || [])], monthlyCalls: [...(d.monthlyCalls || [])], focusProducts: [...(d.focusProducts || [])], followProducts: [...(d.followProducts || [])], appointmentModes: [...(d.appointmentModes || [])] })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => deleteDoctor(d)}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                    )}
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
              <button onClick={() => { goTo("settings"); setSettingsView("alarms"); }} title="Open alarm settings" className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-800 shadow-sm transition hover:bg-amber-100">
                <BellRing className="h-4 w-4" /> Alarms
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                      {isToday(r.date) && !r.done && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">Today</span>}
                      {critical && <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">Overdue · {od}d</span>}
                      {overdue && !critical && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 ring-1 ring-amber-200">Overdue · {od}d</span>}
                      {r.done && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">Done</span>}
                      {r.alarm !== false && !r.done && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 ring-1 ring-amber-200"><AlarmClock className="h-3 w-3" />Alarm</span>}
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
                    {!r.done && (
                      <div className="flex gap-1.5">
                        <button onClick={() => { dismissedRef.current.add(r.id); setReminders((p) => p.map((x) => (x.id === r.id ? { ...x, done: true } : x))); showToast("Reminder completed"); }} title="Mark completed" className="flex h-9 items-center gap-1 rounded-xl bg-emerald-700 px-3 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                          <Check className="h-3.5 w-3.5" /> Done
                        </button>
                        <button onClick={() => { setReminderModal({ open: true, draft: { ...r }, editing: true }); }} title="Postpone to another date" className="flex h-9 items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold text-amber-800 transition hover:bg-amber-100">
                          <CalendarClock className="h-3.5 w-3.5" /> Postpone
                        </button>
                      </div>
                    )}
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
              <p className="mt-1 text-sm font-medium text-slate-500">{isAndroidPhone ? <>Purchase orders · <span className="font-bold text-slate-600">Red = 30+ days</span></> : <>Purchase orders of Nutrova products · <span className="font-bold text-slate-600">Red = pending 30+ days only</span> · below 30 days shows normal colour</>}</p>
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
                <Plus className="h-4 w-4" /> New Purchase Order
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
                <input value={paySearch} onChange={(e) => setPaySearch(e.target.value)} placeholder={isAndroidPhone ? "Search orders…" : "Search PO no / doctor / area / product / amount"} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
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

          {/* purchase orders — column / row table */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-white">
                    <th className="w-10 border-r border-slate-700 px-3 py-3 text-center">#</th>
                    <th className="border-r border-slate-700 px-3 py-3">PO / Invoice no</th>
                    <th className="border-r border-slate-700 px-3 py-3">Order date</th>
                    <th className="border-r border-slate-700 px-3 py-3">Doctor</th>
                    <th className="border-r border-slate-700 px-3 py-3">Billing name</th>
                    <th className="border-r border-slate-700 px-3 py-3">Products ordered</th>
                    <th className="border-r border-slate-700 px-3 py-3 text-right">Qty</th>
                    <th className="border-r border-slate-700 px-3 py-3 text-right">Amount</th>
                    <th className="border-r border-slate-700 px-3 py-3">Due date</th>
                    <th className="border-r border-slate-700 px-3 py-3">Pending days</th>
                    <th className="border-r border-slate-700 px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-10 text-center">
                        <Wallet className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-extrabold text-slate-700">No purchase orders here</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Tap “New Purchase Order” to add the products a doctor ordered.</p>
                      </td>
                    </tr>
                  )}
                  {filteredPayments.map((p, idx) => {
                    const od = daysOverdue(p.dueDate);
                    const critical = p.status !== "paid" && od > 30;
                    const pastSmall = p.status !== "paid" && od > 0 && od <= 30;
                    const st = p.status === "paid" ? "paid" : critical ? "overdue" : "pending";
                    const pend = pendingDaysInfo(p);
                    const cell = "border-r border-slate-200 px-3 py-3";
                    return (
                      <tr key={p.id} className={`border-t border-slate-200 align-top ${critical ? "bg-rose-50/70" : idx % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                        <td className={`${cell} text-center text-xs font-extrabold text-slate-400`}>{idx + 1}</td>
                        <td className={cell}>
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 font-mono text-xs font-extrabold ${critical ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                            <FileText className={`h-3.5 w-3.5 ${critical ? "text-rose-500" : "text-slate-400"}`} />{p.invoiceNo || "—"}
                          </span>
                          {p.mode && <p className="mt-1 text-[11px] font-semibold text-slate-400">{p.mode}</p>}
                        </td>
                        <td className={`${cell} whitespace-nowrap text-xs font-bold text-slate-600`}>{p.orderDate ? fmtDate(p.orderDate) : "—"}</td>
                        <td className={cell}>
                          <p className="font-extrabold text-slate-900">{p.doctorName}</p>
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><MapPin className="h-3 w-3" />{p.doctorArea || "—"}</p>
                        </td>
                        <td className={`${cell} text-xs font-bold text-slate-700`}>{p.billingName || <span className="font-semibold italic text-slate-400">—</span>}</td>
                        <td className={`${cell} min-w-[250px]`}>
                          {p.items.length > 0 ? (
                            <ul className="space-y-1">
                              {p.items.map((it, i) => (
                                <li key={i} className="flex items-start justify-between gap-3 text-xs font-semibold text-slate-700">
                                  <span className="min-w-0">{shortProduct(it.product)}</span>
                                  <span className="shrink-0 font-extrabold text-emerald-800">× {it.qty}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs font-semibold italic text-slate-400">{p.purpose || "No products listed"}</p>
                          )}
                          {p.items.length > 0 && p.purpose && <p className="mt-1.5 text-[11px] font-medium text-slate-400">{p.purpose}</p>}
                        </td>
                        <td className={`${cell} text-right font-extrabold text-slate-800`}>{p.items.length > 0 ? orderQty(p.items) : "—"}</td>
                        <td className={`${cell} whitespace-nowrap text-right text-base font-extrabold ${critical ? "text-rose-700" : "text-slate-900"}`}>{inr(p.amount)}</td>
                        <td className={`${cell} whitespace-nowrap text-xs font-bold ${critical ? "text-rose-700" : "text-slate-600"}`}>
                          {fmtDate(p.dueDate)}
                          {p.status === "paid" && p.paidDate && <span className="block text-[11px] font-semibold text-emerald-600">Paid {fmtShort(p.paidDate)}</span>}
                        </td>
                        <td className={cell}>
                          <span title={critical ? `${od} days pending — over 30 days, red` : pastSmall ? `${od} days pending — under 30 days, normal colour` : pend.text} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${pendingBadgeCls(pend.tone)}`}>
                            <Clock className="h-3 w-3" />{pend.text}
                          </span>
                        </td>
                        <td className={cell}>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${st === "paid" ? "bg-emerald-100 text-emerald-800" : st === "overdue" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800"}`}>
                            {st}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status !== "paid" && (
                              <button onClick={() => markPaid(p)} className="flex items-center gap-1 whitespace-nowrap rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                                <Check className="h-3.5 w-3.5" /> Paid
                              </button>
                            )}
                            <IconBtn title="Edit purchase order" onClick={() => setPaymentModal({ open: true, draft: { ...p, items: p.items.map((i) => ({ ...i })) }, editing: true })}><Pencil className="h-4 w-4" /></IconBtn>
                            <IconBtn title="Delete purchase order" danger onClick={() => deleteInvoice(p)}><Trash2 className="h-4 w-4" /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredPayments.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 text-sm font-extrabold text-slate-800">
                      <td colSpan={6} className="border-r border-slate-200 px-3 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Total · {filteredPayments.length} purchase order{filteredPayments.length !== 1 ? "s" : ""}</td>
                      <td className="border-r border-slate-200 px-3 py-3 text-right">{filteredPayments.reduce((s, p) => s + orderQty(p.items), 0)}</td>
                      <td className="border-r border-slate-200 px-3 py-3 text-right text-base">{inr(filteredPayments.reduce((s, p) => s + p.amount, 0))}</td>
                      <td colSpan={4} className="px-3 py-3 text-xs font-bold text-slate-500">{inr(filteredPayments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0))} still pending</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </section>
        )}

        {/* -------------------------------- users (owner only) ------------------------------- */}
        {activeTab === "users" && (
        <section id="users" key="tab-users" className="anim-fade-up">
          {!isOwner ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <Lock className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-extrabold text-slate-700">Users is available to the project owner only</p>
              <p className="mt-1 text-sm text-slate-500">Please sign in as {APP_OWNER.email} to view team accounts.</p>
            </div>
          ) : (
          <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Users</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {teamLoading ? "Loading accounts…" : `${teamRoster.length} account${teamRoster.length === 1 ? "" : "s"} created`} · select a user to see their full workspace
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setSelectedUserId(""); setSelectedWorkspace(null); setSelectedError(""); void loadTeamRoster(); }} title="Reload users" className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
                <RefreshCcw className={`h-4 w-4 ${teamLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>

          {!online ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
              <p className="text-sm font-extrabold text-amber-900">Online store not connected</p>
              <p className="mt-1 text-sm font-medium text-amber-800">Connect the online store to list team accounts and open their workspaces. Local accounts on this device: {users.length}.</p>
              {users.length > 0 && (
                <div className="mt-3 space-y-2">
                  {users.map((u) => (
                    <div key={u.email} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-amber-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xs font-extrabold text-white">{initials(u.name || "?")}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">{u.name || "—"}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{u.email}{u.hq ? ` · ${u.hq} HQ` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedUserId && (selectedLoading || selectedWorkspace) ? (
            selectedLoading && !selectedWorkspace ? (
              <div className="mt-5 space-y-2.5">
                <div className="h-11 w-28 animate-pulse rounded-full bg-slate-100" />
                <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              </div>
            ) : selectedWorkspace ? (
            /* ---------- selected user's full workspace (read-only) ---------- */
            (() => {
              const m = teamRoster.find((x) => x.userId === selectedUserId);
              const ws = selectedWorkspace;
              const openRems = ws.reminders.filter((r) => !r.done).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
              const pend = ws.payments.filter((p) => p.status !== "paid");
              const pendTotal = pend.reduce((s, p) => s + (Number(p.amount) || 0), 0);
              const patchName = (id: string) => ws.patches.find((p) => p.id === id)?.name || "";
              return (
                <div className="mt-5 space-y-4">
                  <button onClick={() => { setSelectedUserId(""); setSelectedWorkspace(null); setSelectedError(""); }} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
                    ← All users
                  </button>
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-5 py-5 text-white sm:px-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-extrabold ring-1 ring-white/25">
                          {initials(ws.bio.name || m?.name || "?")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-extrabold leading-tight">{ws.bio.name || m?.name || "—"}</p>
                          <p className="truncate text-sm text-emerald-100/80">{ws.bio.role || "—"}{ws.bio.hq ? ` · ${ws.bio.hq} HQ` : ""}</p>
                          <p className="truncate text-xs text-emerald-100/60">{ws.bio.email || m?.email || ""}{ws.bio.phone ? ` · ${ws.bio.phone}` : ""}{ws.bio.city ? ` · ${ws.bio.city}${ws.bio.state ? `, ${ws.bio.state}` : ""}` : ""}</p>
                        </div>
                        <span className="hidden shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold ring-1 ring-white/20 sm:inline">Read-only view</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:px-5">
                      {[
                        { label: "Doctors", value: ws.doctors.length },
                        { label: "Areas", value: ws.patches.length },
                        { label: "Open reminders", value: openRems.length },
                        { label: "Pending", value: `${pend.length} · ${inr(pendTotal)}` },
                      ].map((s) => (
                        <div key={s.label} className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center ring-1 ring-slate-200">
                          <p className="truncate text-base font-extrabold text-slate-900">{s.value}</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedError && (
                    <p className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{selectedError}</p>
                  )}

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <p className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 sm:px-6">Doctor list · {ws.doctors.length}</p>
                    {ws.doctors.length === 0 ? (
                      <p className="p-5 text-sm font-semibold text-slate-400">No doctors yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="bg-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-white">
                              <th className="w-10 border-r border-slate-700 px-3 py-2.5 text-center">#</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Doctor</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Specialty</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Area / Patch</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Phone</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Call days</th>
                              <th className="px-3 py-2.5">Next visit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ws.doctors.map((d, idx) => (
                              <tr key={d.id} className={`border-t border-slate-200 align-top ${idx % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                                <td className="border-r border-slate-200 px-3 py-2.5 text-center text-xs font-extrabold text-slate-400">{idx + 1}</td>
                                <td className="border-r border-slate-200 px-3 py-2.5 font-extrabold text-slate-900">{d.name}</td>
                                <td className="border-r border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">{d.specialty || "—"}</td>
                                <td className="border-r border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">{d.area || patchName(d.patchId) || "—"}</td>
                                <td className="border-r border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">{d.phone || "—"}</td>
                                <td className="border-r border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">{describeWeekly(d.callDays || [])}</td>
                                <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{d.nextVisit ? fmtShort(d.nextVisit) : "Not planned"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <p className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 sm:px-6">Payment invoices · {ws.payments.length}</p>
                    {ws.payments.length === 0 ? (
                      <p className="p-5 text-sm font-semibold text-slate-400">No purchase orders yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="bg-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-white">
                              <th className="w-10 border-r border-slate-700 px-3 py-2.5 text-center">#</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Invoice</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Doctor</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Products</th>
                              <th className="border-r border-slate-700 px-3 py-2.5 text-right">Amount</th>
                              <th className="border-r border-slate-700 px-3 py-2.5">Due</th>
                              <th className="px-3 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ws.payments.map((p, idx) => {
                              const st = p.status === "paid" ? "paid" : isCriticalOverdue(p.dueDate) ? "overdue" : "pending";
                              return (
                                <tr key={p.id} className={`border-t border-slate-200 align-top ${idx % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                                  <td className="border-r border-slate-200 px-3 py-2.5 text-center text-xs font-extrabold text-slate-400">{idx + 1}</td>
                                  <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-xs font-extrabold text-slate-700">{p.invoiceNo || "—"}</td>
                                  <td className="border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800">{p.doctorName || "—"}</td>
                                  <td className="min-w-[220px] border-r border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">
                                    {p.items.length > 0 ? p.items.slice(0, 3).map((it) => `${shortProduct(it.product)} ×${it.qty}`).join(" · ") + (p.items.length > 3 ? ` +${p.items.length - 3} more` : "") : (p.purpose || "—")}
                                  </td>
                                  <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-extrabold text-slate-900">{inr(p.amount)}</td>
                                  <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">{fmtDate(p.dueDate)}</td>
                                  <td className="px-3 py-2.5">
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${st === "paid" ? "bg-emerald-100 text-emerald-800" : st === "overdue" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800"}`}>{st}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <p className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 sm:px-6">Open reminders · {openRems.length}</p>
                    {openRems.length === 0 ? (
                      <p className="p-5 text-sm font-semibold text-slate-400">No open reminders.</p>
                    ) : (
                      <div className="space-y-2 p-4 sm:px-5">
                        {openRems.slice(0, 8).map((r) => (
                          <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-100">
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                            <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{r.title}</p>
                            <span className="shrink-0 text-xs font-semibold text-slate-500">{fmtShort(r.date)} · {r.time || "—"}</span>
                          </div>
                        ))}
                        {openRems.length > 8 && <p className="text-xs font-bold text-slate-400">Showing 8 of {openRems.length} open reminders.</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
            ) : null
          ) : (
            <>
              <div className="mt-4 flex flex-1 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Search className="h-5 w-5 shrink-0 text-emerald-600" />
                <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Search name / email / HQ / phone" className="w-full bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400" />
                {teamSearch && <button onClick={() => setTeamSearch("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
              </div>
              {teamLoading && (
                <div className="mt-5 space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="h-11 w-11 rounded-2xl bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {teamError && !teamLoading && (
                <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-extrabold text-rose-700">{teamError}</p>
                  <p className="mt-1 text-xs font-medium text-rose-600">If this is the first run, open Settings → Database setup and run the SQL again to add the owner read policy.</p>
                  <button onClick={() => void loadTeamRoster()} className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-700">Retry</button>
                </div>
              )}
              {!teamLoading && !teamError && teamRoster.length === 0 && (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-extrabold text-slate-700">No accounts found yet</p>
                  <p className="mt-1 text-sm text-slate-500">New accounts appear here after they sign up and open the app once.</p>
                </div>
              )}
              {!teamLoading && !teamError && teamRoster.length > 0 && (() => {
                const q = teamSearch.trim().toLowerCase();
                const list = q
                  ? teamRoster.filter((m) => [m.name, m.email, m.hq, m.phone, m.role, m.city].join(" ").toLowerCase().includes(q))
                  : teamRoster;
                if (list.length === 0) {
                  return (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                      <Search className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 font-extrabold text-slate-700">No users match “{teamSearch.trim()}”</p>
                    </div>
                  );
                }
                return (
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((m) => (
                      <button key={m.userId} onClick={() => void openTeamMember(m.userId)} className="group flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-lg">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-extrabold text-white">{initials(m.name || m.email || "?")}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-extrabold text-slate-900">{m.name || "—"}{m.email.toLowerCase() === APP_OWNER.email.toLowerCase() && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-amber-800">Owner</span>}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{m.email || "—"}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{m.role || "—"}{m.hq ? ` · ${m.hq} HQ` : ""}{m.phone ? ` · ${m.phone}` : ""}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
          </>
          )}
        </section>
        )}

        {/* -------------------------------- settings ------------------------------- */}
        {activeTab === "settings" && (
        <section id="settings" key="tab-settings" className="anim-fade-up">
          {settingsView === "menu" ? (
          <>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{isOwner ? "Account, password, online store and app" : "Account, password and app"}</p>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* ---------- Settings menu buttons ---------- */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
                <SettingsIcon className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Manage</p>
              </div>
              <div className="space-y-2 p-5 sm:p-6">
                <button onClick={() => setSettingsView("account")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><User className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-900">Account</span>
                    <span className="block truncate text-xs font-medium text-slate-500">{bio.name || currentEmail || "Your profile & sign out"}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
                <button onClick={() => setSettingsView("password")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Lock className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900">Change password</span>
                    <span className="block text-xs font-medium text-slate-500">Update your sign-in password</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
                <button onClick={() => setSettingsView("alarms")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><BellRing className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900">Alarms & Sounds</span>
                    <span className="block truncate text-xs font-medium text-slate-500">Reminder alerts · {ALARM_SOUNDS.find((s) => s.id === alarmSound)?.label || "Sound"} · Morning {morningCfg.enabled ? morningCfg.time : "off"}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
                {isOwner && (
                <button onClick={() => setSettingsView("online")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-sky-300 hover:bg-sky-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Cloud className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900">
                      Online store
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">Owner</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${syncState === "error" ? "bg-rose-100 text-rose-700" : syncState === "loading" || syncBusy ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
                        {syncState === "error" ? "Problem" : syncState === "loading" || syncBusy ? "Syncing…" : "Connected"}
                      </span>
                    </span>
                    <span className="block text-xs font-medium text-slate-500">Sync status, connection & database setup</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
                )}
                <button onClick={() => setShareOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Share2 className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900">Share app</span>
                    <span className="block text-xs font-medium text-slate-500">Send the app link or QR code</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
              </div>
            </div>

            {/* ---------- App ---------- */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
                <Smartphone className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">App</p>
              </div>
              <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-extrabold text-slate-900">Install on your phone</p>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    Android: open in Chrome → ⋮ menu → <span className="font-bold text-slate-700">Add to Home screen</span>.
                    iPhone: Safari → Share → <span className="font-bold text-slate-700">Add to Home Screen</span>.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">About</p>
                  <p className="text-xs font-medium text-slate-500">Nutrova Doctor Tracker</p>
                  <p className="text-xs font-medium text-slate-500">App created by <span className="font-extrabold uppercase text-emerald-800">{APP_OWNER.name}</span></p>
                  <p className="text-xs font-medium text-slate-500">{APP_OWNER.role} at {APP_OWNER.hq} HQ</p>
                </div>
              </div>
            </div>
          </div>
          </>
          ) : settingsView === "password" ? (
          <>
          <button onClick={() => setSettingsView("menu")} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            ← Back to Settings
          </button>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Change password</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Signed in as {currentEmail || bio.email || "—"}</p>

          <div className="mt-5 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
              <Lock className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">New password</p>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" autoComplete="new-password" className="w-full bg-transparent py-1 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} title={showNewPw ? "Hide password" : "Show password"} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-700">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input type={showNewPw ? "text" : "password"} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} placeholder="Confirm new password" autoComplete="new-password" className={inputCls} />
              </div>
              {pwMsg && <p className={`rounded-xl px-3 py-2 text-xs font-bold ring-1 ${pwMsg.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>{pwMsg.text}</p>}
              <button onClick={handleChangePassword} disabled={pwBusy} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-800 disabled:opacity-60">
                {pwBusy ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
          </>
          ) : settingsView === "account" ? (
          <>
          <button onClick={() => setSettingsView("menu")} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            ← Back to Settings
          </button>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Account</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Your profile and sign out</p>

          <div className="mt-5 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-extrabold text-white">{initials(bio.name || "User")}</div>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-slate-900">{bio.name || "—"}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{bio.role || "Business Development Manager"}{bio.hq ? ` · ${bio.hq} HQ` : ""}</p>
                  <p className="truncate text-xs font-medium text-slate-400">{currentEmail || bio.email || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => goTo("bio")} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50">
                  <Pencil className="h-3.5 w-3.5" /> Edit profile
                </button>
                <button onClick={handleSignOut} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-extrabold text-rose-600 transition hover:bg-rose-100">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-800">
                  <Lock className="h-3.5 w-3.5" /> Private workspace
                </p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-sky-900/75">
                  Doctors, area patches, reminders, purchase orders and HQ are saved only to {currentEmail || "this account"}. New accounts get their own empty doctor list. Set or update your HQ in Bio.
                </p>
              </div>
            </div>
          </div>
          </>
          ) : settingsView === "alarms" ? (
          <>
          <button onClick={() => setSettingsView("menu")} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            ← Back to Settings
          </button>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Alarms & Sounds</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Reminder alerts, alarm sound and morning alarm</p>

          <div className="mt-5 max-w-2xl space-y-4">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
                <BellRing className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Reminder alerts</p>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={alertsOn ? testAlarmSound : enableAlerts} title={alertsOn ? "Play test sound" : "Turn on sound + phone notifications for reminders"} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-sm transition ${alertsOn ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-amber-400 text-amber-950 shadow-md shadow-amber-200 hover:bg-amber-300"}`}>
                    {alertsOn ? <Volume2 className="h-4 w-4" /> : <BellRing className="h-4 w-4" />} {alertsOn ? "Test sound" : "Enable alerts"}
                  </button>
                  <button onClick={toggleMuted} title={muted ? "Unmute all alarm sounds" : "Mute all alarm sounds"} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-sm transition ${muted ? "bg-slate-900 text-white hover:bg-slate-700" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {muted ? "Muted" : "Mute"}
                  </button>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  {alertsOn ? "Alerts are on — reminders ring with sound when due." : "Turn alerts on once to allow sound and phone notifications."} Mute silences every alarm sound until you unmute.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
                <Volume2 className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Alarm sound</p>
              </div>
              <div className="space-y-2 p-5 sm:p-6">
                {ALARM_SOUNDS.map((s) => {
                  const selected = alarmSound === s.id;
                  return (
                    <button key={s.id} onClick={() => { changeAlarmSound(s.id); playAlarmSound(1, s.id, true); }} title={`Use ${s.label}`} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : <Volume2 className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-slate-900">{s.label}</span>
                        <span className="block text-xs font-medium text-slate-500">{s.hint}</span>
                      </span>
                    </button>
                  );
                })}
                <p className="text-xs font-medium text-slate-500">Tap a sound to select it — it plays once so you can hear it.</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-4 sm:px-6">
                <AlarmClock className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-800">Morning alarm · before 8 AM</p>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  Rings once daily with today's calls, reminders & pending payments. Works in the app, and in the background once the app is installed with notifications allowed{swReady ? "" : " (installing background support…)"}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMorningCfg({ ...morningCfg, enabled: !morningCfg.enabled })}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition ${morningCfg.enabled ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    <BellRing className="h-3.5 w-3.5" /> {morningCfg.enabled ? "On" : "Off"}
                  </button>
                  <input
                    type="time"
                    value={morningCfg.time}
                    onChange={(e) => setMorningCfg({ ...morningCfg, time: e.target.value || "07:45" })}
                    title="Morning alarm time"
                    className="rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
          </>
          ) : isOwner ? (
          <>
          <button onClick={() => setSettingsView("menu")} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            ← Back to Settings
          </button>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Online store</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Owner only · connection, sync and database setup</p>

          <div className="mt-5 max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-600"><Cloud className="h-4 w-4 text-sky-600" /> Online store</p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${syncState === "error" ? "bg-rose-100 text-rose-700" : syncState === "loading" || syncBusy ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
                {syncState === "error" ? "Problem" : syncState === "loading" || syncBusy ? "Syncing…" : "Connected"}
              </span>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
                  {lastSync ? `Last synced at ${new Date(lastSync).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Not synced yet in this session"}
                </p>
                <button onClick={syncNow} disabled={syncBusy || syncState === "loading"} className="flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-sky-700 disabled:opacity-60">
                  <RefreshCcw className={`h-3.5 w-3.5 ${syncBusy ? "animate-spin" : ""}`} /> {syncBusy ? "Syncing…" : "Sync now"}
                </button>
              </div>
              {syncState === "error" && syncError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">{syncError}</p>
              )}

              {/* connection details — read-only, can't be edited */}
              <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Project URL</p>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-slate-700">{cfg?.url || "—"}</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Publishable key</p>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-slate-700">{cfg ? maskKey(cfg.key) : "—"}</span>
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-relaxed text-slate-500">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" /> Locked — built into the app{(typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ? " via Vercel env vars (NEXT_PUBLIC_SUPABASE_URL + KEY)" : ""}. To move projects, set those Vercel env vars and redeploy — no code change needed.
                </p>
              </div>

              {/* what's saved online */}
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Saved in your account</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Doctors", value: doctors.length },
                    { label: "Reminders", value: reminders.length },
                    { label: "Orders", value: payments.length },
                    { label: "Areas", value: patches.length },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-sky-50 px-3 py-2 text-center ring-1 ring-sky-100">
                      <p className="text-lg font-extrabold text-sky-900">{s.value}</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* one-time database setup (read-only SQL to run in Supabase) — owner only */}
              <details className="group rounded-2xl border border-slate-200 bg-white" open={/nutrova_store|SQL setup/i.test(syncError)}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-extrabold text-slate-700 [&::-webkit-details-marker]:hidden">
                  <Database className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">Database setup (one time, in Supabase)</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                    Only needed once: Supabase → SQL Editor → paste and run. Also turn off “Confirm email” (Authentication → Providers → Email) so new accounts can sign in right away.
                  </p>
                  <button onClick={copySetupSql} className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-slate-700">
                    {sqlCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {sqlCopied ? "Copied" : "Copy SQL"}
                  </button>
                  <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-[10.5px] leading-relaxed text-emerald-200">{SETUP_SQL}</pre>
                </div>
              </details>
            </div>
          </div>
          </>
          ) : (
          <>
          <button onClick={() => setSettingsView("menu")} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            ← Back to Settings
          </button>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-extrabold text-slate-700">Online store is available to the project owner only</p>
            <p className="mt-1 text-sm text-slate-500">Your data still syncs automatically in the background.</p>
          </div>
          </>
          )}
        </section>
        )}
      </main>

      {/* --------------------------------- footer --------------------------------- */}
      <footer className="mt-12 bg-emerald-950 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 sm:px-8 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-base font-extrabold"><Stethoscope className="h-5 w-5 text-emerald-300" /> Nutrova Doctor Tracker</p>
            <p className="mt-1.5 text-sm text-emerald-100/70">App created by {APP_OWNER.name} · {APP_OWNER.role} · {APP_OWNER.hq} HQ</p>
          </div>
          <div className="text-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/70">Territory summary</p>
            <p className="mt-1.5 font-medium text-emerald-50">{doctors.length} doctors · {patches.length} patches · {callsTodayList.length} calls today · {inr(pendingTotal)} pending</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/70">Contact</p>
            <p className="mt-1.5 font-medium text-emerald-50"><a className="underline underline-offset-2 hover:text-emerald-200" href={`mailto:${APP_OWNER.email}`}>{APP_OWNER.email}</a></p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs font-medium text-emerald-100/50">
          Crafted for Nutrova · {APP_OWNER.hq} HQ · Online account data
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
            <p className="mt-1 text-xs font-medium text-slate-500">Select one or more ways the Business Development Manager should book the visit</p>
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
            <Field label="Next visit (optional)">
              <div className="flex gap-2">
                <input type="date" value={doctorModal.draft.nextVisit} onChange={(e) => setDraft({ nextVisit: e.target.value })} className={inputCls} />
                {doctorModal.draft.nextVisit && (
                  <button type="button" onClick={() => setDraft({ nextVisit: "" })} title="Clear — mark as not planned" className="flex h-[42px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-400">Leave empty if not planned yet — pick a date only when needed.</p>
            </Field>
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

      {/* --------------------------- doctor bulk-upload --------------------------- */}
      {doctorImportOpen && (
        <DoctorImportDialog onClose={() => setDoctorImportOpen(false)} onImport={importDoctorsBulk} />
      )}

      {/* ------------------------------- patch modal ------------------------------ */}
      {patchModal && (
        <Modal title="Manage Area Patches" wide onClose={() => setPatchModal(false)}>
          <p className="text-sm font-medium text-slate-500">Patches are <span className="font-extrabold text-slate-800">area names only</span> — e.g. Koramangala, HSR Layout. Doctors get binned under their area automatically.</p>

          {/* create / edit form */}
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">{patchDraft.id ? "Edit area patch" : "Create new area patch"}</p>
            <div className="mt-3">
              <Field label="Area name *"><input value={patchDraft.name} onChange={(e) => setPatchDraft({ ...patchDraft, name: e.target.value })} placeholder="e.g. Koramangala" className={inputCls} /></Field>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={savePatch} className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-800">
                {patchDraft.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {patchDraft.id ? "Update area" : "Create area"}
              </button>
              {patchDraft.id && (
                <button onClick={() => setPatchDraft({ id: "", name: "" })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel edit</button>
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
        <Modal title={reminderModal.editing ? "Edit / Postpone Reminder" : "Add Reminder"} onClose={() => setReminderModal({ open: false, draft: emptyReminder(), editing: false })}>
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
            <Field label="Alarm with sound" span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModal({ ...reminderModal, draft: { ...reminderModal.draft, alarm: reminderModal.draft.alarm === false } })}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition ${reminderModal.draft.alarm === false ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-amber-400 text-amber-950 shadow hover:bg-amber-300"}`}
                >
                  <AlarmClock className="h-4 w-4" />
                  {reminderModal.draft.alarm === false ? "Alarm off" : "Alarm on — rings with sound"}
                </button>
                <button type="button" onClick={testAlarmSound} title="Play test sound" className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700">
                  <Volume2 className="h-4 w-4" /> Test sound
                </button>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-slate-400">When the date & time arrive, this reminder rings in the app with sound + a phone notification.</p>
            </Field>
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
              <button onClick={saveReminder} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">{reminderModal.editing ? "Save new date" : "Add Reminder"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------ payment modal ------------------------------ */}
      {paymentModal.open && (
        <Modal title={paymentModal.editing ? "Edit Purchase Order" : "New Purchase Order"} wide onClose={() => setPaymentModal({ open: false, draft: emptyPayment(), editing: false })}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Doctor — search by name or area *" span>
              <DoctorPicker
                value={paymentModal.draft.doctorName}
                doctors={doctors}
                onPick={(name, area) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, doctorName: name, doctorArea: area || paymentModal.draft.doctorArea } })}
                placeholder="Type doctor name or area"
              />
            </Field>
            <Field label="Billing name *"><input value={paymentModal.draft.billingName} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, billingName: e.target.value } })} placeholder="e.g. DermaCare Clinic" className={inputCls} /></Field>
            <Field label="Invoice no *">
              <div className="flex gap-2">
                <input value={paymentModal.draft.invoiceNo} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, invoiceNo: e.target.value } })} placeholder="INV-2026-1001" className={`${inputCls} font-mono`} />
                <button type="button" title="Generate new invoice no" onClick={() => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, invoiceNo: genInvoiceNo() } })} className="flex h-[42px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-700">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            </Field>
            <Field label="Order date"><input type="date" value={paymentModal.draft.orderDate} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, orderDate: e.target.value } })} className={inputCls} /></Field>
            <Field label="Order note (optional)"><input value={paymentModal.draft.purpose} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, purpose: e.target.value } })} placeholder="e.g. Monthly clinic stock order" className={inputCls} /></Field>

            {/* products ordered */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3 sm:col-span-2">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-teal-900"><Package className="h-3.5 w-3.5" /> Products ordered</p>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-teal-800 ring-1 ring-teal-200">{orderQty(paymentModal.draft.items)} units · {inr(orderTotal(paymentModal.draft.items))}</span>
              </div>
              <div className="space-y-2">
                {paymentModal.draft.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200">
                    <select value={it.product} onChange={(e) => pickPayProduct(i, e.target.value)} className={`${inputCls} col-span-12 sm:col-span-6`}>
                      <option value="">Select Nutrova product…</option>
                      {PRODUCT_CATS.map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {NUTROVA_PRODUCTS.filter((p) => p.category === cat).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <input type="number" min={1} value={it.qty || ""} onChange={(e) => updatePayItem(i, { qty: Number(e.target.value) })} placeholder="Qty" className={`${inputCls} col-span-4 sm:col-span-2`} />
                    <input type="number" min={0} value={it.rate || ""} onChange={(e) => updatePayItem(i, { rate: Number(e.target.value) })} placeholder="Rate ₹" className={`${inputCls} col-span-5 sm:col-span-2`} />
                    <p className="col-span-2 text-right text-xs font-extrabold text-slate-700 sm:col-span-1">{inr((Number(it.qty) || 0) * (Number(it.rate) || 0))}</p>
                    <button type="button" onClick={() => removePayItem(i)} title="Remove product" className="col-span-1 flex h-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addPayItem} className="mt-2.5 flex items-center gap-1.5 rounded-full border border-teal-300 bg-white px-4 py-1.5 text-xs font-extrabold text-teal-800 transition hover:bg-teal-50">
                <Plus className="h-3.5 w-3.5" /> Add product
              </button>
              <p className="mt-2 text-[11px] font-medium text-slate-500">Rates start from nutrova.com listings — change the rate on any line. Total updates automatically.</p>
            </div>

            <Field label="Order total (₹) *"><input type="number" min={0} value={paymentModal.draft.amount || ""} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, amount: Number(e.target.value) } })} placeholder="10000" className={inputCls} /></Field>
            <Field label="Mode (optional)"><select value={paymentModal.draft.mode} onChange={(e) => setPaymentModal({ ...paymentModal, draft: { ...paymentModal.draft, mode: e.target.value } })} className={inputCls}><option value="">— Select —</option>{["UPI", "Bank Transfer", "Cheque", "Cash"].map((m) => <option key={m}>{m}</option>)}</select></Field>
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
                <Trash2 className="h-4 w-4" /> Delete purchase order
              </button>
            )}
            <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setPaymentModal({ open: false, draft: emptyPayment(), editing: false })} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={savePayment} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">{paymentModal.editing ? "Update Order" : "Save Purchase Order"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------- Reminder alarm: ringing overlay ----------
          Stays until Done / Snooze / Dismiss / X. Backdrop click does nothing
          on purpose (prevents accidental hide). X = hide + stop sound. */}
      {ringing.length > 0 && (
        <div role="alertdialog" aria-label="Reminder alarm" className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-amber-300">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-5 text-amber-950">
              <div className="flex items-center gap-3">
                <div className="anim-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow">
                  <BellRing className="h-6 w-6 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">Reminder alarm!</p>
                  <p className="text-xs font-bold opacity-80">{ringing.length} task{ringing.length > 1 ? "s" : ""} due now · stays until you act</p>
                </div>
                <button onClick={() => playAlarmSound(2, alarmSound, true)} title="Replay sound" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-amber-700 shadow transition hover:bg-white">
                  <RefreshCcw className="h-5 w-5" />
                </button>
                <button onClick={toggleMuted} title={muted ? "Unmute alarm sound" : "Mute alarm sound"} aria-label={muted ? "Unmute alarm sound" : "Mute alarm sound"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow transition ${muted ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-white/90 text-amber-700 hover:bg-white"}`}>
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <button onClick={skipAllRinging} title="Close + stop sound" aria-label="Close alarm and stop sound" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-950/10 text-amber-950 transition hover:bg-amber-950/20">
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto p-5">
              {ringing.map((r) => (
                <div key={r.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500"><Clock className="h-3 w-3" />{fmtDate(r.date)} · {r.time}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-extrabold text-slate-900">{r.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-slate-500">
                    <User className="h-3.5 w-3.5" /> {r.doctorName || "General"}{r.doctorArea ? ` · ${r.doctorArea}` : ""}
                  </p>
                  {r.notes && <p className="mt-1 text-[13px] font-medium text-slate-500">{r.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => completeRinging(r)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                      <Check className="h-3.5 w-3.5" /> Done
                    </button>
                    <button onClick={() => snoozeReminder(r.id, 10)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">
                      <Clock className="h-3.5 w-3.5" /> Snooze 10m
                    </button>
                    <button onClick={() => dismissRinging(r.id)} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <button onClick={() => { skipAllRinging(); goTo("reminders"); }} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-700">
                Open Reminders
              </button>
            </div>
          </div>
        </div>
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

      {shareOpen && (
        <ShareAppDialog
          url={appShareUrl}
          text={appShareText}
          copied={shareCopied}
          online={online}
          onClose={() => setShareOpen(false)}
          onNative={handleNativeShare}
          onCopy={handleCopyLink}
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

/* Share app — link + QR + install steps */
function ShareAppDialog({ url, text, copied, online, onClose, onNative, onCopy }: {
  url: string; text: string; copied: boolean; online: boolean; onClose: () => void; onNative: () => void; onCopy: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const waLink = `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`;
  const mailLink = `mailto:?subject=${encodeURIComponent("Nutrova Doctor Tracker")}&body=${encodeURIComponent(text + "\n" + url)}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="anim-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-emerald-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Share2 className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-base font-extrabold leading-tight">Share this app</p>
                <p className="text-xs text-emerald-200/70">{online ? "Online store is built in — teammates just create an account" : "Send to other Business Development Managers like an APK"}</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
              <QRCodeSVG value={url} size={84} level="M" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">Scan to open app</p>
              <p className="mt-0.5 break-all text-[11px] font-medium leading-relaxed text-slate-500">{url}</p>
            </div>
          </div>
          <button onClick={onNative} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-800">
            <Share2 className="h-4 w-4" /> Share via phone (WhatsApp / SMS / more)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-extrabold text-white transition hover:brightness-95">
              WhatsApp
            </a>
            <a href={mailLink} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50">
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          </div>
          <button onClick={onCopy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? "Link copied!" : "Copy app link"}
          </button>
          <div className="rounded-2xl bg-amber-50 p-4 text-[11px] font-semibold leading-relaxed text-amber-900 ring-1 ring-amber-200">
            <p className="font-extrabold">Install like APK on Android:</p>
            <p className="mt-1">1. Open link in Chrome → ⋮ menu → <span className="font-extrabold">Add to Home screen / Install app</span></p>
            <p>2. App icon appears like APK · works fast · data stays on phone</p>
          </div>
        </div>
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
