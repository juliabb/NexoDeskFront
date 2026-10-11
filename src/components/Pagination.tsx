import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, total)

  return <footer className="pagination">
    <span>{firstItem}–{lastItem} de {total} chamados</span>
    <div>
      <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft /></button>
      <strong>Página {page} de {totalPages}</strong>
      <button type="button" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight /></button>
    </div>
  </footer>
}
