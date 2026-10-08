import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../components/crm/PageHeader'
import { FormField, inputClass } from '../components/crm/FormField'
import { CrmDatePicker } from '../components/crm/CrmDatePicker'
import { useNotifications } from '../components/crm/Notifications'
import { crmRoutes } from '../lib/routes'
import { WORKSPACE_IDS } from '../lib/workspaces'
import { apiRequest } from '../services/api'

function chileIsoDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function chileYesterdayIso(date = new Date()) {
  const today = chileIsoDate(date)
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function defaultDateRange() {
  const to = chileIsoDate()
  const from = chileYesterdayIso()
  return { from, to }
}

function addDaysIso(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** FROM inclusive (00:00 Chile). */
function dateToApiFrom(dateStr) {
  if (!dateStr) return ''
  return dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00.000-04:00`
}

/** TO exclusivo = medianoche del día siguiente → día TO inclusive completo. */
function dateToApiTo(dateStr) {
  if (!dateStr) return ''
  if (dateStr.includes('T')) return dateStr
  return `${addDaysIso(dateStr, 1)}T00:00:00.000-04:00`
}

export default function WisetrackConsole() {
  const { notify } = useNotifications()
  const defaults = useMemo(() => defaultDateRange(), [])
  const [status, setStatus] = useState(null)
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [vehicleId, setVehicleId] = useState('')
  const [busy, setBusy] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [readingDate, setReadingDate] = useState(() => chileYesterdayIso())

  const apiFrom = dateToApiFrom(from)
  const apiTo = dateToApiTo(to)

  async function refreshStatus() {
    const res = await apiRequest('/integrations/wisetrack/status')
    setStatus(res.data)
  }

  useEffect(() => {
    refreshStatus().catch((error) => notify({ type: 'error', title: 'Status', message: error.message }))
  }, [notify])

  async function run(label, fn) {
    setBusy(label)
    try {
      const result = await fn()
      setLastResult(result)
      notify({ type: 'success', title: label, message: 'Operación completada' })
      await refreshStatus()
      return result
    } catch (error) {
      notify({ type: 'error', title: label, message: error.message })
      throw error
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        workspace={WORKSPACE_IDS.CRM}
        eyebrow="Integraciones"
        title="Wisetrack — consola de datos"
        dataSourceKey="wisetrack-console"
        description="Usa el Bearer guardado en BD para consultar la API (Postman WT-UCM) e ingresar pings a ucm_fleet."
      />

      <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 text-sm shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-foreground">Estado / token</p>
          <NavLink
            to={crmRoutes.wisetrackCredentials}
            className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
          >
            Credenciales / Token →
          </NavLink>
        </div>
        <pre className="overflow-auto rounded-xl bg-muted/40 p-3 text-xs">
          {JSON.stringify(status || { loading: true }, null, 2)}
        </pre>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-violet-500/[0.06] via-card to-emerald-500/[0.05] p-5 shadow-sm">
          <h2 className="text-base font-bold">1) Vehículos</h2>
          <p className="text-xs text-muted-foreground">
            <code>GET /ucm/get/v1/vehicles</code> → sincroniza a mantenedor Vehicles
            (<code>wisetrack_vehicle_id</code>).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('Pull vehicles', async () => {
                const res = await apiRequest('/integrations/wisetrack/pull/vehicles', { method: 'POST', body: '{}' })
                return res.data
              })}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy === 'Pull vehicles' ? 'Sincronizando…' : 'Sincronizar vehículos'}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('Preview vehicles', async () => {
                const res = await apiRequest('/integrations/wisetrack/remote/vehicles')
                return res.data
              })}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Solo consultar (preview)
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold">2) Pings GPS</h2>
          <p className="text-xs text-muted-foreground">
            Descarga <strong>día por día</strong> (1 bitácora por fecha de ts) para evitar el tope ~20k
            de un rango multi-día. Inserta en <code>gps_minute_pings</code>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="FROM">
              <CrmDatePicker
                value={from}
                onChange={setFrom}
                placeholder="Seleccione desde"
                required
              />
            </FormField>
            <FormField label="TO">
              <CrmDatePicker
                value={to}
                onChange={setTo}
                placeholder="Seleccione hasta"
                required
              />
            </FormField>
          </div>
          <FormField label="vehicle_id (opcional)">
            <input
              className={inputClass}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="Vacío = todos los pings del rango"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy) || !from || !to}
              onClick={() => run('Pull pings', async () => {
                const res = await apiRequest('/integrations/wisetrack/pull/pings', {
                  method: 'POST',
                  body: JSON.stringify({
                    from: apiFrom,
                    to: apiTo,
                    vehicle_id: vehicleId || undefined,
                    day_by_day: true,
                    page_size: 1000,
                  }),
                })
                return res.data
              })}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy === 'Pull pings' ? 'Descargando día a día…' : 'Pull + ingest (día a día)'}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !from || !to}
              onClick={() => run('Preview pings', async () => {
                const qs = new URLSearchParams({
                  from: apiFrom,
                  to: apiTo,
                  page: '1',
                  page_size: '100',
                })
                const path = vehicleId
                  ? `/integrations/wisetrack/remote/vehicles/${encodeURIComponent(vehicleId)}/pings?${qs}`
                  : `/integrations/wisetrack/remote/pings?${qs}`
                const res = await apiRequest(path)
                return res.data
              })}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Solo consultar (preview)
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-base font-bold">3) Consolidar gps_daily_km</h2>
        <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
          Por defecto consolida el <strong>día anterior (Chile)</strong>. Si ese día no tiene pings,
          usa el último día con datos. Siempre deja registro en bitácora (<code>consolidate-day-YYYY-MM-DD</code>).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <FormField label={`Fecha (ayer Chile: ${chileYesterdayIso()})`}>
            <input
              type="date"
              className={inputClass}
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
            />
          </FormField>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={async () => {
              setBusy('Consolidar')
              try {
                const res = await apiRequest('/integrations/wisetrack/consolidate-daily', {
                  method: 'POST',
                  body: JSON.stringify({ reading_date: readingDate || undefined }),
                })
                const data = res.data
                setLastResult(data)
                notify({
                  type: data?.pings_source > 0 ? 'success' : 'warning',
                  title: 'Consolidar',
                  message: data?.message || `${data?.rows ?? 0} filas · ${data?.reading_date || ''}`,
                })
                await refreshStatus()
              } catch (error) {
                notify({ type: 'error', title: 'Consolidar', message: error.message })
              } finally {
                setBusy('')
              }
            }}
            className="h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold disabled:opacity-60"
          >
            Consolidar
          </button>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold">Último resultado</p>
        <pre className="max-h-[360px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">
          {lastResult ? JSON.stringify(lastResult, null, 2) : '— ejecuta una acción —'}
        </pre>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <NavLink to={crmRoutes.mantenedoresCatalogo('vehicles')} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
            Ver Vehicles
          </NavLink>
          <NavLink to={crmRoutes.mantenedoresCatalogo('gps-minute-pings')} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
            Ver GPS minute pings
          </NavLink>
          <NavLink to={crmRoutes.mantenedoresCatalogo('wisetrack-ingestion-log')} className="font-semibold text-muted-foreground hover:underline">
            Bitácora ingesta
          </NavLink>
        </div>
      </section>
    </div>
  )
}
