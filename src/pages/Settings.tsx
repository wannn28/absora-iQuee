import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type User } from '../api'
import { useAuth } from '../auth'

export default function Settings() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setMsg('')
    try {
      const res = await api<{ user: User }>('/api/auth/settings', {
        method: 'PATCH',
        body: { name, currentPassword, newPassword },
      })
      setUser(res.user)
      setCurrent(''); setNew('')
      setMsg('Saved.')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save')
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    nav('/login')
  }

  return (
    <div className="page">
      <div className="section-head"><h1>Settings</h1></div>
      <form className="inset" style={{ maxWidth: 460 }} onSubmit={save}>
        <div style={{ fontSize: 13, color: '#8b919c', marginBottom: 8 }}>{user?.email} · {user?.role}</div>
        {err && <p className="err">{err}</p>}
        {msg && <p style={{ color: '#157a48', fontSize: 13 }}>{msg}</p>}
        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="field"><span>Current password</span><input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} placeholder="Only needed to change password" /></label>
        <label className="field"><span>New password</span><input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="Leave blank to keep" /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn dark" type="submit">Save</button>
          <button className="btn light" type="button" onClick={logout}>Log out</button>
        </div>
      </form>
    </div>
  )
}
