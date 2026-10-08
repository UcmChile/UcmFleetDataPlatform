import { DataTable } from './DataTable'
import { CrmDatePicker } from './CrmDatePicker'
import { FormField } from './FormField'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { Icon } from './Icon'

const PREVIEW_PAGE_SIZE = 5

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

export function ExportModal({
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
  loadingPreview = false,
  recordCount,
}) {
  const label = type === 'excel' ? 'Excel' : 'PDF'
  const totalCount = recordCount ?? rows.length

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
                <p className="text-sm font-bold text-foreground">
                  {loadingPreview ? 'Cargando registros...' : `${totalCount} registros para exportar`}
                </p>
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
                {loadingPreview ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Preparando vista previa...
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    rows={rows.slice(0, PREVIEW_PAGE_SIZE)}
                    rowKey={(row, index) => `export-${row.codigo ?? row.id ?? index}`}
                  />
                )}
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
          <button disabled={!totalCount || exporting || loadingPreview} onClick={onExport} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-50 sm:h-10">
            {exporting ? 'Preparando...' : `Exportar ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
