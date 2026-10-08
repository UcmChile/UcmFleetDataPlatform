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
