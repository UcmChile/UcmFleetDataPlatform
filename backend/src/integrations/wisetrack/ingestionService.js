import { query, sql, getPool } from '../../database/db.js'
import { validatePing } from './validator.js'
import { chileDayWindow, chileOffsetForDate } from '../../lib/chileDay.js'

async function loadVehicleMap() {
  const result = await query(`
    SELECT id, plate, wisetrack_vehicle_id
    FROM dbo.vehicles
    WHERE wisetrack_vehicle_id IS NOT NULL
  `)
  const map = new Map()
  for (const row of result.recordset) {
    map.set(String(row.wisetrack_vehicle_id), row)
  }
  return map
}

/**
 * Último odómetro por vehículo (por ts, no MAX numérico).
 * Solo para los vehicle_id del batch — evita GROUP BY sobre ~millones de filas.
 */
async function loadLastOdometers(vehicleIds = []) {
  const map = new Map()
  const ids = [...new Set(vehicleIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))]
  if (!ids.length) return map

  // Chunks pequeños: OUTER APPLY TOP 1 usa el PK (vehicle_id, ts).
  const chunkSize = 80
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const valuesSql = chunk.map((_, idx) => `(@id${idx})`).join(',')
    const params = {}
    chunk.forEach((id, idx) => {
      params[`id${idx}`] = { type: sql.BigInt, value: id }
    })
    const result = await query(
      `
      SELECT v.vehicle_id, lv.last_odo
      FROM (VALUES ${valuesSql}) AS v(vehicle_id)
      OUTER APPLY (
        SELECT TOP (1) p.odometer_km AS last_odo
        FROM dbo.gps_minute_pings p
        WHERE p.vehicle_id = v.vehicle_id
          AND p.odometer_km IS NOT NULL
        ORDER BY p.ts DESC
      ) lv
      `,
      params,
    )
    for (const row of result.recordset) {
      if (row.last_odo != null) map.set(Number(row.vehicle_id), Number(row.last_odo))
    }
  }
  return map
}

async function mergeAcceptedRows(tx, rows) {
  if (!rows.length) return { inserted: 0, duplicated: 0 }

  const table = buildAcceptedTable()
  for (const row of rows) {
    table.rows.add(...row)
  }

  const bulkReq = new sql.Request(tx)
  await bulkReq.bulk(table)

  const mergeReq = new sql.Request(tx)
  const mergeResult = await mergeReq.query(`
    DECLARE @out TABLE (action_taken NVARCHAR(10));
    MERGE dbo.gps_minute_pings AS target
    USING (
      SELECT vehicle_id, ts, odometer_km, latitude, longitude, speed_kmh, ignition_on
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY vehicle_id, ts ORDER BY (SELECT 1)) AS rn
        FROM #staging_pings
      ) d
      WHERE rn = 1
    ) AS source
    ON target.vehicle_id = source.vehicle_id AND target.ts = source.ts
    WHEN NOT MATCHED THEN
      INSERT (vehicle_id, ts, odometer_km, latitude, longitude, speed_kmh, ignition_on)
      VALUES (source.vehicle_id, source.ts, source.odometer_km, source.latitude,
              source.longitude, source.speed_kmh, source.ignition_on)
    OUTPUT $action INTO @out;
    SELECT
      SUM(CASE WHEN action_taken = 'INSERT' THEN 1 ELSE 0 END) AS inserted_count
    FROM @out;
    DROP TABLE IF EXISTS #staging_pings;
  `)

  const inserted = Number(mergeResult.recordset[0]?.inserted_count || 0)
  return {
    inserted,
    duplicated: Math.max(0, rows.length - inserted),
  }
}

function buildAcceptedTable() {
  const table = new sql.Table('#staging_pings')
  table.create = true
  table.columns.add('vehicle_id', sql.BigInt, { nullable: false })
  table.columns.add('ts', sql.DateTimeOffset(7), { nullable: false })
  table.columns.add('odometer_km', sql.Decimal(12, 3), { nullable: true })
  table.columns.add('latitude', sql.Decimal(9, 6), { nullable: true })
  table.columns.add('longitude', sql.Decimal(9, 6), { nullable: true })
  table.columns.add('speed_kmh', sql.SmallInt, { nullable: true })
  table.columns.add('ignition_on', sql.Bit, { nullable: true })
  return table
}

