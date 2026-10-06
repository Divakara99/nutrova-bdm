'use client'

import { useState, type FormEvent } from 'react'
import {
  CALL_PATTERNS,
  SPECIALTIES,
  STATUSES,
  type CallPattern,
  type Doctor,
  type DoctorStatus,
  type Specialty,
} from '@/lib/tracker/types'
import { Field, inputClass, primaryButtonClass } from './primitives'

export type DoctorFormValues = Omit<Doctor, 'id' | 'visits'>

export function DoctorForm({
  initial,
  listedFull,
  submitLabel,
  onSubmit,
}: {
  initial: DoctorFormValues
  listedFull: boolean
  submitLabel: string
  onSubmit: (values: DoctorFormValues) => void
}) {
  const [values, setValues] = useState(initial)
  const set = <K extends keyof DoctorFormValues>(key: K, value: DoctorFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const blockedListing = values.listed && listedFull && !initial.listed

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!values.name.trim() || !values.area.trim() || blockedListing) return
    onSubmit({ ...values, name: values.name.trim(), area: values.area.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Doctor name">
        <input
          required
          className={inputClass}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Dr. Full Name"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Specialty">
          <select className={inputClass} value={values.specialty} onChange={(e) => set('specialty', e.target.value as Specialty)}>
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Area in Bangalore">
          <input
            required
            className={inputClass}
            value={values.area}
            onChange={(e) => set('area', e.target.value)}
            placeholder="e.g. Indiranagar"
          />
        </Field>
        <Field label="Call pattern">
          <select className={inputClass} value={values.pattern} onChange={(e) => set('pattern', e.target.value as CallPattern)}>
            {CALL_PATTERNS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={values.status} onChange={(e) => set('status', e.target.value as DoctorStatus)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="List">
        <select
          className={inputClass}
          value={values.listed ? 'listed' : 'unlisted'}
          onChange={(e) => set('listed', e.target.value === 'listed')}
        >
          <option value="listed">Listed doctor</option>
          <option value="unlisted">Unlisted doctor</option>
        </select>
      </Field>
      {blockedListing && (
        <p className="text-sm text-accent" role="alert">
          The listed limit of 100 doctors is reached. Save as unlisted or move another doctor out first.
        </p>
      )}
      <button type="submit" className={primaryButtonClass} disabled={blockedListing}>
        {submitLabel}
      </button>
    </form>
  )
}
