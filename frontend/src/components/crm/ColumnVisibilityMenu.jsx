import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react'

const STORAGE_PREFIX = 'comercial.crm.columns'

export function useColumnVisibility(storageKey, columns) {
  const safeKey = storageKey ? `${STORAGE_PREFIX}.${storageKey}` : null
  const hidableKeys = useMemo(() => columns.filter((column) => column.canHide !== false).map((column) => String(column.key)), [columns])
  const signature = hidableKeys.join('|')
  const [visibleKeys, setVisibleKeys] = useState(() => readVisibleKeys(safeKey, hidableKeys, columns))

  useEffect(() => {
    setVisibleKeys(readVisibleKeys(safeKey, hidableKeys, columns))
  }, [safeKey, signature, columns])

  useEffect(() => {
    if (!safeKey) return
    localStorage.setItem(safeKey, JSON.stringify(visibleKeys))
  }, [safeKey, visibleKeys])

  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys])
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.canHide === false || visibleKeySet.has(String(column.key))),
    [columns, visibleKeySet],
  )

  function toggleColumn(key) {
    const normalized = String(key)
    setVisibleKeys((current) => {
      const next = new Set(current)
      if (next.has(normalized)) {
        if (next.size <= 1) return current
        next.delete(normalized)
      } else {
        next.add(normalized)
      }
      return hidableKeys.filter((item) => next.has(item))
    })
  }

  function showAllColumns() {
    setVisibleKeys(hidableKeys)
  }

  return {
    visibleColumns,
    visibleKeys,
    visibleKeySet,
    hidableKeys,
    toggleColumn,
    showAllColumns,
  }
}

export function ColumnVisibilityMenu({ columns, visibleKeys, onToggle, onShowAll }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const hidableColumns = columns.filter((column) => column.canHide !== false)
  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }

    if (open) document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  if (!hidableColumns.length) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent sm:w-auto"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Columnas
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{visibleKeys.length}/{hidableColumns.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1000] mt-2 isolate w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-3 shadow-[0_28px_90px_rgba(15,23,42,0.32)] ring-1 ring-white/90 dark:bg-gray-950 dark:ring-white/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">Columnas visibles</p>
              <p className="text-xs text-muted-foreground">Se guarda para futuras sesiones.</p>
            </div>
            <button
              type="button"
              onClick={onShowAll}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
              title="Mostrar todas"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {hidableColumns.map((column) => {
              const key = String(column.key)
              const checked = visibleSet.has(key)
              const disableLast = checked && visibleKeys.length <= 1

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disableLast}
                  onClick={() => onToggle(key)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-transparent'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 truncate font-semibold text-foreground">{getColumnLabel(column)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function readVisibleKeys(storageKey, hidableKeys, columns = []) {
  if (!hidableKeys.length) return []

  const defaultHidden = new Set(
    columns.filter((column) => column.defaultHidden).map((column) => String(column.key)),
  )
  const defaultVisible = hidableKeys.filter((key) => !defaultHidden.has(key))

  if (!storageKey) {
    return defaultVisible.length ? defaultVisible : hidableKeys
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (Array.isArray(parsed)) {
      const allowed = new Set(hidableKeys)
      const sanitized = parsed.map(String).filter((key) => allowed.has(key))
      if (sanitized.length) {
        // Columnas nuevas en el registry que no estaban guardadas → visibles por defecto.
        const saved = new Set(sanitized)
        const added = hidableKeys.filter((key) => !saved.has(key) && !defaultHidden.has(key))
        return [...sanitized, ...added]
      }
    }
  } catch {
    // Si la preferencia esta corrupta, se vuelve a la vista por defecto.
  }

  return defaultVisible.length ? defaultVisible : hidableKeys
}

function getColumnLabel(column) {
  if (column.pickerLabel) return column.pickerLabel
  if (column.label) return column.label
  if (typeof column.header === 'string') return column.header
  return String(column.key)
}
