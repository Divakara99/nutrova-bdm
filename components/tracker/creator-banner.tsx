import { Mail, MapPin, Phone } from 'lucide-react'
import { CREATOR } from '@/lib/tracker/types'

export function CreatorBanner() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-banner/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-col gap-1.5 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-heading text-base font-bold leading-tight text-foreground">{CREATOR.name}</p>
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-primary">{CREATOR.company}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{CREATOR.role}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {CREATOR.city}
          </span>
          <a href={`tel:${CREATOR.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <Phone className="size-3.5" aria-hidden="true" />
            {CREATOR.phone}
          </a>
          <a href={`mailto:${CREATOR.email}`} className="inline-flex items-center gap-1 break-all hover:text-foreground">
            <Mail className="size-3.5" aria-hidden="true" />
            {CREATOR.email}
          </a>
        </div>
      </div>
    </header>
  )
}
