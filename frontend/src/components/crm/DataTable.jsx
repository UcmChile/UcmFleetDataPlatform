import { useEffect, useMemo, useState } from 'react'
import { ColumnVisibilityMenu, useColumnVisibility } from './ColumnVisibilityMenu'
import { ExportFileIcon } from './ExportFileIcon'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { exportExcel, exportPdf } from '../../utils/exporters'
import { parseSortableDate } from '../../utils/formatters'

function defaultRowKey(row, index) {
  const candidates = [
    ['log', row.id_log],
    ['caso', row.id_caso],
    ['contrato', row.id_contrato],
    ['oportunidad', row.id_oportunidad],
    ['contacto', row.id_contacto],
    ['empresa', row.id_empresa],
    ['row', row.id],
    ['codigo', row.codigo],
  ]
  const match = candidates.find(([, value]) => value !== undefined && value !== null)
  return match ? `${match[0]}-${match[1]}` : `row-${index}`
}

export function DataTable({
  columns,
  rows,
  onRowClick,
  onRowDoubleClick,
  empty = 'Sin registros',
  rowKey,
  columnStorageKey,
  enableSorting = false,
  clientSort = true,
  exportTitle,
  exportFilename,
  enableExport,
  wrapCells = false,
  tableOnly = false,
  pageSize,
  onSortConfigChange,
  initialSortConfig,
  size = 'default',
}) {
  const columnVisibility = useColumnVisibility(columnStorageKey, columns)
  const initialSortKey = columns.find((column) => isSortableColumn(column))?.key
  const [sortConfig, setSortConfig] = useState(
    initialSortConfig || { key: initialSortKey, direction: 'asc' },
  )
  const [page, setPage] = useState(1)
  const tableColumns = columnStorageKey ? columnVisibility.visibleColumns : columns
  const displayRows = useMemo(
    () => (enableSorting && clientSort ? sortRows(rows, columns, sortConfig) : rows),
    [clientSort, columns, enableSorting, rows, sortConfig],
  )
  const resolvedPageSize = Number(pageSize) > 0 ? Number(pageSize) : 0
  const totalPages = resolvedPageSize ? Math.max(1, Math.ceil(displayRows.length / resolvedPageSize)) : 1
  const currentPage = Math.min(page, totalPages)
  const pagedRows = resolvedPageSize
    ? displayRows.slice((currentPage - 1) * resolvedPageSize, currentPage * resolvedPageSize)
    : displayRows
  const compact = size === 'xxs' || size === 'xs'
  const tableTextClass = compact ? (size === 'xxs' ? 'text-xxs' : 'text-xs') : 'text-sm'
  const emptyTextClass = compact ? (size === 'xxs' ? 'text-xxs' : 'text-xs') : 'text-sm'
  const exportColumns = tableColumns.filter((column) => column.exportable !== false && !isUtilityColumn(column))
  const showExportButtons = enableExport ?? Boolean(exportFilename)

  useEffect(() => {
    onSortConfigChange?.(sortConfig)
  }, [onSortConfigChange, sortConfig])

  useEffect(() => {
    setPage(1)
  }, [rows, resolvedPageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function changeSort(column, direction) {
    setSortConfig({ key: column.key, direction })
  }

  function runExport(type) {
    const payload = {
      title: exportTitle || 'Registros',
      filename: exportFilename || 'registros',
      columns: exportColumns,
      rows: displayRows,
    }

    if (type === 'excel') exportExcel(payload)
    if (type === 'pdf') exportPdf(payload)
  }

  return (
    <div className="w-full max-w-full overflow-visible rounded-2xl border border-border bg-card shadow-sm">
      {columnStorageKey && (
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {columnVisibility.visibleKeys.length} de {columnVisibility.hidableKeys.length} columnas visibles
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ColumnVisibilityMenu
              columns={columns}
              visibleKeys={columnVisibility.visibleKeys}
              onToggle={columnVisibility.toggleColumn}
              onShowAll={columnVisibility.showAllColumns}
            />
            {showExportButtons && (
              <>
                <button
                  type="button"
                  onClick={() => runExport('excel')}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  <ExportFileIcon type="excel" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => runExport('pdf')}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300"
                >
                  <ExportFileIcon type="pdf" />
                  PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!tableOnly && (
      <div className="grid gap-3 p-3 md:hidden">
        {pagedRows.map((row, index) => (
          <article
            key={rowKey ? rowKey(row, index) : defaultRowKey(row, index)}
            onClick={() => onRowClick?.(row)}
            onDoubleClick={() => onRowDoubleClick?.(row)}
            className={`min-w-0 rounded-2xl border border-border bg-background/70 p-3 shadow-sm ${onRowClick || onRowDoubleClick ? 'cursor-pointer active:bg-accent/60' : ''}`}
          >
            <dl className="grid min-w-0 grid-cols-2 gap-2 text-sm">
              {tableColumns.map((column) => (
                <div key={column.key} className={`min-w-0 rounded-xl bg-card px-3 py-2 ring-1 ring-border/70 ${isUtilityColumn(column) ? 'col-span-2' : ''}`}>
                  <dt className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{mobileColumnLabel(column)}</dt>
                  <dd className={`min-w-0 font-semibold text-foreground/90 ${isActionsColumn(column) ? '' : 'break-words'}`}>
                    {renderBodyCell(column, row)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
        {!displayRows.length && (
          <p className={`rounded-2xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground ${emptyTextClass}`}>
            {empty}
          </p>
        )}
      </div>
      )}

      <div className={`overflow-x-auto ${tableOnly ? 'block' : 'hidden md:block'}`}>
        <table className={`min-w-full divide-y divide-border ${tableTextClass}`}>
          <thead className="bg-muted/70">
            <tr>
              {tableColumns.map((column) => (
                <th key={column.key} className={headerCellClass(column, wrapCells, compact)}>
                  {enableSorting && isSortableColumn(column) && typeof column.header === 'string' ? (
                    <SortHeader column={column} sortConfig={sortConfig} onSort={changeSort} />
                  ) : typeof column.header === 'string' ? (
                    <HeaderLabel label={column.header} icon={column.icon || getHeaderIcon(column.key, column.header)} />
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {pagedRows.map((row, index) => (
              <tr
                key={rowKey ? rowKey(row, index) : defaultRowKey(row, index)}
            onClick={() => onRowClick?.(row)}
            onDoubleClick={() => onRowDoubleClick?.(row)}
            className={onRowClick || onRowDoubleClick ? 'cursor-pointer transition hover:bg-accent/60' : ''}
              >
                {tableColumns.map((column) => (
                  <td key={column.key} className={bodyCellClass(column, wrapCells, compact)}>
                    {renderBodyCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
            {!pagedRows.length && (
              <tr>
                <td colSpan={tableColumns.length} className={`px-4 py-8 text-center text-muted-foreground ${emptyTextClass}`}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resolvedPageSize > 0 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span>
            Mostrando {displayRows.length ? (currentPage - 1) * resolvedPageSize + 1 : 0}-{Math.min(currentPage * resolvedPageSize, displayRows.length)} de {displayRows.length}
          </span>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex">
            <button
              type="button"
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition hover:bg-accent disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Anterior
            </button>
            <span className="flex h-9 items-center justify-center rounded-xl bg-muted px-3 text-xs font-bold text-muted-foreground">
              Pagina {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition hover:bg-accent disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function renderCell(column, row) {
  if (column.badge) {
    const badgeValue = column.badgeValue ? column.badgeValue(row) : row[column.key]
    return (
      <StatusBadge
        value={badgeValue}
        asSwitch={column.badgeAsSwitch}
        tones={column.badgeTones}
      />
    )
  }
  if (column.render) return column.render(row)
  const value = row[column.key]
  return value === undefined || value === null || value === '' ? 'Sin dato' : value
}

function renderBodyCell(column, row) {
  const content = renderCell(column, row)
  if (isActionsColumn(column)) {
    return <div className="flex w-max items-center justify-start">{content}</div>
  }
  return content
}

function shouldWrapCell(column, wrapCells) {
  return Boolean(wrapCells && column.wrap)
}

function headerCellClass(column, wrapCells = false, compact = false) {
  const wrap = shouldWrapCell(column, wrapCells)
  const padding = compact ? 'px-2 py-1.5' : 'px-4 py-3'
  const base = `${wrap ? 'whitespace-normal' : 'whitespace-nowrap'} ${padding} text-left text-xs font-bold uppercase tracking-wide text-muted-foreground align-middle`
  if (isActionsColumn(column)) return `${base} w-[1%] min-w-[10.5rem]`
  if (isSelectionColumn(column)) return `${base} w-12 px-3`
  if (column.key === 'codigo') return `${base} w-[1%] min-w-[9.5rem]`
  if (wrap) return `${base} min-w-[10rem]`
  return base
}

function bodyCellClass(column, wrapCells = false, compact = false) {
  const wrap = shouldWrapCell(column, wrapCells)
  const padding = compact ? 'px-2 py-1.5' : 'px-4 py-3'
  const base = `${wrap ? 'whitespace-normal break-words' : 'whitespace-nowrap'} ${padding} text-foreground/85 align-middle`
  if (isActionsColumn(column)) return `${base} w-[1%] min-w-[10.5rem]`
  if (isSelectionColumn(column)) return `${base} w-12 px-3`
  if (column.key === 'codigo') return `${base} w-[1%] min-w-[9.5rem] font-medium tabular-nums`
  if (wrap) return `${base} min-w-[10rem] max-w-[22rem]`
  return base
}

function isActionsColumn(column) {
  return ['actions', 'acciones'].includes(String(column.key))
}

function SortHeader({ column, sortConfig, onSort }) {
  const activeAscending = sortConfig.key === column.key && sortConfig.direction === 'asc'
  const activeDescending = sortConfig.key === column.key && sortConfig.direction === 'desc'

  return (
    <div className="flex min-w-32 items-center gap-2">
      <HeaderLabel label={column.header} icon={column.icon || getHeaderIcon(column.key, column.header)} />
      <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSort(column, 'asc')
          }}
          className={`flex h-7 w-7 items-center justify-center ${
            activeAscending
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={`Ordenar ${column.header} ascendente`}
          aria-label={`Ordenar ${column.header} ascendente`}
        >
          <Icon name="arrowUp" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSort(column, 'desc')
          }}
          className={`flex h-7 w-7 items-center justify-center border-l border-border ${
            activeDescending
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={`Ordenar ${column.header} descendente`}
          aria-label={`Ordenar ${column.header} descendente`}
        >
          <Icon name="arrowDown" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function sortRows(rows, columns, sortConfig) {
  const column = columns.find((item) => item.key === sortConfig.key)
  if (!column) return rows

  const direction = sortConfig.direction === 'asc' ? 1 : -1
  return [...rows].sort((first, second) => compareValues(sortableValue(first, column), sortableValue(second, column)) * direction)
}

function sortableValue(row, column) {
  const raw = column.sortValue?.(row)
    ?? row[column.key]
    ?? column.exportValue?.(row)
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

function isUtilityColumn(column) {
  return isSelectionColumn(column) || isActionsColumn(column)
}

function isSelectionColumn(column) {
  return ['selection', 'seleccion'].includes(String(column.key))
}

function isSortableColumn(column) {
  return column.canSort !== false && !isUtilityColumn(column)
}

function mobileColumnLabel(column) {
  if (column.pickerLabel) return column.pickerLabel
  if (column.label) return column.label
  if (typeof column.header === 'string') return column.header
  if (isSelectionColumn(column)) return 'Seleccion'
  if (isActionsColumn(column)) return 'Acciones'
  return String(column.key)
}
