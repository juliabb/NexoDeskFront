import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, Bell, ChevronRight, Headphones, LayoutDashboard, LoaderCircle, LogOut, Plus, Search, Ticket, Users, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom'

type Chamado = { id: string; protocolo: string; titulo: string; prioridade: string; status: string; categoria: string; areaResponsavel: string; criadoEm: string; atualizadoEm?: string }
type ChamadosResponse = { pagina: number; tamanhoPagina: number; totalRegistros: number; chamados: Chamado[] }
type Categoria = { id: number; nome: string; descricao?: string; areaResponsavel: { id: number; nome: string } }
type NovoChamado = { id: string; protocolo: string }

const statusLabels: Record<string, string> = { Aberto: 'Aberto', EmTriagem: 'Em triagem', EmAtendimento: 'Em atendimento', AguardandoSolicitante: 'Aguardando você', Resolvido: 'Resolvido', Fechado: 'Fechado', Cancelado: 'Cancelado' }
const prioridadeLabels: Record<string, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta', Critica: 'Crítica' }

export function DashboardPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<ChamadosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const loadTickets = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    try { setData(await api<ChamadosResponse>('/api/chamados/me?pageSize=100', {}, session.token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os chamados.') }
    finally { setLoading(false) }
  }, [session])

  // A consulta inicial sincroniza a tela com os dados externos da API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadTickets() }, [loadTickets])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return data?.chamados ?? []
    return (data?.chamados ?? []).filter((item) => `${item.protocolo} ${item.titulo} ${item.categoria}`.toLowerCase().includes(term))
  }, [data, search])

  const stats = useMemo(() => {
    const chamados = data?.chamados ?? []
    return {
      total: data?.totalRegistros ?? 0,
      ongoing: chamados.filter((item) => ['Aberto', 'EmTriagem', 'EmAtendimento', 'AguardandoSolicitante'].includes(item.status)).length,
      resolved: chamados.filter((item) => ['Resolvido', 'Fechado'].includes(item.status)).length,
    }
  }, [data])

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div>
        <nav><a className="active" href="#inicio"><LayoutDashboard /> Visão geral</a><a href="#chamados"><Ticket /> Chamados</a>{session?.perfil !== 'Padrao' && <a href="#equipe"><Users /> Equipe</a>}</nav>
        <div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div>
        <button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button>
      </aside>
      <section className="dashboard">
        <header className="topbar"><div className="search"><Search /><input aria-label="Pesquisar" placeholder="Pesquisar chamados..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="icon-button" aria-label="Notificações"><Bell /></button><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div></header>
        <div className="dashboard-content">
          <div className="page-heading"><div><span className="eyebrow">Visão geral</span><h1>Olá, {session?.name.split(' ')[0]}!</h1><p>Acompanhe o que está acontecendo com seus chamados.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus /> Novo chamado</button></div>
          <div className="stat-grid"><article><span>Meus chamados</span><strong>{loading ? '—' : stats.total}</strong><small>Total de solicitações registradas</small></article><article><span>Em andamento</span><strong>{loading ? '—' : stats.ongoing}</strong><small>Precisam de acompanhamento</small></article><article><span>Resolvidos</span><strong>{loading ? '—' : stats.resolved}</strong><small>Resolvidos ou fechados</small></article></div>
          <section className="ticket-panel" id="chamados">
            <div className="panel-heading"><div><h2>Chamados recentes</h2><p>{search ? `${filtered.length} resultado(s) para sua busca` : 'Suas solicitações mais recentes'}</p></div></div>
            {loading && <div className="panel-state"><LoaderCircle className="spin" /><p>Carregando chamados...</p></div>}
            {!loading && error && <div className="panel-state error-state"><AlertCircle /><p>{error}</p><button onClick={() => void loadTickets()}>Tentar novamente</button></div>}
            {!loading && !error && filtered.length === 0 && <div className="panel-state"><div className="empty-icon"><Ticket /></div><h3>{search ? 'Nenhum chamado encontrado' : 'Nenhum chamado aberto ainda'}</h3><p>{search ? 'Tente pesquisar por outro termo.' : 'Quando precisar de ajuda, abra sua primeira solicitação.'}</p>{!search && <button className="primary-button" onClick={() => setModalOpen(true)}><Plus /> Abrir chamado</button>}</div>}
            {!loading && !error && filtered.length > 0 && <div className="ticket-list">{filtered.slice(0, 8).map((item) => <article className="ticket-row" key={item.id} onClick={() => navigate(`/chamados/${item.id}`)}><div className={`priority-dot priority-${item.prioridade.toLowerCase()}`} title={`Prioridade ${prioridadeLabels[item.prioridade]}`} /><div className="ticket-main"><div><span className="protocol">{item.protocolo}</span><span className={`status status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span></div><h3>{item.titulo}</h3><p>{item.categoria} · {item.areaResponsavel}</p></div><time>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.criadoEm))}</time><button className="row-action" aria-label={`Abrir chamado ${item.protocolo}`}><ChevronRight /></button></article>)}</div>}
          </section>
        </div>
      </section>
      {modalOpen && session && <NewTicketModal token={session.token} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); void loadTickets() }} />}
    </main>
  )
}

function NewTicketModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({ titulo: '', descricao: '', categoriaId: '', prioridade: 'Media' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Categoria[]>('/api/categorias-chamados', {}, token).then(setCategorias).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as categorias.')).finally(() => setLoading(false))
  }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try {
      await api<NovoChamado>('/api/chamados', { method: 'POST', body: JSON.stringify({ ...form, categoriaId: Number(form.categoriaId) }) }, token)
      onCreated()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir o chamado.') }
    finally { setSubmitting(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><div className="modal-heading"><div><span className="eyebrow">Nova solicitação</span><h2 id="new-ticket-title">Abrir chamado</h2></div><button onClick={onClose} aria-label="Fechar"><X /></button></div><form onSubmit={submit}>
    <div className="field"><label htmlFor="tituloChamado">Título</label><input id="tituloChamado" placeholder="Resuma o que você precisa" minLength={5} maxLength={150} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required /></div>
    <div className="modal-grid"><div className="field"><label htmlFor="categoriaChamado">Categoria</label><select id="categoriaChamado" disabled={loading} value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} required><option value="">{loading ? 'Carregando...' : 'Selecione'}</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div><div className="field"><label htmlFor="prioridadeChamado">Prioridade</label><select id="prioridadeChamado" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}><option value="Baixa">Baixa</option><option value="Media">Média</option><option value="Alta">Alta</option><option value="Critica">Crítica</option></select></div></div>
    <div className="field"><label htmlFor="descricaoChamado">Descrição</label><textarea id="descricaoChamado" placeholder="Descreva o problema com o máximo de detalhes possível..." minLength={10} maxLength={4000} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /><small>{form.descricao.length}/4000 caracteres</small></div>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={loading || submitting}>{submitting ? 'Abrindo...' : 'Abrir chamado'} {!submitting && <ArrowRight />}</button></div>
  </form></section></div>
}
