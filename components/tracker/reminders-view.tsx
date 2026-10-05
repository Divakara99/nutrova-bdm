'use client'

import { Check, MapPin } from 'lucide-react'
import { formatDate, lastVisit } from '@/lib/tracker/dates'
import { updateTracker } from '@/lib/tracker/store'
import type { Doctor } from '@/lib/tracker/types'
import { EmptyState } from './primitives'

export function getReminders(doctors: Doctor[]) {
  const planVisit = doctors.filter((d) => d.visits.length === 0)
  const pendingTasks = doctors
    .map((doctor) => ({ doctor, visit: lastVisit(doctor) }))
    .filter((item): item is { doctor: Doctor; visit: NonNullable<ReturnType<typeof lastVisit>> } =>
      Boolean(item.visit?.task && !item.visit.taskDone),
    )
  return { planVisit, pendingTasks }
}

function markDone(doctorId: string, visitId: string) {
  updateTracker((data) => ({
    ...data,
    doctors: data.doctors.map((d) =>
      d.id === doctorId
        ? { ...d, visits: d.visits.map((v) => (v.id === visitId ? { ...v, taskDone: true } : v)) }
        : d,
    ),
  }))
}

export function RemindersView({ doctors }: { doctors: Doctor[] }) {
  const { planVisit, pendingTasks } = getReminders(doctors)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Reminders</h1>
        <p className="text-sm text-muted-foreground">Doctors waiting on a first visit or a follow-up task.</p>
      </div>

      <section aria-labelledby="plan-visit" className="flex flex-col gap-3">
        <h2 id="plan-visit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Not yet visited ({planVisit.length})
        </h2>
        {planVisit.length === 0 ? (
          <EmptyState title="Everyone has been visited" description="Every doctor has at least one logged visit." />
        ) : (
          <ul className="flex flex-col gap-2">
            {planVisit.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-card p-4">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-foreground">{d.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {d.area} · {d.specialty}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-[11px] font-bold tracking-wide text-accent-foreground">
                  PLAN VISIT TODAY
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pending-tasks" className="flex flex-col gap-3">
        <h2 id="pending-tasks" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pending tasks from last visit ({pendingTasks.length})
        </h2>
        {pendingTasks.length === 0 ? (
          <EmptyState title="No pending tasks" description="Tasks noted on a doctor's latest visit will appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingTasks.map(({ doctor, visit }) => (
              <li key={doctor.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-foreground">{doctor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last visit {formatDate(visit.date)} · {doctor.area}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markDone(doctor.id, visit.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Done
                  </button>
                </div>
                <p className="rounded-md bg-secondary px-3 py-2 text-sm text-foreground">{visit.task}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