function buildRejectedTable() {
  const table = new sql.Table('#staging_rejected')
  table.create = true
  table.columns.add('batch_id', sql.NVarChar(64), { nullable: true })
  table.columns.add('wisetrack_vehicle_id', sql.NVarChar(50), { nullable: true })
  table.columns.add('plate', sql.NVarChar(20), { nullable: true })
  table.columns.add('ping_ts', sql.DateTimeOffset(7), { nullable: true })
  table.columns.add('reason', sql.NVarChar(255), { nullable: false })
  table.columns.add('raw_payload', sql.NVarChar(sql.MAX), { nullable: true })
  return table
}

/**
 * Ingesta idempotente de un batch.
 * Valida en memoria y hace bulk + INSERT…SELECT (mucho más rápido que fila a fila).
 */
function pingTimestampMs(ping) {
  const raw = ping?.timestamp ?? ping?.ts
  if (!raw) return Number.POSITIVE_INFINITY
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY
}

/** Orden estable por timestamp (luego vehicle_id) antes de validar/insertar. */
function sortPingsByTimestamp(pings) {
  return [...pings].sort((a, b) => {
    const dt = pingTimestampMs(a) - pingTimestampMs(b)
    if (dt !== 0) return dt
    return String(a?.vehicle_id || '').localeCompare(String(b?.vehicle_id || ''))
  })
}

