const CHILE_TZ = 'America/Santiago'

/** Offset ISO de America/Santiago para un día civil (UTC-3 o UTC-4 según la fecha). */
export function chileOffsetForDate(isoDate) {
  const day = String(isoDate || '').slice(0, 10)
  const probe = new Date(`${day}T15:00:00Z`)
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TZ,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(probe).find((part) => part.type === 'timeZoneName')?.value || ''
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return '-03:00'
  return `${match[1]}${String(match[2]).padStart(2, '0')}:${match[3] || '00'}`
}

/**
 * Ventana del mismo día civil Chile: 00:00:00.000 a 23:59:59.999.
 * El fin no es la medianoche del día siguiente.
 */
export function chileDayWindow(isoDate) {
  const day = String(isoDate || '').slice(0, 10)
  const offset = chileOffsetForDate(day)
  return {
    date: day,
    offset,
    from: `${day}T00:00:00.000${offset}`,
    to: `${day}T23:59:59.999${offset}`,
  }
}

/** Día civil YYYY-MM-DD en America/Santiago. */
export function chileCalendarDate(reference = new Date()) {
  const when = reference instanceof Date ? reference : new Date(reference)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when)
}

export function addCalendarDays(isoDate, days) {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const pad2 = (n) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

/** Día civil anterior en Chile (útil para cron 01:00 → extraer ayer). */
export function chileCalendarYesterday(reference = new Date()) {
  return addCalendarDays(chileCalendarDate(reference), -1)
}
