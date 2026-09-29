export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed')
  return data as T
}

export type User = { id: number; name: string; email: string; role: string }
export type Employee = {
  id: number
  name: string
  email: string
  role_title: string
  department: string
  color: string
}
export type Absence = {
  id: number
  employee_id: number
  type: 'Paid Leave' | 'Sick Leave' | 'Vacation' | string
  status: 'Approved' | 'Pending' | string
  start_date: string
  end_date: string
  note: string
  employee_name?: string
  role_title?: string
  color?: string
}
export type EventItem = {
  id: number
  title: string
  subtitle: string
  event_date: string
  start_time: string
  end_time: string
  badge: string
  highlighted: number
}
export type Task = { id: number; person_id: number; title: string; done: number; sort_order: number }
export type OnboardPerson = {
  id: number
  name: string
  role_title: string
  color: string
  done: number
  total: number
  tasks?: Task[]
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase()
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

export function formatLong(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export function monthBounds(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
}

export type DayCol = { iso: string; d: number; wd: string; weekend: boolean }

export function monthDays(iso: string): DayCol[] {
  const [y, m] = iso.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const out: DayCol[] = []
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m - 1, d)
    const mm = String(m).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    out.push({
      iso: `${y}-${mm}-${dd}`,
      d,
      wd: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      weekend: dt.getDay() === 0 || dt.getDay() === 6,
    })
  }
  return out
}
