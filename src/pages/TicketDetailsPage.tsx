import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Clock3, Download, FileText, Headphones, LoaderCircle, MessageSquare, Paperclip, Send, Upload, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, downloadAuthenticated } from '../services/api'

type Person = { id: string; nomeCompleto: string }
type TicketDetails = { id: string; protocolo: string; titulo: string; descricao: string; prioridade: string; status: string; categoria: { id: number; nome: string }; solicitante: Person; setorSolicitante: { id: number; nome: string }; setorResponsavel: { id: number; nome: string }; responsavel?: Person; criadoEm: string; prazoResolucaoEm: string; atualizadoEm?: string; resolvidoEm?: string; fechadoEm?: string }
type Comment = { id: string; autor: Person; conteudo: string; interno: boolean; criadoEm: string }
type HistoryItem = { id: string; acao: string; statusAnterior?: string; statusNovo?: string; realizadoPor: Person; observacao?: string; criadoEm: string }
type HistoryResponse = { historico: HistoryItem[] }
type Attachment = { id: string; nomeOriginal: string; tipoConteudo: string; tamanhoBytes: number; interno: boolean; enviadoPor: Person; criadoEm: string }

const statusLabels: Record<string, string> = { Aberto: 'Aberto', EmTriagem: 'Em triagem', EmAtendimento: 'Em atendimento', AguardandoSolicitante: 'Aguardando você', Resolvido: 'Resolvido', Fechado: 'Fechado', Cancelado: 'Cancelado' }

function dateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }

