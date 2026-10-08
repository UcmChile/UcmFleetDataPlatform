import 'dotenv/config'
import { query, closePool, getPool } from '../database/db.js'

async function q(label, text) {
  const r = await query(text)
  console.log(`=== ${label} ===`)
  console.log(JSON.stringify(r.recordset, null, 2))
}

await getPool()
await q('vehicles', 'SELECT COUNT(*) AS n, COUNT(wisetrack_vehicle_id) AS mapped FROM dbo.vehicles')
await q(
  'pings',
  `SELECT COUNT_BIG(*) AS n,
          CONVERT(varchar(33), MIN(ts), 127) AS min_ts,
          CONVERT(varchar(33), MAX(ts), 127) AS max_ts
   FROM dbo.gps_minute_pings`,
)
await q(
  'daily_km',
  `SELECT COUNT(*) AS n,
          CONVERT(varchar(10), MIN(reading_date), 23) AS min_d,
          CONVERT(varchar(10), MAX(reading_date), 23) AS max_d,
          SUM(CASE WHEN has_anomaly = 1 THEN 1 ELSE 0 END) AS anomalies
   FROM dbo.gps_daily_km`,
)
await q('log_status', `SELECT status, COUNT(*) AS n FROM dbo.wisetrack_ingestion_log GROUP BY status`)
await q('rejected', 'SELECT COUNT(*) AS n FROM dbo.wisetrack_rejected_pings')
await q(
  'recent_batches',
  `SELECT TOP 5
      CONVERT(varchar(10), SWITCHOFFSET(period_from, '-04:00'), 23) AS d,
      n_vehicles_expected,
      n_vehicles_reporting,
      n_pings_inserted,
      n_pings_rejected,
      status
   FROM dbo.wisetrack_ingestion_log
   WHERE status IN (N'success', N'partial')
   ORDER BY period_from DESC`,
)
await q(
  'avg_vehicles',
  `SELECT
      AVG(CAST(n_vehicles_reporting AS FLOAT)) AS avg_reporting,
      MAX(n_vehicles_reporting) AS max_reporting,
      MIN(n_vehicles_reporting) AS min_reporting
   FROM dbo.wisetrack_ingestion_log
   WHERE status IN (N'success', N'partial')
     AND n_vehicles_reporting IS NOT NULL`,
)
await closePool()
