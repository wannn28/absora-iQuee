import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { api, type User } from '../api'
import { useAuth } from '../auth'

export default function Login() {
  const { user, loading, setUser } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  if (!loading && user) return <Navigate to="/" replace />
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const res = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: { email, password } })
      setUser(res.user)
      nav('/')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not sign in')
    }
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo"><BarChart3 size={18} /></div>
        <h1>Absora</h1>
        <p className="sub">Sign in to your workspace.</p>
        {err && <p className="err">{err}</p>}
        <label className="field"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn dark" style={{ width: '100%', marginTop: 6 }} type="submit">Sign in</button>
        <p style={{ fontSize: 13, marginTop: 14 }}>No account? <Link to="/register">Create one</Link></p>
      </form>
    </div>
  )
}
