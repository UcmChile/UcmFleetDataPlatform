import { query, sql } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { chileDayWindow, chileOffsetForDate } from '../lib/chileDay.js'

/** Zona Windows de Chile (Santiago) para el día calendario del ping. */
const CHILE_TZ = 'Pacific SA Standard Time'

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Fecha calendario Chile (America/Santiago) como YYYY-MM-DD. */
function chileTodayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Consultados = catálogo mapeado al leer el día (n_vehicles_expected).
 * Con ping = vehículos con ping aceptado. Sin ping = el resto.
 * Si el lote no guardó el catálogo, consultados queda igual a los que reportaron.
 */
function vehicleSplit(row) {
  const withPing = Number(row?.vehicle_count || 0)
  const consulted = Math.max(Number(row?.vehicles_consulted || 0), withPing)
  return {
    vehicle_count: withPing,
    vehicles_consulted: consulted,
    vehicles_with_ping: withPing,
    vehicles_without_ping: Math.max(0, consulted - withPing),
  }
}

/** Ayer en Chile (= fecha actual − 1 día). Tope para días “esperados”. */
function chileYesterdayIso(now = new Date()) {
  const today = chileTodayIso(now)
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Cobertura mensual: usa la bitácora día-a-día (period_from/to = ventana del ts)
 * para no escanear gps_minute_pings (~millones de filas).
 *
 * Fuente: wisetrack_ingestion_log (1 fila por día de descarga).
 * Fallback opcional: agregación sargable sobre gps_minute_pings si no hay bitácora.
 */
export async function getMonthlyPingCoverage(input = {}) {
  const now = new Date()
  const year = Number(input.year || now.getFullYear())
  const month = Number(input.month || now.getMonth() + 1)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(422, 'year inválido')
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ApiError(422, 'month inválido (1-12)')
  }

  const totalDays = daysInMonth(year, month)
  const monthStart = `${year}-${pad2(month)}-01`

  const monthWindowStart = chileDayWindow(monthStart)
  const monthWindowEnd = chileDayWindow(`${year}-${pad2(month)}-${pad2(totalDays)}`)
  const rangeFrom = monthWindowStart.from
  const rangeTo = monthWindowEnd.to
  const chileOffset = chileOffsetForDate(`${year}-${pad2(month)}-15`)

  // Devolver varchar YYYY-MM-DD (no DATE): el driver JS convierte DATE a medianoche UTC
  // y en Chile (UTC-4) getDate() corre el día al anterior (pierde fin de mes).
  let source = 'wisetrack_ingestion_log'
  let result = await query(
    `
    WITH daily AS (
      SELECT
        CONVERT(varchar(10), CAST(l.period_from AS datetime2), 23) AS ping_date,
        CAST(ISNULL(l.n_pings_inserted, 0) AS BIGINT) AS n_pings_inserted,
        CAST(ISNULL(l.n_pings_received, 0) AS BIGINT) AS n_pings_received,
        CAST(ISNULL(l.n_vehicles_reporting, 0) AS INT) AS n_vehicles_reporting,
        CAST(ISNULL(l.n_vehicles_expected, 0) AS INT) AS n_vehicles_expected,
        ROW_NUMBER() OVER (
          PARTITION BY CONVERT(varchar(10), CAST(l.period_from AS datetime2), 23)
          ORDER BY ISNULL(l.completed_at, l.started_at) DESC, l.id DESC
        ) AS rn
      FROM dbo.wisetrack_ingestion_log l
      WHERE CONVERT(date, CAST(l.period_from AS datetime2)) >= @month_start
        AND CONVERT(date, CAST(l.period_from AS datetime2)) <= @month_end
        AND l.status IN (N'success', N'partial')
        AND l.batch_id NOT LIKE N'consolidate-%'
    )
    SELECT
      ping_date,
      SUM(n_pings_inserted) AS ping_count,
      SUM(n_pings_received) AS ping_received,
      MAX(CASE WHEN rn = 1 THEN n_vehicles_reporting END) AS vehicle_count,
      MAX(CASE WHEN rn = 1 THEN n_vehicles_expected END) AS vehicles_consulted,
      COUNT_BIG(1) AS batch_count
    FROM daily
    GROUP BY ping_date
    ORDER BY ping_date
    `,
    {
      month_start: { type: sql.Date, value: monthStart },
      month_end: { type: sql.Date, value: `${year}-${pad2(month)}-${pad2(totalDays)}` },
    },
  )

  if (!result.recordset.length) {
    source = 'gps_minute_pings'
    result = await query(
      `
      SELECT
        CONVERT(varchar(10), SWITCHOFFSET(p.ts, @chile_offset), 23) AS ping_date,
        COUNT_BIG(1) AS ping_count,
        COUNT_BIG(1) AS ping_received,
        COUNT(DISTINCT p.vehicle_id) AS vehicle_count
      FROM dbo.gps_minute_pings p
      WHERE p.ts >= @range_from
        AND p.ts <= @range_to
      GROUP BY CONVERT(varchar(10), SWITCHOFFSET(p.ts, @chile_offset), 23)
      ORDER BY ping_date
      `,
      {
        range_from: { type: sql.DateTimeOffset, value: new Date(rangeFrom) },
        range_to: { type: sql.DateTimeOffset, value: new Date(rangeTo) },
        chile_offset: { type: sql.NVarChar(6), value: chileOffset },
      },
    )
  }

  const byDate = new Map()
  for (const row of result.recordset) {
    const key = toIsoDateKey(row.ping_date)
    byDate.set(key, {
      date: key,
      day: Number(key.slice(8, 10)),
      has_pings: Number(row.ping_count || 0) > 0 || Number(row.ping_received || 0) > 0,
      ping_count: Number(row.ping_count || 0),
      batch_count: Number(row.batch_count || 0),
      ...vehicleSplit(row),
    })
  }

  // Solo se exigen datos hasta ayer (fecha actual Chile − 1). Hoy y futuros no cuentan como faltantes.
  const asOfDate = chileYesterdayIso()
  const days = []
  let daysExpected = 0
  let daysWithPings = 0
  let totalPings = 0
  let maxVehiclesInDay = 0

  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${year}-${pad2(month)}-${pad2(day)}`
    const expected = date <= asOfDate
    const found = byDate.get(date)
    const hasPings = Boolean(found?.has_pings)
    const split = found || vehicleSplit(null)
    const row = {
      date,
      day,
      has_pings: hasPings,
      ping_count: found?.ping_count || 0,
      vehicle_count: split.vehicle_count,
      vehicles_consulted: split.vehicles_consulted,
      vehicles_with_ping: split.vehicles_with_ping,
      vehicles_without_ping: split.vehicles_without_ping,
      batch_count: found?.batch_count || 0,
      expected,
      status: !expected ? 'pending' : hasPings ? 'ok' : 'missing',
    }
    if (expected) {
      daysExpected += 1
      if (hasPings) {
        daysWithPings += 1
        totalPings += row.ping_count
        maxVehiclesInDay = Math.max(maxVehiclesInDay, row.vehicle_count || 0)
      }
    } else if (hasPings) {
      totalPings += row.ping_count
      maxVehiclesInDay = Math.max(maxVehiclesInDay, row.vehicle_count || 0)
    }
    days.push(row)
  }

  const daysWithoutPings = daysExpected - daysWithPings
  const coveragePct = daysExpected
    ? Math.round((daysWithPings / daysExpected) * 1000) / 10
    : 0

  const batchesResult = await query(
    `
    SELECT
      l.batch_id,
      l.status,
      CONVERT(varchar(33), l.started_at, 127) AS started_at,
      CONVERT(varchar(33), l.completed_at, 127) AS completed_at,
      CONVERT(varchar(33), l.period_from, 127) AS period_from,
      CONVERT(varchar(33), l.period_to, 127) AS period_to,
      CONVERT(varchar(10), CAST(l.period_from AS datetime2), 23) AS ping_date,
      l.n_vehicles_expected,
      l.n_vehicles_reporting,
      l.n_pings_received,
      l.n_pings_inserted,
      l.n_pings_duplicated,
      l.n_pings_rejected,
      LEFT(l.error_details, 500) AS error_details
    FROM dbo.wisetrack_ingestion_log l
    WHERE CONVERT(date, CAST(l.period_from AS datetime2)) >= @month_start
      AND CONVERT(date, CAST(l.period_from AS datetime2)) <= @month_end
      AND l.batch_id NOT LIKE N'consolidate-%'
    ORDER BY ping_date, l.started_at
    `,
    {
      month_start: { type: sql.Date, value: monthStart },
      month_end: { type: sql.Date, value: `${year}-${pad2(month)}-${pad2(totalDays)}` },
    },
  )

  const batches = batchesResult.recordset.map((row) => ({
    batch_id: row.batch_id,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    period_from: row.period_from,
    period_to: row.period_to,
    ping_date: toIsoDateKey(row.ping_date),
    n_vehicles_expected: row.n_vehicles_expected == null ? null : Number(row.n_vehicles_expected),
    n_vehicles_reporting: row.n_vehicles_reporting == null ? null : Number(row.n_vehicles_reporting),
    n_pings_received: Number(row.n_pings_received || 0),
    n_pings_inserted: Number(row.n_pings_inserted || 0),
    n_pings_duplicated: Number(row.n_pings_duplicated || 0),
    n_pings_rejected: Number(row.n_pings_rejected || 0),
    error_details: row.error_details || '',
  }))

  return {
    year,
    month,
    month_label: `${year}-${pad2(month)}`,
    timezone: CHILE_TZ,
    as_of_date: asOfDate,
    source,
    group_by: source === 'wisetrack_ingestion_log'
      ? 'wisetrack_ingestion_log.period_from (ventana diaria del ts)'
      : 'gps_minute_pings.ts',
    days_in_month: totalDays,
    days_expected: daysExpected,
    days_with_pings: daysWithPings,
    days_without_pings: daysWithoutPings,
    days_pending: totalDays - daysExpected,
    coverage_pct: coveragePct,
    total_pings: totalPings,
    max_vehicles_in_day: maxVehiclesInDay,
    days,
    batches,
  }
}

/** Catálogo mapeado y si tuvo ping aceptado en la ventana Chile de esa fecha. */
export async function getDailyVehicleReport(date) {
  const day = String(date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new ApiError(422, 'date inválida (YYYY-MM-DD)')
  }

  const window = chileDayWindow(day)
  const result = await query(
    `
    SELECT
      v.id AS vehicle_id,
      v.vehicle_number,
      v.plate,
      v.wisetrack_vehicle_id,
      CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.gps_minute_pings p
        WHERE p.vehicle_id = v.id
          AND p.ts >= @from_ts
          AND p.ts <= @to_ts
      ) THEN 1 ELSE 0 END AS reported
    FROM dbo.vehicles v
    WHERE v.wisetrack_vehicle_id IS NOT NULL
      AND LTRIM(RTRIM(v.wisetrack_vehicle_id)) <> N''
    ORDER BY reported ASC, v.plate
    `,
    {
      from_ts: { type: sql.DateTimeOffset, value: new Date(window.from) },
      to_ts: { type: sql.DateTimeOffset, value: new Date(window.to) },
    },
  )

  const vehicles = result.recordset.map((row) => ({
    vehicle_id: Number(row.vehicle_id),
    vehicle_number: row.vehicle_number || '',
    plate: row.plate || '',
    wisetrack_vehicle_id: row.wisetrack_vehicle_id || '',
    reported: Number(row.reported) === 1 ? 'Sí' : 'No',
  }))
  const withPing = vehicles.filter((row) => row.reported === 'Sí').length

  return {
    date: day,
    vehicles_consulted: vehicles.length,
    vehicles_with_ping: withPing,
    vehicles_without_ping: vehicles.length - withPing,
    vehicles,
  }
}

function toIsoDateKey(value) {
  if (value instanceof Date) {
    // DATE de SQL llega como UTC midnight: usar UTC para no restar un día en Chile.
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
  }
  return String(value || '').slice(0, 10)
}

/**
 * Salud de ingesta según umbrales §8 de la especificación Wisetrack.
 * Usa bitácora + último ping por vehículo + anomalías en gps_daily_km.
 */
export async function getIngestionHealth() {
  const fleetTarget = 93 // spec §8 / §9: ~93 unidades activas
  const coverageMinPct = 90
  const coverageMinVehicles = Math.ceil((fleetTarget * coverageMinPct) / 100) // 84

  const asOfDate = chileYesterdayIso()

  const [summary, lastBatch, failed, silent, silentItems, anomalies, anomalyItems, dailyKm] = await Promise.all([
    query(`
      SELECT
        COUNT_BIG(1) AS batches_total,
        SUM(CASE WHEN status = N'failed' THEN 1 ELSE 0 END) AS batches_failed,
        SUM(CASE WHEN status = N'partial' THEN 1 ELSE 0 END) AS batches_partial,
        SUM(CASE WHEN status = N'success' THEN 1 ELSE 0 END) AS batches_success,
        SUM(CAST(ISNULL(n_pings_received, 0) AS BIGINT)) AS pings_received,
        SUM(CAST(ISNULL(n_pings_inserted, 0) AS BIGINT)) AS pings_inserted,
        SUM(CAST(ISNULL(n_pings_rejected, 0) AS BIGINT)) AS pings_rejected,
        AVG(CAST(n_vehicles_reporting AS FLOAT)) AS avg_vehicles_reporting,
        MAX(n_vehicles_reporting) AS max_vehicles_reporting
      FROM dbo.wisetrack_ingestion_log
      WHERE batch_id NOT LIKE N'consolidate-%'
    `),
    query(`
      SELECT TOP 1
        id,
        batch_id,
        status,
        n_vehicles_expected,
        n_vehicles_reporting,
        n_pings_received,
        n_pings_inserted,
        n_pings_rejected,
        CONVERT(varchar(33), period_from, 127) AS period_from,
        CONVERT(varchar(33), period_to, 127) AS period_to,
        CONVERT(varchar(33), completed_at, 127) AS completed_at,
        CONVERT(varchar(33), started_at, 127) AS started_at
      FROM dbo.wisetrack_ingestion_log
      WHERE status IN (N'success', N'partial')
        AND batch_id NOT LIKE N'consolidate-%'
      ORDER BY ISNULL(completed_at, started_at) DESC
    `),
    query(`
      SELECT TOP 20
        id,
        batch_id,
        status,
        CONVERT(varchar(33), period_from, 127) AS period_from,
        CONVERT(varchar(33), completed_at, 127) AS completed_at,
        LEFT(ISNULL(error_details, N''), 400) AS error_preview
      FROM dbo.wisetrack_ingestion_log
      WHERE status = N'failed'
        AND batch_id NOT LIKE N'consolidate-%'
      ORDER BY started_at DESC
    `),
    query(`
      SELECT
        COUNT(1) AS vehicles_mapped,
        SUM(CASE WHEN last_ts IS NULL THEN 1 ELSE 0 END) AS never_reported,
        SUM(CASE
              WHEN last_ts IS NOT NULL
               AND fleet_max_ts IS NOT NULL
               AND last_ts < DATEADD(hour, -2, fleet_max_ts)
              THEN 1 ELSE 0 END) AS silent_over_2h,
        CONVERT(varchar(33), MAX(fleet_max_ts), 127) AS fleet_max_ts
      FROM (
        SELECT
          v.id,
          lv.last_ts,
          (SELECT MAX(p2.ts) FROM dbo.gps_minute_pings p2) AS fleet_max_ts
        FROM dbo.vehicles v
        OUTER APPLY (
          SELECT MAX(p.ts) AS last_ts
          FROM dbo.gps_minute_pings p
          WHERE p.vehicle_id = v.id
        ) lv
        WHERE v.wisetrack_vehicle_id IS NOT NULL
      ) x
    `),
    query(`
      SELECT
        v.id AS vehicle_id,
        v.plate,
        v.wisetrack_vehicle_id,
        CONVERT(varchar(33), lv.last_ts, 127) AS last_ts
      FROM dbo.vehicles v
      OUTER APPLY (
        SELECT MAX(p.ts) AS last_ts
        FROM dbo.gps_minute_pings p
        WHERE p.vehicle_id = v.id
      ) lv
      CROSS APPLY (
        SELECT MAX(p2.ts) AS fleet_max_ts
        FROM dbo.gps_minute_pings p2
      ) f
      WHERE v.wisetrack_vehicle_id IS NOT NULL
        AND lv.last_ts IS NOT NULL
        AND lv.last_ts < DATEADD(hour, -2, f.fleet_max_ts)
      ORDER BY lv.last_ts ASC
    `),
    query(`
      SELECT COUNT(1) AS anomaly_rows
      FROM dbo.gps_daily_km
      WHERE has_anomaly = 1
        AND reading_date = @as_of_date
    `, { as_of_date: { type: sql.Date, value: asOfDate } }),
    (() => {
      const dayWindow = chileDayWindow(asOfDate)
      return query(
        `
        SELECT TOP 50
          d.vehicle_id,
          v.plate,
          v.wisetrack_vehicle_id,
          CONVERT(varchar(10), d.reading_date, 23) AS reading_date,
          d.km_raw,
          d.first_odometer_km,
          d.last_odometer_km,
          d.is_consistent,
          d.ping_count,
          o.min_odo,
          o.max_odo,
          CASE
            WHEN d.km_raw IS NOT NULL AND d.km_raw > 1000
              THEN N'Delta odómetro > 1000 km en el día'
            WHEN o.min_odo IS NOT NULL AND o.max_odo IS NOT NULL AND o.min_odo > o.max_odo
              THEN N'Retroceso de odómetro (min > max)'
            ELSE N'Marcada has_anomaly en consolidación'
          END AS reason,
          CASE
            WHEN d.km_raw IS NOT NULL AND d.km_raw > 5000 THEN N'crítica'
            WHEN d.km_raw IS NOT NULL AND d.km_raw > 1000 THEN N'alta'
            ELSE N'media'
          END AS severity_hint
        FROM dbo.gps_daily_km d
        LEFT JOIN dbo.vehicles v ON v.id = d.vehicle_id
        OUTER APPLY (
          SELECT
            MIN(CASE WHEN p.odometer_km > 0 THEN p.odometer_km END) AS min_odo,
            MAX(CASE WHEN p.odometer_km > 0 THEN p.odometer_km END) AS max_odo
          FROM dbo.gps_minute_pings p
          WHERE p.vehicle_id = d.vehicle_id
            AND p.ts >= @range_from
            AND p.ts <= @range_to
        ) o
        WHERE d.has_anomaly = 1
          AND d.reading_date = @as_of_date
        ORDER BY d.km_raw DESC
        `,
        {
          as_of_date: { type: sql.Date, value: asOfDate },
          range_from: { type: sql.DateTimeOffset, value: new Date(dayWindow.from) },
          range_to: { type: sql.DateTimeOffset, value: new Date(dayWindow.to) },
        },
      )
    })(),
    query(`
      SELECT
        COUNT(1) AS rows_total,
        CONVERT(varchar(10), MIN(reading_date), 23) AS min_date,
        CONVERT(varchar(10), MAX(reading_date), 23) AS max_date,
        SUM(CASE WHEN has_anomaly = 1 THEN 1 ELSE 0 END) AS anomalies_total
      FROM dbo.gps_daily_km
    `),
  ])

  const s = summary.recordset[0] || {}
  const last = lastBatch.recordset[0] || null
  const silentRow = silent.recordset[0] || {}
  const daily = dailyKm.recordset[0] || {}

  const pingsReceived = Number(s.pings_received || 0)
  const pingsRejected = Number(s.pings_rejected || 0)
  const rejectRatePct = pingsReceived > 0
    ? Math.round((pingsRejected / pingsReceived) * 1000) / 10
    : 0

  const reporting = Number(last?.n_vehicles_reporting || 0)
  const expected = Number(last?.n_vehicles_expected || fleetTarget)
  const vehicleCoveragePct = expected > 0
    ? Math.round((reporting / expected) * 1000) / 10
    : 0
  const vehicleCoverageVsTargetPct = fleetTarget > 0
    ? Math.round((reporting / fleetTarget) * 1000) / 10
    : 0

  let minutesSinceLastBatch = null
  if (last?.completed_at || last?.started_at) {
    const t = new Date(last.completed_at || last.started_at).getTime()
    minutesSinceLastBatch = Math.round((Date.now() - t) / 60000)
  }

  const failedItems = failed.recordset || []
  const silentList = silentItems.recordset || []
  const anomalyList = anomalyItems.recordset || []

  const alerts = []
  const failedCount = Number(s.batches_failed || 0)
  if (failedCount > 0) {
    alerts.push({
      code: 'batch_failed',
      severity: 'high',
      label: 'Batch fallido',
      detail: `${failedCount} batch(es) en estado failed`,
      threshold: "status = 'failed'",
      items: failedItems,
      columns: [
        { key: 'batch_id', label: 'Batch' },
        { key: 'period_from', label: 'Desde' },
        { key: 'completed_at', label: 'Completado' },
        { key: 'error_preview', label: 'Error' },
      ],
    })
  }
  if (minutesSinceLastBatch != null && minutesSinceLastBatch > 90) {
    alerts.push({
      code: 'batch_late',
      severity: 'high',
      label: 'Batch tardío',
      detail: `Sin batches nuevos en ${minutesSinceLastBatch} min`,
      threshold: '>90 min',
      items: last
        ? [{
            batch_id: last.batch_id,
            status: last.status,
            completed_at: last.completed_at,
            period_from: last.period_from,
            minutes_ago: minutesSinceLastBatch,
          }]
        : [],
      columns: [
        { key: 'batch_id', label: 'Último batch' },
        { key: 'status', label: 'Estado' },
        { key: 'completed_at', label: 'Completado' },
        { key: 'minutes_ago', label: 'Minutos' },
      ],
    })
  }
  // Respecto al último ts de la flota (no al reloj del servidor): útil con backfill histórico.
  const silentCount = Number(silentRow.silent_over_2h || 0)
  if (silentCount > 0) {
    alerts.push({
      code: 'vehicle_silent',
      severity: 'medium',
      label: 'Vehículo sin reportar',
      detail: `${silentCount} vehículo(s) sin pings >2 h antes del último ts de flota`,
      threshold: '>2 horas vs MAX(ts)',
      explanation: [
        'Se compara el último ping de cada vehículo mapeado contra el MAX(ts) de toda la flota.',
        'Si un vehículo dejó de reportar más de 2 horas antes de ese borde de datos, aparece aquí.',
        'No usa el reloj del servidor (útil con backfill histórico).',
      ].join(' '),
      items: silentList,
      columns: [
        { key: 'plate', label: 'Patente' },
        { key: 'wisetrack_vehicle_id', label: 'Wisetrack ID' },
        { key: 'last_ts', label: 'Último ping' },
      ],
    })
  }
  if (rejectRatePct > 5) {
    alerts.push({
      code: 'reject_rate',
      severity: 'medium',
      label: 'Tasa de rechazo alta',
      detail: `${rejectRatePct}% de pings rechazados`,
      threshold: '>5%',
      items: [{
        pings_received: pingsReceived,
        pings_rejected: pingsRejected,
        reject_rate_pct: rejectRatePct,
      }],
      columns: [
        { key: 'pings_received', label: 'Recibidos' },
        { key: 'pings_rejected', label: 'Rechazados' },
        { key: 'reject_rate_pct', label: '% rechazo' },
      ],
    })
  }
  const anomalyCount = Number(anomalies.recordset[0]?.anomaly_rows || 0)
  if (anomalyCount > 10) {
    const enrichedAnomalies = anomalyList.map((row) => ({
      ...row,
      km_raw: row.km_raw != null ? Number(row.km_raw) : null,
      first_odometer_km: row.first_odometer_km != null ? Number(row.first_odometer_km) : null,
      last_odometer_km: row.last_odometer_km != null ? Number(row.last_odometer_km) : null,
      min_odo: row.min_odo != null ? Number(row.min_odo) : null,
      max_odo: row.max_odo != null ? Number(row.max_odo) : null,
      ping_count: Number(row.ping_count || 0),
      is_consistent: row.is_consistent === true || row.is_consistent === 1 ? 'OK' : 'Inconsistente',
    }))
    const reasonCounts = enrichedAnomalies.reduce((acc, row) => {
      const key = row.reason || 'Otra'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    alerts.push({
      code: 'odometer_anomaly',
      severity: 'low',
      label: 'Anomalías de odómetro',
      detail: `${anomalyCount} vehículos con anomalía el ${asOfDate} (umbral alerta: >10)`,
      threshold: 'km_raw > 1000 km/día o retroceso (spec §6.2)',
      explanation: [
        `Regla de consolidación gps_daily_km (§6.2): km_raw = MAX(odómetro>0) − MIN(odómetro>0) del día (se ignoran 0/NULL).`,
        `Se marca anomalía si km_raw > 1000 km en un día o si hay retroceso.`,
        `Nota: el orden de inserción (id) no altera MAX−MIN; si ves odómetro 0 en pings, son datos fuente (Wisetrack), no un bug de orden.`,
        `Fecha evaluada (ayer Chile): ${asOfDate}.`,
      ].join(' '),
      reading_date: asOfDate,
      reason_summary: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })),
      maintainer_hint: {
        slug: 'gps-daily-km',
        dateFrom: asOfDate,
        dateTo: asOfDate,
      },
      items: enrichedAnomalies,
      columns: [
        { key: 'plate', label: 'Patente' },
        { key: 'wisetrack_vehicle_id', label: 'Wisetrack ID' },
        { key: 'reason', label: 'Causa' },
        { key: 'severity_hint', label: 'Nivel' },
        { key: 'first_odometer_km', label: 'Primer odo' },
        { key: 'last_odometer_km', label: 'Último odo' },
        { key: 'km_raw', label: 'Km día (max−min)' },
        { key: 'is_consistent', label: 'Consistencia' },
        { key: 'ping_count', label: 'Pings' },
      ],
    })
  }
  if (reporting > 0 && reporting < coverageMinVehicles) {
    alerts.push({
      code: 'coverage_low',
      severity: 'low',
      label: 'Cobertura menor a 90%',
      detail: `${reporting} de ${fleetTarget} vehículos objetivo reportando (umbral ${coverageMinVehicles})`,
      threshold: `<${coverageMinVehicles} de ${fleetTarget}`,
      items: last
        ? [{
            n_vehicles_reporting: reporting,
            n_vehicles_expected: expected,
            fleet_target: fleetTarget,
            coverage_vs_target_pct: vehicleCoverageVsTargetPct,
            period_from: last.period_from,
          }]
        : [],
      columns: [
        { key: 'n_vehicles_reporting', label: 'Reportando' },
        { key: 'fleet_target', label: 'Objetivo' },
        { key: 'coverage_vs_target_pct', label: '% vs objetivo' },
        { key: 'period_from', label: 'Ventana' },
      ],
    })
  }

  return {
    generated_at: new Date().toISOString(),
    as_of_date: asOfDate,
    timezone: CHILE_TZ,
    fleet_target: fleetTarget,
    thresholds: {
      batch_late_minutes: 90,
      vehicle_silent_hours: 2,
      reject_rate_pct: 5,
      coverage_min_pct: coverageMinPct,
      coverage_min_vehicles: coverageMinVehicles,
      odometer_anomaly_day: 10,
    },
    summary: {
      batches_total: Number(s.batches_total || 0),
      batches_failed: failedCount,
      batches_partial: Number(s.batches_partial || 0),
      batches_success: Number(s.batches_success || 0),
      pings_received: pingsReceived,
      pings_inserted: Number(s.pings_inserted || 0),
      pings_rejected: pingsRejected,
      reject_rate_pct: rejectRatePct,
      avg_vehicles_reporting: Math.round(Number(s.avg_vehicles_reporting || 0) * 10) / 10,
      max_vehicles_reporting: Number(s.max_vehicles_reporting || 0),
      minutes_since_last_batch: minutesSinceLastBatch,
      vehicles_mapped: Number(silentRow.vehicles_mapped || 0),
      vehicles_silent_over_2h: silentCount,
      vehicles_never_reported: Number(silentRow.never_reported || 0),
    },
    last_batch: last
      ? {
          ...last,
          vehicle_coverage_pct: vehicleCoveragePct,
          vehicle_coverage_vs_target_pct: vehicleCoverageVsTargetPct,
          below_coverage_threshold: reporting < coverageMinVehicles,
        }
      : null,
    gps_daily_km: {
      rows_total: Number(daily.rows_total || 0),
      min_date: daily.min_date,
      max_date: daily.max_date,
      anomalies_total: Number(daily.anomalies_total || 0),
      consolidated: Number(daily.rows_total || 0) > 0,
    },
    failed_batches: failed.recordset,
    alerts,
    alert_count: alerts.length,
    health_ok: alerts.filter((a) => a.severity === 'high').length === 0,
  }
}
