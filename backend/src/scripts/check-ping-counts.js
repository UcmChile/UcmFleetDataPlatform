import 'dotenv/config'
import { getPool, query, closePool } from '../database/db.js'

await getPool()
const r = await query(`
  SELECT
    (SELECT COUNT_BIG(1) FROM dbo.gps_minute_pings) AS pings,
    (SELECT COUNT_BIG(1) FROM dbo.wisetrack_ingestion_log) AS logs,
    (SELECT COUNT_BIG(1) FROM dbo.wisetrack_rejected_pings) AS rejected,
    (SELECT MIN(CONVERT(varchar(10), period_from, 23)) FROM dbo.wisetrack_ingestion_log) AS log_from,
    (SELECT MAX(CONVERT(varchar(10), period_from, 23)) FROM dbo.wisetrack_ingestion_log) AS log_to,
    (SELECT COUNT(DISTINCT status) FROM dbo.wisetrack_ingestion_log) AS status_kinds
`)
const days = await query(`
  SELECT TOP 10
    CONVERT(varchar(10), period_from, 23) AS day,
    n_pings_received,
    n_pings_inserted,
    n_pings_rejected,
    status
  FROM dbo.wisetrack_ingestion_log
  ORDER BY period_from DESC
`)
console.log(JSON.stringify({ summary: r.recordset[0], recent_logs: days.recordset }, null, 2))
await closePool()
