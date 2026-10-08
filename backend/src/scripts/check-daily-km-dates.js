import 'dotenv/config'
import { query, closePool, getPool } from '../database/db.js'

await getPool()
const r = await query(`
  SELECT TOP 10
    id,
    vehicle_id,
    reading_date AS reading_date_raw,
    CONVERT(varchar(10), reading_date, 23) AS reading_date_iso,
    km_raw,
    ping_count
  FROM dbo.gps_daily_km
  ORDER BY reading_date DESC, id DESC
`)
console.log(JSON.stringify(r.recordset, null, 2))

const byDay = await query(`
  SELECT
    CONVERT(varchar(10), reading_date, 23) AS d,
    COUNT(1) AS n
  FROM dbo.gps_daily_km
  WHERE reading_date >= '2026-07-18'
  GROUP BY CONVERT(varchar(10), reading_date, 23)
  ORDER BY d DESC
`)
console.log('byDay', JSON.stringify(byDay.recordset, null, 2))
await closePool()
