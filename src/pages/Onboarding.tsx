import { useEffect, useState } from 'react'
import { api, type OnboardPerson } from '../api'
import { Avatar, Ring } from '../components/ui'

export default function Onboarding() {
  const [people, setPeople] = useState<OnboardPerson[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const d = await api<{ people: OnboardPerson[] }>('/api/onboarding')
    setPeople(d.people)
  }
  useEffect(() => { load().catch(() => {}) }, [])

  async function toggle(id: number, done: boolean) {
    const d = await api<{ people: OnboardPerson[] }>(`/api/onboarding/tasks/${id}`, { method: 'PATCH', body: { done } })
    setPeople(d.people)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const d = await api<{ people: OnboardPerson[] }>('/api/onboarding', { method: 'POST', body: { name, role_title: role } })
      setPeople(d.people)
      setName(''); setRole('')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not add')
    }
  }

  return (
    <div className="page">
      <div className="section-head"><h1>Onboarding</h1></div>
      <form className="inset" onSubmit={add} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}><span>Role</span><input value={role} onChange={(e) => setRole(e.target.value)} required /></label>
        <button className="btn dark" type="submit">Add person</button>
        {err && <p className="err" style={{ width: '100%' }}>{err}</p>}
      </form>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {people.map((p) => (
          <section key={p.id} className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <Avatar name={p.name} color={p.color} className="lg" />
              <div style={{ flex: 1 }}>
                <b>{p.name}</b>
                <div style={{ color: '#8b919c', fontSize: 12 }}>{p.role_title}</div>
              </div>
              <div className="prog" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <Ring done={p.done} total={p.total} /> {p.done}/{p.total} tasks done
              </div>
            </div>
            {(p.tasks || []).map((t) => (
              <label key={t.id} className="task">
                <input type="checkbox" checked={!!t.done} onChange={(e) => toggle(t.id, e.target.checked)} />
                <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8b919c' : 'inherit' }}>{t.title}</span>
              </label>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
