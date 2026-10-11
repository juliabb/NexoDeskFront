import { useMemo, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, Headphones, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

export function ChangePasswordPage() {
  const { session, endSession } = useAuth()
  const token = session?.token
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const rules = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    symbol: /[^a-zA-Z0-9\s]/.test(newPassword),
  }), [newPassword])
  const validPassword = Object.values(rules).every(Boolean)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmation

  if (completed) return <Navigate to="/login" replace />
  if (!session) return <Navigate to="/login" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!token) return
    if (!validPassword) { setError('A nova senha ainda não atende a todos os requisitos.'); return }
    if (!passwordsMatch) { setError('A confirmação não corresponde à nova senha.'); return }
    if (currentPassword === newPassword) { setError('A nova senha deve ser diferente da senha atual.'); return }

    setSubmitting(true)
    try {
      await api('/api/usuarios/me/senha', { method: 'PUT', body: JSON.stringify({ senhaAtual: currentPassword, novaSenha: newPassword }) }, token)
      endSession('Senha alterada com sucesso. Entre novamente com a nova senha.')
      setCompleted(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível alterar a senha.')
    } finally { setSubmitting(false) }
  }

  return <main className="password-change-page">
    <header className="password-change-header"><div className="brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><span><ShieldCheck /> Atualização de segurança</span></header>
    <section className="password-change-card">
      <div className="password-change-icon"><KeyRound /></div>
      <span className="eyebrow">Primeiro acesso</span>
      <h1>Crie uma nova senha</h1>
      <p>Por segurança, substitua a senha temporária antes de acessar o NexoDesk.</p>
      <form onSubmit={submit}>
        <label htmlFor="currentPassword">Senha atual</label>
        <div className="input-wrap"><LockKeyhole /><input id="currentPassword" type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
        <label htmlFor="newPassword">Nova senha</label>
        <div className="input-wrap"><LockKeyhole /><input id="newPassword" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPasswords((current) => !current)} aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}>{showPasswords ? <EyeOff /> : <Eye />}</button></div>
        <div className="password-rule-grid"><Rule valid={rules.length}>8 caracteres</Rule><Rule valid={rules.upper}>Letra maiúscula</Rule><Rule valid={rules.lower}>Letra minúscula</Rule><Rule valid={rules.number}>Número</Rule><Rule valid={rules.symbol}>Símbolo</Rule></div>
        <label htmlFor="passwordConfirmation">Confirme a nova senha</label>
        <div className={`input-wrap ${confirmation && !passwordsMatch ? 'invalid' : ''}`}><LockKeyhole /><input id="passwordConfirmation" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
        {confirmation && <small className={passwordsMatch ? 'match-success' : 'match-error'}>{passwordsMatch ? 'As senhas coincidem.' : 'As senhas não coincidem.'}</small>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={submitting || !validPassword || !passwordsMatch}>{submitting ? 'Alterando senha...' : 'Salvar nova senha'}</button>
      </form>
    </section>
  </main>
}

function Rule({ valid, children }: { valid: boolean; children: string }) {
  return <span className={valid ? 'valid' : ''}><Check /> {children}</span>
}
