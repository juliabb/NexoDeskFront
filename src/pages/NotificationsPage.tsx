import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Bell, CheckCheck, FileText, Headphones, LoaderCircle, LogOut, MessageSquare, Paperclip, TicketCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

type Notification = { id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; criadaEm: string; lidaEm?: string; chamado: { id: string; protocolo: string } }
type NotificationsResponse = { totalRegistros: number; naoLidas: number; notificacoes: Notification[] }

export function NotificationsPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [filter, setFilter] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true); setError('')
    const query = filter === 'nao-lidas' ? '?lida=false&pageSize=100' : '?pageSize=100'
    try { setData(await api<NotificationsResponse>(`/api/notificacoes${query}`, {}, session.token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as notificações.') }
    finally { setLoading(false) }
  }, [filter, session])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function openNotification(notification: Notification) {
    if (!session) return
    if (!notification.lida) await api(`/api/notificacoes/${notification.id}/lida`, { method: 'PATCH' }, session.token)
    navigate(`/chamados/${notification.chamado.id}`)
  }

  async function markAllRead() {
    if (!session || !data?.naoLidas) return
    setSaving(true); setError('')
    try { await api('/api/notificacoes/ler-todas', { method: 'PATCH' }, session.token); await load() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível marcar as notificações.') }
    finally { setSaving(false) }
  }

  return <main className="app-shell"><aside className="sidebar"><div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><Bell /> Notificações</button></nav><div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div><button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button></aside>
    <section className="dashboard"><div className="dashboard-content notifications-content"><div className="page-heading"><div><span className="eyebrow">Atualizações</span><h1>Notificações</h1><p>Acompanhe movimentações importantes nos seus chamados.</p></div><button className="secondary-button" disabled={saving || !data?.naoLidas} onClick={() => void markAllRead()}><CheckCheck /> {saving ? 'Marcando...' : 'Marcar todas como lidas'}</button></div>
      <div className="notification-summary"><button className={filter === 'todas' ? 'active' : ''} onClick={() => setFilter('todas')}>Todas <span>{data?.totalRegistros ?? 0}</span></button><button className={filter === 'nao-lidas' ? 'active' : ''} onClick={() => setFilter('nao-lidas')}>Não lidas <span>{data?.naoLidas ?? 0}</span></button></div>
      {error && <div className="form-error">{error}</div>}{loading ? <div className="panel-state"><LoaderCircle className="spin" /> Carregando notificações...</div> : !data?.notificacoes.length ? <div className="panel-state notification-empty"><Bell /><h3>Nenhuma notificação</h3><p>As atualizações dos seus chamados aparecerão aqui.</p></div> : <div className="notifications-list">{data.notificacoes.map((notification) => <button type="button" key={notification.id} className={`notification-row ${notification.lida ? '' : 'unread'}`} onClick={() => void openNotification(notification)}><div className={`notification-icon type-${notification.tipo.toLowerCase()}`}>{notificationIcon(notification.tipo)}</div><div><header><strong>{notification.titulo}</strong><span>{notification.chamado.protocolo}</span></header><p>{notification.mensagem}</p><time>{formatNotificationDate(notification.criadaEm)}</time></div>{!notification.lida && <i aria-label="Não lida" />}</button>)}</div>}
    </div></section></main>
}

function notificationIcon(type: string) {
  if (type === 'ChamadoAtribuido') return <TicketCheck />
  if (type === 'NovoComentario') return <MessageSquare />
  if (type === 'NovoAnexo') return <Paperclip />
  return <FileText />
}

function formatNotificationDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
