import { formatAuditDateValue } from '../../utils/formatters'

const TECHNICAL_FIELDS = ['updated_at', 'created_at', 'deleted_at']

export function getAuditChanges(previousValue, currentValue, { ignoreTechnical = true } = {}) {
  const previous = parseJsonObject(previousValue)
  const current = parseJsonObject(currentValue)

  if (!previous && !current) return []

  if (!previous && current) {
    return Object.entries(current)
      .filter(([key]) => !ignoreTechnical || !isTechnicalLogField(key))
      .map(([field, next]) => ({ field, previous: null, next }))
  }

  if (previous && !current) {
    return Object.entries(previous)
      .filter(([key]) => !ignoreTechnical || !isTechnicalLogField(key))
      .map(([field, previousValueEntry]) => ({ field, previous: previousValueEntry, next: null }))
  }

  const keys = new Set([...Object.keys(previous), ...Object.keys(current)])
  const changes = []

  for (const field of keys) {
    if (ignoreTechnical && isTechnicalLogField(field)) continue

    const prev = Object.prototype.hasOwnProperty.call(previous, field) ? previous[field] : null
    const next = Object.prototype.hasOwnProperty.call(current, field) ? current[field] : null

    if (normalizeLogValue(prev) !== normalizeLogValue(next)) {
      changes.push({ field, previous: prev, next })
    }
  }

  return changes
}

export function getAuditChangesFromDetalle(detalleValue) {
  const detalle = parseJsonObject(detalleValue)
  if (!detalle) return []

  return Object.entries(detalle).map(([field, next]) => ({
    field,
    previous: null,
    next,
  }))
}

