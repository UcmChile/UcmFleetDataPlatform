import { createPortal } from 'react-dom'
import { AuditChangeList, formatAuditActionLabel } from './AuditValueDiff'
import { HeaderLabel } from './HeaderLabel'
import { Icon } from './Icon'
import { formatDateTime } from '../../utils/formatters'

export function EntityAuditLogModal({
  open,
  onClose,
  eyebrow = 'Log de cambios',
  title,
  titleIcon = 'history',
  loading,
  events,
  entityId,
  emptyMessage = 'No hay eventos registrados para este registro.',
}) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[190] overflow-y-auto bg-gray-950/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-[calc(100dvh-2rem)] items-center justify-center">
        <div
          className="max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl crm-scrollbar sm:p-6"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{eyebrow}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-gray-50">
                <HeaderLabel label={title} icon={titleIcon} size="lg" />
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-gray-500 shadow-sm transition hover:bg-white hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          {loading && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Cargando eventos...
            </p>
          )}

          {!loading && (
            <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
              {events.map((log) => (
                <article key={log.id_log} className="rounded-2xl border border-border bg-background/60 p-4 text-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="font-bold text-foreground">{formatAuditActionLabel(log.accion)}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.usuario_nombre || 'Sistema'} - {formatDateTime(log.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      ID {log.entidad_id || entityId}
                    </span>
                  </div>
                  <AuditChangeList
                    previousValue={log.valor_anterior}
                    currentValue={log.valor_nuevo}
                    detalle={log.detalle}
                    emptyMessage="Sin cambios detallados para este evento."
                  />
                </article>
              ))}
              {!events.length && (
                <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
