import { useMemo, useState } from 'react'
import { ActionIconButton, ActionToolbar, ActionToolbarDivider } from './ActionIconButton'
import { ColumnVisibilityMenu, useColumnVisibility } from './ColumnVisibilityMenu'
import { DataTable } from './DataTable'
import { ExportFileIcon } from './ExportFileIcon'
import { FormField, inputClass } from './FormField'
import { CrmDatePicker } from './CrmDatePicker'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { Icon } from './Icon'
import { CrmRecordFormModal } from './CrmRecordFormModal'
import { useNotifications } from './Notifications'
import { SearchInput } from './SearchInput'
import { isPersistedField, normalizeFieldValue } from './crmFormFields'
import { deleteData, isApiError, patchData, putData, userHasRole } from '../../services/api'
import { exportExcel, exportExcelSheets, exportPdf, exportPdfSheets } from '../../utils/exporters'

const PAGE_SIZE = 5

export function OperationalList({
  title,
  rows,
  setRows,
  columns,
  editFields,
  idKey,
  apiPath,
  dateKey,
  exportDateKey,
  rowLabel,
  activePatch = { activo: true },
  inactivePatch = { activo: false },
  onRowFocus,
  onRefresh,
  exportFilename,
  buildExportSheets,
  buildEditPayload,
  validateEdit,
  editSections,
  editSectionsLayout,
  renderEditExtra,
  editModalSize,
  editModalGridClassName,
  editModalTitleIcon,
  editModalEyebrow,
  editModalHint,
  editModalSubmitLabel,
  editOwnerFieldKey,
  onEditRow,
  canEdit = true,
  canEditRow,
  canDelete: canDeleteProp,
  onViewRow,
  onViewLogRow,
  enableGridToggle = false,
  showActiveToggle = true,
  toolbarActions,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar',
}) {
  const notify = useNotifications()
  const canDelete = canDeleteProp ?? userHasRole('Administrador')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: dateKey || columns[0]?.key, direction: 'desc' })
  const [showGrid, setShowGrid] = useState(true)
  const [page, setPage] = useState(1)
  const [exportModal, setExportModal] = useState(null)
  const [exportScope, setExportScope] = useState('all')
  const [exportDateFrom, setExportDateFrom] = useState('')
  const [exportDateTo, setExportDateTo] = useState('')
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [exportRunning, setExportRunning] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editSubmitProgressMessage, setEditSubmitProgressMessage] = useState('')
  const columnVisibility = useColumnVisibility(`operational.${exportFilename || title}.${idKey}`, columns)
  const rangeDateKey = exportDateKey || dateKey
  const exportRangeDateLabel = useMemo(() => {
    const column = columns.find((item) => item.key === rangeDateKey)
    return column?.pickerLabel || column?.header || 'Fecha de creacion'
  }, [columns, rangeDateKey])

  const sortedRows = useMemo(() => sortRows(rows, columns, sortConfig, rowLabel), [columns, rowLabel, rows, sortConfig])
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const selectedRows = sortedRows.filter((row) => selectedIds.has(String(row[idKey])))
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.has(String(row[idKey])))
  const partialPageSelected = pageRows.some((row) => selectedIds.has(String(row[idKey])) && !allPageSelected)
  const activeSortLabel = columns.find((column) => column.key === sortConfig.key)?.header || 'Registro'

  const exportRows = useMemo(() => {
    if (exportScope === 'selected') return selectedRows
    if (exportScope === 'date') {
      return sortRows(filterRowsByDate(rows, rangeDateKey, exportDateFrom, exportDateTo), columns, sortConfig, rowLabel)
    }

    return sortedRows
  }, [columns, rangeDateKey, exportDateFrom, exportDateTo, exportScope, rowLabel, rows, selectedRows, sortConfig, sortedRows])

  function toggleRow(row) {
    const id = String(row[idKey])
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allPageSelected) pageRows.forEach((row) => next.delete(String(row[idKey])))
      else pageRows.forEach((row) => next.add(String(row[idKey])))
      return next
    })
  }

  function changeSort(column, direction) {
    setSortConfig({ key: column.key, direction })
    setPage(1)
  }

  function startEdit(row) {
    if (onEditRow) {
      onEditRow(row)
      onRowFocus?.(row)
      return
    }

    setEditing(row)
    setForm(
      editFields.reduce((acc, field) => {
        let value = row[field.key]
        if (field.key === 'estado' && (value === undefined || value === null || value === '')) {
          const inactive = row.activo === false || row.activo === 0 || String(row.activo).toLowerCase() === 'false'
          value = inactive ? 'Inactiva' : 'Activa'
        }
        acc[field.key] = normalizeFieldValue(value, field.type)
        return acc
      }, {}),
    )
    onRowFocus?.(row)
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (editSubmitting) return
    if (validateEdit) {
      const validationMessage = validateEdit(form, editing)
      if (validationMessage) {
        notify.warning('Datos requeridos', validationMessage)
        return
      }
    }
    const id = editing[idKey]
    const basePayload = editFields.filter(isPersistedField).reduce((acc, field) => {
      acc[field.key] = form[field.key] === '' ? null : form[field.key]
      return acc
    }, {})
    const payload = buildEditPayload ? buildEditPayload(basePayload, form, editing) : basePayload
    const ownerChanged = editOwnerFieldKey
      && String(form[editOwnerFieldKey] || '') !== String(editing[editOwnerFieldKey] || '')

    setEditSubmitting(true)
    if (ownerChanged) {
      setEditSubmitProgressMessage('Guardando caso y enviando notificacion al propietario...')
    }

    try {
      const updated = await putData(`${apiPath}/${id}`, payload)
      replaceRow(updated)
      onRowFocus?.(updated)
      await refreshRows(updated[idKey])
      notify.success('Cambios guardados', ownerChanged
        ? `${rowLabel(updated)} fue actualizado y se notifico al propietario.`
        : `${rowLabel(updated)} fue actualizado correctamente.`)
    } catch (error) {
      if (isApiError(error)) {
        notify.error('No se pudo guardar', error.message)
        return
      }

      const updated = { ...editing, ...payload }
      replaceRow(updated)
      onRowFocus?.(updated)
      notify.warning('Cambios locales', 'La API no respondio; el registro quedo actualizado solo en esta sesion.')
    } finally {
      setEditSubmitting(false)
      setEditSubmitProgressMessage('')
    }

    setEditing(null)
    setForm({})
  }

  async function removeRow(row) {
    if (!canDelete) {
      notify.error('Accion no autorizada', 'No tienes permiso para eliminar registros en este modulo.')
      return
    }

    const accepted = await notify.confirm({
      title: 'Eliminar definitivamente',
      message: `Se eliminara fisicamente "${rowLabel(row)}" del sistema. Esta accion no se puede deshacer.`,
      confirmLabel: 'Eliminar definitivamente',
    })
    if (!accepted) return

    const deleted = await physicalDelete(row)
    if (!deleted) return
    setRows((current) => current.filter((item) => String(item[idKey]) !== String(row[idKey])))
    onRowFocus?.(null)
    await refreshRows(null)
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(String(row[idKey]))
      return next
    })
    notify.success('Registro eliminado', `${rowLabel(row)} fue eliminado fisicamente.`)
  }

  async function removeSelected() {
    if (!selectedRows.length) return
    if (!canDelete) {
      notify.error('Accion no autorizada', 'No tienes permiso para eliminar registros en este modulo.')
      return
    }

    const accepted = await notify.confirm({
      title: 'Eliminar seleccionados',
      message: `Se eliminaran fisicamente ${selectedRows.length} registros de ${title}. Esta accion no se puede deshacer.`,
      confirmLabel: 'Eliminar definitivamente',
    })
    if (!accepted) return

    const deletedRows = []
    for (const row of selectedRows) {
      if (await physicalDelete(row)) deletedRows.push(row)
    }
    if (!deletedRows.length) return
    const deletedIds = new Set(deletedRows.map((row) => String(row[idKey])))
    setRows((current) => current.filter((row) => !deletedIds.has(String(row[idKey]))))
    onRowFocus?.(null)
    setSelectedIds(new Set())
    await refreshRows(null)
    notify.success('Registros eliminados', `${deletedRows.length} registros fueron eliminados fisicamente.`)
  }

  async function toggleActive(row) {
    const nextActive = !isActiveRow(row)
    const patch = nextActive ? activePatch : inactivePatch

    try {
      const updated = await patchData(`${apiPath}/${row[idKey]}/activo`, { activo: nextActive })
      const hydrated = { ...row, ...patch, ...updated }
      replaceRow(hydrated)
      onRowFocus?.(hydrated)
      await refreshRows(hydrated[idKey])
      notify.success(nextActive ? 'Registro activado' : 'Registro desactivado', `${rowLabel(hydrated)} quedo ${nextActive ? 'activo' : 'inactivo'}.`)
    } catch (error) {
      if (isApiError(error)) {
        notify.error(nextActive ? 'No se pudo activar' : 'No se pudo desactivar', error.message)
        return
      }

      const updated = { ...row, ...patch, activo: nextActive }
      replaceRow(updated)
      onRowFocus?.(updated)
      notify.warning('Cambio local', 'La API no respondio; el estado activo/inactivo cambio solo en esta sesion.')
    }
  }

  async function physicalDelete(row) {
    try {
      await deleteData(`${apiPath}/${row[idKey]}`, { fisico: true, motivo: `Eliminacion fisica desde ${title}` })
      return true
    } catch (error) {
      if (isApiError(error)) {
        notify.error('No se pudo eliminar', error.message)
        return false
      }

      return true
    }
  }

  function replaceRow(updated) {
    setRows((current) => current.map((row) => (String(row[idKey]) === String(updated[idKey]) ? updated : row)))
  }

  async function refreshRows(focusId = null) {
    if (!onRefresh) return

    try {
      await onRefresh(focusId)
    } catch {
      notify.warning('Actualizacion pendiente', 'El cambio se guardo, pero no se pudo refrescar la lista automaticamente.')
    }
  }

  function openExportModal(type) {
    setExportModal(type)
    setExportScope(selectedRows.length ? 'selected' : 'all')
    setShowExportPreview(false)
  }

  async function runExport() {
    const filename = exportFilename || title.toLowerCase().replace(/\s+/g, '-')
    const visibleColumns = columnVisibility.visibleColumns

    setExportRunning(true)
    try {
      if (buildExportSheets) {
        const sheets = await Promise.resolve(buildExportSheets(exportRows, visibleColumns))
        if (exportModal === 'excel') exportExcelSheets({ filename, sheets })
        if (exportModal === 'pdf') exportPdfSheets({ title, sheets })
        const sheetSummary = sheets.map((sheet) => `${sheet.name} (${sheet.rows.length})`).join(', ')
        notify.success('Exportacion lista', `${exportRows.length} registros. Hojas: ${sheetSummary}.`)
      } else {
        const payload = {
          title,
          columns: visibleColumns,
          rows: exportRows,
          filename,
        }
        if (exportModal === 'excel') exportExcel(payload)
        if (exportModal === 'pdf') exportPdf(payload)
        notify.success('Exportacion lista', `${exportRows.length} registros fueron enviados a ${exportModal === 'excel' ? 'Excel' : 'PDF'}.`)
      }
      setExportModal(null)
    } catch (error) {
      notify.error('No se pudo exportar', error?.message || 'Revisa los datos e intenta nuevamente.')
    } finally {
      setExportRunning(false)
    }
  }

  const sortableColumns = columnVisibility.visibleColumns.map((column) => ({
    ...column,
    pickerLabel: typeof column.header === 'string' ? column.header : column.pickerLabel,
    header: (
      <SortHeader column={column} sortConfig={sortConfig} onSort={changeSort} />
    ),
  }))

  const tableColumns = [
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
    ...sortableColumns,
    {
      key: 'actions',
      canHide: false,
      header: 'Acciones',
      render: (row) => (
        <ActionToolbar>
          {onViewRow && (
            <>
              <ActionIconButton
                icon="eye"
                label="Ver ficha"
                tone="indigo"
                onClick={() => onViewRow(row)}
              />
              <ActionToolbarDivider />
            </>
          )}
          {onViewLogRow && (
            <>
              <ActionIconButton
                icon="history"
                label="Ver log"
                tone="slate"
                onClick={() => onViewLogRow(row)}
              />
              <ActionToolbarDivider />
            </>
          )}
          {canEdit && (!canEditRow || canEditRow(row)) && (
            <ActionIconButton
              icon="pencil"
              label="Editar registro"
              tone="sky"
              onClick={() => startEdit(row)}
            />
          )}
          {showActiveToggle && (
            <>
              <ActionToolbarDivider />
              <ActionIconButton
                icon={isActiveRow(row) ? 'deactivate' : 'activate'}
                label={isActiveRow(row) ? 'Inactivar registro' : 'Activar registro'}
                tone={isActiveRow(row) ? 'amber' : 'emerald'}
                onClick={() => toggleActive(row)}
              />
            </>
          )}
          {canDelete && (
            <>
              <ActionToolbarDivider />
              <ActionIconButton
                icon="delete"
                label="Eliminar registro"
                tone="rose"
                onClick={() => removeRow(row)}
              />
            </>
          )}
        </ActionToolbar>
      ),
    },
  ]

  return (
    <section className="min-w-0 max-w-full overflow-visible">
      <div className="relative z-20 mb-4 rounded-2xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="min-w-0 shrink-0">
            <p className="text-sm font-bold text-foreground">
              {selectedRows.length ? `${selectedRows.length} seleccionados` : `${sortedRows.length} registros`}
            </p>
            <p className="text-xs text-muted-foreground">
              Orden actual: {activeSortLabel} {sortConfig.direction === 'asc' ? 'ascendente' : 'descendente'}
            </p>
          </div>
          {onSearchChange && (
            <div className="flex min-w-0 flex-1 justify-center lg:px-2">
              <div className="w-full max-w-md lg:max-w-lg">
                <SearchInput
                  value={searchValue || ''}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  className="max-w-none"
                  inputClassName="h-10"
                />
              </div>
            </div>
          )}
          <div className={`flex min-w-0 flex-wrap items-center gap-2 ${onSearchChange ? 'shrink-0 lg:ml-auto' : 'w-full justify-end sm:ml-auto sm:w-auto'}`}>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ColumnVisibilityMenu
              columns={columns}
              visibleKeys={columnVisibility.visibleKeys}
              onToggle={columnVisibility.toggleColumn}
              onShowAll={columnVisibility.showAllColumns}
            />
            {enableGridToggle && (
              <button
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
                onClick={() => setShowGrid((value) => !value)}
              >
                {showGrid ? 'Ocultar grilla' : 'Mostrar grilla'}
              </button>
            )}
            {canDelete && selectedRows.length > 0 && (
              <button className="col-span-2 h-10 rounded-xl bg-rose-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:col-span-1" onClick={removeSelected}>
                Eliminar seleccionados ({selectedRows.length})
              </button>
            )}
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              onClick={() => openExportModal('excel')}
            >
              <ExportFileIcon type="excel" />
              Excel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300"
              onClick={() => openExportModal('pdf')}
            >
              <ExportFileIcon type="pdf" />
              PDF
            </button>
            {toolbarActions}
            </div>
          </div>
        </div>
      </div>

      {(!enableGridToggle || showGrid) && (
        <>
          <DataTable
            columns={tableColumns}
            rows={pageRows}
            rowKey={(row, index) => `${title}-${row[idKey] ?? index}`}
            onRowClick={(row) => {
              if (onViewRow) {
                onViewRow(row)
              } else {
                toggleRow(row)
              }
              onRowFocus?.(row)
            }}
          />
          <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>
              Mostrando {sortedRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, sortedRows.length)} de {sortedRows.length}
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex">
              <button
                className="h-10 rounded-xl border border-border bg-card px-3 font-semibold transition hover:bg-accent disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              <span className="flex h-10 items-center justify-center rounded-xl bg-muted px-3 text-xs font-bold text-muted-foreground">Pagina {currentPage} de {totalPages}</span>
              <button
                className="h-10 rounded-xl border border-border bg-card px-3 font-semibold transition hover:bg-accent disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {enableGridToggle && !showGrid && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Grilla oculta. Usa "Mostrar grilla" para ver registros en paginas de 5.
        </div>
      )}

      {editing && !onEditRow && (
        <CrmRecordFormModal
          open
          mode="edit"
          eyebrow={editModalEyebrow || 'Editar'}
          title={rowLabel(editing)}
          titleIcon={editModalTitleIcon}
          size={editModalSize || 'lg'}
          gridClassName={editModalGridClassName || 'grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3'}
          hint={editModalHint}
          submitLabel={editModalSubmitLabel || 'Guardar cambios'}
          submitting={editSubmitting}
          submitProgressMessage={editSubmitProgressMessage}
          fields={editFields}
          form={form}
          setForm={setForm}
          row={editing}
          sections={editSections}
          sectionsLayout={editSectionsLayout}
          extra={renderEditExtra?.({ row: editing, form })}
          onClose={() => {
            if (editSubmitting) return
            setEditing(null)
            setForm({})
          }}
          onSubmit={saveEdit}
        />
      )}

      {exportModal && (
        <ExportModal
          type={exportModal}
          title={title}
          columns={columnVisibility.visibleColumns}
          rows={exportRows}
          selectedCount={selectedRows.length}
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
        />
      )}
    </section>
  )
}

