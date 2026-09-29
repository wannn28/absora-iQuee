import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  CalendarDays,
  FileText,
  Home,
  Monitor,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { api, type Absence, type Employee } from '../api'
import { useAuth } from '../auth'
import { Avatar, Modal } from '../components/ui'

function Logo() {
  return (
    <svg className="logo-mark" width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect x="2" y="14" width="5" height="10" rx="1.6" fill="#60a5fa" />
      <rect x="10.5" y="8" width="5" height="16" rx="1.6" fill="#3b82f6" />
      <rect x="19" y="2" width="5" height="22" rx="1.6" fill="#2563eb" />
    </svg>
  )
}

export default function Shell() {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [pending, setPending] = useState<Absence[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [bell, setBell] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role_title: '', department: 'General' })

  async function loadPeople() {
    const [emp, abs] = await Promise.all([
      api<{ employees: Employee[] }>('/api/employees'),
      api<{ absences: Absence[] }>('/api/absences'),
    ])
    setEmployees(emp.employees)
    setPending(abs.absences.filter((a) => a.status === 'Pending'))
  }

  useEffect(() => {
    loadPeople().catch(() => {})
  }, [loc.pathname])

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const res = await api<{ employee: Employee }>('/api/employees', { method: 'POST', body: form })
      setAddOpen(false)
      setForm({ name: '', email: '', role_title: '', department: 'General' })
      await loadPeople()
      nav(`/employees/${res.employee.id}`)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not add employee')
    }
  }

  const shown = employees.slice(0, 3)
  const extra = Math.max(employees.length - shown.length, 0)
  const moreLabel = extra >= 8 ? '8+' : extra > 0 ? `${extra}+` : ''

  return (
    <div className="app-bg">
      <div className="shell">
        <aside className="rail-col">
          <div className="logo" aria-hidden>
            <Logo />
          </div>
          <nav className="rail">
            <NavLink to="/" end title="Dashboard"><Home size={18} /></NavLink>
            <NavLink to="/employees" title="Employees"><Monitor size={18} /></NavLink>
            <NavLink to="/absences" title="Absences"><CalendarDays size={18} /></NavLink>
            <NavLink to="/reports" title="Reports"><BarChart3 size={18} /></NavLink>
            <NavLink to="/onboarding" title="Onboarding"><Sparkles size={18} /></NavLink>
          </nav>
          <NavLink to="/settings" className="rail-set" title="Settings"><Settings size={18} /></NavLink>
        </aside>
        <div className="shell-main">
          <header className="topbar">
            <nav className="nav-pills">
              <NavLink to="/" end className={({ isActive }) => `pill-btn ${isActive ? 'active' : ''}`}>
                <Home size={14} /> Dashboard
              </NavLink>
              <NavLink to="/employees" className={({ isActive }) => `pill-btn ${isActive ? 'active' : ''}`}>
                <Users size={14} /> Employees
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `pill-btn ${isActive ? 'active' : ''}`}>
                <FileText size={14} /> Reports
              </NavLink>
            </nav>
            <form
              className={`search-pill ${searchOpen ? 'open' : ''}`}
              onSubmit={(e) => {
                e.preventDefault()
                nav(`/employees?q=${encodeURIComponent(q)}`)
              }}
            >
              <button type="button" className="search-ico" aria-label="Search" onClick={() => setSearchOpen(true)}>
                <Search size={15} />
              </button>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                aria-label="Search"
                onFocus={() => setSearchOpen(true)}
                onBlur={() => { if (!q) setSearchOpen(false) }}
              />
            </form>
            <div className="top-right">
              <div className="avatar-stack" title="Team">
                {shown.map((e) => <Avatar key={e.id} name={e.name} color={e.color} />)}
                {moreLabel && <span className="plus-chip">{moreLabel}</span>}
              </div>
              <button className="add-emp" onClick={() => { setErr(''); setAddOpen(true) }}>
                <Plus size={15} /> Add Employee
              </button>
              <NavLink to="/settings" className="me-av" title={user?.name}>
                <Avatar name={user?.name || 'You'} color="#d7e6ff" className="lg" />
              </NavLink>
              <div style={{ position: 'relative' }}>
                <button className="icon-btn" aria-label="Notifications" onClick={() => setBell((v) => !v)}>
                  <Bell size={16} />
                  {pending.length > 0 && <span className="dot" />}
                </button>
                {bell && (
                  <div className="bell-pop">
                    <strong style={{ fontSize: 13 }}>Pending approvals</strong>
                    {pending.length === 0 && <div className="item">Nothing waiting.</div>}
                    {pending.map((a) => (
                      <div className="item" key={a.id}>
                        <b>{a.employee_name}</b> · {a.type}
                        <div style={{ color: '#8b919c' }}>{a.start_date} → {a.end_date}</div>
                      </div>
                    ))}
                    <button className="linkish" onClick={() => { setBell(false); nav('/absences') }}>View all</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <Outlet context={{ search: q }} />
        </div>
      </div>
      {addOpen && (
        <Modal title="Add Employee" onClose={() => setAddOpen(false)}>
          <form onSubmit={addEmployee}>
            {err && <p className="err">{err}</p>}
            <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="field"><span>Role</span><input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></label>
            <label className="field"><span>Department</span><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
            <div className="modal-actions">
              <button type="button" className="btn light" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn dark" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
