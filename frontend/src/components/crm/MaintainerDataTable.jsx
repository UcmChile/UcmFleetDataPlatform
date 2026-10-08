import { useCallback, useEffect, useMemo, useState } from 'react'
import { ColumnVisibilityMenu, useColumnVisibility } from './ColumnVisibilityMenu'
import { DataTable } from './DataTable'
import { ExportFileIcon } from './ExportFileIcon'
import { ExportModal } from './ExportModal'
import { useNotifications } from './Notifications'
import { defaultRowLabel, filterRowsByDate, sortRows } from '../../lib/exportGridHelpers'
import { exportExcel, exportPdf } from '../../utils/exporters'

export function MaintainerDataTable({
  columns,
  rows,
  rowKey,
  idKey = 'id',
  columnStorageKey,
  enableSorting = false,
  serverSort = false,
  onSortConfigChange: externalOnSortConfigChange,
  exportTitle,
  exportFilename,
  exportDateKey,
  fetchAllRows,
  totalRecords = 0,
  empty = 'Sin registros',
  wrapCells = false,
  onRowClick,
  onRowDoubleClick,
  rowLabel = defaultRowLabel,
  initialSortConfig,
  renderToolbarActions,
}) {
  const notify = useNotifications()
  const columnVisibility = useColumnVisibility(columnStorageKey, columns)
  const initialSortKey = exportDateKey || columns.find((column) => column.canSort !== false && !isUtilityColumn(column))?.key
  const [sortConfig, setSortConfig] = useState(
    initialSortConfig || { key: initialSortKey, direction: 'desc' },
  )
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedRowsById, setSelectedRowsById] = useState(new Map())
  const [exportModal, setExportModal] = useState(null)
  const [exportScope, setExportScope] = useState('all')
  const [exportDateFrom, setExportDateFrom] = useState('')
  const [exportDateTo, setExportDateTo] = useState('')
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [exportRunning, setExportRunning] = useState(false)
  const [allRowsCache, setAllRowsCache] = useState([])
  const [loadingAllRows, setLoadingAllRows] = useState(false)

  const rangeDateKey = exportDateKey
  const exportRangeDateLabel = useMemo(() => {
    const column = columns.find((item) => item.key === rangeDateKey)
    return column?.pickerLabel || column?.header || 'Fecha de modificacion'
  }, [columns, rangeDateKey])

  const visibleColumns = columnVisibility.visibleColumns
  const activeSortLabel = columns.find((column) => column.key === sortConfig.key)?.header || 'Registro'
  const selectedCount = selectedIds.size
  const isServerPaginated = Number(totalRecords) > Number(rows.length)
  const resolvedServerSort = serverSort || (enableSorting && isServerPaginated)

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectedRowsById(new Map())
  }

  const allPageSelected = rows.length > 0 && rows.every((row) => selectedIds.has(String(row[idKey])))
  const partialPageSelected = rows.some((row) => selectedIds.has(String(row[idKey]))) && !allPageSelected

  const selectedRows = useMemo(
    () => Array.from(selectedRowsById.values()),
    [selectedRowsById],
  )

  const loadAllRows = useCallback(async () => {
    if (!fetchAllRows) return rows
    setLoadingAllRows(true)
    try {
      const data = await fetchAllRows()
      setAllRowsCache(data)
      return data
    } finally {
      setLoadingAllRows(false)
    }
  }, [fetchAllRows, rows])

  useEffect(() => {
    if (!exportModal) return
    if (exportScope === 'selected') return
    void loadAllRows()
  }, [exportModal, exportScope, exportDateFrom, exportDateTo, loadAllRows])

  const exportRows = useMemo(() => {
    if (exportScope === 'selected') {
      return enableSorting ? sortRows(selectedRows, visibleColumns, sortConfig, rowLabel) : selectedRows
    }

    const sourceRows = fetchAllRows ? allRowsCache : rows
    if (exportScope === 'date') {
      const filtered = filterRowsByDate(sourceRows, rangeDateKey, exportDateFrom, exportDateTo)
      return enableSorting ? sortRows(filtered, visibleColumns, sortConfig, rowLabel) : filtered
    }

    return enableSorting ? sortRows(sourceRows, visibleColumns, sortConfig, rowLabel) : sourceRows
  }, [
    allRowsCache,
    enableSorting,
    exportDateFrom,
    exportDateTo,
    exportScope,
    fetchAllRows,
    rangeDateKey,
    rowLabel,
    rows,
    selectedRows,
    sortConfig,
    visibleColumns,
  ])

  function toggleRow(row) {
    const id = String(row[idKey])
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSelectedRowsById((current) => {
      const next = new Map(current)
      if (next.has(id)) next.delete(id)
      else next.set(id, row)
      return next
    })
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allPageSelected) {
        rows.forEach((row) => next.delete(String(row[idKey])))
      } else {
        rows.forEach((row) => next.add(String(row[idKey])))
      }
      return next
    })
    setSelectedRowsById((current) => {
      const next = new Map(current)
      if (allPageSelected) {
        rows.forEach((row) => next.delete(String(row[idKey])))
      } else {
        rows.forEach((row) => next.set(String(row[idKey]), row))
      }
      return next
    })
  }

  function openExportModal(type) {
    setAllRowsCache([])
    setExportModal(type)
    setExportScope(selectedCount ? 'selected' : 'all')
    setShowExportPreview(false)
  }

  async function runExport() {
    const filename = exportFilename || 'registros'
    const exportColumns = visibleColumns.filter((column) => column.exportable !== false && !isUtilityColumn(column))
    let rowsToExport = exportRows

    if (exportScope !== 'selected' && fetchAllRows) {
      setExportRunning(true)
      try {
        const allRows = allRowsCache.length ? allRowsCache : await loadAllRows()
        if (exportScope === 'date') {
          rowsToExport = filterRowsByDate(allRows, rangeDateKey, exportDateFrom, exportDateTo)
        } else {
          rowsToExport = allRows
        }
        if (enableSorting) {
          rowsToExport = sortRows(rowsToExport, visibleColumns, sortConfig, rowLabel)
        }
      } catch (error) {
        notify.error('No se pudieron cargar los registros', error?.message || 'Intenta nuevamente.')
        setExportRunning(false)
        return
      }
    } else {
      setExportRunning(true)
    }

    try {
      const payload = {
        title: exportTitle || 'Registros',
        columns: exportColumns,
        rows: rowsToExport,
        filename,
      }
      if (exportModal === 'excel') exportExcel(payload)
      if (exportModal === 'pdf') exportPdf(payload)
      notify.success('Exportacion lista', `${rowsToExport.length} registros fueron enviados a ${exportModal === 'excel' ? 'Excel' : 'PDF'}.`)
      setExportModal(null)
    } catch (error) {
      notify.error('No se pudo exportar', error?.message || 'Revisa los datos e intenta nuevamente.')
    } finally {
      setExportRunning(false)
    }
  }

  const tableColumns = useMemo(() => [
    {
      key: 'selection',
      canHide: false,
      header: (
        <input
          type="checkbox"
          checked={allPageSelected}
          ref={(element) => {
            if (element) element.indeterminate = partialPageSelected
          }}
          onChange={togglePageSelection}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          aria-label="Seleccionar pagina"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(String(row[idKey]))}
          onChange={() => toggleRow(row)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          aria-label={`Seleccionar ${rowLabel(row)}`}
        />
      ),
    },
    ...visibleColumns,
  ], [allPageSelected, idKey, partialPageSelected, rowLabel, selectedIds, visibleColumns])

  const exportRecordCount = useMemo(() => {
    if (exportScope === 'selected') return selectedCount
    if (exportScope === 'date') return exportRows.length
    if (fetchAllRows) {
      if (loadingAllRows && !allRowsCache.length) return totalRecords || rows.length
      return allRowsCache.length || totalRecords || rows.length
    }
    return exportRows.length
  }, [
    allRowsCache.length,
    exportRows.length,
    exportScope,
    fetchAllRows,
    loadingAllRows,
    rows.length,
    selectedCount,
    totalRecords,
  ])

  return (
    <div className="min-w-0 max-w-full">
      <div className="relative z-20 mb-3 rounded-2xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 shrink-0">
            <p className="text-sm font-bold text-foreground">
              {selectedCount ? `${selectedCount} seleccionados` : `${totalRecords || rows.length} registros`}
            </p>
            <p className="text-xs text-muted-foreground">
              Orden actual: {activeSortLabel} {sortConfig.direction === 'asc' ? 'ascendente' : 'descendente'}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
            {renderToolbarActions?.({
              selectedRows,
              selectedCount,
              clearSelection,
            })}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <ColumnVisibilityMenu
              columns={columns}
              visibleKeys={columnVisibility.visibleKeys}
              onToggle={columnVisibility.toggleColumn}
              onShowAll={columnVisibility.showAllColumns}
            />
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              onClick={() => openExportModal('excel')}
            >
              <ExportFileIcon type="excel" />
              Excel
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300"
              onClick={() => openExportModal('pdf')}
            >
              <ExportFileIcon type="pdf" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <DataTable
        columns={tableColumns}
        rows={rows}
        rowKey={rowKey}
        enableSorting={enableSorting}
        clientSort={!resolvedServerSort}
        empty={empty}
        wrapCells={wrapCells}
        enableExport={false}
        onRowClick={onRowClick || toggleRow}
        onRowDoubleClick={onRowDoubleClick}
        initialSortConfig={initialSortConfig || sortConfig}
        onSortConfigChange={(config) => {
          setSortConfig(config)
          externalOnSortConfigChange?.(config)
        }}
      />

      {exportModal && (
        <ExportModal
          type={exportModal}
          title={exportTitle || 'Registros'}
          columns={visibleColumns}
          rows={exportRows}
          recordCount={exportRecordCount}
          selectedCount={selectedCount}
          exportScope={exportScope}
          setExportScope={setExportScope}
          dateKey={rangeDateKey}
          exportRangeDateLabel={exportRangeDateLabel}
          dateFrom={exportDateFrom}
          dateTo={exportDateTo}
          setDateFrom={setExportDateFrom}
          setDateTo={setExportDateTo}
          activeSortLabel={activeSortLabel}
          sortDirection={sortConfig.direction}
          showPreview={showExportPreview}
          setShowPreview={setShowExportPreview}
          onClose={() => setExportModal(null)}
          onExport={runExport}
          exporting={exportRunning}
          loadingPreview={loadingAllRows && exportScope !== 'selected'}
        />
      )}
    </div>
  )
}

function isUtilityColumn(column) {
  return ['selection', 'seleccion', 'actions', 'acciones'].includes(String(column.key))
}
