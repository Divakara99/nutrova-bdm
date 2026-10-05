'use client'

import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { formatDate, paymentSummary, startOfToday, toISODate } from '@/lib/tracker/dates'
import { createId, updateTracker } from '@/lib/tracker/store'
import { CREDIT_DAYS, type Payment } from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { EmptyState, Field, inputClass, primaryButtonClass } from './primitives'

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function PaymentsView({ payments }: { payments: Payment[] }) {
  const [party, setParty] = useState('')
  const [date, setDate] = useState(() => toISODate(startOfToday()))
  const [amount, setAmount] = useState('')

  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date))
  const pendingTotal = payments.filter((p) => !p.paid).reduce((sum, p) => sum + p.amount, 0)
  const paidTotal = payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0)

  const addPayment = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!date || !Number.isFinite(value) || value <= 0) return
    updateTracker((data) => ({
      ...data,
      payments: [...data.payments, { id: createId(), party: party.trim() || 'Payment', date, amount: value, paid: false }],
    }))
    setParty('')
    setAmount('')
  }

  const togglePaid = (id: string) =>
    updateTracker((data) => ({
      ...data,
      payments: data.payments.map((p) => (p.id === id ? { ...p, paid: !p.paid } : p)),
    }))

  const remove = (id: string) =>
    updateTracker((data) => ({ ...data, payments: data.payments.filter((p) => p.id !== id) }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">{CREDIT_DAYS}-day credit period. Pending days update automatically.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pending</p>
          <p className="font-mono text-lg font-semibold text-accent">{rupees.format(pendingTotal)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
          <p className="font-mono text-lg font-semibold text-primary">{rupees.format(paidTotal)}</p>
        </div>
      </div>

      <form onSubmit={addPayment} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading font-semibold text-foreground">Log a payment</h2>
        <Field label="Party / stockist">
          <input className={inputClass} value={party} onChange={(e) => setParty(e.target.value)} placeholder="e.g. Skin Care Pharmacy" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount (₹)">
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              required
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Add payment
        </button>
      </form>

      {sorted.length === 0 ? (
        <EmptyState title="No payments logged" description="Log a payment to track its 30-day credit." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((payment) => {
            const s = paymentSummary(payment)
            return (
              <li key={payment.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{payment.party}</p>
                    <p className="text-xs text-muted-foreground">
                      Logged {formatDate(payment.date)} · Due {formatDate(s.dueDate)}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono font-semibold text-foreground">{rupees.format(payment.amount)}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 font-semibold',
                        s.status === 'Paid' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
                      )}
                    >
                      {s.status}
                    </span>
                    {!payment.paid && (
                      <span className={cn('font-medium', s.overdue ? 'text-accent' : 'text-muted-foreground')}>
                        {s.elapsed} days pending ·{' '}
                        {s.overdue ? `${Math.abs(s.daysLeft)} days overdue` : `${s.daysLeft} days of credit left`}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => togglePaid(payment.id)}
                      className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      {payment.paid ? 'Mark pending' : 'Mark paid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(payment.id)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={`Delete payment from ${payment.party}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
