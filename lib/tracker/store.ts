'use client'

import { useSyncExternalStore } from 'react'
import { addDays, startOfToday, toISODate } from './dates'
import { CREATOR, type TrackerData } from './types'

const STORAGE_KEY = 'nutrova-doctor-tracker-v1'

export function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function daysAgo(days: number) {
  return toISODate(addDays(startOfToday(), -days))
}

function sampleData(): TrackerData {
  return {
    doctors: [
      {
        id: createId(),
        name: 'Dr. Ananya Rao',
        specialty: 'Cosmetic Derma',
        area: 'Indiranagar',
        pattern: '1st Tue',
        status: 'Converted',
        listed: true,
        visits: [
          { id: createId(), date: daysAgo(28), notes: 'Introduced collagen range. Positive response.', task: '', taskDone: false },
          { id: createId(), date: daysAgo(6), notes: 'Prescribing regularly for post-procedure care.', task: '', taskDone: false },
        ],
      },
      {
        id: createId(),
        name: 'Dr. Karthik Menon',
        specialty: 'Aesthetic Derma',
        area: 'Koramangala',
        pattern: 'Tue to Fri',
        status: 'Going to Convert',
        listed: true,
        visits: [
          { id: createId(), date: daysAgo(3), notes: 'Asked for clinical study summary on hair & skin.', task: 'Share clinical study PDF', taskDone: false },
        ],
      },
      {
        id: createId(),
        name: 'Dr. Priya Shetty',
        specialty: 'Plastic Cosmetic Surgeon',
        area: 'Jayanagar',
        pattern: 'Last Thu',
        status: 'Plan to Convert',
        listed: true,
        visits: [],
      },
      {
        id: createId(),
        name: 'Dr. Rahul Gowda',
        specialty: 'Dermatologist',
        area: 'Whitefield',
        pattern: 'Only Tue and Fri',
        status: 'Going to Convert',
        listed: true,
        visits: [
          { id: createId(), date: daysAgo(14), notes: 'Met at clinic, busy OPD.', task: '', taskDone: false },
          { id: createId(), date: daysAgo(4), notes: 'Interested in samples for acne patients.', task: 'Deliver 10 sample packs', taskDone: false },
        ],
      },
      {
        id: createId(),
        name: 'Dr. Sneha Iyer',
        specialty: 'Cosmetic Derma',
        area: 'HSR Layout',
        pattern: '3rd Wed',
        status: 'Plan to Convert',
        listed: true,
        visits: [],
      },
      {
        id: createId(),
        name: 'Dr. Vikram Reddy',
        specialty: 'Dermatologist',
        area: 'Malleshwaram',
        pattern: 'Only Fri',
        status: 'Plan to Convert',
        listed: false,
        visits: [],
      },
      {
        id: createId(),
        name: 'Dr. Meera Nair',
        specialty: 'Aesthetic Derma',
        area: 'JP Nagar',
        pattern: '1st Thu',
        status: 'Going to Convert',
        listed: false,
        visits: [
          { id: createId(), date: daysAgo(10), notes: 'New clinic opened. Good footfall.', task: 'Follow up for listing', taskDone: false },
        ],
      },
    ],
    payments: [
      { id: createId(), party: 'Skin Care Pharmacy, Indiranagar', date: daysAgo(12), amount: 18500, paid: false },
      { id: createId(), party: 'Wellness Medicals, Koramangala', date: daysAgo(41), amount: 9200, paid: false },
      { id: createId(), party: 'Derma Plus Clinic, Jayanagar', date: daysAgo(35), amount: 12400, paid: true },
    ],
    bio: {
      name: CREATOR.name,
      role: CREATOR.role,
      company: CREATOR.company,
      state: 'Karnataka',
      city: CREATOR.city,
      hq: CREATOR.city,
      phone: CREATOR.phone,
      email: CREATOR.email,
    },
  }
}

let cache: TrackerData | null = null
const listeners = new Set<() => void>()

function read(): TrackerData {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cache = { ...sampleData(), ...(JSON.parse(raw) as Partial<TrackerData>) }
    } else {
      cache = sampleData()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    }
  } catch {
    cache = sampleData()
  }
  return cache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function updateTracker(updater: (data: TrackerData) => TrackerData) {
  cache = updater(read())
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Storage may be full or disabled; keep the in-memory copy so the session still works.
  }
  listeners.forEach((listener) => listener())
}

export function useTracker() {
  return useSyncExternalStore(subscribe, read, () => null)
}
