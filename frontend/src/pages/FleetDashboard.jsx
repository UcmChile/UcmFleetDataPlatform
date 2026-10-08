import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bus, Fuel, Gauge, Hand, Radio, Workflow } from 'lucide-react'
import { MaintainerDataTable } from '../components/crm/MaintainerDataTable'
import { PageHeader } from '../components/crm/PageHeader'
import { StatCard } from '../components/crm/StatCard'
import { FormField, inputClass } from '../components/crm/FormField'
import { CrmFormModal, CrmFormModalFooter } from '../components/crm/CrmFormModal'
import { useNotifications } from '../components/crm/Notifications'
import { flattenCrmMenuTreeLeaves } from '../lib/crmMenuData'
import { crmRoutes } from '../lib/routes'
import { WORKSPACE_IDS } from '../lib/workspaces'
import { apiRequest } from '../services/api'
import { cn } from '../lib/utils'
import { formatDate, formatDateTime } from '../utils/formatters'
import { exportExcelSheets } from '../utils/exporters'

const DOMAIN_CARDS = [
  {
    title: 'Maestros',
    description: 'Vehículos y personas de la flota.',
    icon: Bus,
    to: crmRoutes.mantenedoresCatalogo('vehicles'),
  },
  {
    title: 'Kilometraje',
    description: 'GPS, lecturas físicas y reconciliación.',
    icon: Gauge,
    to: crmRoutes.mantenedoresCatalogo('gps-minute-pings'),
  },
  {
    title: 'Combustible',
    description: 'Tarjetas, estaciones y transacciones.',
    icon: Fuel,
    to: crmRoutes.mantenedoresCatalogo('fuel-cards'),
  },
  {
    title: 'Operacional',
    description: 'Turnos, runs y tramos de servicio.',
    icon: Workflow,
    to: crmRoutes.mantenedoresCatalogo('runs'),
  },
  {
    title: 'Wisetrack',
    description: 'Ingesta GPS, bitácora y pings rechazados.',
    icon: Radio,
    to: crmRoutes.wisetrack,
  },
]

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function currentMonthValue() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function parseMonthValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

const SILENT_VEHICLE_COLUMNS = [
  {
    key: 'plate',
    header: 'Patente',
    label: 'Patente',
    // El comparador de fechas interpreta "SSGH-51" como año 1951. Se fuerza texto.
    sortValue: (row) => `(${row.plate || ''})`,
  },
  { key: 'wisetrack_vehicle_id', header: 'Wisetrack ID', label: 'Wisetrack ID' },
  {
    key: 'last_ts',
    header: 'Último ping',
    label: 'Último ping',
    sortValue: (row) => row.last_ts || '',
    exportValue: (row) => (row.last_ts ? formatDateTime(row.last_ts) : ''),
    render: (row) => (row.last_ts ? formatDateTime(row.last_ts) : '—'),
  },
]

function dayStatusLabel(day) {
  if (day.status === 'pending') return 'Pendiente (hoy/futuro)'
  if (day.has_pings) return 'Con datos'
  return 'Faltante'
}

function vehicleTrio(day) {
  const consulted = Number(day?.vehicles_consulted || 0)
  const withPing = Number(day?.vehicles_with_ping ?? day?.vehicle_count ?? 0)
  const without = Number(day?.vehicles_without_ping ?? Math.max(0, consulted - withPing))
  return { consulted, withPing, without }
}

function formatVehicleTrio(day) {
  const { consulted, withPing, without } = vehicleTrio(day)
  const n = (value) => Number(value).toLocaleString('es-CL')
  return `${n(consulted)} / ${n(withPing)} / ${n(without)}`
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('es-CL')
}

function VehicleCountButton({ day, field, onOpen }) {
  return (
    <button
      type="button"
      className="font-semibold tabular-nums text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
      title="Ver vehículos de esta columna"
      onClick={(event) => {
        event.stopPropagation()
        onOpen(day, field)
      }}
    >
      {formatCount(day[field])}
    </button>
  )
}

