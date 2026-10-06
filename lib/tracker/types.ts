export const SPECIALTIES = [
  'Cosmetic Derma',
  'Aesthetic Derma',
  'Plastic Cosmetic Surgeon',
  'Dermatologist',
] as const
export type Specialty = (typeof SPECIALTIES)[number]

export const CALL_PATTERNS = [
  '1st Tue',
  '1st Thu',
  'Last Thu',
  '3rd Wed',
  'Tue to Fri',
  'Only Tue',
  'Only Fri',
  'Only Tue and Fri',
] as const
export type CallPattern = (typeof CALL_PATTERNS)[number]

export const STATUSES = ['Converted', 'Going to Convert', 'Plan to Convert'] as const
export type DoctorStatus = (typeof STATUSES)[number]

export const LISTED_LIMIT = 100
export const CREDIT_DAYS = 30

export type Visit = {
  id: string
  date: string
  notes: string
  task: string
  taskDone: boolean
}

export type Doctor = {
  id: string
  name: string
  specialty: Specialty
  area: string
  pattern: CallPattern
  status: DoctorStatus
  listed: boolean
  visits: Visit[]
}

export type Payment = {
  id: string
  party: string
  date: string
  amount: number
  paid: boolean
}

export type EmployeeBio = {
  name: string
  role: string
  company: string
  state: string
  city: string
  hq: string
  phone: string
  email: string
}

export type TrackerData = {
  doctors: Doctor[]
  payments: Payment[]
  bio: EmployeeBio
}

export const CREATOR = {
  name: 'M Divakar Reddy',
  role: 'Medical Representative',
  company: 'Nutrova',
  city: 'Bangalore',
  phone: '9676728619',
  email: 'divakar.reddy@nutrova.com',
} as const
