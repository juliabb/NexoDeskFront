import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, Bell, ChevronRight, Headphones, LayoutDashboard, LoaderCircle, LogOut, Paperclip, Plus, Search, Settings, Ticket, Users, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom'

type Chamado = { id: string; protocolo: string; titulo: string; prioridade: string; status: string; categoria: string; setorResponsavel: string; criadoEm: string; prazoResolucaoEm: string; atualizadoEm?: string; resolvidoEm?: string }
type ChamadosResponse = { pagina: number; tamanhoPagina: number; totalRegistros: number; chamados: Chamado[] }
type Categoria = { id: number; nome: string; descricao?: string; setorResponsavel: { id: number; nome: string } }
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
  const [notificationCount, setNotificationCount] = useState(0)
  const [renderedAt] = useState(() => Date.now())

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

  useEffect(() => {
    if (!session) return
    let active = true
    const refreshNotificationCount = () => {
      if (document.visibilityState !== 'visible') return
      api<{ quantidade: number }>('/api/notificacoes/nao-lidas/quantidade', {}, session.token)
        .then((result) => { if (active) setNotificationCount(result.quantidade) })
        .catch(() => undefined)
    }
    const handleVisibility = () => refreshNotificationCount()

    refreshNotificationCount()
    const interval = window.setInterval(refreshNotificationCount, 30_000)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [session])

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
        <nav><a className="active" href="#inicio"><LayoutDashboard /> Visão geral</a><button type="button" onClick={() => navigate('/meus-chamados')}><Ticket /> Meus chamados</button>{session?.perfil !== 'Padrao' && <button type="button" onClick={() => navigate('/fila')}><Users /> Fila de atendimento</button>}{session?.perfil === 'Administrador' && <><button type="button" onClick={() => navigate('/usuarios')}><Users /> Gestão de usuários</button><button type="button" onClick={() => navigate('/configuracoes')}><Settings /> Configurações</button></>}</nav>
        <div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div>
        <button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button>
      </aside>
      <section className="dashboard">
        <header className="topbar"><div className="search"><Search /><input aria-label="Pesquisar" placeholder="Pesquisar chamados..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className={`icon-button notification-button ${notificationCount > 0 ? 'has-unread' : ''}`} aria-label={`${notificationCount} notificações não lidas`} onClick={() => navigate('/notificacoes')}><Bell />{notificationCount > 0 && <span>{notificationCount > 99 ? '99+' : notificationCount}</span>}</button><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div></header>
        <div className="dashboard-content">
          <div className="page-heading"><div><span className="eyebrow">Visão geral</span><h1>Olá, {session?.name.split(' ')[0]}!</h1><p>Acompanhe o que está acontecendo com seus chamados.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus /> Novo chamado</button></div>
          <div className="stat-grid"><article><span>Meus chamados</span><strong>{loading ? '—' : stats.total}</strong><small>Total de solicitações registradas</small></article><article><span>Em andamento</span><strong>{loading ? '—' : stats.ongoing}</strong><small>Precisam de acompanhamento</small></article><article><span>Resolvidos</span><strong>{loading ? '—' : stats.resolved}</strong><small>Resolvidos ou fechados</small></article></div>
          <section className="ticket-panel" id="chamados">
            <div className="panel-heading"><div><h2>Chamados recentes</h2><p>{search ? `${filtered.length} resultado(s) para sua busca` : 'Suas solicitações mais recentes'}</p></div><button className="text-button" onClick={() => navigate('/meus-chamados')}>Ver todos <ArrowRight /></button></div>
            {loading && <div className="panel-state"><LoaderCircle className="spin" /><p>Carregando chamados...</p></div>}
            {!loading && error && <div className="panel-state error-state"><AlertCircle /><p>{error}</p><button onClick={() => void loadTickets()}>Tentar novamente</button></div>}
            {!loading && !error && filtered.length === 0 && <div className="panel-state"><div className="empty-icon"><Ticket /></div><h3>{search ? 'Nenhum chamado encontrado' : 'Nenhum chamado aberto ainda'}</h3><p>{search ? 'Tente pesquisar por outro termo.' : 'Quando precisar de ajuda, abra sua primeira solicitação.'}</p>{!search && <button className="primary-button" onClick={() => setModalOpen(true)}><Plus /> Abrir chamado</button>}</div>}
            {!loading && !error && filtered.length > 0 && <div className="ticket-list">{filtered.slice(0, 8).map((item) => { const sla = getSla(item.prazoResolucaoEm, renderedAt, item.resolvidoEm); return <article className="ticket-row" key={item.id} onClick={() => navigate(`/chamados/${item.id}`)}><div className={`priority-dot priority-${item.prioridade.toLowerCase()}`} title={`Prioridade ${prioridadeLabels[item.prioridade]}`} /><div className="ticket-main"><div><span className="protocol">{item.protocolo}</span><span className={`status status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span><span className={`sla-badge sla-${sla.kind}`}>{sla.label}</span></div><h3>{item.titulo}</h3><p>{item.categoria} · {item.setorResponsavel}</p></div><time>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.criadoEm))}</time><button className="row-action" aria-label={`Abrir chamado ${item.protocolo}`}><ChevronRight /></button></article> })}</div>}
          </section>
        </div>
      </section>
      {modalOpen && session && <NewTicketModal token={session.token} onClose={() => setModalOpen(false)} onCreated={(ticketId) => { setModalOpen(false); void loadTickets(); navigate(`/chamados/${ticketId}`) }} />}
    </main>
  )
}

function getSla(deadline: string, currentTime: number, resolved?: string) {
  const deadlineAt = new Date(deadline).getTime()
  const reference = resolved ? new Date(resolved).getTime() : currentTime
  if (reference > deadlineAt) return { kind: 'late', label: resolved ? 'Resolvido fora do SLA' : 'SLA atrasado' }
  if (resolved) return { kind: 'ok', label: 'SLA cumprido' }
  if (deadlineAt - reference <= 4 * 60 * 60 * 1000) return { kind: 'warning', label: 'SLA vence em breve' }
  return { kind: 'ok', label: 'Dentro do SLA' }
}

function NewTicketModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: (ticketId: string) => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({ titulo: '', descricao: '', categoriaId: '', impacto: 'Individual', urgencia: 'PodeAguardar', localizacao: '', patrimonioEquipamento: '', contatoPreferencial: '' })
  const [attachment, setAttachment] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Categoria[]>('/api/categorias-chamados', {}, token).then(setCategorias).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as categorias.')).finally(() => setLoading(false))
  }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    let chamadoCriado: NovoChamado | null = null
    try {
      const chamado = await api<NovoChamado>('/api/chamados', { method: 'POST', body: JSON.stringify({ ...form, categoriaId: Number(form.categoriaId) }) }, token)
      chamadoCriado = chamado
      if (attachment) {
        const attachmentData = new FormData()
        attachmentData.append('arquivo', attachment)
        await api(`/api/chamados/${chamado.id}/anexos`, { method: 'POST', body: attachmentData }, token)
      }
      onCreated(chamado.id)
    } catch (requestError) {
      if (chamadoCriado) {
        window.alert('O chamado foi criado, mas o anexo não pôde ser enviado. Você poderá tentar novamente na página do chamado.')
        onCreated(chamadoCriado.id)
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir o chamado.')
      }
    }
    finally { setSubmitting(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><div className="modal-heading"><div><span className="eyebrow">Nova solicitação</span><h2 id="new-ticket-title">Abrir chamado</h2></div><button onClick={onClose} aria-label="Fechar"><X /></button></div><form onSubmit={submit}>
    <div className="field"><label htmlFor="tituloChamado">Título</label><input id="tituloChamado" placeholder="Resuma o que você precisa" minLength={5} maxLength={150} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required /></div>
    <div className="field"><label htmlFor="categoriaChamado">Categoria</label><select id="categoriaChamado" disabled={loading} value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} required><option value="">{loading ? 'Carregando...' : 'Selecione o assunto da solicitação'}</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
    <div className="field"><label htmlFor="descricaoChamado">Descrição</label><textarea id="descricaoChamado" placeholder="Descreva o problema com o máximo de detalhes possível..." minLength={10} maxLength={4000} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /><small>{form.descricao.length}/4000 caracteres</small></div>
    <div className="modal-section"><h3>Impacto da solicitação</h3><p>Essas informações ajudam a equipe a definir a prioridade correta.</p></div>
    <div className="modal-grid"><div className="field"><label htmlFor="impactoChamado">Quem foi afetado?</label><select id="impactoChamado" value={form.impacto} onChange={(e) => setForm({ ...form, impacto: e.target.value })}><option value="Individual">Somente eu</option><option value="Equipe">Minha equipe</option><option value="MultiplosSetores">Vários setores</option><option value="Empresa">A empresa inteira</option></select></div><div className="field"><label htmlFor="urgenciaChamado">Quanto isso impede o trabalho?</label><select id="urgenciaChamado" value={form.urgencia} onChange={(e) => setForm({ ...form, urgencia: e.target.value })}><option value="PodeAguardar">Posso aguardar</option><option value="PrecisaHoje">Preciso resolver ainda hoje</option><option value="ImpedidoTrabalhar">Estou impedido de trabalhar</option></select></div></div>
    <div className="modal-section"><h3>Informações complementares</h3><p>Preencha quando ajudar a equipe a localizar ou reproduzir o problema.</p></div>
    <div className="modal-grid"><div className="field"><label htmlFor="localizacaoChamado">Localização <span>(opcional)</span></label><input id="localizacaoChamado" maxLength={150} placeholder="Ex.: 2º andar, sala 204" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div><div className="field"><label htmlFor="patrimonioChamado">Equipamento/patrimônio <span>(opcional)</span></label><input id="patrimonioChamado" maxLength={100} placeholder="Ex.: Notebook PAT-1234" value={form.patrimonioEquipamento} onChange={(e) => setForm({ ...form, patrimonioEquipamento: e.target.value })} /></div></div>
    <div className="field"><label htmlFor="contatoChamado">Preferência de contato <span>(opcional)</span></label><input id="contatoChamado" maxLength={200} placeholder="Ex.: Teams, ramal ou melhor horário" value={form.contatoPreferencial} onChange={(e) => setForm({ ...form, contatoPreferencial: e.target.value })} /></div>
    <div className="field"><label htmlFor="anexoChamado">Anexo <span>(opcional)</span></label><label className="ticket-file-picker" htmlFor="anexoChamado"><Paperclip /> <span>{attachment?.name ?? 'Selecionar arquivo'}</span></label><input className="sr-only" id="anexoChamado" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx" onChange={(event: ChangeEvent<HTMLInputElement>) => setAttachment(event.target.files?.[0] ?? null)} /><small>PDF, imagens, TXT, DOCX ou XLSX · até 10 MB</small></div>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={loading || submitting}>{submitting ? 'Abrindo...' : 'Abrir chamado'} {!submitting && <ArrowRight />}</button></div>
  </form></section></div>
}
