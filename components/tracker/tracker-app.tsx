'use client'

import { useEffect, useState } from 'react'
import { useTracker } from '@/lib/tracker/store'
import { BioView } from './bio-view'
import { BottomNav, type View } from './bottom-nav'
import { CreatorBanner } from './creator-banner'
import { DoctorsView } from './doctors-view'
import { PaymentsView } from './payments-view'
import { RemindersView, getReminders } from './reminders-view'

export function TrackerApp() {
  const data = useTracker()
  const [view, setView] = useState<View>('doctors')

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  const reminders = data ? getReminders(data.doctors) : null
  const reminderCount = reminders ? reminders.planVisit.length + reminders.pendingTasks.length : 0

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CreatorBanner />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">
        {!data ? (
          <p className="py-10 text-center text-sm text-muted-foreground" role="status">
            Loading your tracker…
          </p>
        ) : view === 'doctors' ? (
          <DoctorsView doctors={data.doctors} />
        ) : view === 'reminders' ? (
          <RemindersView doctors={data.doctors} />
        ) : view === 'payments' ? (
          <PaymentsView payments={data.payments} />
        ) : (
          <BioView bio={data.bio} />
        )}
      </main>
      <BottomNav view={view} onChange={setView} reminderCount={reminderCount} />
    </div>
  )
}
