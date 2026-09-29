import { useEffect, useState } from 'react'
import { api, formatShort, type EventItem } from '../api'

const blank = { title: '', subtitle: '', event_date: '2025-12-18', start_time: '09:00', end_time: '10:00', badge: '', highlighted: false }

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [form, setForm] = useState(blank)
  const [err, setErr] = useState('')
  async function load() { setEvents((await api<{ events: EventItem[] }>('/api/events')).events) }
  useEffect(() => { load().catch(() => {}) }, [])
  async function add(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/events', { method: 'POST', body: form })
      setForm(blank)
      await load()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not add')
    }
  }
  return (
    <div className="page">
      <div className="section-head"><h1>Future Events</h1></div>
      <form className="inset" onSubmit={add}>
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr .8fr .6fr .6fr', gap: 8 }}>
          <label className="field"><span>Title</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="field"><span>Subtitle</span><input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></label>
          <label className="field"><span>Date</span><input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></label>
          <label className="field"><span>Start</span><input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
          <label className="field"><span>End</span><input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
          <input type="checkbox" checked={form.highlighted} onChange={(e) => setForm({ ...form, highlighted: e.target.checked })} /> Highlight
        </label>
        <button className="btn dark" type="submit">Add event</button>
      </form>
      {events.map((ev) => (
        <div key={ev.id} className="event-row">
          <div style={{ flex: 1 }}>
            <div className="ttl">{ev.title} {ev.highlighted ? <span className="badge-soon">Highlighted</span> : null}</div>
            <div className="sub">{ev.subtitle} · {ev.start_time}–{ev.end_time} · {formatShort(ev.event_date)}</div>
          </div>
          <button className="btn light" onClick={async () => { await api(`/api/events/${ev.id}`, { method: 'DELETE' }); await load() }}>Delete</button>
        </div>
      ))}
    </div>
  )
}
