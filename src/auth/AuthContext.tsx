import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services/api'

export type Session = {
  name: string
  email: string
  perfil: string
  deveAlterarSenha: boolean
  token: string
}

type AuthContextValue = {
  session: Session | null
  login: (emailCorporativo: string, senha: string) => Promise<Session>
  logout: () => Promise<void>
}

const STORAGE_KEY = 'nexodesk:session'
const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Session) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)
  const value = useMemo<AuthContextValue>(() => ({
    session,
    async login(emailCorporativo, senha) {
      const nextSession = await api<Session>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ emailCorporativo, senha }),
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      return nextSession
    },
    async logout() {
      try {
        if (session) await api('/api/auth/logout', { method: 'POST' }, session.token)
      } finally {
        localStorage.removeItem(STORAGE_KEY)
        setSession(null)
      }
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
