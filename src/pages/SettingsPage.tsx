import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Building2, FolderCog, Headphones, LoaderCircle, LogOut, Plus, Tags } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

type Departamento = { id: number; nome: string; sigla: string }
type Setor = { id: number; nome: string }
type Categoria = { id: number; nome: string; descricao?: string; ativa: boolean; setorResponsavel: { id: number; nome: string } }

export function SettingsPage() {
  const { session, logout, isDemo } = useAuth()
  const navigate = useNavigate()
  const token = session!.token
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState('')
  const [departamentoCategoria, setDepartamentoCategoria] = useState('')
  const [setoresCategoria, setSetoresCategoria] = useState<Setor[]>([])
  const [departamentoForm, setDepartamentoForm] = useState({ nome: '', sigla: '' })
  const [setorNome, setSetorNome] = useState('')
  const [categoriaForm, setCategoriaForm] = useState({ nome: '', descricao: '', setorResponsavelId: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadBase = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [deps, cats] = await Promise.all([
        api<Departamento[]>('/api/departamentos', {}, token),
        api<Categoria[]>('/api/categorias-chamados?incluirInativas=true', {}, token),
      ])
      setDepartamentos(deps); setCategorias(cats)
      setDepartamentoSelecionado((current) => current || String(deps[0]?.id ?? ''))
      setDepartamentoCategoria((current) => current || String(deps[0]?.id ?? ''))
    } catch (requestError) {
      setError(message(requestError, 'Não foi possível carregar as configurações.'))
    } finally { setLoading(false) }
  }, [token])

  // As consultas mantêm os cadastros da tela sincronizados com a API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBase() }, [loadBase])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!departamentoSelecionado) return
    api<Setor[]>(`/api/departamentos/${departamentoSelecionado}/setores`, {}, token).then(setSetores).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os setores.')))
  }, [departamentoSelecionado, token])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!departamentoCategoria) return
    api<Setor[]>(`/api/departamentos/${departamentoCategoria}/setores`, {}, token).then(setSetoresCategoria).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os setores.')))
  }, [departamentoCategoria, token])

  async function createDepartamento(event: FormEvent) {
    event.preventDefault(); await submit('departamento', async () => {
      await api('/api/departamentos', { method: 'POST', body: JSON.stringify(departamentoForm) }, token)
      setDepartamentoForm({ nome: '', sigla: '' }); await loadBase()
    }, 'Departamento criado com sucesso.')
  }

  async function createSetor(event: FormEvent) {
    event.preventDefault(); await submit('setor', async () => {
      await api('/api/setores', { method: 'POST', body: JSON.stringify({ nome: setorNome, departamentoId: Number(departamentoSelecionado) }) }, token)
      setSetorNome(''); setSetores(await api<Setor[]>(`/api/departamentos/${departamentoSelecionado}/setores`, {}, token))
    }, 'Setor criado com sucesso.')
  }

  async function createCategoria(event: FormEvent) {
    event.preventDefault(); await submit('categoria', async () => {
      await api('/api/categorias-chamados', { method: 'POST', body: JSON.stringify({ ...categoriaForm, setorResponsavelId: Number(categoriaForm.setorResponsavelId) }) }, token)
      setCategoriaForm({ nome: '', descricao: '', setorResponsavelId: '' }); await loadBase()
    }, 'Categoria criada com sucesso.')
  }

  async function submit(key: string, action: () => Promise<void>, confirmation: string) {
    setSaving(key); setError(''); setSuccess('')
    try { await action(); setSuccess(confirmation) }
    catch (requestError) { setError(message(requestError, 'Não foi possível salvar.')) }
    finally { setSaving('') }
  }

  return <main className="app-shell settings-shell">
    <aside className="sidebar">
      <div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div>
      <nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><FolderCog /> Configurações</button></nav>
      <div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div>
      <button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button>
    </aside>
    <section className="dashboard"><div className="dashboard-content settings-content">
      <div className="page-heading"><div><span className="eyebrow">Administração</span><h1>Configurações</h1><p>Organize a estrutura usada no cadastro e no direcionamento dos chamados.</p></div></div>
      {isDemo && <div className="form-notice" role="status">Modo de demonstração: as configurações podem ser consultadas, mas novos cadastros estão bloqueados para preservar a estrutura do sistema.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}
      {loading ? <div className="panel-state"><LoaderCircle className="spin" /><p>Carregando configurações...</p></div> : <div className="settings-grid">
        <SettingsCard icon={<Building2 />} title="Departamentos" description="Agrupamentos maiores da empresa, como Tecnologia ou Administrativo.">
          <form onSubmit={createDepartamento}><div className="field"><label htmlFor="nomeDepartamento">Nome</label><input id="nomeDepartamento" minLength={2} maxLength={100} value={departamentoForm.nome} onChange={(e) => setDepartamentoForm({ ...departamentoForm, nome: e.target.value })} required /></div><div className="field"><label htmlFor="siglaDepartamento">Sigla</label><input id="siglaDepartamento" minLength={2} maxLength={20} value={departamentoForm.sigla} onChange={(e) => setDepartamentoForm({ ...departamentoForm, sigla: e.target.value.toUpperCase() })} required /></div><button className="primary-button" disabled={isDemo || saving === 'departamento'}><Plus /> {saving === 'departamento' ? 'Salvando...' : 'Adicionar'}</button></form>
          <div className="config-list">{departamentos.map((item) => <div key={item.id}><strong>{item.nome}</strong><span>{item.sigla}</span></div>)}</div>
        </SettingsCard>
        <SettingsCard icon={<FolderCog />} title="Setores" description="Equipes dentro de um departamento, como Suporte, RH ou Compras.">
          <form onSubmit={createSetor}><div className="field"><label htmlFor="departamentoSetor">Departamento</label><select id="departamentoSetor" value={departamentoSelecionado} onChange={(e) => setDepartamentoSelecionado(e.target.value)} required>{departamentos.map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}</option>)}</select></div><div className="field"><label htmlFor="nomeSetor">Nome do setor</label><input id="nomeSetor" minLength={2} maxLength={100} value={setorNome} onChange={(e) => setSetorNome(e.target.value)} required /></div><button className="primary-button" disabled={isDemo || !departamentoSelecionado || saving === 'setor'}><Plus /> {saving === 'setor' ? 'Salvando...' : 'Adicionar'}</button></form>
          <div className="config-list">{setores.length ? setores.map((item) => <div key={item.id}><strong>{item.nome}</strong></div>) : <p>Nenhum setor neste departamento.</p>}</div>
        </SettingsCard>
        <SettingsCard icon={<Tags />} title="Categorias de chamados" description="O assunto escolhido pelo usuário; cada categoria encaminha o chamado a um setor.">
          <form onSubmit={createCategoria}><div className="field"><label htmlFor="nomeCategoria">Nome</label><input id="nomeCategoria" minLength={3} maxLength={100} value={categoriaForm.nome} onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })} required /></div><div className="field"><label htmlFor="departamentoCategoria">Departamento responsável</label><select id="departamentoCategoria" value={departamentoCategoria} onChange={(e) => { setDepartamentoCategoria(e.target.value); setCategoriaForm((current) => ({ ...current, setorResponsavelId: '' })) }} required>{departamentos.map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}</option>)}</select></div><div className="field"><label htmlFor="setorCategoria">Setor responsável</label><select id="setorCategoria" value={categoriaForm.setorResponsavelId} onChange={(e) => setCategoriaForm({ ...categoriaForm, setorResponsavelId: e.target.value })} required><option value="">Selecione</option>{setoresCategoria.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div><div className="field"><label htmlFor="descricaoCategoria">Descrição opcional</label><textarea id="descricaoCategoria" maxLength={500} value={categoriaForm.descricao} onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })} /></div><button className="primary-button" disabled={isDemo || !categoriaForm.setorResponsavelId || saving === 'categoria'}><Plus /> {saving === 'categoria' ? 'Salvando...' : 'Adicionar'}</button></form>
          <div className="config-list">{categorias.map((item) => <div key={item.id}><span className={`config-status ${item.ativa ? 'active' : ''}`}>{item.ativa ? 'Ativa' : 'Inativa'}</span><strong>{item.nome}</strong><small>{item.setorResponsavel.nome}</small></div>)}</div>
        </SettingsCard>
      </div>}
    </div></section>
  </main>
}

function SettingsCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <article className="settings-card"><header><div className="settings-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></header>{children}</article>
}

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback }
