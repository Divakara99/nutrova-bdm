'use client'

import { useState } from 'react'
import { Bell, CalendarDays, ChevronRight, Clock3, FileText, LayoutDashboard, Plus, Search, Settings, Stethoscope, Users } from 'lucide-react'

const appointments = [
  { name: 'Dr. Maya Patel', type: 'Cardiology follow-up', time: '09:30 AM', date: 'Today', color: 'bg-teal-100 text-teal-700' },
  { name: 'Dr. Aaron Chen', type: 'Lab results review', time: '02:00 PM', date: 'Today', color: 'bg-blue-100 text-blue-700' },
  { name: 'Dr. Sofia Williams', type: 'Annual wellness visit', time: '10:15 AM', date: 'Tomorrow', color: 'bg-amber-100 text-amber-700' },
]

const records = [
  { title: 'Blood panel results', doctor: 'Dr. Maya Patel', date: 'Oct 02, 2026', icon: FileText },
  { title: 'Prescription updated', doctor: 'Dr. Aaron Chen', date: 'Sep 28, 2026', icon: Stethoscope },
  { title: 'Visit summary', doctor: 'Dr. Sofia Williams', date: 'Sep 14, 2026', icon: CalendarDays },
]

export default function Page() {
  const [active, setActive] = useState('Overview')
  const [showForm, setShowForm] = useState(false)

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-6 md:flex md:flex-col">
          <div className="mb-10 flex items-center gap-3 px-2"><div className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white"><Stethoscope size={19} /></div><span className="text-lg font-bold tracking-tight">Nutrova</span></div>
          <nav className="space-y-1" aria-label="Main navigation">
            {[['Overview', LayoutDashboard], ['Appointments', CalendarDays], ['Doctors', Users], ['Documents', FileText]].map(([label, Icon]) => <button key={label as string} onClick={() => setActive(label as string)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === label ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} />{label as string}</button>)}
          </nav>
          <div className="mt-auto space-y-1"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"><Settings size={18} />Settings</button><div className="mt-5 flex items-center gap-3 border-t border-slate-100 px-2 pt-5"><div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">JD</div><div><p className="text-sm font-semibold">Jordan Davis</p><p className="text-xs text-slate-400">Patient</p></div></div></div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-9"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Monday, October 5, 2026</p><h1 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">Good morning, Jordan</h1></div><div className="flex items-center gap-3"><button aria-label="Search" className="hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 sm:block"><Search size={19} /></button><button aria-label="Notifications" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell size={19} /></button><button onClick={() => setShowForm(true)} className="hidden items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 sm:flex"><Plus size={17} />Add appointment</button></div></header>
          <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-9">
            <div className="grid gap-4 sm:grid-cols-3"><Stat label="Upcoming visits" value="3" note="Next: today at 9:30 AM" /><Stat label="Care team" value="6" note="Across 4 specialties" /><Stat label="Documents" value="18" note="2 added this month" /></div>
            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Upcoming appointments</h2><p className="mt-1 text-sm text-slate-500">Stay on top of your care schedule.</p></div><button onClick={() => setActive('Appointments')} className="flex items-center gap-1 text-sm font-semibold text-teal-700">View all <ChevronRight size={16} /></button></div><div className="space-y-3">{appointments.map((item) => <div key={item.name} className="flex items-center gap-4 rounded-xl border border-slate-100 p-3.5"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Stethoscope size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="truncate text-xs text-slate-500">{item.type}</p></div><div className="text-right"><p className="text-sm font-semibold">{item.time}</p><p className="text-xs text-slate-400">{item.date}</p></div></div>)}</div></section>
              <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-teal-300">Health overview</p><h2 className="mt-2 text-2xl font-bold">You&apos;re on track</h2></div><div className="rounded-xl bg-white/10 p-2.5"><Clock3 size={20} /></div></div><p className="mt-6 text-sm leading-6 text-slate-300">Your next check-in is scheduled for today. Keep your health history up to date for better conversations with your doctors.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-4/5 rounded-full bg-teal-400" /></div><div className="mt-2 flex justify-between text-xs text-slate-400"><span>Care plan progress</span><span>80%</span></div></section>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Your latest records and updates.</p></div><button onClick={() => setActive('Documents')} className="flex items-center gap-1 text-sm font-semibold text-teal-700">See documents <ChevronRight size={16} /></button></div><div className="grid gap-3 md:grid-cols-3">{records.map(({ title, doctor, date, icon: Icon }) => <div key={title} className="rounded-xl border border-slate-100 p-4"><div className="mb-5 flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={17} /></div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{doctor}</p><p className="mt-4 text-xs font-medium text-slate-400">{date}</p></div>)}</div></section>
          </div>
        </section>
      </div>
      {showForm && <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/30 p-5"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Add appointment</h2><button aria-label="Close" onClick={() => setShowForm(false)} className="text-2xl leading-none text-slate-400">&times;</button></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium">Doctor<input className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" placeholder="Search your care team" /></label><label className="block text-sm font-medium">Date and time<input type="datetime-local" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" /></label><button onClick={() => setShowForm(false)} className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700">Save appointment</button></div></div></div>}
    </main>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>
}
