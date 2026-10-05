'use client'

import { useState, type FormEvent } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { describeNextCall, formatDate, startOfToday, toISODate } from '@/lib/tracker/dates'
import { createId, updateTracker } from '@/lib/tracker/store'
import { STATUSES, type Doctor, type DoctorStatus } from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from './doctor-card'
import { DoctorForm } from './doctor-form'
import { EmptyState, Field, ghostButtonClass, inputClass, primaryButtonClass } from './primitives'

function updateDoctor(id: string, fn: (doctor: Doctor) => Doctor) {
  updateTracker((data) => ({
    ...data,
    doctors: data.doctors.map((d) => (d.id === id ? fn(d) : d)),
  }))
}

export function DoctorDetail({
  doctor,
  listedFull,
  onDeleted,
}: {
  doctor: Doctor
  listedFull: boolean
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(() => toISODate(startOfToday()))
  const [notes, setNotes] = useState('')
  const [task, setTask] = useState('')
  const next = describeNextCall(doctor.pattern)
  const history = [...doctor.visits].sort((a, b) => b.date.localeCompare(a.date))

  const addVisit = (event: FormEvent) => {
    event.preventDefault()
    if (!date) return
    updateDoctor(doctor.id, (d) => ({
      ...d,
      visits: [...d.visits, { id: createId(), date, notes: notes.trim(), task: task.trim(), taskDone: false }],
    }))
    setNotes('')
    setTask('')
  }

  const toggleTask = (visitId: string) =>
    updateDoctor(doctor.id, (d) => ({
      ...d,
      visits: d.visits.map((v) => (v.id === visitId ? { ...v, taskDone: !v.taskDone } : v)),
    }))

  const removeVisit = (visitId: string) =>
    updateDoctor(doctor.id, (d) => ({ ...d, visits: d.visits.filter((v) => v.id !== visitId) }))

  const removeDoctor = () => {
    if (!window.confirm(`Remove ${doctor.name} and all visit history?`)) return
    updateTracker((data) => ({ ...data, doctors: data.doctors.filter((d) => d.id !== doctor.id) }))
    onDeleted()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <DoctorForm
          initial={{
            name: doctor.name,
            specialty: doctor.specialty,
            area: doctor.area,
            pattern: doctor.pattern,
            status: doctor.status,
            listed: doctor.listed,
          }}
          listedFull={listedFull}
          submitLabel="Save changes"
          onSubmit={(values) => {
            updateDoctor(doctor.id, (d) => ({ ...d, ...values }))
            setEditing(false)
          }}
        />
        <button type="button" className={ghostButtonClass} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={doctor.status} />
          <span className="text-sm text-muted-foreground">
            {doctor.specialty} · {doctor.area} · {doctor.listed ? 'Listed' : 'Unlisted'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Call pattern</p>
            <p className="text-sm font-semibold text-foreground">{doctor.pattern}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Next call day</p>
            <p className="text-sm font-semibold text-foreground">
              {next.label} <span className="font-normal text-muted-foreground">({next.detail})</span>
            </p>
          </div>
        </div>
        <Field label="Update status">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Doctor status">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={doctor.status === s}
                onClick={() => updateDoctor(doctor.id, (d) => ({ ...d, status: s as DoctorStatus }))}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                  doctor.status === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-2">
          <button type="button" className={ghostButtonClass} onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit details
          </button>
          <button type="button" className={cn(ghostButtonClass, 'text-muted-foreground')} onClick={removeDoctor}>
            <Trash2 className="size-4" aria-hidden="true" />
            Remove
          </button>
        </div>
      </section>

      <section aria-labelledby="log-visit" className="flex flex-col gap-3">
        <h3 id="log-visit" className="font-heading font-semibold text-foreground">
          Log a visit
        </h3>
        <form onSubmit={addVisit} className="flex flex-col gap-3">
          <Field label="Visit date">
            <input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed?"
            />
          </Field>
          <Field label="Task / follow-up">
            <input
              className={inputClass}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Deliver samples"
            />
          </Field>
          <button type="submit" className={primaryButtonClass}>
            Save visit
          </button>
        </form>
      </section>

      <section aria-labelledby="visit-history" className="flex flex-col gap-3">
        <h3 id="visit-history" className="font-heading font-semibold text-foreground">
          Visit history <span className="font-mono text-sm text-muted-foreground">({history.length})</span>
        </h3>
        {history.length === 0 ? (
          <EmptyState title="No visits yet" description="Log the first visit above to start this doctor's history." />
        ) : (
          <ol className="flex flex-col gap-2">
            {history.map((visit) => (
              <li key={visit.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{formatDate(visit.date)}</span>
                  <button
                    type="button"
                    onClick={() => removeVisit(visit.id)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Delete visit on ${formatDate(visit.date)}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {visit.notes && <p className="text-sm leading-relaxed text-muted-foreground">{visit.notes}</p>}
                {visit.task && (
                  <button
                    type="button"
                    onClick={() => toggleTask(visit.id)}
                    aria-pressed={visit.taskDone}
                    className={cn(
                      'flex items-center gap-2 self-start rounded-md px-2 py-1 text-left text-xs font-semibold',
                      visit.taskDone ? 'text-muted-foreground line-through' : 'bg-accent text-accent-foreground',
                    )}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    {visit.taskDone ? 'Done: ' : 'Task: '}
                    {visit.task}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
