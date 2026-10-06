'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import { FileUp } from 'lucide-react'
import { createId, updateTracker } from '@/lib/tracker/store'
import {
  CALL_PATTERNS,
  LISTED_LIMIT,
  SPECIALTIES,
  STATUSES,
  type CallPattern,
  type Doctor,
  type DoctorStatus,
  type Specialty,
} from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { Field, ghostButtonClass, inputClass, primaryButtonClass } from './primitives'

type ParsedDoctor = Omit<Doctor, 'id' | 'visits' | 'listed'>

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function matchOption<T extends string>(raw: string | undefined, options: readonly T[], fallback: T): T {
  const key = normalize(raw ?? '')
  if (!key) return fallback
  return options.find((o) => normalize(o) === key) ?? options.find((o) => normalize(o).includes(key) || key.includes(normalize(o))) ?? fallback
}

function splitRow(line: string) {
  const separator = line.includes('\t') ? '\t' : line.includes(';') && !line.includes(',') ? ';' : ','
  return line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ''))
}

export function parseDoctorList(text: string): ParsedDoctor[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitRow)
    .filter(([name]) => name && normalize(name) !== 'name' && normalize(name) !== 'doctorname')
    .map(([name, specialty, area, pattern, status]) => ({
      name: /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`,
      specialty: matchOption<Specialty>(specialty, SPECIALTIES, 'Dermatologist'),
      area: area || 'Bangalore',
      pattern: matchOption<CallPattern>(pattern, CALL_PATTERNS, 'Tue to Fri'),
      status: matchOption<DoctorStatus>(status, STATUSES, 'Plan to Convert'),
    }))
}

export function BulkImport({
  doctors,
  onDone,
}: {
  doctors: Doctor[]
  onDone: (target: 'listed' | 'unlisted') => void
}) {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'listed' | 'unlisted'>('unlisted')

  const parsed = useMemo(() => parseDoctorList(text), [text])
  const existingNames = useMemo(() => new Set(doctors.map((d) => normalize(d.name))), [doctors])
  const fresh = parsed.filter((d) => !existingNames.has(normalize(d.name)))
  const duplicates = parsed.length - fresh.length
  const listedRoom = Math.max(0, LISTED_LIMIT - doctors.filter((d) => d.listed).length)
  const toImport = target === 'listed' ? fresh.slice(0, listedRoom) : fresh
  const overflow = fresh.length - toImport.length

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setText(await file.text())
    event.target.value = ''
  }

  function handleImport() {
    updateTracker((data) => ({
      ...data,
      doctors: [
        ...data.doctors,
        ...toImport.map((d) => ({ ...d, id: createId(), listed: target === 'listed', visits: [] })),
      ],
    }))
    onDone(target)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Paste one doctor per line, or copy rows straight from Excel / Google Sheets. Column order:
        <span className="mt-1 block rounded-lg bg-secondary px-3 py-2 font-mono text-xs text-foreground">
          Name, Specialty, Area, Call pattern, Status
        </span>
        Only the name is required. Missing values default to Dermatologist, Bangalore, Tue to Fri, Plan to Convert.
      </p>

      <div role="radiogroup" aria-label="Add doctors to" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(
          [
            ['unlisted', 'Unlisted'],
            ['listed', `Listed (${listedRoom} slots left)`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={target === id}
            onClick={() => setTarget(id)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition',
              target === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Doctor list">
        <textarea
          className={cn(inputClass, 'min-h-48 font-mono text-xs leading-relaxed')}
          placeholder={'Dr. Arjun Kumar, Dermatologist, BTM Layout, Only Tue, Plan to Convert\nDr. Kavya S, Cosmetic Derma, Hebbal, 1st Thu\nDr. Naveen Rao'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>

      <label className={cn(ghostButtonClass, 'cursor-pointer justify-center')}>
        <FileUp className="size-4" aria-hidden="true" />
        Upload CSV file
        <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={handleFile} />
      </label>

      {parsed.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/50 p-3 text-sm" aria-live="polite">
          <p className="font-semibold text-foreground">
            {toImport.length} doctor{toImport.length === 1 ? '' : 's'} ready to add
          </p>
          {duplicates > 0 && <p className="text-muted-foreground">{duplicates} skipped (already in your list)</p>}
          {overflow > 0 && <p className="text-muted-foreground">{overflow} skipped (Listed limit of {LISTED_LIMIT} reached)</p>}
          <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
            {toImport.slice(0, 50).map((d, i) => (
              <li key={`${d.name}-${i}`}>
                <span className="font-medium text-foreground">{d.name}</span> · {d.specialty} · {d.area} · {d.pattern}
              </li>
            ))}
            {toImport.length > 50 && <li>…and {toImport.length - 50} more</li>}
          </ul>
        </div>
      )}

      <button type="button" className={primaryButtonClass} disabled={toImport.length === 0} onClick={handleImport}>
        Add {toImport.length || ''} doctors
      </button>
    </div>
  )
}
