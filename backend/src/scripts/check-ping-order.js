import 'dotenv/config'
import { query, closePool, getPool, sql } from '../database/db.js'

await getPool()

const sample = await query(`
  SELECT TOP 1
    vehicle_id,
    CONVERT(varchar(10), SWITCHOFFSET(MIN(ts), '-04:00'), 23) AS d
  FROM dbo.gps_minute_pings
  WHERE ts >= '2026-07-22T00:00:00.000-04:00'
    AND ts < '2026-07-23T00:00:00.000-04:00'
  GROUP BY vehicle_id
  HAVING MIN(odometer_km) = 0 AND MAX(odometer_km) > 1000
  ORDER BY MAX(odometer_km) - MIN(odometer_km) DESC
`)

const row = sample.recordset[0]
console.log('sample vehicle/day', row)

if (row) {
  const params = { vid: { type: sql.BigInt, value: row.vehicle_id } }
  const seq = await query(
    `
    SELECT TOP 15 id, CONVERT(varchar(33), ts, 127) AS ts, odometer_km
    FROM dbo.gps_minute_pings
    WHERE vehicle_id = @vid
      AND ts >= '2026-07-22T00:00:00.000-04:00'
      AND ts < '2026-07-23T00:00:00.000-04:00'
    ORDER BY id ASC
    `,
    params,
  )
  const byTs = await query(
    `
    SELECT TOP 15 id, CONVERT(varchar(33), ts, 127) AS ts, odometer_km
    FROM dbo.gps_minute_pings
    WHERE vehicle_id = @vid
      AND ts >= '2026-07-22T00:00:00.000-04:00'
      AND ts < '2026-07-23T00:00:00.000-04:00'
    ORDER BY ts ASC
    `,
    params,
  )
  const mismatch = await query(
    `
    ;WITH ordered AS (
      SELECT id, ts,
        ROW_NUMBER() OVER (ORDER BY id) AS rn_id,
        ROW_NUMBER() OVER (ORDER BY ts, id) AS rn_ts
      FROM dbo.gps_minute_pings
      WHERE vehicle_id = @vid
        AND ts >= '2026-07-22T00:00:00.000-04:00'
        AND ts < '2026-07-23T00:00:00.000-04:00'
    )
    SELECT COUNT(1) AS out_of_order_vs_id
    FROM ordered
    WHERE rn_id <> rn_ts
    `,
    params,
  )
  const zeros = await query(
    `
    SELECT
      COUNT(1) AS n_pings,
      SUM(CASE WHEN odometer_km = 0 THEN 1 ELSE 0 END) AS n_zero_odo,
      MIN(odometer_km) AS min_odo,
      MAX(odometer_km) AS max_odo,
      MAX(odometer_km) - MIN(odometer_km) AS km_raw
    FROM dbo.gps_minute_pings
    WHERE vehicle_id = @vid
      AND ts >= '2026-07-22T00:00:00.000-04:00'
      AND ts < '2026-07-23T00:00:00.000-04:00'
    `,
    params,
  )

  console.log('by id ASC first15', JSON.stringify(seq.recordset, null, 2))
  console.log('by ts ASC first15', JSON.stringify(byTs.recordset, null, 2))
  console.log('mismatch', mismatch.recordset[0])
  console.log('odo stats', zeros.recordset[0])
}

await closePool()
