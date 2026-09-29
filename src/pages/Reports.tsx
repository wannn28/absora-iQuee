import { useEffect, useState } from 'react'
import { api, type Absence } from '../api'

type Report = {
  headcount: number
  month: string
  absencesThisMonth: number
  pending: number
  byType: { type: string; count: number }[]
  pendingItems: Absence[]
}

export default function Reports() {
  const [data, setData] = useState<Report | null>(null)
  async function load() {
    setData(await api<Report>('/api/reports'))
  }
  useEffect(() => { load().catch(() => {}) }, [])
  if (!data) return <div className="page">Loading…</div>
  const max = Math.max(1, ...data.byType.map((t) => t.count))
  const colors: Record<string, string> = { 'Paid Leave': '#6d46d6', 'Sick Leave': '#2f6fe0', Vacation: '#1c9a5c' }
  return (
    <div className="page">
      <div className="section-head"><h1>Reports</h1><span className="linkish">{data.month}</span></div>
      <div className="stat-grid">
        <div className="stat"><div className="k">Headcount</div><div className="v">{data.headcount}</div></div>
        <div className="stat"><div className="k">Absences this month</div><div className="v">{data.absencesThisMonth}</div></div>
        <div className="stat"><div className="k">Pending approvals</div><div className="v">{data.pending}</div></div>
      </div>
      <section className="card">
        <h2>By type</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {data.byType.map((t) => (
            <div key={t.type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span>{t.type}</span><span>{t.count}</span>
              </div>
              <div className="bar"><span style={{ width: `${(t.count / max) * 100}%`, background: colors[t.type] }} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Pending</h2>
        {data.pendingItems.length === 0 && <p style={{ color: '#8b919c' }}>No approvals waiting.</p>}
        {data.pendingItems.map((a) => (
          <div key={a.id} className="event-row">
            <div style={{ flex: 1 }}><b>{a.employee_name}</b><div className="sub">{a.type} · {a.start_date} → {a.end_date}</div></div>
            <button className="btn green" onClick={async () => { await api(`/api/absences/${a.id}`, { method: 'PATCH', body: { status: 'Approved' } }); await load() }}>Approve</button>
          </div>
        ))}
      </section>
    </div>
  )
}
