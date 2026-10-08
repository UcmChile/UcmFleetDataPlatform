import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiRequest, isApiError, isSystemAdmin } from '../../services/api'
import { Icon } from './Icon'

let dbInfoCache = null
let dbInfoPromise = null
const sourceMetaCache = new Map()

async function loadDbInfo() {
  if (dbInfoCache) return dbInfoCache
  if (!dbInfoPromise) {
    dbInfoPromise = apiRequest('/system/db-info')
      .then((data) => {
        dbInfoCache = data
        return data
      })
      .catch((error) => {
        dbInfoPromise = null
        throw error
      })
  }
  return dbInfoPromise
}

async function loadSourceMeta(dataSourceKey) {
  const key = String(dataSourceKey || '').replace(/^\//, '')
  if (!key) return null
  if (sourceMetaCache.has(key)) return sourceMetaCache.get(key)
  const data = await apiRequest(`/system/data-sources?key=${encodeURIComponent(key)}`)
  sourceMetaCache.set(key, data)
  if (data?.database) {
    dbInfoCache = {
      database: data.database,
      server: data.server,
      port: data.port,
    }
  }
  return data
}

/**
 * Indicador BD + tabla principal + botón Ver query (solo Owner/Administrador).
 * Usar en encabezados de listado (PageHeader) y formularios (CrmFormModal).
 */
export function EntityDataSourceHint({
  dataSourceKey,
  className = '',
  compact = false,
}) {
  const admin = isSystemAdmin()
  const [dbInfo, setDbInfo] = useState(dbInfoCache)
  const [sourceMeta, setSourceMeta] = useState(() => {
    const key = String(dataSourceKey || '').replace(/^\//, '')
    return key && sourceMetaCache.has(key) ? sourceMetaCache.get(key) : null
  })
  const [source, setSource] = useState(null)
  const [open, setOpen] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!admin || !dataSourceKey) return undefined
    let cancelled = false
    void Promise.all([loadDbInfo(), loadSourceMeta(dataSourceKey)])
      .then(([db, meta]) => {
        if (cancelled) return
        setDbInfo(db)
        setSourceMeta(meta)
      })
      .catch(() => {
        /* ignore for non-critical badge */
      })
    return () => {
      cancelled = true
    }
  }, [admin, dataSourceKey])

  const openQuery = useCallback(async () => {
    if (!dataSourceKey) return
    setOpen(true)
    setLoadingQuery(true)
    setError('')
    try {
      const data = await loadSourceMeta(dataSourceKey)
      setSource(data)
      setSourceMeta(data)
      if (data?.database) {
        setDbInfo(dbInfoCache)
      }
    } catch (err) {
      setSource(null)
      setError(isApiError(err) ? err.message : 'No se pudo obtener la query')
    } finally {
      setLoadingQuery(false)
    }
  }, [dataSourceKey])

  if (!admin || !dataSourceKey) return null

  const primaryTable = sourceMeta?.primaryTable || sourceMeta?.objects?.[0] || ''
  const dbLabel = dbInfo?.database ? `BD: ${dbInfo.database}` : 'BD: …'
  const tableLabel = primaryTable ? ` · Tabla: ${primaryTable}` : sourceMeta ? ' · Tabla: —' : ' · Tabla: …'
  const serverLabel = dbInfo?.server ? ` @ ${dbInfo.server}` : ''

  return (
    <>
      <div className={`mt-1 flex flex-wrap items-center gap-2 ${className}`}>
        <span className={`rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-200 ${compact ? '' : ''}`}>
          {dbLabel}
          {tableLabel}
          {!compact && serverLabel ? (
            <span className="font-normal text-amber-700/80 dark:text-amber-300/80">{serverLabel}</span>
          ) : null}
        </span>
        <button
          type="button"
          data-form-nav-ignore
          onClick={() => void openQuery()}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-foreground transition hover:bg-accent"
          title="Ver query SQL de consulta (solo administración)"
        >
          <Icon name="file" className="h-3.5 w-3.5" />
          Ver query
        </button>
      </div>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[min(90dvh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                  Diagnóstico SQL
                </p>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {source?.label || dataSourceKey}
                </h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {source
                    ? `${source.database} · ${source.primaryTable || source.objects?.[0] || '—'} @ ${source.server}:${source.port || 1433}`
                    : `${dbLabel}${tableLabel}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cerrar"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="crm-scrollbar max-h-[min(70dvh,560px)] space-y-4 overflow-y-auto px-4 py-4 text-sm">
              {loadingQuery && <p className="text-muted-foreground">Cargando…</p>}
              {error && <p className="text-destructive">{error}</p>}
              {source && !loadingQuery && (
                <>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objetos</p>
                    <p className="font-mono text-xs text-foreground">
                      {(source.objects || []).join(' · ') || '—'}
                    </p>
                    {source.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">{source.notes}</p>
                    ) : null}
                  </div>
                  <QueryBlock title="Listado (representativo)" sql={source.listSql} />
                  <QueryBlock title="Detalle (representativo)" sql={source.detailSql} />
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function QueryBlock({ title, sql }) {
  if (!sql) return null
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <button
          type="button"
          className="text-[11px] font-semibold text-sky-700 hover:underline dark:text-sky-300"
          onClick={() => {
            void navigator.clipboard?.writeText(sql)
          }}
        >
          Copiar
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-5 text-foreground whitespace-pre-wrap">
        {sql}
      </pre>
    </div>
  )
}
