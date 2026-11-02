import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Building2, FolderCog, Headphones, LoaderCircle, LogOut, Plus, Tags, Pencil, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

type Departamento = { id: number; nome: string; sigla: string; ativo: boolean }
type Setor = { id: number; nome: string; ativo: boolean }
type Categoria = { id: number; nome: string; descricao?: string; ativa: boolean; setorResponsavel: { id: number; nome: string; departamentoId: number; disponivel: boolean } }

export function OrganizationalStructurePage() {
  const { session, logout } = useAuth()
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
  const [editingDepartment, setEditingDepartment] = useState<number | null>(null)
  const [editingSector, setEditingSector] = useState<number | null>(null)
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadBase = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [deps, cats] = await Promise.all([
        api<Departamento[]>('/api/departamentos?incluirInativos=true', {}, token),
        api<Categoria[]>('/api/categorias-chamados?incluirInativas=true', {}, token),
      ])
      setDepartamentos(deps); setCategorias(cats); setRevision((value) => value + 1)
      setDepartamentoSelecionado((current) => current || String(deps[0]?.id ?? ''))
      setDepartamentoCategoria((current) => deps.some((d) => String(d.id) === current && d.ativo) ? current : String(deps.find((d) => d.ativo)?.id ?? ''))
    } catch (requestError) {
      setError(message(requestError, 'Não foi possível carregar a estrutura organizacional.'))
    } finally { setLoading(false) }
  }, [token])

  // As consultas mantêm os cadastros da tela sincronizados com a API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBase() }, [loadBase])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!departamentoSelecionado) return
    let active = true
    api<Setor[]>(`/api/departamentos/${departamentoSelecionado}/setores?incluirInativos=true`, {}, token).then((items) => { if (active) setSetores(items) }).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os setores.')))
    return () => { active = false }
  }, [departamentoSelecionado, token, revision])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!departamentoCategoria) return
    let active = true
    api<Setor[]>(`/api/departamentos/${departamentoCategoria}/setores`, {}, token).then((items) => { if (active) setSetoresCategoria(items) }).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os setores.')))
    return () => { active = false }
  }, [departamentoCategoria, token, revision])

  async function createDepartamento(event: FormEvent) {
    event.preventDefault(); await submit('departamento', async () => {
      await api(editingDepartment ? `/api/departamentos/${editingDepartment}` : '/api/departamentos', { method: editingDepartment ? 'PUT' : 'POST', body: JSON.stringify(departamentoForm) }, token)
      setDepartamentoForm({ nome: '', sigla: '' }); setEditingDepartment(null); await loadBase()
    }, 'Departamento salvo com sucesso.')
  }

  async function createSetor(event: FormEvent) {
    event.preventDefault(); await submit('setor', async () => {
      await api(editingSector ? `/api/setores/${editingSector}` : '/api/setores', { method: editingSector ? 'PUT' : 'POST', body: JSON.stringify({ nome: setorNome, departamentoId: Number(departamentoSelecionado) }) }, token)
      setSetorNome(''); setEditingSector(null); await loadBase()
    }, 'Setor salvo com sucesso.')
  }

  async function createCategoria(event: FormEvent) {
    event.preventDefault(); await submit('categoria', async () => {
      await api(editingCategory ? `/api/categorias-chamados/${editingCategory.id}` : '/api/categorias-chamados', { method: editingCategory ? 'PUT' : 'POST', body: JSON.stringify({ ...categoriaForm, ativa: editingCategory?.ativa ?? true, setorResponsavelId: Number(categoriaForm.setorResponsavelId) }) }, token)
      setCategoriaForm({ nome: '', descricao: '', setorResponsavelId: '' }); setEditingCategory(null); await loadBase()
    }, 'Categoria salva com sucesso.')
  }

  async function toggleStatus(path: string, id: number, name: string, active: boolean) {
    if (active && !window.confirm(`Desativar "${name}"? O histórico será mantido. Este registro e seus vínculos deixarão de estar disponíveis para novos cadastros e chamados.`)) return
    await submit(`status-${path}-${id}`, async () => {
      await api(`/api/${path}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ ativo: !active }) }, token)
      await loadBase()
    }, active ? 'Registro desativado. Histórico mantido.' : 'Registro reativado com sucesso.')
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
      <nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><FolderCog /> Estrutura organizacional</button></nav>
      <div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div>
      <button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button>
    </aside>
    <section className="dashboard"><div className="dashboard-content settings-content">
      <div className="page-heading"><div><span className="eyebrow">Administração</span><h1>Estrutura organizacional</h1><p>Gerencie departamentos, setores e categorias. Desative registros sem apagar os vínculos e o histórico.</p></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}
      {loading ? <div className="panel-state"><LoaderCircle className="spin" /><p>Carregando estrutura...</p></div> : <div className="settings-grid">
        <StructureCard icon={<Building2 />} title="Departamentos" description="Agrupamentos maiores da empresa, como Tecnologia ou Administrativo.">
          <form onSubmit={createDepartamento}>{editingDepartment && <p className="structure-editing" role="status">Editando departamento</p>}<div className="field"><label htmlFor="nomeDepartamento">Nome</label><input id="nomeDepartamento" minLength={2} maxLength={100} value={departamentoForm.nome} onChange={(e) => setDepartamentoForm({ ...departamentoForm, nome: e.target.value })} required /></div><div className="field"><label htmlFor="siglaDepartamento">Sigla</label><input id="siglaDepartamento" minLength={2} maxLength={20} value={departamentoForm.sigla} onChange={(e) => setDepartamentoForm({ ...departamentoForm, sigla: e.target.value.toUpperCase() })} required /></div><button className="primary-button" disabled={!!saving}><Plus /> {saving === 'departamento' ? 'Salvando...' : editingDepartment ? 'Salvar alterações' : 'Adicionar'}</button>{editingDepartment && <button type="button" className="secondary-button" disabled={!!saving} onClick={() => { setEditingDepartment(null); setDepartamentoForm({ nome: '', sigla: '' }) }}>Cancelar edição</button>}</form>
          <div className="config-list structure-list">{departamentos.map((item) => <div key={item.id}><div className="structure-identity"><strong>{item.nome}</strong><small>{item.sigla} · {item.ativo ? 'Ativo' : 'Inativo'}</small></div><div className="structure-actions"><button type="button" disabled={!!saving} onClick={() => { setEditingDepartment(item.id); setDepartamentoForm({ nome: item.nome, sigla: item.sigla }); document.getElementById('nomeDepartamento')?.focus() }} aria-label={`Editar departamento ${item.nome}`}><Pencil /> Editar</button><button type="button" disabled={!!saving || !!editingDepartment || !!editingSector || !!editingCategory} onClick={() => void toggleStatus('departamentos', item.id, item.nome, item.ativo)}><Power /> {item.ativo ? 'Desativar' : 'Reativar'}</button></div></div>)}</div>
        </StructureCard>
        <StructureCard icon={<FolderCog />} title="Setores" description="Equipes dentro de um departamento, como Suporte, RH ou Compras.">
          <form onSubmit={createSetor}>{editingSector && <p className="structure-editing" role="status">Editando setor</p>}<div className="field"><label htmlFor="departamentoSetor">Departamento</label><select id="departamentoSetor" value={departamentoSelecionado} disabled={!!saving || !!editingSector} onChange={(e) => { setDepartamentoSelecionado(e.target.value); setSetorNome(''); setSetores([]) }} required>{departamentos.map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}{!item.ativo ? ' (inativo)' : ''}</option>)}</select></div><div className="field"><label htmlFor="nomeSetor">Nome do setor</label><input id="nomeSetor" minLength={2} maxLength={100} value={setorNome} onChange={(e) => setSetorNome(e.target.value)} required /></div><button className="primary-button" disabled={!!saving || (!editingSector && !departamentos.find((d) => String(d.id) === departamentoSelecionado)?.ativo)}><Plus /> {saving === 'setor' ? 'Salvando...' : editingSector ? 'Salvar alterações' : 'Adicionar'}</button>{editingSector && <button type="button" className="secondary-button" disabled={!!saving} onClick={() => { setEditingSector(null); setSetorNome('') }}>Cancelar edição</button>}</form>
          <div className="config-list structure-list">{setores.length ? setores.map((item) => <div key={item.id}><div className="structure-identity"><strong>{item.nome}</strong><small>{item.ativo ? 'Ativo' : 'Inativo'}{item.ativo && !departamentos.find((d) => String(d.id) === departamentoSelecionado)?.ativo ? ' · Departamento inativo' : ''}</small></div><div className="structure-actions"><button type="button" disabled={!!saving} onClick={() => { setEditingSector(item.id); setSetorNome(item.nome); document.getElementById('nomeSetor')?.focus() }} aria-label={`Editar setor ${item.nome}`}><Pencil /> Editar</button><button type="button" disabled={!!saving || !!editingDepartment || !!editingSector || !!editingCategory} onClick={() => void toggleStatus('setores', item.id, item.nome, item.ativo)}><Power /> {item.ativo ? 'Desativar' : 'Reativar'}</button></div></div>) : <p>Nenhum setor neste departamento.</p>}</div>
        </StructureCard>
        <StructureCard icon={<Tags />} title="Categorias de chamados" description="O assunto escolhido pelo usuário; cada categoria encaminha o chamado a um setor.">
          <form onSubmit={createCategoria}>{editingCategory && <p className="structure-editing" role="status">Editando categoria</p>}<div className="field"><label htmlFor="nomeCategoria">Nome</label><input id="nomeCategoria" minLength={3} maxLength={100} value={categoriaForm.nome} onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })} required /></div><div className="field"><label htmlFor="departamentoCategoria">Departamento responsável</label><select id="departamentoCategoria" value={departamentoCategoria} onChange={(e) => { setDepartamentoCategoria(e.target.value); setSetoresCategoria([]); setCategoriaForm((current) => ({ ...current, setorResponsavelId: '' })) }} required>{departamentos.filter((d) => d.ativo || d.id === editingCategory?.setorResponsavel.departamentoId).map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}{!item.ativo ? ' (inativo)' : ''}</option>)}</select></div><div className="field"><label htmlFor="setorCategoria">Setor responsável</label><select id="setorCategoria" value={categoriaForm.setorResponsavelId} onChange={(e) => setCategoriaForm({ ...categoriaForm, setorResponsavelId: e.target.value })} required><option value="">Selecione</option>{editingCategory && String(editingCategory.setorResponsavel.departamentoId) === departamentoCategoria && !setoresCategoria.some((item) => item.id === editingCategory.setorResponsavel.id) && <option value={editingCategory.setorResponsavel.id}>{editingCategory.setorResponsavel.nome} (indisponível para novos chamados)</option>}{setoresCategoria.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div><div className="field"><label htmlFor="descricaoCategoria">Descrição opcional</label><textarea id="descricaoCategoria" maxLength={500} value={categoriaForm.descricao} onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })} /></div><button className="primary-button" disabled={!!saving || !categoriaForm.setorResponsavelId}><Plus /> {saving === 'categoria' ? 'Salvando...' : editingCategory ? 'Salvar alterações' : 'Adicionar'}</button>{editingCategory && <button type="button" className="secondary-button" disabled={!!saving} onClick={() => { setEditingCategory(null); setCategoriaForm({ nome: '', descricao: '', setorResponsavelId: '' }) }}>Cancelar edição</button>}</form>
          <div className="config-list structure-list">{categorias.map((item) => <div key={item.id}><div className="structure-identity"><strong>{item.nome}</strong><small>{item.setorResponsavel.nome} · {item.ativa ? 'Ativa' : 'Inativa'}{item.ativa && !item.setorResponsavel.disponivel ? ' · Setor ou departamento inativo' : ''}</small>{item.descricao && <small>{item.descricao}</small>}</div><div className="structure-actions"><button type="button" disabled={!!saving} onClick={() => { setEditingCategory(item); setSetoresCategoria([]); setDepartamentoCategoria(String(item.setorResponsavel.departamentoId)); setCategoriaForm({ nome: item.nome, descricao: item.descricao ?? '', setorResponsavelId: String(item.setorResponsavel.id) }); document.getElementById('nomeCategoria')?.focus() }} aria-label={`Editar categoria ${item.nome}`}><Pencil /> Editar</button><button type="button" disabled={!!saving || !!editingDepartment || !!editingSector || !!editingCategory} onClick={() => void toggleStatus('categorias-chamados', item.id, item.nome, item.ativa)}><Power /> {item.ativa ? 'Desativar' : 'Reativar'}</button></div></div>)}</div>
        </StructureCard>
      </div>}
    </div></section>
  </main>
}

function StructureCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <article className="settings-card"><header><div className="settings-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></header>{children}</article>
}

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback }
