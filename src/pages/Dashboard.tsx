import { useEffect, useMemo, useState } from 'react'

type SpeechRec = {
  lang: string
  start: () => void
  onresult: (ev: { results: Array<Array<{ transcript: string }>> }) => void
  onend: () => void
}
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  FileText,
  Heart,
  LayoutGrid,
  Mic,
  TreePalm,
  Paperclip,
  Send,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  api,
  firstName,
  formatLong,
  formatShort,
  monthBounds,
  monthDays,
  type Absence,
  type Employee,
  type EventItem,
  type OnboardPerson,
} from '../api'
import { useAuth } from '../auth'
import { Avatar } from '../components/ui'

type Dash = {
  today: string
  employees: Employee[]
  absences: Absence[]
  events: EventItem[]
  onboarding: OnboardPerson[]
}

function FaceStack({ people, more }: { people: Employee[]; more: string }) {
  return (
    <div className="avatar-stack sm">
      {people.map((e) => <Avatar key={e.id} name={e.name} color={e.color} />)}
      <span className="plus-chip">{more}</span>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { search } = useOutletContext<{ search: string }>()
  const [anchor, setAnchor] = useState('2025-12-15')
  const [data, setData] = useState<Dash | null>(null)
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [text, setText] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)

  const bounds = monthBounds(anchor)
  const days = useMemo(() => monthDays(anchor).slice(0, 17), [anchor])

  useEffect(() => {
    api<Dash>(`/api/dashboard?from=${bounds.from}&to=${bounds.to}`).then(setData).catch(() => {})
  }, [bounds.from, bounds.to])

  const today = data?.today || '2025-12-09'
  const todayIndex = days.findIndex((d) => d.iso === today)
  const q = search.trim().toLowerCase()
  const matched = (data?.employees || []).filter((e) => !q || `${e.name} ${e.role_title}`.toLowerCase().includes(q))
  const employees = q ? matched : matched.slice(0, 5)

  function pillsFor(empId: number) {
    return (data?.absences || []).filter((a) => {
      if (a.employee_id !== empId) return false
      if (type !== 'All' && a.type !== type) return false
      if (status !== 'All' && a.status !== status) return false
      return true
    })
  }

  function place(a: Absence) {
    let s = -1
    let e = -1
    days.forEach((d, i) => {
      if (d.iso >= a.start_date && d.iso <= a.end_date) {
        if (s < 0) s = i
        e = i
      }
    })
    if (s < 0 || e < 0) return null
    const n = Math.max(days.length, 1)
    const span = e - s + 1
    const pad = 8
    return {
      left: `calc(var(--name) + (100% - var(--name)) * ${s} / ${n} + ${pad}px)`,
      width: `max(196px, calc((100% - var(--name)) * ${span} / ${n} - ${pad * 2}px))`,
    }
  }

  async function ask(message: string) {
    const m = message.trim()
    if (!m) return
    setBusy(true)
    try {
      const res = await api<{ reply: string }>('/api/assistant', { method: 'POST', body: { message: m } })
      const clean = (res.reply || '').replace(/\s+/g, ' ').trim()
      setReply(clean.length > 140 ? `${clean.slice(0, 136)}…` : clean)
      setText('')
    } catch {
      setReply('')
    } finally {
      setBusy(false)
    }
  }

  function onMic() {
    const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }
    const Rec = w.webkitSpeechRecognition
    if (!Rec) return
    const rec = new Rec()
    rec.lang = 'en-US'
    setListening(true)
    rec.onresult = (ev) => {
      const said = ev.results[0][0].transcript
      setText((prev) => (prev + ' ' + said).trim().slice(0, 300))
    }
    rec.onend = () => setListening(false)
    rec.start()
  }

  const events = data?.events || []
  const hero = events.find((e) => e.highlighted) || events[0]
  const rest = events.filter((e) => e !== hero)
  const onboard = (data?.onboarding || []).slice(0, 4)
  const faces = data?.employees || []

  return (
    <div className="page dash">
      <div className="section-head">
        <h1>Planned Absences</h1>
        <div className="head-actions">
          <label className="date-pill">
            <Calendar size={14} />
            <span>{formatLong(anchor)}</span>
            <ChevronDown size={14} />
            <input
              type="date"
              value={anchor}
              aria-label="Date"
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
            />
          </label>
          <button className="ghost-pill" onClick={() => setFilterOpen((v) => !v)}>
            <SlidersHorizontal size={14} /> Filter
          </button>
          <Link to="/absences" className="linkish">View all</Link>
          {filterOpen && (
            <div className="popover">
              <h4>Type</h4>
              {['All', 'Paid Leave', 'Sick Leave', 'Vacation'].map((t) => (
                <label key={t}><input type="radio" name="type" checked={type === t} onChange={() => setType(t)} /> {t}</label>
              ))}
              <h4>Status</h4>
              {['All', 'Approved', 'Pending'].map((t) => (
                <label key={t}><input type="radio" name="status" checked={status === t} onChange={() => setStatus(t)} /> {t}</label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="cal-scroll">
        <div className="cal-inner" style={{ ['--days' as string]: String(days.length) }}>
          <div className="cal-head">
            <div className="corner">Employees</div>
            {days.map((d) => (
              <div key={d.iso} className={`day-h ${d.weekend ? 'weekend' : ''} ${d.iso === today ? 'is-today' : ''}`}>
                {d.iso === today ? (
                  <span className="today-badge">
                    <span>{d.wd}</span>
                    <b>{d.d}</b>
                  </span>
                ) : (
                  <>
                    <span className="wd">{d.wd}</span>
                    <span className={`n ${d.weekend ? 'wk' : ''}`}>{d.d}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {employees.map((emp) => (
            <div className="cal-row" key={emp.id}>
              <div className="emp">
                <Avatar name={emp.name} color={emp.color} />
                <div>
                  <div className="nm">{emp.name}</div>
                  <div className="rl">{emp.role_title}</div>
                </div>
              </div>
              {days.map((d) => <div key={d.iso} className={`cell ${d.weekend ? 'weekend' : ''}`} />)}
              {pillsFor(emp.id).map((a) => {
                const box = place(a)
                if (!box) return null
                const slug = a.type === 'Sick Leave' ? 'sick' : a.type === 'Vacation' ? 'vacation' : 'paid'
                const Icon = a.type === 'Sick Leave' ? Heart : a.type === 'Vacation' ? TreePalm : Briefcase
                return (
                  <div key={a.id} className={`absence ${slug}`} style={{ left: box.left, width: box.width }} title={`${a.type} · ${a.status}`}>
                    <span className="ic"><Icon size={13} /></span>
                    <span className="t">{a.type}</span>
                    <span className="chip"><i />{a.status}</span>
                  </div>
                )
              })}
            </div>
          ))}
          {todayIndex >= 0 && (
            <div
              className="today-line"
              style={{ left: `calc(var(--name) + (100% - var(--name)) * (${todayIndex} + 0.5) / ${Math.max(days.length, 1)})` }}
            />
          )}
        </div>
      </div>

      <div className="bottom-grid">
        <section className="card">
          <div className="card-h">
            <h2>Future Events</h2>
            <Link to="/events" className="viewall">View all <ArrowUpRight size={14} /></Link>
          </div>
          {hero && (
            <div className="event-hero">
              <div className="hero-top">
                <div>
                  <div className="ttl">{hero.title}</div>
                  <div className="sub">{hero.subtitle}</div>
                </div>
                {hero.badge && <span className="badge-soon"><i />{hero.badge}</span>}
              </div>
              <div className="event-meta">
                <span className="meta-pill"><Clock size={13} /> {hero.start_time} – {hero.end_time}</span>
                <span className="meta-pill"><Calendar size={13} /> {formatShort(hero.event_date)}</span>
                <FaceStack people={faces.slice(0, 2)} more="8+" />
              </div>
            </div>
          )}
          <div className="event-list">
            {rest.map((ev, i) => (
              <div className="event-row" key={ev.id}>
                <div className="ttl">{ev.title}</div>
                <div className="desc">{ev.subtitle}</div>
                <div className="event-meta">
                  <span className="meta-pill soft"><Clock size={13} /> {ev.start_time} – {ev.end_time}</span>
                  <span className="meta-pill soft"><Calendar size={13} /> {formatShort(ev.event_date)}</span>
                  <FaceStack people={faces.slice(2, 4)} more={i === 0 ? '12+' : '6+'} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Onboarding</h2>
            <Link to="/onboarding" className="viewall">View all <ArrowUpRight size={14} /></Link>
          </div>
          <div className="on-grid">
            {onboard.map((p) => (
              <Link key={p.id} to="/onboarding" className="on-card">
                <Avatar name={p.name} color={p.color} className="lg" />
                <div className="nm">{p.name}</div>
                <div className="rl">{p.role_title}</div>
                <div className="taskchip"><LayoutGrid size={12} /> {p.done}/{p.total} tasks done</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card welcome">
          <div className="sphere" aria-hidden />
          <h3>Welcome, {firstName(user?.name || 'there')}</h3>
          <p className="lead">What can I help with today?</p>
          <div className="chips">
            <button className="chip" onClick={() => ask('How do I create an employee profile?')}><UserPlus size={13} /> Create a profile</button>
            <button className="chip" onClick={() => ask('Show me this month’s absence report')}><FileText size={13} /> Get reports</button>
            <button className="chip" onClick={() => ask('How many employees do we have?')}><Users size={13} /> Manage users</button>
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
            <div className="composer-input">
              <textarea
                maxLength={300}
                value={text}
                placeholder="Ask me anything"
                aria-label="Ask me anything"
                onChange={(e) => setText(e.target.value.slice(0, 300))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask(text)
                  }
                }}
              />
              <button className="send" type="submit" aria-label="Send" disabled={busy}>
                <Send size={16} />
              </button>
            </div>
            <div className="composer-bar">
              <label className="mini">
                <Paperclip size={13} /> Attach file
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setText((t) => (`${t} [file: ${f.name}]`).trim().slice(0, 300))
                    e.target.value = ''
                  }}
                />
              </label>
              <button className="mini" type="submit" disabled={busy}>{busy ? '…' : 'Create'}</button>
              <button type="button" className="mini iconly" onClick={onMic} aria-label="Microphone" title={listening ? 'Listening' : 'Microphone'}>
                <Mic size={14} />
              </button>
              <span className={`counter ${text.length > 260 ? 'warn' : ''}`}>{text.length}/300</span>
            </div>
          </form>
          {reply && <p className="reply">{reply}</p>}
        </section>
      </div>
    </div>
  )
}
