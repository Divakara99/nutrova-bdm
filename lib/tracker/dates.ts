import { CREDIT_DAYS, type CallPattern, type Doctor, type Payment } from './types'

const MS_PER_DAY = 86_400_000

export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function formatDate(value: string) {
  return parseISODate(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const TUE = 2
const WED = 3
const THU = 4
const FRI = 5

const MONTHLY: Partial<Record<CallPattern, { weekday: number; nth: number }>> = {
  '1st Tue': { weekday: TUE, nth: 1 },
  '1st Thu': { weekday: THU, nth: 1 },
  'Last Thu': { weekday: THU, nth: -1 },
  '3rd Wed': { weekday: WED, nth: 3 },
}

const WEEKLY: Partial<Record<CallPattern, number[]>> = {
  'Tue to Fri': [TUE, WED, THU, FRI],
  'Only Tue': [TUE],
  'Only Fri': [FRI],
  'Only Tue and Fri': [TUE, FRI],
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  if (nth > 0) {
    const first = new Date(year, month, 1)
    const offset = (weekday - first.getDay() + 7) % 7
    return new Date(year, month, 1 + offset + (nth - 1) * 7)
  }
  const last = new Date(year, month + 1, 0)
  const offset = (last.getDay() - weekday + 7) % 7
  return new Date(year, month, last.getDate() - offset)
}

export function nextCallDate(pattern: CallPattern, from = startOfToday()) {
  const monthly = MONTHLY[pattern]
  if (monthly) {
    const thisMonth = nthWeekdayOfMonth(from.getFullYear(), from.getMonth(), monthly.weekday, monthly.nth)
    if (thisMonth >= from) return thisMonth
    return nthWeekdayOfMonth(from.getFullYear(), from.getMonth() + 1, monthly.weekday, monthly.nth)
  }
  const weekdays = WEEKLY[pattern] ?? []
  for (let i = 0; i < 7; i++) {
    const candidate = addDays(from, i)
    if (weekdays.includes(candidate.getDay())) return candidate
  }
  return from
}

export function describeNextCall(pattern: CallPattern) {
  const today = startOfToday()
  const next = nextCallDate(pattern, today)
  const diff = daysBetween(today, next)
  const label = next.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  if (diff === 0) return { label: 'Today', detail: label, isToday: true }
  if (diff === 1) return { label: 'Tomorrow', detail: label, isToday: false }
  return { label, detail: `in ${diff} days`, isToday: false }
}

export function lastVisit(doctor: Doctor) {
  if (doctor.visits.length === 0) return undefined
  return [...doctor.visits].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function paymentSummary(payment: Payment) {
  const today = startOfToday()
  const logged = parseISODate(payment.date)
  const elapsed = Math.max(0, daysBetween(logged, today))
  const dueDate = addDays(logged, CREDIT_DAYS)
  const daysLeft = daysBetween(today, dueDate)
  return {
    status: payment.paid ? ('Paid' as const) : ('Pending' as const),
    elapsed,
    daysLeft,
    overdue: !payment.paid && daysLeft < 0,
    dueDate: toISODate(dueDate),
  }
}
