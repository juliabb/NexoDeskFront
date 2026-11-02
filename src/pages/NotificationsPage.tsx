import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, CheckCheck, FileText, Headphones, LoaderCircle, LogOut, MessageSquare, Paperclip, TicketCheck, UserRoundCog, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../services/api'

type Notification = { id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; criadaEm: string; lidaEm?: string; chamado: { id: string; protocolo: string } | null }
type NotificationsResponse = { totalRegistros: number; naoLidas: number; notificacoes: Notification[] }

export function NotificationsPage({ embedded = false, onRead }: { embedded?: boolean; onRead?: () => void } = {}) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [filter, setFilter] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!session) return
    if (!silent) setLoading(true)
    setError('')
    const query = filter === 'nao-lidas' ? '?lida=false&pageSize=100' : '?pageSize=100'
    try { setData(await api<NotificationsResponse>(`/api/notificacoes${query}`, {}, session.token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as notificações.') }
    finally { if (!silent) setLoading(false) }
  }, [filter, session])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    const interval = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  async function openNotification(notification: Notification) {
    if (!session) return
    try {
      if (!notification.lida) await api(`/api/notificacoes/${notification.id}/lida`, { method: 'PATCH' }, session.token)
      onRead?.()
      navigate(notification.tipo === 'CadastroPendente' ? '/usuarios?status=AguardandoAprovacao' : notification.chamado ? `/chamados/${notification.chamado.id}` : '/')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir a notificação.') }
  }

  async function markAllRead() {
    if (!session || !data?.naoLidas) return
    setSaving(true); setError('')
    try { await api('/api/notificacoes/ler-todas', { method: 'PATCH' }, session.token); await load(); onRead?.() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível marcar as notificações.') }
    finally { setSaving(false) }
  }

  const content = <div className="dashboard-content notifications-content"><div className="page-heading"><div><span className="eyebrow">Atualizações</span><h1>Notificações</h1><p>Acompanhe as atualizações dos chamados e solicitações de acesso.</p><small className="live-update-label"><i /> Atualização automática</small></div><button className="secondary-button" disabled={saving || !data?.naoLidas} onClick={() => void markAllRead()}><CheckCheck /> {saving ? 'Marcando...' : 'Marcar todas como lidas'}</button></div>
      <div className="notification-summary"><button className={filter === 'todas' ? 'active' : ''} onClick={() => setFilter('todas')}>Todas <span>{data?.totalRegistros ?? 0}</span></button><button className={filter === 'nao-lidas' ? 'active' : ''} onClick={() => setFilter('nao-lidas')}>Não lidas <span>{data?.naoLidas ?? 0}</span></button></div>
      {error && <div className="form-error">{error}</div>}{loading ? <div className="panel-state"><LoaderCircle className="spin" /> Carregando notificações...</div> : !data?.notificacoes.length ? <div className="panel-state notification-empty"><Bell /><h3>Nenhuma notificação</h3><p>Suas atualizações aparecerão aqui.</p></div> : <div className="notifications-list">{data.notificacoes.map((notification) => <button type="button" key={notification.id} className={`notification-row ${notification.lida ? '' : 'unread'}`} onClick={() => void openNotification(notification)}><div className={`notification-icon type-${notification.tipo.toLowerCase()}`}>{notificationIcon(notification.tipo)}</div><div><header><strong>{notification.titulo}</strong><span>{notification.chamado?.protocolo ?? 'Solicitação de acesso'}</span></header><p>{notification.mensagem}</p><time>{formatNotificationDate(notification.criadaEm)}</time></div>{!notification.lida && <i aria-label="Não lida" />}</button>)}</div>}
    </div>
  if (embedded) return content
  return <main className="app-shell"><aside className="sidebar"><div className="sidebar-brand brand-line"><div className="brand-mark"><Headphones size={22} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></div><nav><button type="button" onClick={() => navigate('/')}><ArrowLeft /> Voltar ao painel</button><button type="button" className="active"><Bell /> Notificações</button></nav><div className="sidebar-user"><div className="avatar">{session?.name.charAt(0).toUpperCase()}</div><div><strong>{session?.name}</strong><span>{session?.perfil}</span></div></div><button className="logout-button" onClick={() => void logout()}><LogOut /> Sair</button></aside>
    <section className="dashboard">{content}</section></main>
}

function notificationIcon(type: string) {
  if (type === 'CadastroPendente') return <UserRoundCog />
  if (type === 'ChamadoAtribuido') return <TicketCheck />
  if (type === 'NovoComentario') return <MessageSquare />
  if (type === 'NovoAnexo') return <Paperclip />
  return <FileText />
}

function formatNotificationDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }


export function NotificationsPanel({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow }
  }, [])
  return <dialog ref={dialogRef} className="notifications-dialog" aria-label="Notificações" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="notifications-dialog-body">
      <button type="button" className="icon-button notifications-close" aria-label="Fechar notificações" onClick={onClose} autoFocus><X /></button>
      <NotificationsPage embedded onRead={onRead} />
    </section>
  </dialog>
}
