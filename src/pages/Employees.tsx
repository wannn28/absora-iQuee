import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type Employee } from '../api'
import { useOutletContext } from 'react-router-dom'
import { Avatar } from '../components/ui'

export default function Employees() {
  const [params] = useSearchParams()
  const ctx = useOutletContext<{ search: string }>()
  const q = (params.get('q') || ctx.search || '').trim()
  const [rows, setRows] = useState<Employee[]>([])
  useEffect(() => {
    api<{ employees: Employee[] }>(`/api/employees?q=${encodeURIComponent(q)}`).then((d) => setRows(d.employees)).catch(() => {})
  }, [q])
  return (
    <div className="page">
      <div className="section-head">
        <h1 className="page-title">Employees</h1>
        <span className="linkish">{rows.length} people{q ? ` · “${q}”` : ''}</span>
      </div>
      <div className="list">
        <div className="person-row" style={{ color: '#8b919c', fontSize: 12, fontWeight: 700 }}>
          <span>Name</span><span>Role</span><span>Department</span><span>Email</span><span />
        </div>
        {rows.map((e) => (
          <Link key={e.id} to={`/employees/${e.id}`} className="person-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={e.name} color={e.color} />
              <b>{e.name}</b>
            </span>
            <span>{e.role_title}</span>
            <span>{e.department}</span>
            <span style={{ color: '#6d7482' }}>{e.email}</span>
            <span className="linkish">Profile</span>
          </Link>
        ))}
        {rows.length === 0 && <p style={{ color: '#8b919c' }}>No employees match that search.</p>}
      </div>
    </div>
  )
}
