import { useEffect, useRef, useState } from 'react'

/**
 * Clave estable para DetailTabPanel: solo cambia al cambiar registro o pestaña.
 * No incluir estados loading/ready (provoca parpadeo al cargar datos del tab).
 */
export function buildDetailTabContentKey(recordId, activeTab, prefix = 'record') {
  const id = recordId != null && recordId !== '' ? String(recordId) : 'new'
  return `${prefix}-${id}-${activeTab}`
}

export function DetailTabPanel({ tabKey, children, className = '' }) {
  const [visible, setVisible] = useState(true)
  const previousKeyRef = useRef(null)

  useEffect(() => {
    if (previousKeyRef.current === null) {
      previousKeyRef.current = tabKey
      setVisible(true)
      return undefined
    }

    if (previousKeyRef.current === tabKey) {
      return undefined
    }

    previousKeyRef.current = tabKey
    setVisible(false)
    let innerFrame = 0
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(outerFrame)
      if (innerFrame) cancelAnimationFrame(innerFrame)
    }
  }, [tabKey])

  return (
    <div
      className={`min-w-0 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function TabContentSkeleton({ count = 6 }) {
  return (
    <div className="grid min-w-0 animate-pulse grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-16 rounded-xl border border-border/40 bg-muted/50" />
      ))}
    </div>
  )
}

export function TabTableSkeleton({ rows = 5 }) {
  return (
    <div className="min-w-0 animate-pulse space-y-2">
      <div className="h-10 rounded-lg border border-border/40 bg-muted/50" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 rounded-lg border border-border/30 bg-muted/40" />
      ))}
    </div>
  )
}

export function TabLoadingState({ label, variant = 'grid' }) {
  return (
    <div className="min-h-[12rem] space-y-3">
      <p className="text-sm text-muted-foreground">Cargando {label}...</p>
      {variant === 'table' ? <TabTableSkeleton /> : <TabContentSkeleton />}
    </div>
  )
}

export function createRecordTabCache(tabIds) {
  return tabIds.reduce((cache, tabId) => {
    cache[tabId] = { data: null, loaded: false, loading: false, error: '' }
    return cache
  }, {})
}

export function createListTabCache(tabIds) {
  return tabIds.reduce((cache, tabId) => {
    cache[tabId] = { rows: [], loaded: false, loading: false, error: '' }
    return cache
  }, {})
}

export async function fetchRecordTabData(loader, relatedId, emptyError = 'Sin registro relacionado.') {
  if (!relatedId) {
    return { data: null, loaded: true, loading: false, error: emptyError }
  }

  try {
    const result = await loader(relatedId)
    const data = result?.source === 'api' ? (result.data ?? null) : null
    if (!data) {
      return {
        data: null,
        loaded: true,
        loading: false,
        error: 'No se pudieron cargar los datos relacionados.',
      }
    }
    return { data, loaded: true, loading: false, error: '' }
  } catch {
    return {
      data: null,
      loaded: true,
      loading: false,
      error: 'No se pudieron cargar los datos relacionados.',
    }
  }
}

export async function fetchListTabData(loader, relatedId) {
  if (!relatedId) {
    return { rows: [], loaded: true, loading: false, error: 'Sin registro relacionado.' }
  }

  try {
    const result = await loader(relatedId)
    const rows = result?.source === 'api' ? (result.data || []) : []
    if (result?.source !== 'api') {
      return {
        rows: [],
        loaded: true,
        loading: false,
        error: 'No se pudieron cargar los datos relacionados.',
      }
    }
    return { rows, loaded: true, loading: false, error: '' }
  } catch {
    return {
      rows: [],
      loaded: true,
      loading: false,
      error: 'No se pudieron cargar los datos relacionados.',
    }
  }
}

export function detailTabButtonClass(isActive) {
  return `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-all duration-200 ease-out ${
    isActive
      ? 'bg-slate-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
      : 'text-slate-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800'
  }`
}

/** Bloquea scroll del body y cierra con Escape mientras la ficha esta abierta. */
export function useDetailPanelLock(open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])
}
