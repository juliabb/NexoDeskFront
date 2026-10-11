import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, ChevronRight, Clock3, Headphones, LoaderCircle, LogOut, Search, Ticket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'

type MyTicket = { id: string; protocolo: string; titulo: string; prioridade: string; status: string; categoria: string; setorResponsavel: string; criadoEm: string; prazoResolucaoEm: string; atualizadoEm?: string; resolvidoEm?: string }
type MyTicketsResponse = { pagina: number; tamanhoPagina: number; totalRegistros: number; chamados: MyTicket[] }

const PAGE_SIZE = 10

const statusLabels: Record<string, string> = { Aberto: 'Aberto', EmTriagem: 'Em triagem', EmAtendimento: 'Em atendimento', AguardandoSolicitante: 'Aguardando você', Resolvido: 'Resolvido', Fechado: 'Fechado', Cancelado: 'Cancelado' }
const priorityLabels: Record<string, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta', Critica: 'Crítica' }

export function MyTicketsPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<MyTicketsResponse | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [renderedAt] = useState(() => Date.now())
  const debouncedSearch = useDebouncedValue(search)

  const loadTickets = useCallback(async () => {
    if (!session) return
    setLoading(true); setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (debouncedSearch.trim()) params.set('termo', debouncedSearch.trim())
    if (status) params.set('status', status)
    if (priority) params.set('prioridade', priority)
    try { setData(await api<MyTicketsResponse>(`/api/chamados/me?${params}`, {}, session.token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar seus chamados.') }
    finally { setLoading(false) }
  }, [debouncedSearch, page, priority, session, status])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadTickets() }, [loadTickets])

  const tickets = data?.chamados ?? []

  return <main className="app-shell"><aside className="sidebar"><div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><Ticket /> Meus chamados</button></nav><div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div><button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button></aside>
    <section className="dashboard"><div className="dashboard-content my-tickets-content"><div className="page-heading"><div><span className="eyebrow">Solicitações</span><h1>Meus chamados</h1><p>Acompanhe todos os pedidos que você abriu.</p></div><button className="secondary-button" onClick={() => void loadTickets()}>Atualizar lista</button></div>
      <section className="ticket-panel my-tickets-panel"><div className="users-toolbar"><div className="search"><Search /><input aria-label="Pesquisar chamados" placeholder="Protocolo, título ou categoria..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div><select aria-label="Filtrar por status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por prioridade" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}><option value="">Todas as prioridades</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {loading && <div className="panel-state"><LoaderCircle className="spin" /> Carregando chamados...</div>}{!loading && error && <div className="panel-state error-state"><AlertCircle /><p>{error}</p><button onClick={() => void loadTickets()}>Tentar novamente</button></div>}{!loading && !error && tickets.length === 0 && <div className="panel-state"><Ticket /><h3>Nenhum chamado encontrado</h3><p>Não há solicitações correspondentes aos filtros escolhidos.</p></div>}
        {!loading && !error && tickets.length > 0 && <><div className="my-ticket-list">{tickets.map((ticket) => { const sla = getSla(ticket, renderedAt); return <button type="button" key={ticket.id} className="my-ticket-row" onClick={() => navigate(`/chamados/${ticket.id}`)}><div className={`priority-dot priority-${ticket.prioridade.toLowerCase()}`} /><div className="my-ticket-main"><div><span className="protocol">{ticket.protocolo}</span><span className={`status status-${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status]}</span></div><strong>{ticket.titulo}</strong><small>{ticket.categoria} · {ticket.setorResponsavel}</small></div><div className="my-ticket-sla"><span className={`sla-badge sla-${sla.kind}`}>{sla.label}</span><small><Clock3 /> Prazo {formatDate(ticket.prazoResolucaoEm)}</small></div><div className="my-ticket-date"><strong>{formatDate(ticket.criadoEm)}</strong><small>Data de abertura</small></div><ChevronRight /></button> })}</div><Pagination page={data?.pagina ?? page} pageSize={data?.tamanhoPagina ?? PAGE_SIZE} total={data?.totalRegistros ?? 0} onPageChange={setPage} /></>}
      </section>
    </div></section></main>
}

function getSla(ticket: MyTicket, now: number) {
  const deadline = new Date(ticket.prazoResolucaoEm).getTime()
  const reference = ticket.resolvidoEm ? new Date(ticket.resolvidoEm).getTime() : now
  if (reference > deadline) return { kind: 'late', label: ticket.resolvidoEm ? 'Fora do SLA' : 'Atrasado' }
  if (ticket.resolvidoEm) return { kind: 'ok', label: 'SLA cumprido' }
  if (deadline - reference <= 4 * 60 * 60 * 1000) return { kind: 'warning', label: 'Vence em breve' }
  return { kind: 'ok', label: 'No prazo' }
}

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) }
