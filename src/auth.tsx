import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from './api'

type AuthState = {
  user: User | null
  loading: boolean
  today: string
  refresh: () => Promise<void>
  setUser: (u: User | null) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('2025-12-09')

  async function refresh() {
    try {
      const data = await api<{ user: User; today: string }>('/api/auth/me')
      setUser(data.user)
      if (data.today) setToday(data.today)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return <Ctx.Provider value={{ user, loading, today, refresh, setUser }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('auth')
  return v
}
