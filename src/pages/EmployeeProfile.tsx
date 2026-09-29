import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Absence, type Employee } from '../api'
import { Avatar } from '../components/ui'

export default function EmployeeProfile() {
  const { id } = useParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [absences, setAbsences] = useState<Absence[]>([])
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role_title: '', department: '' })

  function load() {
    api<{ employee: Employee; absences: Absence[] }>(`/api/employees/${id}`).then((d) => {
      setEmployee(d.employee)
      setAbsences(d.absences)
      setForm({ name: d.employee.name, email: d.employee.email, role_title: d.employee.role_title, department: d.employee.department })
    }).catch((ex) => setErr(ex.message))
  }
  useEffect(() => { load() }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const res = await api<{ employee: Employee }>(`/api/employees/${id}`, { method: 'PATCH', body: form })
      setEmployee(res.employee)
      setEditing(false)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save')
    }
  }

  if (!employee) return <div className="page"><p>{err || 'Loading…'}</p></div>
  return (
    <div className="page">
      <Link to="/employees" className="linkish" style={{ alignSelf: 'flex-start' }}>← Employees</Link>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Avatar name={employee.name} color={employee.color} className="xl" />
        <div>
          <h1 className="page-title">{employee.name}</h1>
          <div style={{ color: '#8b919c' }}>{employee.role_title} · {employee.department}</div>
          <div style={{ color: '#6d7482', fontSize: 13 }}>{employee.email}</div>
        </div>
        <button className="btn light" style={{ marginLeft: 'auto' }} onClick={() => setEditing((v) => !v)}>{editing ? 'Close' : 'Edit'}</button>
      </div>
      {editing && (
        <form className="inset" onSubmit={save} style={{ maxWidth: 480 }}>
          {err && <p className="err">{err}</p>}
          <label className="field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Email</span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field"><span>Role</span><input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></label>
          <label className="field"><span>Department</span><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <button className="btn dark" type="submit">Save changes</button>
        </form>
      )}
      <h2 style={{ margin: '8px 0 0', fontSize: 16 }}>Absences</h2>
      {absences.length === 0 && <p style={{ color: '#8b919c' }}>No leave recorded.</p>}
      {absences.map((a) => (
        <div key={a.id} className="event-row">
          <span className={`tag ${a.type === 'Sick Leave' ? 'sick' : a.type === 'Vacation' ? 'vacation' : 'paid'}`}>{a.type}</span>
          <span>{a.start_date} → {a.end_date}</span>
          <span className={`tag ${a.status === 'Pending' ? 'pending' : 'approved'}`}>{a.status}</span>
        </div>
      ))}
    </div>
  )
}
