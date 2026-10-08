import 'dotenv/config'
import { query, closePool, getPool, sql } from '../database/db.js'

await getPool()
const ids = (await query('SELECT TOP 90 id FROM dbo.vehicles WHERE wisetrack_vehicle_id IS NOT NULL'))
  .recordset.map((r) => Number(r.id))

const t0 = Date.now()
const valuesSql = ids.map((_, idx) => `(@id${idx})`).join(',')
const params = {}
ids.forEach((id, idx) => {
  params[`id${idx}`] = { type: sql.BigInt, value: id }
})
const result = await query(
  `
  SELECT v.vehicle_id, lv.last_odo
  FROM (VALUES ${valuesSql}) AS v(vehicle_id)
  OUTER APPLY (
    SELECT TOP (1) p.odometer_km AS last_odo
    FROM dbo.gps_minute_pings p
    WHERE p.vehicle_id = v.vehicle_id AND p.odometer_km IS NOT NULL
    ORDER BY p.ts DESC
  ) lv
  `,
  params,
)
console.log(JSON.stringify({
  new_ms: Date.now() - t0,
  rows: result.recordset.length,
  with_odo: result.recordset.filter((r) => r.last_odo != null).length,
}, null, 2))

const t1 = Date.now()
try {
  const old = await query(`
    SELECT vehicle_id, MAX(odometer_km) AS last_odo
    FROM dbo.gps_minute_pings
    GROUP BY vehicle_id
  `)
  console.log(JSON.stringify({ old_ms: Date.now() - t1, rows: old.recordset.length }, null, 2))
} catch (error) {
  console.log(JSON.stringify({
    old_failed: true,
    code: error.code,
    message: error.message,
    after_ms: Date.now() - t1,
  }, null, 2))
}

await closePool()
