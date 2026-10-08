export function formatCurrencyUF(value) {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatUf(value) {
  if (value == null || value === '') return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return `UF ${number.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function resolveCurrencySymbol(symbol, currencyName) {
  const sym = String(symbol || '').trim()
  if (sym) return sym
  const name = String(currencyName || '').trim().toUpperCase()
  if (!name) return ''
  if (name.includes('UF') || name === 'UFM') return 'UF'
  if (name.includes('PESO') || name === 'CLP' || name === '$') return '$'
  if (name === 'USD' || name.includes('DOLAR')) return 'US$'
  return ''
}

/** Monto con símbolo de divisa (UF, $, etc.) para contratos y listados mixtos. */
export function formatContractAmount(value, { symbol, currencyName } = {}) {
  if (value == null || value === '') return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  const formatted = number.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const prefix = resolveCurrencySymbol(symbol, currencyName)
  return prefix ? `${prefix} ${formatted}` : formatted
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Parsea fechas ISO, DD-MM-YYYY, timestamps y objetos Date para ordenamiento. */
export function parseSortableDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const text = String(value).trim()
  if (!text) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{2}):(\d{2}))?/.exec(text)
  if (ddmmyyyy) {
    const [, day, month, year, hour = '0', minute = '0'] = ddmmyyyy
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Formato DD-MM-YYYY para grillas CRM. */
export function formatDate(value) {
  if (value == null || value === '') return 'Sin fecha'
  const text = String(value).trim()
  // Solo fecha (YYYY-MM-DD o medianoche UTC): no restar un día en Chile.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z?)?$/.exec(text)
  if (dateOnly) {
    return `${dateOnly[3]}-${dateOnly[2]}-${dateOnly[1]}`
  }
  const date = parseSortableDate(value)
  if (!date) return 'Sin fecha'
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`
}

/** Formato DD-MM-YYYY HH:mm para grillas CRM. */
export function formatDateTime(value) {
  const date = parseSortableDate(value)
  if (!date) return 'Sin fecha'
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Formato dd-mm-yyyy (y hora si aplica) para valores de auditoría. */
export function formatAuditDateValue(value) {
  if (value === null || value === undefined || value === '') return null
  const date = parseSortableDate(value)
  if (!date) return null

  const text = String(value).trim()
  if (/[T\s]\d{2}:\d{2}/.test(text) || /^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}/.test(text)) {
    return formatDateTime(date)
  }
  return formatDate(date)
}
