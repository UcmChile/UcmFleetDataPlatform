import 'dotenv/config'
import { query, closePool, getPool } from '../database/db.js'

await getPool()
const r = await query(`
SELECT
  CONVERT(varchar(10), CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Pacific SA Standard Time' AS DATE), 23) AS chile_today,
  (SELECT COUNT_BIG(1) FROM dbo.gps_minute_pings
   WHERE ts >= '2026-07-20T00:00:00.000-04:00' AND ts < '2026-07-21T00:00:00.000-04:00') AS pings_20,
  (SELECT COUNT_BIG(1) FROM dbo.gps_minute_pings
   WHERE ts >= '2026-07-21T00:00:00.000-04:00' AND ts < '2026-07-22T00:00:00.000-04:00') AS pings_21,
  (SELECT COUNT(1) FROM dbo.gps_daily_km WHERE reading_date = '2026-07-20') AS daily_20,
  (SELECT COUNT(1) FROM dbo.gps_daily_km WHERE reading_date = '2026-07-21') AS daily_21
`)
console.log(JSON.stringify(r.recordset[0], null, 2))

const logs = await query(`
  SELECT TOP 8
    id, batch_id, status,
    CONVERT(varchar(10), SWITCHOFFSET(period_from, '-04:00'), 23) AS d,
    n_pings_inserted, n_vehicles_reporting
  FROM dbo.wisetrack_ingestion_log
  ORDER BY id DESC
`)
console.log(JSON.stringify(logs.recordset, null, 2))
await closePool()
