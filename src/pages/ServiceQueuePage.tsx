import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, ChevronRight, Clock3, Headphones, Inbox, LoaderCircle, LogOut, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'

type QueueTicket = { id: string; protocolo: string; titulo: string; prioridade: string; status: string; categoria: string; solicitante: string; setorSolicitante: string; setorResponsavel: string; responsavel?: string; criadoEm: string; prazoResolucaoEm: string; resolvidoEm?: string }
type QueueResponse = { pagina: number; tamanhoPagina: number; totalRegistros: number; chamados: QueueTicket[] }

const statusLabels: Record<string, string> = { Aberto: 'Aberto', EmTriagem: 'Em triagem', EmAtendimento: 'Em atendimento', AguardandoSolicitante: 'Aguardando solicitante', Resolvido: 'Resolvido', Fechado: 'Fechado', Cancelado: 'Cancelado' }
const priorityLabels: Record<string, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta', Critica: 'Crítica' }
const PAGE_SIZE = 10

export function ServiceQueuePage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<QueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ativos')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [renderedAt] = useState(() => Date.now())
  const debouncedSearch = useDebouncedValue(search)

  const loadQueue = useCallback(async () => {
    if (!session) return
    setLoading(true); setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (debouncedSearch.trim()) params.set('termo', debouncedSearch.trim())
    if (status === 'ativos') params.set('somenteAtivos', 'true')
    else if (status !== 'todos') params.set('status', status)
    if (priority) params.set('prioridade', priority)
    try { setData(await api<QueueResponse>(`/api/chamados/fila?${params}`, {}, session.token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a fila.') }
    finally { setLoading(false) }
  }, [debouncedSearch, page, priority, session, status])

  // A consulta inicial sincroniza a fila com a API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadQueue() }, [loadQueue])

  const tickets = data?.chamados ?? []

  const stats = useMemo(() => {
    const items = data?.chamados ?? []
    return {
      waiting: items.filter((item) => ['Aberto', 'EmTriagem'].includes(item.status)).length,
      unattended: items.filter((item) => !item.responsavel && !['Resolvido', 'Fechado', 'Cancelado'].includes(item.status)).length,
      late: items.filter((item) => !item.resolvidoEm && !['Fechado', 'Cancelado'].includes(item.status) && new Date(item.prazoResolucaoEm).getTime() < renderedAt).length,
    }
  }, [data, renderedAt])

  return <main className="app-shell">
    <aside className="sidebar"><div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><Inbox /> Fila de atendimento</button></nav><div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div><button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button></aside>
    <section className="dashboard"><div className="dashboard-content queue-content">
      <div className="page-heading"><div><span className="eyebrow">Operação</span><h1>Fila de atendimento</h1><p>Priorize, acompanhe e distribua as solicitações da equipe.</p></div><button className="secondary-button" onClick={() => void loadQueue()}>Atualizar fila</button></div>
      <div className="stat-grid queue-stats"><article><span>Aguardando triagem</span><strong>{loading ? '—' : stats.waiting}</strong><small>Nesta página da fila</small></article><article><span>Sem responsável</span><strong>{loading ? '—' : stats.unattended}</strong><small>Nesta página da fila</small></article><article><span>SLA atrasado</span><strong>{loading ? '—' : stats.late}</strong><small>Nesta página da fila</small></article></div>
      <section className="ticket-panel"><div className="queue-toolbar"><div className="search"><Search /><input aria-label="Pesquisar na fila" placeholder="Protocolo, título, solicitante..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div><div className="queue-filter"><SlidersHorizontal /><select aria-label="Filtrar por status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="ativos">Chamados ativos</option><option value="todos">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por prioridade" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}><option value="">Todas as prioridades</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
        {loading && <div className="panel-state"><LoaderCircle className="spin" /><p>Carregando fila...</p></div>}
        {!loading && error && <div className="panel-state error-state"><AlertCircle /><p>{error}</p><button onClick={() => void loadQueue()}>Tentar novamente</button></div>}
        {!loading && !error && tickets.length === 0 && <div className="panel-state"><Inbox /><h3>Nenhum chamado encontrado</h3><p>A fila está em dia ou não há resultados para os filtros.</p></div>}
        {!loading && !error && tickets.length > 0 && <><div className="queue-table"><div className="queue-table-head"><span>Chamado</span><span>Solicitante</span><span>Responsável</span><span>Prazo</span><span /></div>{tickets.map((ticket) => { const sla = getQueueSla(ticket, renderedAt); return <button type="button" className="queue-row" key={ticket.id} onClick={() => navigate(`/chamados/${ticket.id}`)}><span className="queue-ticket"><small>{ticket.protocolo}</small><strong>{ticket.titulo}</strong><em>{ticket.categoria} · {ticket.setorResponsavel}</em></span><span><strong>{ticket.solicitante}</strong><small>{ticket.setorSolicitante}</small></span><span>{ticket.responsavel ?? <em>Não atribuído</em>}</span><span><span className={`sla-badge sla-${sla.kind}`}>{sla.label}</span><small><Clock3 /> {formatDeadline(ticket.prazoResolucaoEm)}</small></span><ChevronRight /></button> })}</div><Pagination page={data?.pagina ?? page} pageSize={data?.tamanhoPagina ?? PAGE_SIZE} total={data?.totalRegistros ?? 0} onPageChange={setPage} /></>}
      </section>
    </div></section>
  </main>
}

function getQueueSla(ticket: QueueTicket, now: number) {
  if (ticket.resolvidoEm) return { kind: new Date(ticket.resolvidoEm).getTime() <= new Date(ticket.prazoResolucaoEm).getTime() ? 'ok' : 'late', label: 'Finalizado' }
  const remaining = new Date(ticket.prazoResolucaoEm).getTime() - now
  if (remaining < 0) return { kind: 'late', label: 'Atrasado' }
  if (remaining <= 4 * 60 * 60 * 1000) return { kind: 'warning', label: 'Vence em breve' }
  return { kind: 'ok', label: 'No prazo' }
}

function formatDeadline(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
