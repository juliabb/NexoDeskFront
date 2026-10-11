import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Headphones, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login, session, authNotice, clearAuthNotice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearAuthNotice()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="brand-line"><div className="brand-mark"><Headphones size={26} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div>
        <div className="auth-pitch">
          <span className="eyebrow">Suporte que aproxima</span>
          <h1>Conecte pessoas.<br />Resolva melhor.</h1>
          <p>Um espaço simples para registrar solicitações, acompanhar atendimentos e manter toda a equipe em sintonia.</p>
          <div className="feature-list">
            <div><CheckCircle2 /><span>Acompanhamento em tempo real</span></div>
            <div><CheckCircle2 /><span>Histórico completo dos chamados</span></div>
            <div><CheckCircle2 /><span>Comunicação centralizada</span></div>
          </div>
        </div>
        <small>© 2026 NexoDesk · Projeto demonstrativo</small>
      </section>

      <section className="auth-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="mobile-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div>
          <span className="eyebrow">Bem-vindo de volta</span>
          <h2>Acesse sua conta</h2>
          <p className="form-intro">Entre com seu e-mail e senha para acessar o portal.</p>
          <label htmlFor="email">E-mail</label>
          <div className="input-wrap"><Mail aria-hidden="true" /><input id="email" type="email" autoComplete="email" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <label htmlFor="password">Senha</label>
          <div className="input-wrap">
            <LockKeyhole aria-hidden="true" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button>
          </div>
          {authNotice && <div className="form-notice" role="status">{authNotice}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button login-button" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'} {!loading && <ArrowRight />}</button>
          <p className="signup-link">Ainda não tem acesso? <Link to="/cadastro">Solicite seu cadastro</Link></p>
        </form>
      </section>
    </main>
  )
}
