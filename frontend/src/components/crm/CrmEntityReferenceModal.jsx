import { useEffect, useState } from 'react'
import { CrmFormModal } from './CrmFormModal'
import { loadContractEntityReference } from '../../lib/contractEntityReference'

export function CrmEntityReferenceModal({ open, target, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)

  useEffect(() => {
    if (!open || !target?.type || !target?.id) {
      setContent(null)
      setError('')
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError('')
    void loadContractEntityReference(target.type, target.id)
      .then((data) => {
        if (cancelled) return
        setContent(data)
      })
      .catch((err) => {
        if (cancelled) return
        setContent(null)
        setError(err?.message || 'No se pudo cargar la referencia')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, target?.id, target?.type])

  if (!open) return null

  const title = target?.title || content?.title || 'Referencia'

  return (
    <CrmFormModal
      open
      eyebrow="Referencia"
      title={title}
      titleIcon="eye"
      onClose={onClose}
      size="md"
      hint=""
      footer={(
        <div className="mt-4 flex shrink-0 justify-end border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-accent"
          >
            Cerrar
          </button>
        </div>
      )}
    >
      {loading && (
        <p className="text-sm text-muted-foreground">Cargando informacion...</p>
      )}
      {!loading && error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {!loading && !error && content && (
        <div className="space-y-4">
          {content.subtitle && (
            <p className="font-mono text-xs text-muted-foreground">{content.subtitle}</p>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            {content.fields.map((field) => (
              <div key={field.label} className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
          {!content.fields.length && (
            <p className="text-sm text-muted-foreground">Sin datos adicionales para mostrar.</p>
          )}
        </div>
      )}
    </CrmFormModal>
  )
}