const DAY_VEHICLE_COLUMNS = [
  {
    key: 'plate',
    header: 'Patente',
    label: 'Patente',
    sortValue: (row) => `(${row.plate || ''})`,
  },
  { key: 'wisetrack_vehicle_id', header: 'Wisetrack ID', label: 'Wisetrack ID' },
  { key: 'vehicle_number', header: 'Nº vehículo', label: 'Nº vehículo' },
  {
    key: 'reported',
    header: 'Reportó',
    label: 'Reportó',
    render: (row) => (
      <span className={row.reported === 'Sí'
        ? 'font-semibold text-emerald-700 dark:text-emerald-300'
        : 'font-semibold text-amber-700 dark:text-amber-300'}
      >
        {row.reported}
      </span>
    ),
  },
]

function downloadMonthExcel(coverage, monthTitle) {
  const days = coverage?.days || []
  const batches = coverage?.batches || []
  const summaryRows = [
    { metric: 'Mes', value: monthTitle },
    { metric: 'Hasta (ayer Chile)', value: coverage?.as_of_date || '' },
    { metric: 'Fuente', value: coverage?.source || '' },
    { metric: 'Días esperados', value: coverage?.days_expected ?? 0 },
    { metric: 'Días con datos', value: coverage?.days_with_pings ?? 0 },
    { metric: 'Días faltantes', value: coverage?.days_without_pings ?? 0 },
    { metric: 'Días pendientes', value: coverage?.days_pending ?? 0 },
    { metric: 'Cobertura %', value: coverage?.coverage_pct ?? 0 },
    { metric: 'Pings del mes', value: coverage?.total_pings ?? 0 },
    { metric: 'Máx. vehículos en un día', value: coverage?.max_vehicles_in_day ?? 0 },
    { metric: 'Lotes del mes', value: batches.length },
  ]

  exportExcelSheets({
    filename: `fleet-proceso-${coverage?.month_label || 'mes'}`,
    sheets: [
      {
        name: 'Resumen',
        columns: [
          { key: 'metric', header: 'Indicador' },
          { key: 'value', header: 'Valor' },
        ],
        rows: summaryRows,
      },
      {
        name: 'Días',
        columns: [
          { key: 'date', header: 'Fecha (ts)' },
          { key: 'ping_count', header: 'Acumulado del día' },
          { key: 'vehicles_consulted', header: 'Vehículos consultados' },
          { key: 'vehicles_with_ping', header: 'Vehículos con ping' },
          { key: 'vehicles_without_ping', header: 'Vehículos sin ping' },
          { key: 'batch_count', header: 'Lotes' },
          { key: 'status_label', header: 'Estado' },
        ],
        rows: days.map((day) => ({
          ...day,
          status_label: dayStatusLabel(day),
        })),
      },
      {
        name: 'Bitácora',
        columns: [
          { key: 'ping_date', header: 'Fecha (ts)' },
          { key: 'batch_id', header: 'Batch' },
          { key: 'status', header: 'Estado lote' },
          { key: 'started_at', header: 'Inicio' },
          { key: 'completed_at', header: 'Fin' },
          { key: 'period_from', header: 'Ventana desde' },
          { key: 'period_to', header: 'Ventana hasta' },
          { key: 'n_vehicles_expected', header: 'Vehículos esperados' },
          { key: 'n_vehicles_reporting', header: 'Vehículos reportando' },
          { key: 'n_pings_received', header: 'Pings recibidos' },
          { key: 'n_pings_inserted', header: 'Pings insertados' },
          { key: 'n_pings_duplicated', header: 'Pings duplicados' },
          { key: 'n_pings_rejected', header: 'Pings rechazados' },
          { key: 'error_details', header: 'Error' },
        ],
        rows: batches,
      },
    ],
  })
}

