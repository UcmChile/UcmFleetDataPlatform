import { query, sql } from '../../database/db.js'
import { ApiError } from '../../utils/apiError.js'
import { wisetrackClient } from './client.js'
import { consolidateDailyKm, ingestBatch } from './ingestionService.js'
import { chileDayWindow } from '../../lib/chileDay.js'

function asArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key]
  }
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data)) return payload.data
    for (const key of keys) {
      if (Array.isArray(payload.data[key])) return payload.data[key]
    }
  }
  return []
}

function pick(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] != null && obj[key] !== '') return obj[key]
  }
  return null
}

function normalizePlate(value) {
  if (value == null || value === '') return null
  return String(value).trim().toUpperCase()
}

/**
 * Contrato real GET /ucm/get/v1/vehicles:
 * { data: [{ vehicleIdentifier, vehiclePlate }, ...] }
 */
function mapVehicle(row) {
  const wisetrackId = String(
    pick(
      row,
      'vehicleIdentifier',
      'vehicle_identifier',
      'vehicle_id',
      'vehicleId',
      'id',
      'wisetrack_vehicle_id',
      'device_id',
    ) || '',
  ).trim()
  if (!wisetrackId) return null

  const plate = normalizePlate(
    pick(row, 'vehiclePlate', 'vehicle_plate', 'plate', 'patente', 'license_plate', 'licensePlate'),
  )

  return {
    wisetrack_vehicle_id: wisetrackId,
    plate,
    make: pick(row, 'make', 'marca', 'brand'),
    model: pick(row, 'model', 'modelo'),
    status: pick(row, 'status', 'estado', 'active') == null
      ? 'active'
      : (row.active === false || row.status === false ? 'inactive' : String(pick(row, 'status', 'estado', 'active'))),
    vehicle_number: String(
      pick(row, 'vehicle_number', 'movil', 'code', 'name') || `WT-${wisetrackId}`,
    ),
    vin: pick(row, 'vin', 'VIN'),
    raw: row,
  }
}

