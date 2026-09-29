import { useEffect, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { api, formatShort, type Absence, type Employee } from '../api'
import { Avatar } from '../components/ui'

const empty = { employee_id: '', type: 'Paid Leave', status: 'Pending', start_date: '2025-12-09', end_date: '2025-12-10', note: '' }

function slugFor(type: string) {
  if (type === 'Sick Leave') return 'sick'
  if (type === 'Vacation') return 'vacation'
  return 'paid'
}

export default function Absences() {
  const [rows, setRows] = useState<Absence[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')

  async function load() {
    const [a, e] = await Promise.all([
      api<{ absences: Absence[] }>('/api/absences'),
      api<{ employees: Employee[] }>('/api/employees'),
    ])
    setRows(a.absences)
    setEmployees(e.employees)
    if (!form.employee_id && e.employees[0]) setForm((f) => ({ ...f, employee_id: String(e.employees[0].id) }))
  }
  useEffect(() => { load().catch(() => {}) }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/absences', { method: 'POST', body: { ...form, employee_id: Number(form.employee_id) } })
      setForm((f) => ({ ...empty, employee_id: f.employee_id }))
      await load()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not request leave')
    }
  }

  async function setStatus(a: Absence, status: string) {
    await api(`/api/absences/${a.id}`, { method: 'PATCH', body: { status } })
    await load()
  }

  return (
    <div className="page studio">
      <div className="section-head">
        <h1>Absences</h1>
        <span className="linkish">{rows.length} requests</span>
      </div>

      <form className="request-card" onSubmit={create}>
        <div className="req-head">
          <strong>Request leave</strong>
          {err ? <span className="err">{err}</span> : <span className="hint">Add a request without leaving this page</span>}
        </div>
        <div className="req-fields">
          <label className="field"><span>Employee</span>
            <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Paid Leave</option>
              <option>Sick Leave</option>
              <option>Vacation</option>
            </select>
          </label>
          <label className="field"><span>From</span><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
          <label className="field"><span>To</span><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
          <label className="field"><span>Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Pending</option>
              <option>Approved</option>
            </select>
          </label>
          <button className="btn dark" type="submit">Save request</button>
        </div>
      </form>

      <section className="card abs-board">
        <div className="card-h">
          <h2>All requests</h2>
          <span className="viewall">{rows.filter((r) => r.status === 'Pending').length} pending</span>
        </div>
        <div className="abs-grid">
          {rows.map((a, i) => (
            <article key={a.id} className={`abs-card ${rows.length % 2 === 1 && i === rows.length - 1 ? 'wide' : ''}`}>
              <Avatar name={a.employee_name || ''} color={a.color} className="lg" />
              <div className="who">
                <div className="nm">{a.employee_name}</div>
                <div className="rl">{a.role_title || 'Employee'}</div>
              </div>
              <span className={`tag ${slugFor(a.type)}`}>{a.type}</span>
              <div className="abs-meta">
                <span className="dates"><CalendarRange size={13} /> {formatShort(a.start_date)} – {formatShort(a.end_date)}</span>
                <span className={`tag ${a.status === 'Pending' ? 'pending' : 'approved'}`}>{a.status}</span>
              </div>
              <div className="quiet-actions">
                {a.status !== 'Approved' && <button className="pill-quiet ok" onClick={() => setStatus(a, 'Approved')}>Approve</button>}
                {a.status !== 'Pending' && <button className="pill-quiet wait" onClick={() => setStatus(a, 'Pending')}>Mark pending</button>}
                <button className="pill-quiet" onClick={async () => { await api(`/api/absences/${a.id}`, { method: 'DELETE' }); await load() }}>Delete</button>
              </div>
            </article>
          ))}
          {rows.length === 0 && <p className="pend-empty">No leave requests yet.</p>}
        </div>
      </section>
    </div>
  )
}