export function TicketDetailsPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id || !session) return
    setLoading(true); setError('')
    try {
      const [ticketData, commentData, historyData, attachmentData] = await Promise.all([
        api<TicketDetails>(`/api/chamados/${id}`, {}, session.token),
        api<Comment[]>(`/api/chamados/${id}/comentarios`, {}, session.token),
        api<HistoryResponse>(`/api/chamados/${id}/historico`, {}, session.token),
        api<Attachment[]>(`/api/chamados/${id}/anexos`, {}, session.token),
      ])
      setTicket(ticketData); setComments(commentData); setHistory(historyData.historico); setAttachments(attachmentData)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o chamado.') }
    finally { setLoading(false) }
  }, [id, session])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function submitComment(event: FormEvent) {
    event.preventDefault()
    if (!id || !session || !comment.trim()) return
    setSending(true); setError('')
    try {
      await api(`/api/chamados/${id}/comentarios`, { method: 'POST', body: JSON.stringify({ conteudo: comment, interno: false }) }, session.token)
      setComment(''); await load()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o comentário.') }
    finally { setSending(false) }
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !id || !session) return
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'docx', 'xlsx']
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!allowedExtensions.includes(extension)) { setError('Formato não permitido. Use PDF, PNG, JPG, TXT, DOCX ou XLSX.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('O arquivo deve ter no máximo 10 MB.'); return }
    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('interno', 'false')
    setUploading(true); setError('')
    try { await api(`/api/chamados/${id}/anexos`, { method: 'POST', body: formData }, session.token); await load() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o anexo.') }
    finally { setUploading(false) }
  }

  async function downloadAttachment(attachment: Attachment) {
    if (!id || !session) return
    setDownloadingId(attachment.id); setError('')
    try { await downloadAuthenticated(`/api/chamados/${id}/anexos/${attachment.id}/download`, session.token, attachment.nomeOriginal) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível baixar o anexo.') }
    finally { setDownloadingId('') }
  }

  return <main className="details-page">
    <header className="details-header"><Link className="brand-line" to="/"><div className="brand-mark"><Headphones size={21} /></div><div className="brand-copy"><span>NEXO</span><strong>DESK</strong></div></Link><Link className="back-link" to="/"><ArrowLeft /> Voltar ao painel</Link></header>
    {loading && <div className="details-state"><LoaderCircle className="spin" /> Carregando chamado...</div>}
    {!loading && error && !ticket && <div className="details-state error-state"><p>{error}</p><button onClick={() => void load()}>Tentar novamente</button></div>}
    {!loading && ticket && <div className="details-container">
      <section className="details-main">
        <div className="ticket-title-block"><div><span className="protocol">{ticket.protocolo}</span><span className={`status status-${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status] ?? ticket.status}</span></div><h1>{ticket.titulo}</h1><p>Aberto em {dateTime(ticket.criadoEm)}</p></div>
        <article className="content-card"><h2>Descrição</h2><p className="ticket-description">{ticket.descricao}</p></article>
        <article className="content-card"><div className="section-heading"><div><MessageSquare /><h2>Conversas</h2></div><span>{comments.length}</span></div>
          <div className="comments-list">{comments.length === 0 ? <p className="muted-empty">Ainda não existem comentários.</p> : comments.map((item) => <div className="comment" key={item.id}><div className="comment-avatar">{item.autor.nomeCompleto.charAt(0)}</div><div><header><strong>{item.autor.nomeCompleto}</strong><time>{dateTime(item.criadoEm)}</time>{item.interno && <span>Interno</span>}</header><p>{item.conteudo}</p></div></div>)}</div>
          {!['Fechado', 'Cancelado'].includes(ticket.status) && <form className="comment-form" onSubmit={submitComment}><textarea aria-label="Novo comentário" placeholder="Escreva uma mensagem para a equipe..." maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} required /><div><small>{comment.length}/2000</small><button className="primary-button" disabled={sending}>{sending ? 'Enviando...' : 'Enviar'} {!sending && <Send />}</button></div></form>}
        </article>
        {error && <div className="form-error">{error}</div>}
      </section>
      <aside className="details-aside">
        <article className="content-card info-card"><h2>Informações</h2><dl><div><dt>Status</dt><dd>{statusLabels[ticket.status] ?? ticket.status}</dd></div><div><dt>Prioridade</dt><dd>{ticket.prioridade}</dd></div><div><dt>Categoria</dt><dd>{ticket.categoria.nome}</dd></div><div><dt>Setor responsável</dt><dd>{ticket.setorResponsavel.nome}</dd></div><div><dt>Prazo de resolução</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ticket.prazoResolucaoEm))}</dd></div><div><dt>SLA</dt><dd><SlaBadge deadline={ticket.prazoResolucaoEm} resolved={ticket.resolvidoEm} /></dd></div><div><dt><UserRound /> Responsável</dt><dd>{ticket.responsavel?.nomeCompleto ?? 'Não atribuído'}</dd></div></dl></article>
        <article className="content-card"><div className="section-heading"><div><Paperclip /><h2>Anexos</h2></div><span>{attachments.length}</span></div>{attachments.length === 0 ? <p className="muted-empty">Nenhum arquivo anexado.</p> : <div className="attachment-list">{attachments.map((item) => <button type="button" key={item.id} onClick={() => void downloadAttachment(item)} disabled={downloadingId === item.id}><FileText /><span><strong>{item.nomeOriginal}</strong><small>{fileSize(item.tamanhoBytes)} · {downloadingId === item.id ? 'Baixando...' : 'Baixar'}</small></span>{downloadingId === item.id ? <LoaderCircle className="spin" /> : <Download />}</button>)}</div>}{!['Fechado', 'Cancelado'].includes(ticket.status) && <label className={`upload-button ${uploading ? 'disabled' : ''}`}><Upload /> {uploading ? 'Enviando...' : 'Adicionar arquivo'}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx" onChange={(event) => void uploadAttachment(event)} disabled={uploading} /></label>}<small className="upload-hint">PDF, imagens, TXT, DOCX ou XLSX · até 10 MB</small></article>
        <article className="content-card"><div className="section-heading"><div><Clock3 /><h2>Histórico</h2></div></div><div className="timeline">{history.map((item) => <div key={item.id}><i /><span><strong>{item.acao}</strong><small>{item.realizadoPor.nomeCompleto} · {dateTime(item.criadoEm)}</small>{item.observacao && <p>{item.observacao}</p>}</span></div>)}</div></article>
      </aside>
    </div>}
  </main>
}

function SlaBadge({ deadline, resolved }: { deadline: string; resolved?: string }) {
  const [renderedAt] = useState(() => Date.now())
  const deadlineAt = new Date(deadline).getTime()
  const reference = resolved ? new Date(resolved).getTime() : renderedAt
  const late = reference > deadlineAt
  const warning = !resolved && !late && deadlineAt - reference <= 4 * 60 * 60 * 1000
  const label = late ? (resolved ? 'Resolvido fora do SLA' : 'SLA atrasado') : resolved ? 'SLA cumprido' : warning ? 'Vence em breve' : 'Dentro do SLA'
  return <span className={`sla-badge sla-${late ? 'late' : warning ? 'warning' : 'ok'}`}>{label}</span>
}