function mapPing(row) {
  const vehicleId = pick(
    row,
    'vehicleIdentifier',
    'vehicle_identifier',
    'vehicle_id',
    'vehicleId',
    'wisetrack_vehicle_id',
  )
  const timestamp = pick(
    row,
    'timestamp',
    'ts',
    'datetime',
    'date_time',
    'dateTime',
    'ping_time',
    'pingTime',
    'time',
    'gpsDate',
    'gps_date',
  )
  if (!vehicleId || !timestamp) return null
  return {
    vehicle_id: String(vehicleId),
    plate: normalizePlate(pick(row, 'vehiclePlate', 'vehicle_plate', 'plate', 'patente', 'license_plate')),
    timestamp: String(timestamp),
    latitude: Number(pick(row, 'latitude', 'lat', 'Latitude')),
    longitude: Number(pick(row, 'longitude', 'lon', 'lng', 'Longitude')),
    speed_kmh: Number(pick(row, 'speed_kmh', 'speed', 'velocity', 'Speed')),
    odometer_km: (() => {
      const raw = pick(row, 'odometer_km', 'odometer', 'odometerKm', 'odo', 'mileage')
      if (raw == null || raw === '') return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    })(),
    ignition_on: (() => {
      const raw = pick(row, 'ignition_on', 'ignition', 'ignitionOn', 'engine_on', 'ignitionStatus')
      if (typeof raw === 'boolean') return raw
      if (raw == null) return true
      return ['1', 'true', 'on', 'yes'].includes(String(raw).toLowerCase())
    })(),
    event_type: pick(row, 'event_type', 'eventType', 'type') || 'periodic',
    driver_id: pick(row, 'driver_id', 'driverId', 'driver'),
  }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateOnly(value) {
  const raw = String(value || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!match) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

function eachDateInclusive(fromDate, toDate) {
  const dates = []
  let cursor = fromDate
  while (cursor <= toDate) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

/**
 * Mismo día civil Chile, 00:00:00 a 23:59:59.
 * El fin no avanza al día siguiente.
 */
function dayWindowIso(dateStr) {
  return chileDayWindow(dateStr)
}

/**
 * Sincroniza catálogo remoto GET /ucm/get/v1/vehicles → dbo.vehicles
 */
export async function pullAndSyncVehicles() {
  const remote = await wisetrackClient.getVehicles()
  const rawRows = asArray(remote, ['vehicles', 'items', 'results', 'data'])
  const rows = rawRows.map(mapVehicle).filter(Boolean)

  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors = []

  for (const vehicle of rows) {
    if (!vehicle.plate) {
      skipped += 1
      errors.push({
        wisetrack_vehicle_id: vehicle.wisetrack_vehicle_id,
        reason: 'sin patente',
      })
      continue
    }

    const existing = await query(
      `
      SELECT TOP 1 id, plate, wisetrack_vehicle_id
      FROM dbo.vehicles
      WHERE wisetrack_vehicle_id = @wt_id
         OR UPPER(LTRIM(RTRIM(plate))) = UPPER(LTRIM(RTRIM(@plate)))
      ORDER BY CASE WHEN wisetrack_vehicle_id = @wt_id THEN 0 ELSE 1 END
      `,
      {
        wt_id: { type: sql.NVarChar(50), value: vehicle.wisetrack_vehicle_id },
        plate: { type: sql.NVarChar(20), value: vehicle.plate },
      },
    )

    if (existing.recordset[0]) {
      await query(
        `
        UPDATE dbo.vehicles
        SET wisetrack_vehicle_id = @wt_id,
            plate = @plate,
            make = COALESCE(@make, make),
            model = COALESCE(@model, model),
            status = COALESCE(@status, status),
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
          id: { type: sql.BigInt, value: existing.recordset[0].id },
          wt_id: { type: sql.NVarChar(50), value: vehicle.wisetrack_vehicle_id },
          plate: { type: sql.NVarChar(20), value: vehicle.plate },
          make: { type: sql.NVarChar(80), value: vehicle.make },
          model: { type: sql.NVarChar(80), value: vehicle.model },
          status: { type: sql.NVarChar(40), value: vehicle.status },
        },
      )
      updated += 1
      continue
    }

    try {
      await query(
        `
        INSERT INTO dbo.vehicles
          (vehicle_number, plate, vin, make, model, status, wisetrack_vehicle_id)
        VALUES
          (@vehicle_number, @plate, @vin, @make, @model, @status, @wt_id)
        `,
        {
          vehicle_number: { type: sql.NVarChar(50), value: vehicle.vehicle_number },
          plate: { type: sql.NVarChar(20), value: vehicle.plate },
          vin: { type: sql.NVarChar(50), value: vehicle.vin },
          make: { type: sql.NVarChar(80), value: vehicle.make },
          model: { type: sql.NVarChar(80), value: vehicle.model },
          status: { type: sql.NVarChar(40), value: vehicle.status || 'active' },
          wt_id: { type: sql.NVarChar(50), value: vehicle.wisetrack_vehicle_id },
        },
      )
      inserted += 1
    } catch (error) {
      skipped += 1
      errors.push({
        wisetrack_vehicle_id: vehicle.wisetrack_vehicle_id,
        plate: vehicle.plate,
        reason: error?.message || 'insert_failed',
      })
    }
  }

  return {
    remote_raw_count: rawRows.length,
    remote_count: rows.length,
    inserted,
    updated,
    skipped,
    errors: errors.slice(0, 10),
    sample: rows.slice(0, 5).map((v) => ({
      wisetrack_vehicle_id: v.wisetrack_vehicle_id,
      plate: v.plate,
      vehicle_number: v.vehicle_number,
    })),
  }
}

/**
 * Catálogo remoto antes de leer pings. Sin esto, un móvil nuevo llega en
 * GET /pings y se rechaza con vehicle_id_not_mapped.
 */
async function syncVehiclesBeforePings() {
  console.log('[wisetrack] sincronizando vehículos antes de leer pings…')
  const vehicles = await pullAndSyncVehicles()
  console.log(
    `[wisetrack] vehículos remote=${vehicles.remote_count} inserted=${vehicles.inserted} updated=${vehicles.updated} skipped=${vehicles.skipped}`,
  )
  return vehicles
}

/**
 * Descarga e ingesta un único día (una bitácora = un día).
 * Pagina hasta agotar resultados (sin tope artificial de 20k).
 */
export async function pullAndIngestPingsForDay(input = {}) {
  const date = toDateOnly(input.date || input.from)
  if (!date) throw new ApiError(422, 'date/from inválido (YYYY-MM-DD)')

  const vehiclesSync = input.syncVehicles === false ? null : await syncVehiclesBeforePings()
  const range = dayWindowIso(date)
  const pageSize = Math.min(Math.max(Number(input.page_size || input.pageSize || 1000), 1), 1000)
  const maxPages = Math.max(1, Number(input.max_pages || input.maxPages || 500))
  const vehicleId = input.vehicle_id || input.vehicleId || null

  const allPings = []
  let pagesFetched = 0
  let page = 1
  let lastRaw = null
  let hitPageCap = false

  while (pagesFetched < maxPages) {
    const raw = vehicleId
      ? await wisetrackClient.getVehiclePings(vehicleId, range.from, range.to, { page, pageSize })
      : await wisetrackClient.getPings(range.from, range.to, [], { page, pageSize })

    lastRaw = raw
    const chunk = asArray(raw, ['pings', 'items', 'results', 'data']).map(mapPing).filter(Boolean)
    allPings.push(...chunk)
    pagesFetched += 1

    const totalPages = Number(raw?.total_pages || raw?.totalPages || raw?.pages || 0)
    const hasMore = totalPages
      ? page < totalPages
      : chunk.length >= pageSize

    if (!hasMore || chunk.length === 0) break
    if (pagesFetched >= maxPages) {
      hitPageCap = true
      break
    }
    page += 1
  }

  // Orden por timestamp antes de ingest (también se reordena dentro de ingestBatch).
  allPings.sort((a, b) => {
    const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0
    const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0
    if (ta !== tb) return ta - tb
    return String(a?.vehicle_id || '').localeCompare(String(b?.vehicle_id || ''))
  })

  const batch = {
    batch_id: input.batch_id || `pull-day-${date}${vehicleId ? `-v${vehicleId}` : ''}`,
    period_from: range.from,
    period_to: range.to,
    pings: allPings,
  }

  const ingest = await ingestBatch(batch)

  return {
    mode: 'single_day',
    date,
    range,
    vehicle_id: vehicleId,
    vehicles_sync: vehiclesSync,
    pages_fetched: pagesFetched,
    page_size: pageSize,
    hit_page_cap: hitPageCap,
    pings_mapped: allPings.length,
    ingest,
    response_keys: lastRaw && typeof lastRaw === 'object' ? Object.keys(lastRaw) : [],
  }
}

/**
 * Pull por rango: siempre día a día (1 bitácora por día) para evitar el techo ~20k
 * de un solo request multi-día y dejar trazabilidad diaria.
 */
export async function pullAndIngestPings(input = {}) {
  const fromDate = toDateOnly(input.from)
  const toDate = toDateOnly(input.to)
  if (!fromDate || !toDate) {
    throw new ApiError(422, 'from y to son requeridos (YYYY-MM-DD o ISO 8601)')
  }
  if (fromDate > toDate) {
    throw new ApiError(422, 'from no puede ser mayor que to')
  }

  const dayByDay = input.day_by_day !== false && input.dayByDay !== false
  const dates = eachDateInclusive(fromDate, toDate)
  const vehiclesSync = await syncVehiclesBeforePings()

  if (!dayByDay && dates.length > 1) {
    const result = await pullAndIngestPingsSingleWindow({ ...input, syncVehicles: false })
    return { ...result, vehicles_sync: vehiclesSync }
  }

  const days = []
  for (const date of dates) {
    try {
      const result = await pullAndIngestPingsForDay({
        ...input,
        syncVehicles: false,
        date,
        batch_id: `pull-day-${date}${input.vehicle_id || input.vehicleId ? `-v${input.vehicle_id || input.vehicleId}` : ''}`,
      })
      days.push({ ...result, ok: true })
      console.log(
        `[wisetrack] day ${date}: mapped=${result.pings_mapped} inserted=${result.ingest?.n_pings_inserted ?? '?'} rejected=${result.ingest?.n_pings_rejected ?? '?'} pages=${result.pages_fetched}`,
      )
    } catch (error) {
      days.push({
        mode: 'single_day',
        date,
        ok: false,
        error: error?.message || String(error),
        pings_mapped: 0,
        ingest: null,
      })
      console.error(`[wisetrack] day ${date} failed:`, error?.message || error)
    }
  }

  return {
    mode: 'day_by_day',
    vehicles_sync: vehiclesSync,
    from: fromDate,
    to: toDate,
    days_requested: dates.length,
    days_completed: days.filter((d) => d.ok).length,
    days_failed: days.filter((d) => !d.ok).length,
    days,
    totals: summarizeDayResults(days),
  }
}

/** Legacy: un solo request multi-día (puede truncar ~20k). */
async function pullAndIngestPingsSingleWindow(input = {}) {
  const fromDate = toDateOnly(input.from)
  const toDate = toDateOnly(input.to)
  const range = {
    from: input.from?.includes?.('T') ? input.from : `${fromDate}T00:00:00.000Z`,
    to: input.to?.includes?.('T') ? input.to : `${toDate}T23:59:59.999Z`,
  }
  const pageSize = Math.min(Math.max(Number(input.page_size || input.pageSize || 1000), 1), 1000)
  const maxPages = Math.max(1, Number(input.max_pages || input.maxPages || 500))
  const vehicleId = input.vehicle_id || input.vehicleId || null

  const allPings = []
  let pagesFetched = 0
  let page = 1
  let lastRaw = null

  while (pagesFetched < maxPages) {
    const raw = vehicleId
      ? await wisetrackClient.getVehiclePings(vehicleId, range.from, range.to, { page, pageSize })
      : await wisetrackClient.getPings(range.from, range.to, [], { page, pageSize })

    lastRaw = raw
    const chunk = asArray(raw, ['pings', 'items', 'results', 'data']).map(mapPing).filter(Boolean)
    allPings.push(...chunk)
    pagesFetched += 1

    const totalPages = Number(raw?.total_pages || raw?.totalPages || raw?.pages || 0)
    const hasMore = totalPages
      ? page < totalPages
      : chunk.length >= pageSize

    if (!hasMore || chunk.length === 0) break
    page += 1
  }

  const batch = {
    batch_id: input.batch_id || `pull-range-${fromDate}_${toDate}-${Date.now()}`,
    period_from: range.from,
    period_to: range.to,
    pings: allPings,
  }
  const ingest = await ingestBatch(batch)

  return {
    mode: 'single_window',
    range,
    vehicle_id: vehicleId,
    pages_fetched: pagesFetched,
    pings_mapped: allPings.length,
    ingest,
    response_keys: lastRaw && typeof lastRaw === 'object' ? Object.keys(lastRaw) : [],
    warning: 'Modo single_window: la API puede truncar ~20k pings. Prefiera day_by_day.',
  }
}

function summarizeDayResults(days) {
  return days.reduce(
    (acc, day) => {
      acc.pings_mapped += Number(day.pings_mapped || 0)
      acc.n_pings_inserted += Number(day.ingest?.n_pings_inserted || 0)
      acc.n_pings_duplicated += Number(day.ingest?.n_pings_duplicated || 0)
      acc.n_pings_rejected += Number(day.ingest?.n_pings_rejected || 0)
      acc.n_pings_received += Number(day.ingest?.n_pings_received || day.pings_mapped || 0)
      return acc
    },
    {
      pings_mapped: 0,
      n_pings_received: 0,
      n_pings_inserted: 0,
      n_pings_duplicated: 0,
      n_pings_rejected: 0,
    },
  )
}

/** Limpia pings GPS y bitácoras de ingesta (no toca vehicles). */
export async function clearGpsIngestionData() {
  await query('DELETE FROM dbo.wisetrack_rejected_pings')
  await query('DELETE FROM dbo.gps_minute_pings')
  await query('DELETE FROM dbo.gps_daily_km')
  await query('DELETE FROM dbo.wisetrack_ingestion_log')

  const counts = await query(`
    SELECT
      (SELECT COUNT_BIG(1) FROM dbo.gps_minute_pings) AS gps_minute_pings,
      (SELECT COUNT_BIG(1) FROM dbo.gps_daily_km) AS gps_daily_km,
      (SELECT COUNT_BIG(1) FROM dbo.wisetrack_ingestion_log) AS wisetrack_ingestion_log,
      (SELECT COUNT_BIG(1) FROM dbo.wisetrack_rejected_pings) AS wisetrack_rejected_pings
  `)

  return counts.recordset[0]
}

/**
 * Reprocesa un día: borra pings/bitácora de ese día civil (00:00:00 a 23:59:59)
 * y vuelve a descargar+ingestar.
 */
export async function reprocessPingsForDay(input = {}) {
  const date = toDateOnly(input.date || input.from)
  if (!date) throw new ApiError(422, 'date inválido (YYYY-MM-DD)')

  const range = dayWindowIso(date)
  const t0 = Date.now()
  const logStep = (step) => console.log(`[reprocess ${date}] ${step} (+${Date.now() - t0}ms)`)

  logStep(`inicio ${range.from} → ${range.to}`)

  // Borrado en lotes para no trabar el log/lock con DELETE masivo de un día ~100k.
  let deletedPings = 0
  for (;;) {
    const batch = await query(
      `
      DELETE TOP (20000) FROM dbo.gps_minute_pings
      WHERE ts >= @from_ts AND ts <= @to_ts;
      SELECT @@ROWCOUNT AS n;
      `,
      {
        from_ts: { type: sql.DateTimeOffset, value: new Date(range.from) },
        to_ts: { type: sql.DateTimeOffset, value: new Date(range.to) },
      },
    )
    const n = Number(batch.recordset[0]?.n || 0)
    deletedPings += n
    if (n === 0) break
    logStep(`delete pings lote n=${n} total=${deletedPings}`)
  }

  await query(
    `
    DELETE FROM dbo.wisetrack_rejected_pings
    WHERE ping_ts >= @from_ts AND ping_ts <= @to_ts
    `,
    {
      from_ts: { type: sql.DateTimeOffset, value: new Date(range.from) },
      to_ts: { type: sql.DateTimeOffset, value: new Date(range.to) },
    },
  )

  await query(
    `
    DELETE FROM dbo.wisetrack_ingestion_log
    WHERE period_from >= @from_ts AND period_from <= @to_ts
    `,
    {
      from_ts: { type: sql.DateTimeOffset, value: new Date(range.from) },
      to_ts: { type: sql.DateTimeOffset, value: new Date(range.to) },
    },
  )

  await query(
    `
    DELETE FROM dbo.gps_daily_km
    WHERE reading_date = @reading_date
    `,
    { reading_date: { type: sql.Date, value: date } },
  )
  logStep(`limpieza ok deleted_pings=${deletedPings}`)

  const pull = await pullAndIngestPingsForDay({
    date,
    vehicle_id: input.vehicle_id || input.vehicleId || undefined,
    page_size: input.page_size || 1000,
    max_pages: input.max_pages || 500,
    batch_id: `reprocess-day-${date}`,
  })
  logStep(`pull+ingest mapped=${pull.pings_mapped} inserted=${pull.ingest?.n_pings_inserted ?? '?'}`)

  let consolidate = null
  try {
    consolidate = await consolidateDailyKm(date)
    logStep(`consolidate rows=${consolidate.rows}`)
  } catch (error) {
    console.warn(`[reprocess ${date}] consolidate omitido:`, error?.message || error)
  }

  return {
    date,
    range,
    deleted_pings: deletedPings,
    pull,
    consolidate,
    elapsed_ms: Date.now() - t0,
  }
}
