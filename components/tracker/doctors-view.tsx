'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Upload } from 'lucide-react'
import { createId, updateTracker } from '@/lib/tracker/store'
import { LISTED_LIMIT, type Doctor } from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { DoctorCard } from './doctor-card'
import { DoctorDetail } from './doctor-detail'
import { DoctorForm } from './doctor-form'
import { BulkImport } from './bulk-import'
import { EmptyState, Sheet, ghostButtonClass, inputClass, primaryButtonClass } from './primitives'

export function DoctorsView({ doctors }: { doctors: Doctor[] }) {
  const [tab, setTab] = useState<'listed' | 'unlisted'>('listed')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  const listedCount = doctors.filter((d) => d.listed).length
  const unlistedCount = doctors.length - listedCount
  const listedFull = listedCount >= LISTED_LIMIT

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doctors
      .filter((d) => d.listed === (tab === 'listed'))
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.area.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [doctors, tab, query])

  const openDoctor = doctors.find((d) => d.id === openId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Doctors</h1>
          <p className="text-sm text-muted-foreground">Tap a doctor to log visits and update status.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={ghostButtonClass} onClick={() => setImporting(true)}>
            <Upload className="size-4" aria-hidden="true" />
            Import
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Doctor lists" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(
          [
            ['listed', `Listed (${listedCount}/${LISTED_LIMIT})`],
            ['unlisted', `Unlisted (${unlistedCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition',
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Search doctors</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          className={cn(inputClass, 'pl-9')}
          placeholder="Search by name, area or specialty"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {visible.length === 0 ? (
        <EmptyState
          title={query ? 'No matching doctors' : 'No doctors here yet'}
          description={query ? 'Try a different name, area or specialty.' : 'Add a doctor to start tracking calls.'}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((doctor) => (
            <li key={doctor.id}>
              <DoctorCard doctor={doctor} onOpen={() => setOpenId(doctor.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(openDoctor)} onClose={() => setOpenId(null)} title={openDoctor?.name ?? ''}>
        {openDoctor && (
          <DoctorDetail key={openDoctor.id} doctor={openDoctor} listedFull={listedFull} onDeleted={() => setOpenId(null)} />
        )}
      </Sheet>

      <Sheet open={importing} onClose={() => setImporting(false)} title="Import doctors">
        <BulkImport
          doctors={doctors}
          onDone={(target) => {
            setTab(target)
            setQuery('')
            setImporting(false)
          }}
        />
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add doctor">
        <DoctorForm
          initial={{
            name: '',
            specialty: 'Dermatologist',
            area: '',
            pattern: 'Tue to Fri',
            status: 'Plan to Convert',
            listed: tab === 'listed' && !listedFull,
          }}
          listedFull={listedFull}
          submitLabel="Add doctor"
          onSubmit={(values) => {
            updateTracker((data) => ({
              ...data,
              doctors: [...data.doctors, { ...values, id: createId(), visits: [] }],
            }))
            setTab(values.listed ? 'listed' : 'unlisted')
            setAdding(false)
          }}
        />
      </Sheet>
    </div>
  )
}
