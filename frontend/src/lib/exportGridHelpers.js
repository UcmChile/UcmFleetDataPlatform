import { parseSortableDate } from '../utils/formatters'

export function sortRows(rows, columns, sortConfig, rowLabel) {
  const column = columns.find((item) => item.key === sortConfig.key)
  if (!column) return rows

  const direction = sortConfig.direction === 'asc' ? 1 : -1
  return [...rows].sort((first, second) => {
    const firstValue = sortableValue(first, column, sortConfig.key, rowLabel)
    const secondValue = sortableValue(second, column, sortConfig.key, rowLabel)
    return compareValues(firstValue, secondValue) * direction
  })
}

export function filterRowsByDate(rows, dateKey, dateFrom, dateTo) {
  if (!dateKey || (!dateFrom && !dateTo)) return rows

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null

  return rows.filter((row) => {
    const value = parseSortableDate(row[dateKey])
    if (!value) return false
    if (from && value < from) return false
    if (to && value > to) return false
    return true
  })
}

function sortableValue(row, column, key, rowLabel) {
  const raw = column?.sortValue?.(row)
    ?? row[key]
    ?? column?.exportValue?.(row)
    ?? rowLabel?.(row)
    ?? ''
  const date = parseSortableDate(raw)
  if (date) return date.getTime()

  const number = Number(raw)
  if (raw !== '' && Number.isFinite(number)) return number

  return String(raw).toLowerCase()
}

function compareValues(first, second) {
  if (typeof first === 'number' && typeof second === 'number') return first - second
  return String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' })
}

export function defaultRowLabel(row) {
  return row?.name || row?.nombre || row?.title || row?.codigo || row?.id || 'Registro'
}
