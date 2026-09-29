import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { api, type Employee } from '../api'
import { Avatar } from '../components/ui'

export default function Employees() {
  const [params] = useSearchParams()
  const ctx = useOutletContext<{ search: string }>()
  const q = (params.get('q') || ctx.search || '').trim()
  const [rows, setRows] = useState<Employee[]>([])
  const [dept, setDept] = useState('All')

  useEffect(() => {
    api<{ employees: Employee[] }>(`/api/employees?q=${encodeURIComponent(q)}`).then((d) => setRows(d.employees)).catch(() => {})
  }, [q])

  const depts = useMemo(() => ['All', ...Array.from(new Set(rows.map((e) => e.department))).sort()], [rows])
  useEffect(() => {
    if (dept !== 'All' && !depts.includes(dept)) setDept('All')
  }, [depts, dept])

  const shown = rows.filter((e) => dept === 'All' || e.department === dept)

  return (
    <div className="page studio">
      <div className="section-head">
        <h1>Employees</h1>
        <span className="linkish">{shown.length} people{q ? ` · “${q}”` : ''}</span>
      </div>
      <div className="dept-row">
        {depts.map((d) => (
          <button key={d} className={`dept-chip ${dept === d ? 'on' : ''}`} onClick={() => setDept(d)}>{d}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="pend-empty grow">No employees match that search.</div>
      ) : (
        <div className="emp-grid">
          {shown.map((e) => (
            <article key={e.id} className="emp-card">
              <Avatar name={e.name} color={e.color} className="lg" />
              <div className="nm">{e.name}</div>
              <div className="rl">{e.role_title}</div>
              <span className="dept-pill">{e.department}</span>
              <div className="em">{e.email}</div>
              <Link to={`/employees/${e.id}`} className="btn light profile-btn">Profile</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
