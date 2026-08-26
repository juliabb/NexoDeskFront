import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'

function ProtectedRoute() {
  const { session } = useAuth()
  return session ? <DashboardPage /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute />} />
        <Route path="/chamados/:id" element={sessionRoute(<TicketDetailsPage />)} />
        <Route path="/configuracoes" element={adminRoute(<SettingsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

function sessionRoute(element: ReactNode) {
  return <SessionGate>{element}</SessionGate>
}

function adminRoute(element: ReactNode) {
  return <AdminGate>{element}</AdminGate>
}

function SessionGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session ? children : <Navigate to="/login" replace />
}

function AdminGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return session.perfil === 'Administrador' ? children : <Navigate to="/" replace />
}

export default App
