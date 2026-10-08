import { StatusBadge } from '../components/crm/StatusBadge'
import { formatContractAmount, formatDate } from '../utils/formatters'

/**
 * @typedef {Object} MaintainerColumnDef
 * @property {string} id
 * @property {string} label
 * @property {string} [field]
 * @property {'text'|'date'|'status'|'fk'|'money'|'number'|'consistency'|'bit'} [format]
 * @property {boolean} [defaultVisible] — false = oculta por defecto (sigue en selector Columnas)
 * @property {string} [sublineField]
 * @property {string} [sublinePrefix]
 * @property {string} [symbolField]
 * @property {string} [currencyNameField]
 */

function readCellValue(row, col) {
  const field = col.field || col.id
  if (col.format === 'fk' && field.endsWith('_id')) {
    const inline = row[`${field.slice(0, -3)}_name`]
    if (inline != null && String(inline).trim()) return inline
  }
  const value = row[field]
  if (value == null || value === '') return null
  return value
}

function parseNumericSortValue(value) {
  if (value == null || value === '') return null
  const normalized = String(value).trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMoneyValue(row, col) {
  const field = col.field || col.id
  return formatContractAmount(row[field], {
    symbol: col.symbolField ? row[col.symbolField] : undefined,
    currencyName: col.currencyNameField ? row[col.currencyNameField] : undefined,
  })
}

function formatExportValue(row, col) {
  if (col.format === 'status') {
    return row.is_disabled ? 'Inactivo' : 'Activo'
  }
  if (col.format === 'consistency') {
    const ok = row.is_consistent === true || row.is_consistent === 1 || row.is_consistent === '1'
    return ok ? 'OK' : 'Inconsistente'
  }
  if (col.format === 'bit') {
    const on = row[col.field || col.id] === true || row[col.field || col.id] === 1 || row[col.field || col.id] === '1'
    return on ? 'Sí' : 'No'
  }
  if (col.format === 'money') {
    const formatted = formatMoneyValue(row, col)
    return formatted === '—' ? '' : formatted
  }
  const value = readCellValue(row, col)
  if (value == null) return ''
  if (col.format === 'date') return formatDate(value)
  return String(value)
}

function renderCell(row, col) {
  if (col.id === 'name' && col.sublineField) {
    const subline = row[col.sublineField]
    const sublineText = subline
      ? (col.sublinePrefix ? `${col.sublinePrefix}: ${subline}` : String(subline))
      : (col.sublinePrefix ? `${col.sublinePrefix}: ${row.id || '—'}` : (row.id || '—'))
    return (
      <div>
        <p className="font-semibold">{row.name || '—'}</p>
        <p className="text-xs text-muted-foreground">{sublineText}</p>
      </div>
    )
  }

  if (col.format === 'status') {
    return <StatusBadge value={row.is_disabled ? 'Inactivo' : 'Activo'} />
  }

  if (col.format === 'consistency') {
    const ok = row.is_consistent === true || row.is_consistent === 1 || row.is_consistent === '1'
    return (
      <span
        className={
          ok
            ? 'inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-200'
            : 'inline-flex rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-800 dark:text-rose-200'
        }
      >
        {ok ? 'Verde · OK' : 'Rojo · Δ ≠ último−primer'}
      </span>
    )
  }

  if (col.format === 'bit') {
    const on = row[col.field || col.id] === true || row[col.field || col.id] === 1 || row[col.field || col.id] === '1'
    return on ? 'Sí' : 'No'
  }

  if (col.format === 'money') {
    return formatMoneyValue(row, col)
  }

  const value = readCellValue(row, col)
  if (col.format === 'date') {
    return value ? formatDate(value) : '—'
  }

  return value == null || value === '' ? '—' : String(value)
}

/**
 * @param {MaintainerColumnDef[]} columnDefs
 * @returns {import('../components/crm/DataTable').DataTableColumn[]}
 */
export function buildMaintainerTableColumns(columnDefs) {
  return (columnDefs || []).map((col) => ({
    key: col.id,
    header: col.label,
    label: col.label,
    defaultHidden: col.defaultVisible === false,
    exportValue: (row) => formatExportValue(row, col),
    sortValue: col.format === 'date'
      ? (row) => readCellValue(row, col)
      : col.format === 'number'
        ? (row) => parseNumericSortValue(readCellValue(row, col))
        : undefined,
    render: (row) => renderCell(row, col),
  }))
}
