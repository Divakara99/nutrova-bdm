'use client'

import { useState, type FormEvent } from 'react'
import { updateTracker } from '@/lib/tracker/store'
import { CREATOR, type EmployeeBio } from '@/lib/tracker/types'
import { Field, inputClass, primaryButtonClass } from './primitives'

const FIELDS: { key: keyof EmployeeBio; label: string; type?: string; autoComplete?: string }[] = [
  { key: 'name', label: 'Name', autoComplete: 'name' },
  { key: 'role', label: 'Role', autoComplete: 'organization-title' },
  { key: 'company', label: 'Company', autoComplete: 'organization' },
  { key: 'state', label: 'State', autoComplete: 'address-level1' },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'hq', label: 'HQ' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
]

export function BioView({ bio }: { bio: EmployeeBio }) {
  const [values, setValues] = useState(bio)
  const [saved, setSaved] = useState(false)

  const save = (event: FormEvent) => {
    event.preventDefault()
    updateTracker((data) => ({ ...data, bio: values }))
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Employee bio</h1>
        <p className="text-sm text-muted-foreground">Your profile is stored on this device.</p>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type, autoComplete }) => (
          <Field key={key} label={label}>
            <input
              type={type ?? 'text'}
              autoComplete={autoComplete}
              className={inputClass}
              value={values[key]}
              onChange={(e) => {
                setSaved(false)
                setValues((prev) => ({ ...prev, [key]: e.target.value }))
              }}
            />
          </Field>
        ))}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>
            Save bio
          </button>
          <p className="text-sm text-primary" role="status" aria-live="polite">
            {saved ? 'Saved' : ''}
          </p>
        </div>
      </form>

      <section aria-labelledby="creator" className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
        <h2 id="creator" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          App created by
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-semibold text-foreground">{CREATOR.name}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="text-foreground">{CREATOR.role}</dd>
          <dt className="text-muted-foreground">Company</dt>
          <dd className="text-foreground">
            {CREATOR.company}, {CREATOR.city}
          </dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="text-foreground">{CREATOR.phone}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all text-foreground">{CREATOR.email}</dd>
        </dl>
      </section>
    </div>
  )
}
