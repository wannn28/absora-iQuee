import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Shell from './layout/Shell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeProfile from './pages/EmployeeProfile'
import Absences from './pages/Absences'
import Reports from './pages/Reports'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'
import Events from './pages/Events'

function Guard() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-wrap"><div className="auth-card">Loading…</div></div>
  if (!user) return <Navigate to="/login" replace />
  return <Shell />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Guard />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeProfile />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
