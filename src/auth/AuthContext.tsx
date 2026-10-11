import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  authNotice: string
  isDemo: boolean
  login: (emailCorporativo: string, senha: string) => Promise<Session>
  logout: () => Promise<void>
  clearAuthNotice: () => void
}

const STORAGE_KEY = 'nexodesk:session'
const DEMO_EMAIL = 'teste@teste.com'
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
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(STORAGE_KEY)
      setSession(null)
      setAuthNotice('Sua sessão expirou. Entre novamente para continuar.')
    }

    window.addEventListener('nexodesk:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('nexodesk:unauthorized', handleUnauthorized)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    authNotice,
    isDemo: session?.email.toLowerCase() === DEMO_EMAIL,
    clearAuthNotice() { setAuthNotice('') },
    async login(emailCorporativo, senha) {
      const nextSession = await api<Session>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ emailCorporativo, senha }),
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      setAuthNotice('')
      setSession(nextSession)
      return nextSession
    },
    async logout() {
      try {
        if (session) await api('/api/auth/logout', { method: 'POST' }, session.token)
      } finally {
        localStorage.removeItem(STORAGE_KEY)
        setAuthNotice('')
        setSession(null)
      }
    },
  }), [authNotice, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
