import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { api, type User } from '../api'
import { useAuth } from '../auth'

export default function Register() {
  const { user, loading, setUser } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  if (!loading && user) return <Navigate to="/" replace />
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const res = await api<{ user: User }>('/api/auth/register', { method: 'POST', body: { name, email, password } })
      setUser(res.user)
      nav('/')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not register')
    }
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo"><BarChart3 size={18} /></div>
        <h1>Create account</h1>
        <p className="sub">The first account becomes the admin.</p>
        {err && <p className="err">{err}</p>}
        <label className="field"><span>Name</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn dark" style={{ width: '100%', marginTop: 6 }} type="submit">Register</button>
        <p style={{ fontSize: 13, marginTop: 14 }}>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  )
}