export async function ingestBatch(payload) {
  const batchId = payload.batch_id || `manual-${Date.now()}`
  const periodFrom = payload.period_from || new Date().toISOString()
  const periodTo = payload.period_to || new Date().toISOString()
  const pings = sortPingsByTimestamp(Array.isArray(payload.pings) ? payload.pings : [])

  const logInsert = await query(
    `
    INSERT INTO dbo.wisetrack_ingestion_log
      (batch_id, period_from, period_to, n_pings_received, status)
    OUTPUT INSERTED.id
    VALUES (@batch_id, @period_from, @period_to, @n_received, 'running')
    `,
    {
      batch_id: { type: sql.NVarChar(64), value: batchId },
      period_from: { type: sql.DateTimeOffset, value: new Date(periodFrom) },
      period_to: { type: sql.DateTimeOffset, value: new Date(periodTo) },
      n_received: { type: sql.BigInt, value: pings.length },
    },
  )
  const logId = logInsert.recordset[0].id

  const vehicleMap = await loadVehicleMap()
  const candidateVehicleIds = []
  for (const ping of pings) {
    const wtId = ping?.vehicle_id != null ? String(ping.vehicle_id) : ''
    const vehicle = wtId ? vehicleMap.get(wtId) : null
    if (vehicle?.id != null) candidateVehicleIds.push(vehicle.id)
  }
  const lastOdo = await loadLastOdometers(candidateVehicleIds)

  let rejected = 0
  const reporting = new Set()
  const warningSamples = []
  const seenKeys = new Set()
  const acceptedRows = []
  const rejectedTable = buildRejectedTable()

  for (const ping of pings) {
    const result = validatePing(ping, {
      vehicleByWisetrackId: vehicleMap,
      lastOdometerByVehicleId: lastOdo,
    })

    if (result.action === 'reject') {
      rejected += 1
      rejectedTable.rows.add(
        batchId,
        ping.vehicle_id || null,
        ping.plate || null,
        ping.timestamp ? new Date(ping.timestamp) : null,
        result.reason || 'rejected',
        JSON.stringify(ping),
      )
      continue
    }

    if (result.warnings?.length) {
      if (warningSamples.length < 50) {
        warningSamples.push({ vehicle_id: ping.vehicle_id, warnings: result.warnings })
      }
    }

    const dedupeKey = `${result.vehicleId}|${result.ts.toISOString()}`
    if (seenKeys.has(dedupeKey)) {
      continue
    }
    seenKeys.add(dedupeKey)

    const odoValue = Number(ping.odometer_km)
    // Wisetrack a veces envía 0 como “sin dato”; no contaminar min/max ni la secuencia.
    const odoStored = Number.isFinite(odoValue) && odoValue > 0 ? odoValue : null
    acceptedRows.push([
      result.vehicleId,
      result.ts,
      odoStored,
      Number.isFinite(Number(ping.latitude)) ? Number(ping.latitude) : null,
      Number.isFinite(Number(ping.longitude)) ? Number(ping.longitude) : null,
      Number.isFinite(Number(ping.speed_kmh)) ? Number(ping.speed_kmh) : null,
      ping.ignition_on ? 1 : 0,
    ])
    reporting.add(result.vehicleId)
    if (odoStored != null) {
      lastOdo.set(result.vehicleId, odoStored)
    }
  }

  // Reordenar filas aceptadas por ts para que el IDENTITY siga el orden temporal.
  acceptedRows.sort((a, b) => {
    const dt = a[1].getTime() - b[1].getTime()
    if (dt !== 0) return dt
    return Number(a[0]) - Number(b[0])
  })

  let inserted = 0
  let duplicated = 0
  const mergeChunkSize = 15000

  try {
    const pool = await getPool()
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      for (let i = 0; i < acceptedRows.length; i += mergeChunkSize) {
        const chunk = acceptedRows.slice(i, i + mergeChunkSize)
        const mergeStats = await mergeAcceptedRows(tx, chunk)
        inserted += mergeStats.inserted
        duplicated += mergeStats.duplicated
      }

      if (rejectedTable.rows.length) {
        const rejBulk = new sql.Request(tx)
        await rejBulk.bulk(rejectedTable)
        await new sql.Request(tx).query(`
          INSERT INTO dbo.wisetrack_rejected_pings
            (batch_id, wisetrack_vehicle_id, plate, ping_ts, reason, raw_payload)
          SELECT batch_id, wisetrack_vehicle_id, plate, ping_ts, reason, raw_payload
          FROM #staging_rejected
        `)
      }

      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    }

    const status = rejected > 0 && inserted === 0 && duplicated === 0 && acceptedRows.length === 0
      ? (pings.length ? 'failed' : 'success')
      : rejected > 0
        ? 'partial'
        : 'success'

    // Si no hubo accepted pero sí mapped vacíos
    const finalStatus = pings.length === 0
      ? 'success'
      : (inserted === 0 && rejected > 0 && acceptedRows.length === 0)
        ? 'failed'
        : rejected > 0
          ? 'partial'
          : 'success'

    await query(
      `
      UPDATE dbo.wisetrack_ingestion_log
      SET completed_at = SYSDATETIMEOFFSET(),
          n_vehicles_expected = @n_expected,
          n_vehicles_reporting = @n_reporting,
          n_pings_inserted = @n_inserted,
          n_pings_duplicated = @n_duplicated,
          n_pings_rejected = @n_rejected,
          status = @status,
          error_details = @error_details
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: logId },
        n_expected: { type: sql.Int, value: vehicleMap.size },
        n_reporting: { type: sql.Int, value: reporting.size },
        n_inserted: { type: sql.BigInt, value: inserted },
        n_duplicated: { type: sql.BigInt, value: duplicated },
        n_rejected: { type: sql.BigInt, value: rejected },
        status: { type: sql.NVarChar(20), value: finalStatus || status },
        error_details: {
          type: sql.NVarChar(sql.MAX),
          value: warningSamples.length ? JSON.stringify({ warnings: warningSamples }) : null,
        },
      },
    )

    return {
      batch_id: batchId,
      log_id: logId,
      status: finalStatus || status,
      n_pings_received: pings.length,
      n_pings_inserted: inserted,
      n_pings_duplicated: duplicated,
      n_pings_rejected: rejected,
      n_vehicles_reporting: reporting.size,
    }
  } catch (error) {
    await query(
      `
      UPDATE dbo.wisetrack_ingestion_log
      SET completed_at = SYSDATETIMEOFFSET(),
          status = 'failed',
          error_details = @error_details,
          n_pings_inserted = @n_inserted,
          n_pings_duplicated = @n_duplicated,
          n_pings_rejected = @n_rejected
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: logId },
        error_details: { type: sql.NVarChar(sql.MAX), value: String(error.message || error) },
        n_inserted: { type: sql.BigInt, value: inserted },
        n_duplicated: { type: sql.BigInt, value: duplicated },
        n_rejected: { type: sql.BigInt, value: rejected },
      },
    )
    throw error
  }
}

function chileTodayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function chileYesterdayIso(now = new Date()) {
  const today = chileTodayIso(now)
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function dayRangeChile(yyyy) {
  return chileDayWindow(yyyy)
}

async function countPingsInDay(yyyy) {
  const range = dayRangeChile(yyyy)
  const result = await query(
    `
    SELECT COUNT_BIG(1) AS n
    FROM dbo.gps_minute_pings
    WHERE ts >= @range_from AND ts <= @range_to
    `,
    {
      range_from: { type: sql.DateTimeOffset, value: new Date(range.from) },
      range_to: { type: sql.DateTimeOffset, value: new Date(range.to) },
    },
  )
  return Number(result.recordset[0]?.n || 0)
}

async function lastPingDateChile() {
  const result = await query(`
    SELECT CONVERT(varchar(10), SWITCHOFFSET(MAX(ts), @chile_offset), 23) AS d
    FROM dbo.gps_minute_pings
  `, {
    chile_offset: { type: sql.NVarChar(6), value: chileOffsetForDate(chileTodayIso()) },
  })
  return result.recordset[0]?.d || null
}

/**
 * Consolidación diaria gps_daily_km (MERGE §6.2).
 * - Default: ayer Chile; si no hay pings ese día, usa el último día con datos.
 * - Siempre deja registro en wisetrack_ingestion_log (batch_id consolidate-day-*).
 */
export async function consolidateDailyKm(readingDate) {
  const explicit = readingDate ? String(readingDate).slice(0, 10) : null
  if (explicit && !/^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
    throw new Error('reading_date inválida (YYYY-MM-DD)')
  }

  let yyyy = explicit || chileYesterdayIso()
  let resolved_from = explicit ? 'explicit' : 'chile_yesterday'
  let requested_date = yyyy
  let pingsSource = await countPingsInDay(yyyy)

  // Si el día pedido no tiene pings, usar el último día con datos (p. ej. ayer=21 sin GPS → 20).
  if (pingsSource === 0) {
    const fallback = await lastPingDateChile()
    if (fallback && fallback !== yyyy) {
      yyyy = fallback
      pingsSource = await countPingsInDay(yyyy)
      resolved_from = 'last_day_with_pings'
    }
  }

  const range = dayRangeChile(yyyy)
  const batchId = `consolidate-day-${yyyy}`
  const started = new Date()

  const logInsert = await query(
    `
    INSERT INTO dbo.wisetrack_ingestion_log
      (batch_id, period_from, period_to, n_pings_received, status)
    OUTPUT INSERTED.id
    VALUES (@batch_id, @period_from, @period_to, @n_received, N'running')
    `,
    {
      batch_id: { type: sql.NVarChar(64), value: batchId },
      period_from: { type: sql.DateTimeOffset, value: new Date(range.from) },
      period_to: { type: sql.DateTimeOffset, value: new Date(range.to) },
      n_received: { type: sql.BigInt, value: pingsSource },
    },
  )
  const logId = logInsert.recordset[0].id

  try {
    if (pingsSource > 0) {
      await query(
        `
        MERGE dbo.gps_daily_km AS target
        USING (
            SELECT
                a.vehicle_id,
                CAST(@reading_date AS DATE) AS reading_date,
                o.km_raw,
                fo.first_odometer_km,
                lo.last_odometer_km,
                a.ping_count,
                CASE
                  WHEN o.km_raw IS NULL THEN 0
                  WHEN o.km_raw > 1000 THEN 1
                  WHEN fo.first_odometer_km IS NOT NULL
                       AND lo.last_odometer_km IS NOT NULL
                       AND fo.first_odometer_km > lo.last_odometer_km THEN 1
                  ELSE 0
                END AS has_anomaly,
                CASE
                  WHEN fo.first_odometer_km IS NULL OR lo.last_odometer_km IS NULL OR o.km_raw IS NULL THEN 0
                  WHEN ABS(o.km_raw - (lo.last_odometer_km - fo.first_odometer_km)) <= 0.05 THEN 1
                  ELSE 0
                END AS is_consistent
            FROM (
                SELECT vehicle_id, COUNT_BIG(1) AS ping_count
                FROM dbo.gps_minute_pings
                WHERE ts >= @range_from AND ts <= @range_to
                GROUP BY vehicle_id
            ) a
            OUTER APPLY (
                SELECT
                    MAX(p.odometer_km) - MIN(p.odometer_km) AS km_raw
                FROM dbo.gps_minute_pings p
                WHERE p.vehicle_id = a.vehicle_id
                  AND p.ts >= @range_from
                  AND p.ts <= @range_to
                  AND p.odometer_km > 0
            ) o
            OUTER APPLY (
                SELECT TOP (1) p.odometer_km AS first_odometer_km
                FROM dbo.gps_minute_pings p
                WHERE p.vehicle_id = a.vehicle_id
                  AND p.ts >= @range_from
                  AND p.ts <= @range_to
                  AND p.odometer_km > 0
                ORDER BY p.ts ASC, p.id ASC
            ) fo
            OUTER APPLY (
                SELECT TOP (1) p.odometer_km AS last_odometer_km
                FROM dbo.gps_minute_pings p
                WHERE p.vehicle_id = a.vehicle_id
                  AND p.ts >= @range_from
                  AND p.ts <= @range_to
                  AND p.odometer_km > 0
                ORDER BY p.ts DESC, p.id DESC
            ) lo
        ) AS source
        ON target.vehicle_id = source.vehicle_id
           AND target.reading_date = source.reading_date
        WHEN MATCHED THEN UPDATE SET
            km_raw = source.km_raw,
            first_odometer_km = source.first_odometer_km,
            last_odometer_km = source.last_odometer_km,
            ping_count = source.ping_count,
            has_anomaly = source.has_anomaly,
            is_consistent = source.is_consistent
        WHEN NOT MATCHED THEN INSERT (
            vehicle_id, reading_date, km_raw, first_odometer_km, last_odometer_km,
            ping_count, has_anomaly, is_consistent
        )
            VALUES (
                source.vehicle_id, source.reading_date, source.km_raw,
                source.first_odometer_km, source.last_odometer_km,
                source.ping_count, source.has_anomaly, source.is_consistent
            );
        `,
        {
          reading_date: { type: sql.Date, value: yyyy },
          range_from: { type: sql.DateTimeOffset, value: new Date(range.from) },
          range_to: { type: sql.DateTimeOffset, value: new Date(range.to) },
        },
      )
    }

    const count = await query(
      `SELECT COUNT(1) AS n FROM dbo.gps_daily_km WHERE reading_date = @reading_date`,
      { reading_date: { type: sql.Date, value: yyyy } },
    )
    const rows = Number(count.recordset[0]?.n || 0)
    const status = pingsSource === 0 ? 'partial' : 'success'
    const message = pingsSource === 0
      ? `Sin pings en gps_minute_pings para ${yyyy}; no hay filas que consolidar.`
      : `Consolidado ${rows} vehículos desde ${pingsSource} pings.`

    await query(
      `
      UPDATE dbo.wisetrack_ingestion_log
      SET completed_at = SYSDATETIMEOFFSET(),
          n_vehicles_reporting = @n_rows,
          n_pings_inserted = @n_rows,
          n_pings_duplicated = 0,
          n_pings_rejected = 0,
          status = @status,
          error_details = @error_details
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: logId },
        n_rows: { type: sql.Int, value: rows },
        status: { type: sql.NVarChar(20), value: status },
        error_details: {
          type: sql.NVarChar(sql.MAX),
          value: JSON.stringify({
            operation: 'consolidate_daily_km',
            reading_date: yyyy,
            requested_date,
            resolved_from,
            pings_source: pingsSource,
            rows,
            message,
            chile_yesterday: chileYesterdayIso(),
          }),
        },
      },
    )

    return {
      reading_date: yyyy,
      requested_date,
      rows,
      pings_source: pingsSource,
      resolved_from,
      chile_yesterday: chileYesterdayIso(),
      status,
      message: resolved_from === 'last_day_with_pings'
        ? `${message} (solicitado ${requested_date} sin pings → usado ${yyyy})`
        : message,
      log_id: logId,
      batch_id: batchId,
      range,
      elapsed_ms: Date.now() - started.getTime(),
    }
  } catch (error) {
    await query(
      `
      UPDATE dbo.wisetrack_ingestion_log
      SET completed_at = SYSDATETIMEOFFSET(),
          status = N'failed',
          error_details = @error_details
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: logId },
        error_details: {
          type: sql.NVarChar(sql.MAX),
          value: JSON.stringify({
            operation: 'consolidate_daily_km',
            reading_date: yyyy,
            error: String(error.message || error),
          }),
        },
      },
    )
    throw error
  }
}

/** Consolida un rango de fechas (inclusive) día a día. */
export async function consolidateDailyKmRange(fromDate, toDate) {
  const start = new Date(`${String(fromDate).slice(0, 10)}T12:00:00Z`)
  const end = new Date(`${String(toDate).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error('Rango de consolidación inválido (from/to YYYY-MM-DD)')
  }

  const days = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const yyyy = d.toISOString().slice(0, 10)
    const result = await consolidateDailyKm(yyyy)
    days.push(result)
  }

  return {
    from: String(fromDate).slice(0, 10),
    to: String(toDate).slice(0, 10),
    days_consolidated: days.length,
    rows_total: days.reduce((acc, day) => acc + Number(day.rows || 0), 0),
    days,
  }
}
