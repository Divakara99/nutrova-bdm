import { CalendarClock, MapPin, Repeat } from 'lucide-react'
import { describeNextCall, formatDate, lastVisit } from '@/lib/tracker/dates'
import type { Doctor, DoctorStatus } from '@/lib/tracker/types'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<DoctorStatus, string> = {
  Converted: 'bg-primary text-primary-foreground',
  'Going to Convert': 'bg-accent text-accent-foreground',
  'Plan to Convert': 'border border-border text-muted-foreground',
}

export function StatusBadge({ status }: { status: DoctorStatus }) {
  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

export function DoctorCard({ doctor, onOpen }: { doctor: Doctor; onOpen: () => void }) {
  const next = describeNextCall(doctor.pattern)
  const last = lastVisit(doctor)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold leading-snug text-foreground">{doctor.name}</p>
          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
        </div>
        <StatusBadge status={doctor.status} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden="true" />
          {doctor.area}
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="size-3.5" aria-hidden="true" />
          {doctor.pattern}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Next call</span>
          <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', next.isToday ? 'text-primary' : 'text-foreground')}>
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {next.label}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Visits</span>
          <span className="font-mono text-sm font-semibold text-foreground">{doctor.visits.length}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Last visit</span>
          <span className="text-sm font-semibold text-foreground">{last ? formatDate(last.date) : '—'}</span>
        </div>
      </div>
    </button>
  )
}
