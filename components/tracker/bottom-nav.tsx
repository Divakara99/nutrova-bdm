'use client'

import { BellRing, IdCard, IndianRupee, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

export type View = 'doctors' | 'reminders' | 'payments' | 'bio'

const ITEMS = [
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'reminders', label: 'Reminders', icon: BellRing },
  { id: 'payments', label: 'Payments', icon: IndianRupee },
  { id: 'bio', label: 'Bio', icon: IdCard },
] as const

export function BottomNav({
  view,
  onChange,
  reminderCount,
}: {
  view: View
  onChange: (view: View) => void
  reminderCount: number
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-banner/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center gap-1 py-2.5 text-xs font-medium transition',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  {id === 'reminders' && reminderCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-foreground">
                      {reminderCount}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
