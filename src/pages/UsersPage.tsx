import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Headphones, LoaderCircle, LockKeyhole, LogOut, Pencil, Search, UserCheck, UserRoundCog, UserX, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

type User = { nomeCompleto: string; emailCorporativo: string; departamento: string; setor: string; ramal: string; perfil: string; status: string; ativo: boolean; protegido: boolean; criadoEm: string }
type UsersResponse = { totalRegistros: number; usuarios: User[] }
type Department = { id: number; nome: string; sigla: string }
type Sector = { id: number; nome: string }
type UserDetails = { nomeCompleto: string; emailCorporativo: string; departamentoId: number; departamento: string; setorId: number; setor: string; ramal: string; perfil: string; status: string; ativo: boolean }

const profileLabels: Record<string, string> = { Padrao: 'Usuário padrão', Atendente: 'Atendente', Gestor: 'Gestor', Administrador: 'Administrador' }
const statusLabels: Record<string, string> = { AguardandoAprovacao: 'Aguardando aprovação', Aprovado: 'Aprovado', Reprovado: 'Reprovado', Desativado: 'Desativado' }

export function UsersPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const token = session!.token
  const [data, setData] = useState<UsersResponse | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [profileFilter, setProfileFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState<UserDetails | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await api<UsersResponse>('/api/admin/usuarios?pageSize=100', {}, token)) }
    catch (requestError) { setError(message(requestError, 'Não foi possível carregar os usuários.')) }
    finally { setLoading(false) }
  }, [token])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadUsers() }, [loadUsers])

  const users = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data?.usuarios ?? []).filter((user) =>
      (!term || `${user.nomeCompleto} ${user.emailCorporativo} ${user.departamento} ${user.setor}`.toLowerCase().includes(term)) &&
      (!statusFilter || user.status === statusFilter) && (!profileFilter || user.perfil === profileFilter))
  }, [data, profileFilter, search, statusFilter])

  async function action(key: string, operation: () => Promise<void>, confirmation: string) {
    setSaving(key); setError(''); setSuccess('')
    try { await operation(); setSuccess(confirmation); await loadUsers() }
    catch (requestError) { setError(message(requestError, 'Não foi possível atualizar o usuário.')) }
    finally { setSaving('') }
  }

  async function changeStatus(user: User, status: string) {
    await action(user.emailCorporativo, () => api(`/api/admin/usuarios/${encodeURIComponent(user.emailCorporativo)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token), 'Status atualizado com sucesso.')
  }

  async function changeProfile(user: User, profile: string) {
    if (profile === user.perfil) return
    await action(user.emailCorporativo, () => api(`/api/admin/usuarios/${encodeURIComponent(user.emailCorporativo)}/perfil`, { method: 'PUT', body: JSON.stringify({ perfil: profile }) }, token), 'Perfil atualizado com sucesso.')
  }

  async function openEdit(user: User) {
    setSaving(user.emailCorporativo); setError('')
    try { setEditing(await api<UserDetails>(`/api/admin/usuarios/${encodeURIComponent(user.emailCorporativo)}`, {}, token)) }
    catch (requestError) { setError(message(requestError, 'Não foi possível carregar o usuário.')) }
    finally { setSaving('') }
  }

  const pending = data?.usuarios.filter((user) => user.status === 'AguardandoAprovacao').length ?? 0
  const attendants = data?.usuarios.filter((user) => user.perfil === 'Atendente' && user.ativo).length ?? 0

  return <main className="app-shell"><aside className="sidebar"><div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><UserRoundCog /> Gestão de usuários</button></nav><div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div><button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button></aside>
    <section className="dashboard"><div className="dashboard-content users-content"><div className="page-heading"><div><span className="eyebrow">Administração</span><h1>Gestão de usuários</h1><p>Aprove cadastros e organize as permissões da equipe.</p></div><button className="secondary-button" onClick={() => void loadUsers()}>Atualizar lista</button></div>
      <div className="stat-grid user-stats"><article><span>Total de usuários</span><strong>{loading ? '—' : data?.totalRegistros ?? 0}</strong><small>Cadastros encontrados</small></article><article><span>Aguardando aprovação</span><strong>{loading ? '—' : pending}</strong><small>Precisam de uma decisão</small></article><article><span>Atendentes ativos</span><strong>{loading ? '—' : attendants}</strong><small>Disponíveis para atribuição</small></article></div>
      {error && <div className="form-error">{error}</div>}{success && <div className="form-success">{success}</div>}
      <section className="ticket-panel"><div className="users-toolbar"><div className="search"><Search /><input placeholder="Nome, e-mail, departamento..." aria-label="Pesquisar usuários" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select aria-label="Filtrar por status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por perfil" value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)}><option value="">Todos os perfis</option>{Object.entries(profileLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {loading ? <div className="panel-state"><LoaderCircle className="spin" /> Carregando usuários...</div> : <div className="users-list">{users.map((user) => <article className="user-row" key={user.emailCorporativo}><div className="user-avatar">{user.nomeCompleto.charAt(0).toUpperCase()}</div><div className="user-identity"><div><strong>{user.nomeCompleto}</strong>{user.protegido && <span className="owner-badge"><LockKeyhole /> Proprietária</span>}</div><span>{user.emailCorporativo}</span><small>{user.departamento} · {user.setor} · Ramal {user.ramal}</small></div><div className="user-status"><span className={`account-status account-${user.status.toLowerCase()}`}>{statusLabels[user.status]}</span><small>Desde {user.criadoEm}</small></div><select aria-label={`Perfil de ${user.nomeCompleto}`} value={user.perfil} disabled={user.protegido || user.status !== 'Aprovado' || saving === user.emailCorporativo} onChange={(e) => void changeProfile(user, e.target.value)}>{Object.entries(profileLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="user-actions">{user.status === 'AguardandoAprovacao' && <><button className="approve" disabled={saving === user.emailCorporativo} onClick={() => void changeStatus(user, 'Aprovado')}><UserCheck /> Aprovar</button><button className="reject" disabled={saving === user.emailCorporativo} onClick={() => void changeStatus(user, 'Reprovado')}><UserX /> Reprovar</button></>}{user.status === 'Aprovado' && !user.protegido && <button className="reject" disabled={saving === user.emailCorporativo} onClick={() => void changeStatus(user, 'Desativado')}><UserX /> Desativar</button>}{user.status === 'Desativado' && <button className="approve" disabled={saving === user.emailCorporativo} onClick={() => void changeStatus(user, 'Aprovado')}><Check /> Reativar</button>}<button className="edit-user" disabled={user.protegido || saving === user.emailCorporativo} onClick={() => void openEdit(user)}><Pencil /> Editar</button></div></article>)}</div>}
      </section>
    </div></section>{editing && <EditUserModal user={editing} token={token} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSuccess('Dados do usuário atualizados com sucesso.'); void loadUsers() }} />}</main>
}

function EditUserModal({ user, token, onClose, onSaved }: { user: UserDetails; token: string; onClose: () => void; onSaved: () => void }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [form, setForm] = useState({ nomeCompleto: user.nomeCompleto, emailCorporativo: user.emailCorporativo, ramal: user.ramal, departamentoId: String(user.departamentoId), setorId: String(user.setorId) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api<Department[]>('/api/departamentos', {}, token).then(setDepartments).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os departamentos.'))) }, [token])
  useEffect(() => { if (form.departamentoId) api<Sector[]>(`/api/departamentos/${form.departamentoId}/setores`, {}, token).then(setSectors).catch((requestError: unknown) => setError(message(requestError, 'Não foi possível carregar os setores.'))) }, [form.departamentoId, token])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try { await api(`/api/admin/usuarios/${encodeURIComponent(user.emailCorporativo)}`, { method: 'PUT', body: JSON.stringify({ ...form, departamentoId: Number(form.departamentoId), setorId: Number(form.setorId) }) }, token); onSaved() }
    catch (requestError) { setError(message(requestError, 'Não foi possível atualizar o usuário.')) }
    finally { setSaving(false) }
  }

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className="ticket-modal user-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="eyebrow">Usuário</span><h2>Editar cadastro</h2></div><button onClick={onClose}><X /></button></div><form onSubmit={submit}><div className="field"><label>Nome completo</label><input minLength={3} maxLength={150} value={form.nomeCompleto} onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} required /></div><div className="field"><label>E-mail corporativo</label><input type="email" value={form.emailCorporativo} onChange={(e) => setForm({ ...form, emailCorporativo: e.target.value })} required /></div><div className="field"><label>Ramal</label><input maxLength={20} value={form.ramal} onChange={(e) => setForm({ ...form, ramal: e.target.value })} required /></div><div className="modal-grid"><div className="field"><label>Departamento</label><select value={form.departamentoId} onChange={(e) => setForm({ ...form, departamentoId: e.target.value, setorId: '' })} required>{departments.map((item) => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}</option>)}</select></div><div className="field"><label>Setor</label><select value={form.setorId} onChange={(e) => setForm({ ...form, setorId: e.target.value })} required><option value="">Selecione</option>{sectors.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></div></form></section></div>
}

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback }
