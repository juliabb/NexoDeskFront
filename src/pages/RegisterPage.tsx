import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Headphones } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

type Departamento = { id: number; nome: string; sigla: string }
type Setor = { id: number; nome: string }
type CadastroResponse = { mensagem: string; status: string }

const initialForm = { nomeCompleto: '', emailCorporativo: '', cpf: '', ramal: '', departamentoId: '', setorId: '', senha: '', confirmarSenha: '' }

function formatCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingSetores, setLoadingSetores] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api<Departamento[]>('/api/departamentos')
      .then(setDepartamentos)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os departamentos.'))
      .finally(() => setLoadingOptions(false))
  }, [])

  function handleDepartamentoChange(departamentoId: string) {
    setForm((current) => ({ ...current, departamentoId, setorId: '' }))
    setSetores([])
    if (!departamentoId) return
    setLoadingSetores(true)
    api<Setor[]>(`/api/departamentos/${departamentoId}/setores`)
      .then(setSetores)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os setores.'))
      .finally(() => setLoadingSetores(false))
  }

  const passwordChecks = useMemo(() => [
    ['8 caracteres', form.senha.length >= 8],
    ['Maiúscula e minúscula', /[A-Z]/.test(form.senha) && /[a-z]/.test(form.senha)],
    ['Número', /\d/.test(form.senha)],
    ['Caractere especial', /[^a-zA-Z0-9\s]/.test(form.senha)],
  ] as const, [form.senha])

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (form.senha !== form.confirmarSenha) { setError('As senhas não coincidem.'); return }
    if (!passwordChecks.every(([, valid]) => valid)) { setError('A senha ainda não atende a todos os requisitos.'); return }
    setSubmitting(true)
    try {
      const response = await api<CadastroResponse>('/api/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({ ...form, cpf: form.cpf.replace(/\D/g, ''), departamentoId: Number(form.departamentoId), setorId: Number(form.setorId), confirmarSenha: undefined }),
      })
      setSuccess(response.mensagem)
      setForm(initialForm)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o cadastro.')
    } finally { setSubmitting(false) }
  }

  return (
    <main className="register-page">
      <header className="register-header"><Link className="brand-line" to="/login"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></Link><Link className="back-link" to="/login"><ArrowLeft /> Voltar para o login</Link></header>
      <section className="register-card">
        {success ? <div className="success-state"><div className="success-icon"><Check /></div><span className="eyebrow">Solicitação enviada</span><h1>Cadastro realizado!</h1><p>{success}</p><Link className="primary-button" to="/login">Ir para o login <ArrowRight /></Link></div> : <>
          <div className="register-title"><span className="eyebrow">Crie seu acesso</span><h1>Solicite seu cadastro</h1><p>Preencha seus dados. Um responsável deverá aprovar seu acesso antes do primeiro login.</p></div>
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="field full"><label htmlFor="nome">Nome completo</label><input id="nome" value={form.nomeCompleto} onChange={(e) => update('nomeCompleto', e.target.value)} minLength={3} maxLength={150} required /></div>
            <div className="field full"><label htmlFor="emailCadastro">E-mail</label><input id="emailCadastro" type="email" placeholder="voce@empresa.com" value={form.emailCorporativo} onChange={(e) => update('emailCorporativo', e.target.value)} required /></div>
            <div className="field"><label htmlFor="cpf">CPF</label><input id="cpf" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => update('cpf', formatCpf(e.target.value))} required /></div>
            <div className="field"><label htmlFor="ramal">Ramal</label><input id="ramal" placeholder="Ex.: 1234" value={form.ramal} onChange={(e) => update('ramal', e.target.value)} required /></div>
            <div className="field"><label htmlFor="departamento">Departamento</label><select id="departamento" value={form.departamentoId} onChange={(e) => handleDepartamentoChange(e.target.value)} disabled={loadingOptions} required><option value="">{loadingOptions ? 'Carregando...' : 'Selecione'}</option>{departamentos.map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}</option>)}</select></div>
            <div className="field"><label htmlFor="setor">Setor</label><select id="setor" value={form.setorId} onChange={(e) => update('setorId', e.target.value)} disabled={!form.departamentoId || loadingSetores} required><option value="">{loadingSetores ? 'Carregando...' : 'Selecione'}</option>{setores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
            <div className="field"><label htmlFor="novaSenha">Senha</label><div className="plain-password"><input id="novaSenha" type={showPassword ? 'text' : 'password'} value={form.senha} onChange={(e) => update('senha', e.target.value)} minLength={8} maxLength={128} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar ou ocultar senha">{showPassword ? <EyeOff /> : <Eye />}</button></div></div>
            <div className="field"><label htmlFor="confirmarSenha">Confirmar senha</label><input id="confirmarSenha" type={showPassword ? 'text' : 'password'} value={form.confirmarSenha} onChange={(e) => update('confirmarSenha', e.target.value)} required /></div>
            <div className="password-rules full">{passwordChecks.map(([label, valid]) => <span className={valid ? 'valid' : ''} key={label}><Check /> {label}</span>)}</div>
            {error && <div className="form-error full" role="alert">{error}</div>}
            <div className="form-actions full"><Link to="/login">Cancelar</Link><button className="primary-button" disabled={submitting || loadingOptions}>{submitting ? 'Enviando...' : 'Solicitar cadastro'} {!submitting && <ArrowRight />}</button></div>
          </form>
        </>}
      </section>
    </main>
  )
}
