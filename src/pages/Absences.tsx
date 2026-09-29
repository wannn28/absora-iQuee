import { useEffect, useState } from 'react'
import { api, type Absence, type Employee } from '../api'

const empty = { employee_id: '', type: 'Paid Leave', status: 'Pending', start_date: '2025-12-09', end_date: '2025-12-10', note: '' }

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
    <div className="page">
      <div className="section-head"><h1>Absences</h1></div>
      <form className="inset" onSubmit={create}>
        <strong>Request leave</strong>
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr .8fr .8fr .8fr', gap: 8, marginTop: 10 }}>
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
        </div>
        <button className="btn dark" type="submit">Save request</button>
      </form>
      <div className="list">
        {rows.map((a) => (
          <div key={a.id} className="person-row" style={{ gridTemplateColumns: '1.2fr 1fr 1.2fr .8fr auto' }}>
            <b>{a.employee_name}</b>
            <span className={`tag ${a.type === 'Sick Leave' ? 'sick' : a.type === 'Vacation' ? 'vacation' : 'paid'}`}>{a.type}</span>
            <span>{a.start_date} → {a.end_date}</span>
            <span className={`tag ${a.status === 'Pending' ? 'pending' : 'approved'}`}>{a.status}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {a.status !== 'Approved' && <button className="btn green" onClick={() => setStatus(a, 'Approved')}>Approve</button>}
              {a.status !== 'Pending' && <button className="btn amber" onClick={() => setStatus(a, 'Pending')}>Mark pending</button>}
              <button className="btn light" onClick={async () => { await api(`/api/absences/${a.id}`, { method: 'DELETE' }); await load() }}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
