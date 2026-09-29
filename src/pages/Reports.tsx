import { useEffect, useState } from 'react'
import { CalendarRange, Clock3, Users } from 'lucide-react'
import { api, formatShort, type Absence } from '../api'
import { Avatar } from '../components/ui'

type Report = {
  headcount: number
  month: string
  absencesThisMonth: number
  pending: number
  byType: { type: string; count: number }[]
  pendingItems: Absence[]
}

const COLORS: Record<string, string> = {
  'Paid Leave': '#7a45f5',
  'Sick Leave': '#3b82f6',
  Vacation: '#12b56a',
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function slugFor(type: string) {
  if (type === 'Sick Leave') return 'sick'
  if (type === 'Vacation') return 'vacation'
  return 'paid'
}

function LeaveDonut({ slices }: { slices: { type: string; count: number; color: string }[] }) {
  const active = slices.filter((s) => s.count > 0)
  const total = active.reduce((sum, s) => sum + s.count, 0)
  const r = 58
  const c = 2 * Math.PI * r
  const gap = active.length > 1 ? 6 : 0
  let offset = 0
  return (
    <svg className="donut" viewBox="0 0 160 160" role="img" aria-label="Leave by type">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#eef1f6" strokeWidth="18" />
      {active.map((s) => {
        const len = Math.max((s.count / Math.max(total, 1)) * c - gap, 2)
        const node = (
          <circle
            key={s.type}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform="rotate(-90 80 80)"
          />
        )
        offset += len + gap
        return node
      })}
      <circle cx="80" cy="80" r="40" fill="#fff" />
      <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="800" fill="#14161c" fontFamily="Plus Jakarta Sans, Inter, sans-serif">{total}</text>
      <text x="80" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8b919c" fontFamily="Plus Jakarta Sans, Inter, sans-serif">this month</text>
    </svg>
  )
}

export default function Reports() {
  const [data, setData] = useState<Report | null>(null)
  async function load() {
    setData(await api<Report>('/api/reports'))
  }
  useEffect(() => { load().catch(() => {}) }, [])
  if (!data) return <div className="page studio">Loading…</div>

  const slices = data.byType.map((t) => ({ ...t, color: COLORS[t.type] || '#8b919c' }))
  const max = Math.max(1, ...slices.map((t) => t.count))
  const solo = data.pendingItems.length <= 1

  return (
    <div className="page studio">
      <div className="section-head">
        <h1>Reports</h1>
        <span className="linkish">{monthLabel(data.month)}</span>
      </div>

      <div className="stat-grid glass">
        <div className="stat">
          <span className="stat-ico a"><Users size={18} /></span>
          <div><div className="k">Headcount</div><div className="v">{data.headcount}</div></div>
        </div>
        <div className="stat">
          <span className="stat-ico b"><CalendarRange size={18} /></span>
          <div><div className="k">Absences this month</div><div className="v">{data.absencesThisMonth}</div></div>
        </div>
        <div className="stat">
          <span className="stat-ico c"><Clock3 size={18} /></span>
          <div><div className="k">Pending approvals</div><div className="v">{data.pending}</div></div>
        </div>
      </div>

      <div className="reports-body">
        <section className="card mix-card">
          <div className="card-h">
            <h2>Leave by type</h2>
            <span className="viewall">{data.absencesThisMonth} total</span>
          </div>
          <div className="mix-stack">
            <div className="mix-top">
              <LeaveDonut slices={slices} />
              <div className="type-rows">
                {slices.map((t) => (
                  <div key={t.type} className="type-row">
                    <div className="type-top">
                      <span className="swatch" style={{ background: t.color }} />
                      <span className="tn">{t.type}</span>
                      <b>{t.count}</b>
                    </div>
                    <div className="bar"><span style={{ width: `${(t.count / max) * 100}%`, background: t.color }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="share-row">
              {slices.map((t) => (
                <div key={t.type} className="share-tile">
                  <div className="share-k"><span className="swatch" style={{ background: t.color }} />{t.type}</div>
                  <div className="share-n">{t.count}</div>
                  <div>
                    <div className="bar"><span style={{ width: `${(t.count / max) * 100}%`, background: t.color }} /></div>
                    <div className="share-p">{Math.round((t.count / Math.max(data.absencesThisMonth, 1)) * 100)}% of the month</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card pend-panel">
          <div className="card-h">
            <h2>Pending approvals</h2>
            <span className="viewall">{data.pending} waiting</span>
          </div>
          {data.pendingItems.length === 0 ? (
            <div className="pend-empty">No approvals waiting.</div>
          ) : (
            <div className={`pend-grid ${solo ? 'solo' : ''}`}>
              {data.pendingItems.map((a) => (
                <article key={a.id} className="pend-card">
                  <div className="pend-top">
                    <Avatar name={a.employee_name || ''} color={a.color} className={solo ? 'xl' : 'lg'} />
                    <div className="who">
                      <div className="nm">{a.employee_name}</div>
                      <div className="rl">{a.role_title || 'Employee'}</div>
                    </div>
                    <span className={`tag ${slugFor(a.type)}`}>{a.type}</span>
                  </div>
                  {solo ? (
                    <div className="span-visual">
                      <div>
                        <div className="k">From</div>
                        <div className="big">{formatShort(a.start_date)}</div>
                      </div>
                      <div className="span-track"><span />{(() => { const p = (iso: string) => iso.split('-').map(Number); const [y1,m1,d1] = p(a.start_date); const [y2,m2,d2] = p(a.end_date); return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000) + 1 })()} days</div>
                      <div>
                        <div className="k">To</div>
                        <div className="big">{formatShort(a.end_date)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="pend-dates">
                      <CalendarRange size={14} />
                      <span>{formatShort(a.start_date)}</span>
                      <span className="to">to</span>
                      <span>{formatShort(a.end_date)}</span>
                    </div>
                  )}
                  {solo && <p className="pend-note">Still open. Approving it updates the absence calendar.</p>}
                  <button
                    className="btn approve"
                    onClick={async () => {
                      await api(`/api/absences/${a.id}`, { method: 'PATCH', body: { status: 'Approved' } })
                      await load()
                    }}
                  >
                    Approve
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