export default function FleetDashboard() {
  const { notify } = useNotifications()
  const maintainerCount = flattenCrmMenuTreeLeaves().length
  const [monthValue, setMonthValue] = useState(currentMonthValue)
  const [coverage, setCoverage] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [reprocessing, setReprocessing] = useState(false)
  const [vehicleDay, setVehicleDay] = useState(null)
  const [vehicleRows, setVehicleRows] = useState([])
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleDataFilter, setVehicleDataFilter] = useState('todos')

  const monthParts = useMemo(() => parseMonthValue(monthValue), [monthValue])

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await apiRequest('/dashboard/ingestion-health')
      setHealth(res.data)
    } catch (error) {
      setHealth(null)
      notify({ type: 'error', title: 'Salud ingesta', message: error.message })
    } finally {
      setHealthLoading(false)
    }
  }, [notify])

  const refreshCoverage = useCallback(async () => {
    if (!monthParts) return
    setLoading(true)
    try {
      const res = await apiRequest(`/dashboard/monthly-pings?year=${monthParts.year}&month=${monthParts.month}`)
      setCoverage(res.data)
    } catch (error) {
      setCoverage(null)
      notify({ type: 'error', title: 'Dashboard', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [monthParts, notify])

  useEffect(() => {
    void refreshHealth()
  }, [refreshHealth])

  useEffect(() => {
    void refreshCoverage()
  }, [refreshCoverage])

  const monthTitle = monthParts
    ? `${MONTH_LABELS[monthParts.month - 1]} ${monthParts.year}`
    : '—'

  const openVehicleDetail = useCallback(async (day, field) => {
    if (!day?.date) return
    setVehicleDataFilter(field === 'vehicles_with_ping' ? 'con_datos' : field === 'vehicles_without_ping' ? 'sin_datos' : 'todos')
    setVehicleDay(day)
    setVehicleRows([])
    setVehicleLoading(true)
    try {
      const res = await apiRequest(`/dashboard/daily-vehicles?date=${encodeURIComponent(day.date)}`)
      setVehicleRows(res.data?.vehicles || [])
    } catch (error) {
      setVehicleRows([])
      notify({ type: 'error', title: 'Vehículos del día', message: error.message })
    } finally {
      setVehicleLoading(false)
    }
  }, [notify])

  const coverageColumns = useMemo(() => [
    {
      key: 'date',
      header: 'Fecha (ts)',
      sortValue: (row) => row.date || '',
      exportValue: (row) => formatDate(row.date),
      render: (row) => formatDate(row.date),
    },
    {
      key: 'ping_count',
      header: 'Acumulado del día',
      exportValue: (row) => Number(row.ping_count || 0),
      render: (row) => formatCount(row.ping_count),
    },
    {
      key: 'vehicles_consulted',
      header: 'Consultados',
      exportValue: (row) => Number(row.vehicles_consulted || 0),
      render: (row) => <VehicleCountButton day={row} field="vehicles_consulted" onOpen={openVehicleDetail} />,
    },
    {
      key: 'vehicles_with_ping',
      header: 'Con ping',
      exportValue: (row) => Number(row.vehicles_with_ping ?? row.vehicle_count ?? 0),
      render: (row) => <VehicleCountButton day={row} field="vehicles_with_ping" onOpen={openVehicleDetail} />,
    },
    {
      key: 'vehicles_without_ping',
      header: 'Sin ping',
      exportValue: (row) => Number(row.vehicles_without_ping || 0),
      render: (row) => <VehicleCountButton day={row} field="vehicles_without_ping" onOpen={openVehicleDetail} />,
    },
    {
      key: 'status_label',
      header: 'Estado',
      sortValue: (row) => dayStatusLabel(row),
      exportValue: (row) => dayStatusLabel(row),
      render: (row) => {
        if (row.status === 'pending') return <span className="text-slate-600 dark:text-slate-300">Pendiente (hoy/futuro)</span>
        if (row.has_pings) return <span className="text-emerald-700 dark:text-emerald-300">Con datos</span>
        return <span className="font-semibold text-amber-700 dark:text-amber-300">Faltante</span>
      },
    },
    {
      key: 'actions',
      header: 'Acción',
      canSort: false,
      exportable: false,
      render: (row) => (
        <button
          type="button"
          disabled={reprocessing}
          onClick={(event) => {
            event.stopPropagation()
            setSelectedDay(row)
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline disabled:opacity-50 dark:text-sky-300"
        >
          <Hand className="h-3.5 w-3.5" />
          Reprocesar
        </button>
      ),
    },
  ], [openVehicleDetail, reprocessing])

  const visibleVehicleRows = useMemo(() => {
    if (vehicleDataFilter === 'con_datos') return vehicleRows.filter((row) => row.reported === 'Sí')
    if (vehicleDataFilter === 'sin_datos') return vehicleRows.filter((row) => row.reported !== 'Sí')
    return vehicleRows
  }, [vehicleDataFilter, vehicleRows])

  const coverageRows = useMemo(
    () => (loading ? [] : (coverage?.days || [])),
    [coverage, loading],
  )

  async function confirmReprocess() {
    if (!selectedDay?.date) return
    setReprocessing(true)
    try {
      const res = await apiRequest('/integrations/wisetrack/pull/pings/day', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDay.date }),
      })
      const inserted = res.data?.pull?.ingest?.n_pings_inserted ?? res.data?.pull?.pings_mapped ?? 0
      notify({
        type: 'success',
        title: 'Día reprocesado',
        message: `${selectedDay.date}: ${Number(inserted).toLocaleString('es-CL')} pings insertados`,
      })
      setSelectedDay(null)
      await refreshCoverage()
    } catch (error) {
      notify({ type: 'error', title: 'Reproceso', message: error.message })
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        workspace={WORKSPACE_IDS.CRM}
        eyebrow="Inicio"
        title="UCM Fleet Data Platform"
        description="Salud de ingesta Wisetrack (§8) y cobertura mensual por Timestamp GPS."
      />

      <section className="space-y-4 rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-emerald-500/[0.06] via-card to-sky-500/[0.05] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Salud de ingesta · Especificación §8
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">Monitoreo operativo</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Umbrales: batch fallido, tardío &gt;90 min, vehículo sin reportar &gt;2 h, rechazo &gt;5 %,
              cobertura &lt;90 % (84/93), anomalías de odómetro.
            </p>
          </div>
          <button
            type="button"
            disabled={healthLoading}
            onClick={() => void refreshHealth()}
            className="text-xs font-semibold text-sky-700 hover:underline disabled:opacity-50 dark:text-sky-300"
          >
            Actualizar
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Último batch"
            value={healthLoading ? '…' : (health?.summary?.minutes_since_last_batch != null
              ? `${health.summary.minutes_since_last_batch} min`
              : '—')}
            hint={health?.last_batch?.period_from
              ? `Ventana ${String(health.last_batch.period_from).slice(0, 16)} · ${health.last_batch.status}`
              : 'Sin batches'}
            icon="dashboard"
            tone={Number(health?.summary?.minutes_since_last_batch || 0) > 90 ? 'red' : 'green'}
          />
          <StatCard
            label="Vehículos reportando"
            value={healthLoading ? '…' : String(health?.last_batch?.n_vehicles_reporting ?? '—')}
            hint={healthLoading
              ? '…'
              : `${health?.last_batch?.vehicle_coverage_vs_target_pct ?? 0}% vs objetivo ${health?.fleet_target ?? 93} (umbral 84)`}
            icon="users"
            tone={health?.last_batch?.below_coverage_threshold ? 'yellow' : 'green'}
          />
          <StatCard
            label="Tasa rechazo"
            value={healthLoading ? '…' : `${health?.summary?.reject_rate_pct ?? 0}%`}
            hint={`${Number(health?.summary?.pings_rejected || 0).toLocaleString('es-CL')} rechazados / ${Number(health?.summary?.pings_received || 0).toLocaleString('es-CL')} recibidos`}
            icon="alert"
            tone={Number(health?.summary?.reject_rate_pct || 0) > 5 ? 'red' : 'green'}
          />
          <StatCard
            label="gps_daily_km"
            value={healthLoading ? '…' : (health?.gps_daily_km?.consolidated
              ? Number(health.gps_daily_km.rows_total).toLocaleString('es-CL')
              : '0')}
            hint={health?.gps_daily_km?.consolidated
              ? `${health.gps_daily_km.min_date} → ${health.gps_daily_km.max_date} · ${health.gps_daily_km.anomalies_total} anomalías`
              : 'Pendiente consolidar (objetivo §1.2)'}
            icon="check"
            tone={health?.gps_daily_km?.consolidated ? 'green' : 'yellow'}
          />
        </div>

        {(health?.alerts || []).length > 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Alertas activas ({health.alert_count}) — clic para ver detalle
            </p>
            <ul className="space-y-1.5 text-sm">
              {health.alerts.map((alert) => (
                <li key={alert.code}>
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(alert)}
                    className="flex w-full flex-wrap items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-amber-500/15"
                  >
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      alert.severity === 'high' && 'bg-rose-500/20 text-rose-800 dark:text-rose-200',
                      alert.severity === 'medium' && 'bg-amber-500/20 text-amber-900 dark:text-amber-100',
                      alert.severity === 'low' && 'bg-sky-500/15 text-sky-900 dark:text-sky-100',
                    )}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-semibold text-foreground underline-offset-2 hover:underline">{alert.label}</span>
                    <span className="text-muted-foreground">{alert.detail}</span>
                    <span className="ml-auto text-[11px] font-semibold text-sky-700 dark:text-sky-300">Ver detalle</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !healthLoading && (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Sin alertas de severidad según umbrales actuales.
            </p>
          )
        )}
      </section>

      <section className="space-y-4 rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-sky-500/[0.06] via-card to-emerald-500/[0.05] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
              Cobertura por Timestamp GPS
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">{monthTitle}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cobertura desde la <strong>bitácora día a día</strong>. Solo cuentan como faltantes los días hasta{' '}
              <strong>ayer</strong>
              {coverage?.as_of_date ? ` (${coverage.as_of_date})` : ''}. Hoy y futuros quedan pendientes.
              Clic en un día para reprocesar.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <FormField label="Mes" className="w-full sm:w-48">
              <input
                type="month"
                className={inputClass}
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
              />
            </FormField>
            <button
              type="button"
              disabled={loading || !coverage?.days?.length}
              onClick={() => downloadMonthExcel(coverage, monthTitle)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-600/30 bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Días esperados"
            value={loading ? '…' : String(coverage?.days_expected ?? '—')}
            hint={`Hasta ayer${coverage?.as_of_date ? ` (${coverage.as_of_date})` : ''} · ${coverage?.days_pending ?? 0} pendientes`}
            icon="calendar"
            tone="sky"
          />
          <StatCard
            label="Días con datos"
            value={loading ? '…' : String(coverage?.days_with_pings ?? '—')}
            hint="Con ≥1 ping en días esperados"
            icon="dashboard"
            tone="green"
          />
          <StatCard
            label="Días faltantes"
            value={loading ? '…' : String(coverage?.days_without_pings ?? '—')}
            hint="Sin datos hasta ayer (job faltante)"
            icon="alert"
            tone="yellow"
          />
          <StatCard
            label="Cobertura"
            value={loading ? '…' : `${coverage?.coverage_pct ?? 0}%`}
            hint={loading ? 'Cargando…' : `${coverage?.total_pings?.toLocaleString?.('es-CL') || 0} pings · sobre días esperados`}
            icon="check"
            tone={Number(coverage?.coverage_pct || 0) >= 80 ? 'green' : Number(coverage?.coverage_pct || 0) >= 40 ? 'yellow' : 'red'}
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Calendario por día de timestamp</p>
            <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Con datos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Faltante
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Pendiente (hoy/futuro)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hand className="h-3.5 w-3.5" /> Clic = reprocesar
              </span>
              <span>Vehículos: consultados / con ping / sin ping (clic = detalle)</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {(coverage?.days || Array.from({ length: 31 }, (_, i) => ({ day: i + 1, has_pings: false }))).map((day) => (
              <button
                key={day.date || day.day}
                type="button"
                disabled={loading || !day.date || reprocessing}
                onClick={() => setSelectedDay(day)}
                title={
                  day.status === 'pending'
                    ? `${day.date}: pendiente (después de ayer)`
                    : day.has_pings
                      ? `${day.date}: ${Number(day.ping_count).toLocaleString('es-CL')} pings · consultados / con ping / sin ping ${formatVehicleTrio(day)} — clic para reprocesar`
                      : day.date
                        ? `${day.date}: faltante · consultados / con ping / sin ping ${formatVehicleTrio(day)} — clic para descargar`
                        : ''
                }
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition',
                  'cursor-pointer hover:ring-2 hover:ring-sky-400/50 hover:brightness-105',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  day.status === 'pending' && 'border-slate-400/35 bg-slate-500/10 text-slate-700 dark:text-slate-200',
                  day.status === 'ok' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                  day.status === 'missing' && 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100',
                  !day.status && (day.has_pings
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                    : 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100'),
                  loading && 'animate-pulse',
                )}
              >
                {day.status !== 'pending' ? (
                  <Hand className="absolute right-1 top-1 h-3 w-3 opacity-50 sm:h-3.5 sm:w-3.5" aria-hidden />
                ) : null}
                <span className="text-sm font-bold">{day.day}</span>
                <span className="mt-0.5 text-[10px] font-semibold tabular-nums">
                  {day.has_pings ? Number(day.ping_count).toLocaleString('es-CL') : day.status === 'pending' ? '—' : '0'}
                </span>
                {day.has_pings || Number(day.vehicles_consulted) > 0 ? (
                  <span
                    className="mt-0.5 max-w-full cursor-pointer truncate px-0.5 text-[9px] font-medium tabular-nums leading-tight underline-offset-2 opacity-80 hover:underline"
                    title="Ver vehículos: consultados / con ping / sin ping"
                    onClick={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      void openVehicleDetail(day)
                    }}
                  >
                    {formatVehicleTrio(day)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <MaintainerDataTable
          columnStorageKey="fleet.coverage.days"
          columns={coverageColumns}
          rows={coverageRows}
          enableSorting
          initialSortConfig={{ key: 'date', direction: 'asc' }}
          exportTitle={`Cobertura ${monthTitle}`}
          exportFilename={`fleet-cobertura-${coverage?.month_label || 'mes'}`}
          rowKey={(row) => row.date}
          idKey="date"
          empty={loading ? 'Cargando…' : 'Sin días en el mes'}
        />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mantenedores" value={String(maintainerCount)} hint="Catálogos operativos" />
        <StatCard label="Dominios" value="5" hint="Maestros · KM · Fuel · Ops · Integraciones" />
        <StatCard label="Ingesta" value="Wisetrack" hint="Pull vehicles + pings" />
        <StatCard label="BD" value="ucm_fleet" hint="SQL Server" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DOMAIN_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <NavLink
              key={card.title}
              to={card.to}
              className="group rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-violet-500/[0.06] via-card to-emerald-500/[0.05] p-5 shadow-sm transition hover:border-violet-400/40 hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-emerald-500/15 text-violet-700 ring-1 ring-violet-500/10 dark:text-violet-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            </NavLink>
          )
        })}
      </div>

      <CrmFormModal
        open={Boolean(vehicleDay)}
        onClose={() => setVehicleDay(null)}
        onSubmit={(event) => {
          event.preventDefault()
          setVehicleDay(null)
        }}
        eyebrow="Cobertura por Timestamp GPS"
        title={`Vehículos ${vehicleDay?.date ? formatDate(vehicleDay.date) : ''}`}
        titleIcon="users"
        size="xl"
        hint="Mismo día civil, de 00:00:00 a 23:59:59. El filtro parte según la columna que abriste."
        footer={(
          <CrmFormModalFooter
            onClose={() => setVehicleDay(null)}
            cancelLabel="Cerrar"
            submitLabel="Entendido"
          />
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Consultados / con datos / sin datos:{' '}
              <strong className="text-foreground">
                {vehicleLoading
                  ? '…'
                  : `${formatCount(vehicleRows.length)} / ${formatCount(vehicleRows.filter((row) => row.reported === 'Sí').length)} / ${formatCount(vehicleRows.filter((row) => row.reported !== 'Sí').length)}`}
              </strong>
            </p>
            <FormField label="Datos">
              <select
                className={`${inputClass} max-w-52`}
                value={vehicleDataFilter}
                onChange={(event) => setVehicleDataFilter(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="con_datos">Con datos</option>
                <option value="sin_datos">Sin datos</option>
              </select>
            </FormField>
          </div>
          <MaintainerDataTable
            key={`${vehicleDay?.date || ''}-${vehicleDataFilter}`}
            columnStorageKey="fleet.coverage.day-vehicles"
            columns={DAY_VEHICLE_COLUMNS}
            rows={vehicleLoading ? [] : visibleVehicleRows}
            enableSorting
            initialSortConfig={{ key: 'reported', direction: 'asc' }}
            exportTitle={`Vehículos ${vehicleDay?.date || ''}`}
            exportFilename={`fleet-vehiculos-${vehicleDay?.date || 'dia'}`}
            rowKey={(row) => row.wisetrack_vehicle_id || row.vehicle_id}
            idKey="wisetrack_vehicle_id"
            empty={vehicleLoading ? 'Cargando…' : 'Sin vehículos para este filtro'}
          />
        </div>
      </CrmFormModal>

      <CrmFormModal
        open={Boolean(selectedDay)}
        onClose={() => !reprocessing && setSelectedDay(null)}
        onSubmit={(event) => {
          event.preventDefault()
          void confirmReprocess()
        }}
        eyebrow="Wisetrack"
        title={`Reprocesar ${selectedDay?.date || ''}`}
        titleIcon="download"
        size="sm"
        hint="Se eliminarán pings y bitácora de ese día y se volverá a consultar la API de 00:00:00 a 23:59:59 del mismo día."
        footer={(
          <CrmFormModalFooter
            onClose={() => !reprocessing && setSelectedDay(null)}
            submitLabel={reprocessing ? 'Reprocesando…' : 'Sí, reprocesar día'}
            submitDisabled={reprocessing}
          />
        )}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            ¿Reprocesar el día <strong className="text-foreground">{selectedDay?.date}</strong>?
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Acumulado actual: <strong className="text-foreground">{Number(selectedDay?.ping_count || 0).toLocaleString('es-CL')}</strong> pings</li>
            <li>Vehículos consultados / con ping / sin ping: <strong className="text-foreground">{formatVehicleTrio(selectedDay)}</strong></li>
            <li>Se borran los pings de esa ventana de <code>ts</code> y su bitácora</li>
            <li>Luego se descarga de nuevo desde Wisetrack (día inclusive)</li>
          </ul>
        </div>
      </CrmFormModal>

      <CrmFormModal
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        onSubmit={(event) => {
          event.preventDefault()
          setSelectedAlert(null)
        }}
        eyebrow="Alerta §8"
        title={selectedAlert?.label || 'Detalle de alerta'}
        titleIcon="alert"
        size="xl"
        hint={selectedAlert ? `Umbral: ${selectedAlert.threshold}` : ''}
        footer={(
          <CrmFormModalFooter
            onClose={() => setSelectedAlert(null)}
            cancelLabel="Cerrar"
            submitLabel="Entendido"
          />
        )}
      >
        <div className="space-y-4 text-sm">
          <p className="font-medium text-foreground">{selectedAlert?.detail}</p>
          {selectedAlert?.explanation ? (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-muted-foreground">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
                Cómo interpretar esta alerta
              </p>
              <p className="leading-relaxed">{selectedAlert.explanation}</p>
            </div>
          ) : null}
          {(selectedAlert?.reason_summary || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedAlert.reason_summary.map((row) => (
                <span
                  key={row.reason}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold"
                >
                  {row.reason}: {row.count}
                </span>
              ))}
            </div>
          ) : null}
          {selectedAlert?.maintainer_hint?.slug ? (
            <NavLink
              to={`${crmRoutes.mantenedoresCatalogo(selectedAlert.maintainer_hint.slug)}?dateFrom=${selectedAlert.maintainer_hint.dateFrom || ''}&dateTo=${selectedAlert.maintainer_hint.dateTo || ''}`}
              className="inline-flex text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
              onClick={() => setSelectedAlert(null)}
            >
              Abrir GPS daily km filtrado ({selectedAlert.maintainer_hint.dateFrom})
            </NavLink>
          ) : null}
          {selectedAlert?.code === 'vehicle_silent' && (selectedAlert.items || []).length > 0 ? (
            <MaintainerDataTable
              columnStorageKey="fleet.alert.vehicle-silent"
              columns={SILENT_VEHICLE_COLUMNS}
              rows={selectedAlert.items}
              enableSorting
              initialSortConfig={{ key: 'last_ts', direction: 'asc' }}
              exportTitle="Vehículos sin reportar"
              exportFilename="fleet-vehiculos-sin-reportar"
              exportDateKey="last_ts"
              rowKey={(row) => row.wisetrack_vehicle_id || row.vehicle_id}
              idKey="wisetrack_vehicle_id"
              empty="Sin vehículos sin reportar"
            />
          ) : (selectedAlert?.items || []).length > 0 ? (
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-border/60">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-muted/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    {(selectedAlert.columns || Object.keys(selectedAlert.items[0] || {}).map((key) => ({ key, label: key }))).map((col) => (
                      <th key={col.key} className="px-3 py-2 font-semibold">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedAlert.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        'border-b border-border/40',
                        item.severity_hint === 'crítica' && 'bg-rose-500/10',
                        item.severity_hint === 'alta' && 'bg-amber-500/5',
                      )}
                    >
                      {(selectedAlert.columns || Object.keys(item).map((key) => ({ key, label: key }))).map((col) => {
                        const value = item[col.key]
                        const isLevel = col.key === 'severity_hint'
                        const isReason = col.key === 'reason'
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              'px-3 py-2',
                              !isReason && 'tabular-nums',
                              isReason && 'max-w-[220px] text-xs leading-snug',
                            )}
                          >
                            {value == null || value === ''
                              ? '—'
                              : isLevel
                                ? (
                                  <span className={cn(
                                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                                    value === 'crítica' && 'bg-rose-500/20 text-rose-800 dark:text-rose-200',
                                    value === 'alta' && 'bg-amber-500/20 text-amber-900 dark:text-amber-100',
                                    value === 'media' && 'bg-sky-500/15 text-sky-900 dark:text-sky-100',
                                  )}
                                  >
                                    {value}
                                  </span>
                                  )
                                : typeof value === 'number'
                                  ? Number(value).toLocaleString('es-CL', { maximumFractionDigits: 1 })
                                  : String(value)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">Sin filas de detalle para esta alerta.</p>
          )}
          {selectedAlert?.code === 'odometer_anomaly' && (selectedAlert?.items || []).length >= 50 ? (
            <p className="text-xs text-muted-foreground">Mostrando hasta 50 registros (los de mayor delta km).</p>
          ) : null}
        </div>
      </CrmFormModal>
    </div>
  )
}
