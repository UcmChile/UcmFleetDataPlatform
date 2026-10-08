import { cn } from '../../lib/utils'

export function ServerPagination({
  page = 1,
  pageSize = 25,
  total = 0,
  loading = false,
  onPageChange,
  className = '',
}) {
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 25
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / safePageSize))
  const displayPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const from = total ? (displayPage - 1) * safePageSize + 1 : 0
  const to = Math.min(displayPage * safePageSize, total)

  function goTo(nextPage) {
    const target = Math.min(Math.max(1, nextPage), totalPages)
    if (target !== displayPage) onPageChange?.(target)
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <span className="text-sm text-muted-foreground">
        {loading ? 'Cargando...' : `Mostrando ${from}-${to} de ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || displayPage <= 1}
          onClick={() => goTo(displayPage - 1)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Pagina {displayPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={loading || displayPage >= totalPages}
          onClick={() => goTo(displayPage + 1)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