function isActiveRow(row) {
  if (row?.activo !== undefined && row?.activo !== null) {
    return row.activo === true || row.activo === 1 || ['true', '1', 'si', 'sí', 'activo', 'activa', 'vigente'].includes(String(row.activo).toLowerCase())
  }

  const status = String(row?.estado || '').toLowerCase()
  return !['inactivo', 'inactiva', 'terminado', 'cancelado', 'suspendido'].includes(status)
}

function ExportModal({
  type,
  title,
  columns,
  rows,
  selectedCount,
  exportScope,
  setExportScope,
  dateKey,
  exportRangeDateLabel = 'Fecha',
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  activeSortLabel,
  sortDirection,
  showPreview,
  setShowPreview,
  onClose,
  onExport,
  exporting = false,
}) {
  const label = type === 'excel' ? 'Excel' : 'PDF'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-gray-950/55 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[100dvh] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-none border border-border bg-card p-4 shadow-2xl crm-scrollbar sm:max-h-[92vh] sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Exportar {label}</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              <HeaderLabel label={title} icon={getHeaderIcon('', title)} size="lg" />
            </h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm font-bold text-foreground">Alcance</p>
            <RadioOption label="Todos los registros" value="all" current={exportScope} onChange={setExportScope} />
            <RadioOption label={`Registros seleccionados (${selectedCount})`} value="selected" current={exportScope} onChange={setExportScope} disabled={!selectedCount} />
            <RadioOption label="Por rango de fecha" value="date" current={exportScope} onChange={setExportScope} disabled={!dateKey} />

            {exportScope === 'date' && (
              <div className="grid gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Filtra por {exportRangeDateLabel.toLowerCase()}.
                </p>
                <FormField label="Desde">
                  <CrmDatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="Seleccione desde"
                    allowClear
                  />
                </FormField>
                <FormField label="Hasta">
                  <CrmDatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="Seleccione hasta"
                    allowClear
                  />
                </FormField>
              </div>
            )}

            <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Orden actual: {activeSortLabel} {sortDirection === 'asc' ? 'ascendente' : 'descendente'}.
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{rows.length} registros para exportar</p>
                <p className="text-xs text-muted-foreground">La vista previa muestra maximo 5 registros.</p>
              </div>
              <button
                type="button"
                className="h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold shadow-sm transition hover:bg-accent"
                onClick={() => setShowPreview((value) => !value)}
              >
                {showPreview ? 'Ocultar registros' : 'Mostrar registros'}
              </button>
            </div>

            {showPreview ? (
              <div className="min-w-0 max-w-full overflow-hidden">
                <DataTable
                  columns={columns}
                  rows={rows.slice(0, PAGE_SIZE)}
                  rowKey={(row, index) => `export-${row.codigo ?? row.id ?? index}`}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Vista previa oculta para no invadir la pantalla.
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-accent sm:h-10">
            Cancelar
          </button>
          <button disabled={!rows.length || exporting} onClick={onExport} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-50 sm:h-10">
            {exporting ? 'Preparando...' : `Exportar ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function RadioOption({ label, value, current, onChange, disabled = false }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed text-muted-foreground/50' : 'cursor-pointer text-foreground'}`}>
      <input
        type="radio"
        checked={current === value}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="h-4 w-4 border-input text-primary focus:ring-primary"
      />
      {label}
    </label>
  )
}

function SortHeader({ column, sortConfig, onSort }) {
  const activeAscending = sortConfig.key === column.key && sortConfig.direction === 'asc'
  const activeDescending = sortConfig.key === column.key && sortConfig.direction === 'desc'

  return (
    <div className="flex min-w-28 items-center gap-2">
      <HeaderLabel label={column.header} icon={column.icon || getHeaderIcon(column.key, column.header)} />
      <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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

function sortRows(rows, columns, sortConfig, rowLabel) {
  const column = columns.find((item) => item.key === sortConfig.key)
  const direction = sortConfig.direction === 'asc' ? 1 : -1

  return [...rows].sort((first, second) => {
    const firstValue = sortableValue(first, column, sortConfig.key, rowLabel)
    const secondValue = sortableValue(second, column, sortConfig.key, rowLabel)
    return compareValues(firstValue, secondValue) * direction
  })
}

function filterRowsByDate(rows, dateKey, dateFrom, dateTo) {
  if (!dateKey || (!dateFrom && !dateTo)) return rows

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null

  return rows.filter((row) => {
    const value = toDate(row[dateKey])
    if (!value) return false
    if (from && value < from) return false
    if (to && value > to) return false
    return true
  })
}

function sortableValue(row, column, key, rowLabel) {
  const raw = row[key] ?? column?.exportValue?.(row) ?? rowLabel?.(row) ?? ''
  const date = toDate(raw)
  if (date) return date.getTime()

  const number = Number(raw)
  if (raw !== '' && Number.isFinite(number)) return number

  return String(raw).toLowerCase()
}

function compareValues(first, second) {
  if (typeof first === 'number' && typeof second === 'number') return first - second
  return String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' })
}

function toDate(value) {
  if (!value || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