export function AuditChangeList({
  previousValue,
  currentValue,
  detalle,
  emptyMessage = 'Sin cambios detallados.',
}) {
  let changes = getAuditChanges(previousValue, currentValue)
  if (!changes.length) {
    changes = getAuditChangesFromDetalle(detalle)
  }

  if (!changes.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="space-y-2">
      {changes.map(({ field, previous, next }) => (
        <div key={field} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{formatFieldLabel(field)}</p>
          <div className="mt-1.5 grid gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Anterior</span>
              <p className="mt-0.5 break-words font-medium text-foreground/80">{formatDisplayValue(previous)}</p>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Nuevo</span>
              <p className="mt-0.5 break-words font-medium text-foreground">{formatDisplayValue(next)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuditValueBlock({ label, value, compareWith }) {
  const hasCompare = compareWith !== undefined

  return (
    <div className="mt-2">
      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <pre className="max-h-32 overflow-auto rounded-xl bg-muted p-2 text-xs text-foreground/80">
        {hasCompare ? renderJsonDiff(value, compareWith) : formatJson(value)}
      </pre>
    </div>
  )
}

export function AuditValueSummary({ value, compareWith, maxItems = 4 }) {
  const current = parseJsonObject(value)
  const previous = parseJsonObject(compareWith)

  if (!current) {
    return <span className="block max-w-72 whitespace-normal text-xs leading-relaxed text-foreground/75">{compactText(formatJson(value))}</span>
  }

  const entries = getOrderedEntries(current, previous).slice(0, maxItems)
  const hiddenCount = Math.max(Object.keys(current).length - entries.length, 0)
  const hasBusinessChanges = getChangedEntries(current, previous).some(([key]) => !isTechnicalLogField(key))

  return (
    <div className="flex max-w-80 flex-wrap gap-1.5 whitespace-normal">
      {entries.map(([key, currentValue]) => {
        const changed = isChangedLogValue(previous, key, currentValue)
        const shouldHighlight = changed && (!isTechnicalLogField(key) || !hasBusinessChanges)
        const inlineValue = compactText(formatJsonInline(currentValue), 46)

        return (
          <span key={key} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground/75">
            <span className="font-bold text-muted-foreground">{key}:</span>
            {shouldHighlight ? (
              <mark className="max-w-40 truncate rounded-md bg-yellow-200 px-1 font-bold text-amber-950 ring-1 ring-yellow-300">
                {inlineValue}
              </mark>
            ) : (
              <span className="max-w-40 truncate">{inlineValue}</span>
            )}
          </span>
        )
      })}
      {hiddenCount > 0 && (
        <span className="rounded-full border border-dashed border-border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
          +{hiddenCount}
        </span>
      )}
    </div>
  )
}

function renderJsonDiff(value, previousValue) {
  const current = parseJsonObject(value)
  const previous = parseJsonObject(previousValue)

  if (!current || !previous) return formatJson(value)

  const entries = Object.entries(current)
  const hasBusinessChanges = getChangedEntries(current, previous).some(([key]) => !isTechnicalLogField(key))

  return (
    <>
      {'{\n'}
      {entries.map(([key, currentValue], index) => {
        const changed = isChangedLogValue(previous, key, currentValue)
        const shouldHighlight = changed && (!isTechnicalLogField(key) || !hasBusinessChanges)
        const inlineValue = formatJsonInline(currentValue)

        return (
          <span key={key}>
            {'  '}
            <span>"{key}"</span>
            {': '}
            {shouldHighlight ? (
              <mark className="rounded-md bg-yellow-200 px-1 py-0.5 font-bold text-amber-950 ring-1 ring-yellow-300">
                {inlineValue}
              </mark>
            ) : (
              <span>{inlineValue}</span>
            )}
            {index < entries.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        )
      })}
      {'}'}
    </>
  )
}

function getOrderedEntries(current, previous) {
  const entries = Object.entries(current)
  if (!previous) return entries

  const hasBusinessChanges = getChangedEntries(current, previous).some(([key]) => !isTechnicalLogField(key))

  return entries.sort((a, b) => {
    const aChanged = isChangedLogValue(previous, a[0], a[1])
    const bChanged = isChangedLogValue(previous, b[0], b[1])
    const aVisibleChange = aChanged && (!isTechnicalLogField(a[0]) || !hasBusinessChanges)
    const bVisibleChange = bChanged && (!isTechnicalLogField(b[0]) || !hasBusinessChanges)
    if (aVisibleChange === bVisibleChange) return 0
    return aVisibleChange ? -1 : 1
  })
}

function getChangedEntries(current, previous) {
  if (!previous) return []
  return Object.entries(current).filter(([key, currentValue]) => isChangedLogValue(previous, key, currentValue))
}

function formatJson(value) {
  if (!value) return 'Sin datos'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return String(value)
  }
}

function parseJsonObject(value) {
  if (!value) return null

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function isChangedLogValue(previous, key, currentValue) {
  if (!previous) return false
  return !Object.prototype.hasOwnProperty.call(previous, key) || normalizeLogValue(previous[key]) !== normalizeLogValue(currentValue)
}

function normalizeLogValue(value) {
  if (value === undefined) return '__undefined__'
  return JSON.stringify(value)
}

function formatJsonInline(value) {
  const formatted = JSON.stringify(value)
  return formatted === undefined ? 'undefined' : formatted
}

function isTechnicalLogField(key) {
  return TECHNICAL_FIELDS.includes(String(key).toLowerCase())
}

function compactText(value, maxLength = 120) {
  const text = String(value || 'Sin datos').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text
}

const FIELD_LABELS = {
  contrasena: 'Contrasena',
  origen: 'Origen',
}

function formatFieldLabel(field) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  return String(field)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function formatAuditActionLabel(action) {
  const labels = {
    CREATE: 'Creacion',
    UPDATE: 'Actualizacion',
    DELETE_PHYSICAL: 'Eliminacion definitiva',
    DELETE_LOGICAL: 'Eliminacion logica',
    ACTIVATE: 'Activacion',
    DEACTIVATE: 'Desactivacion',
    STATUS: 'Cambio de estado',
    CHANGE_STAGE: 'Cambio de etapa',
    ADD_LOG: 'Bitacora comercial',
    CLOSE: 'Cierre',
    LOGIN: 'Inicio de sesion',
    CHANGE_PASSWORD: 'Cambio de contrasena',
    UPDATE_PROFILE: 'Datos personales actualizados',
    PASSWORD_RESET: 'Restablecimiento de contrasena',
  }
  return labels[action] || action
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (typeof value === 'object') return compactText(formatJsonInline(value), 240)

  const formattedDate = formatAuditDateValue(value)
  if (formattedDate) return formattedDate

  return String(value)
}
