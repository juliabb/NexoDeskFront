import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServiceQueuePage } from './pages/ServiceQueuePage'
import { UsersPage } from './pages/UsersPage'
import { MyTicketsPage } from './pages/MyTicketsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import './App.css'

function ProtectedRoute() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return session.deveAlterarSenha ? <Navigate to="/alterar-senha" replace /> : <DashboardPage />
}

function App() {
  return (
    <AuthProvider>
      <DemoEnvironmentBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/alterar-senha" element={<PasswordChangeGate />} />
        <Route path="/" element={<ProtectedRoute />} />
        <Route path="/chamados/:id" element={sessionRoute(<TicketDetailsPage />)} />
        <Route path="/configuracoes" element={adminRoute(<SettingsPage />)} />
        <Route path="/fila" element={teamRoute(<ServiceQueuePage />)} />
        <Route path="/usuarios" element={adminRoute(<UsersPage />)} />
        <Route path="/meus-chamados" element={sessionRoute(<MyTicketsPage />)} />
        <Route path="/notificacoes" element={sessionRoute(<NotificationsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

function DemoEnvironmentBanner() {
  const { isDemo } = useAuth()
  if (!isDemo) return null

  return <div className="demo-environment-banner" role="status"><ShieldCheck /><span><strong>Ambiente de demonstração</strong> Você está usando uma conta administradora criada para testar os recursos do NexoDesk.</span></div>
}

function sessionRoute(element: ReactNode) {
  return <SessionGate>{element}</SessionGate>
}

function adminRoute(element: ReactNode) {
  return <AdminGate>{element}</AdminGate>
}

function teamRoute(element: ReactNode) {
  return <TeamGate>{element}</TeamGate>
}

function SessionGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return session.deveAlterarSenha ? <Navigate to="/alterar-senha" replace /> : children
}

function PasswordChangeGate() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return session.deveAlterarSenha ? <ChangePasswordPage /> : <Navigate to="/" replace />
}

function AdminGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.deveAlterarSenha) return <Navigate to="/alterar-senha" replace />
  return session.perfil === 'Administrador' ? children : <Navigate to="/" replace />
}

function TeamGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.deveAlterarSenha) return <Navigate to="/alterar-senha" replace />
  return session.perfil !== 'Padrao' ? children : <Navigate to="/" replace />
}

export default App
