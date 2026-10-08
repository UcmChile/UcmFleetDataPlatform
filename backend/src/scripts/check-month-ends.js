import 'dotenv/config'
import { getPool, query, closePool } from '../database/db.js'

await getPool()
const r = await query(`
  SELECT
    CONVERT(varchar(10), SWITCHOFFSET(period_from, '-04:00'), 23) AS day_cl,
    CONVERT(varchar(33), period_from, 127) AS period_from_raw,
    CONVERT(varchar(33), period_to, 127) AS period_to_raw,
    n_pings_received,
    n_pings_inserted,
    status
  FROM dbo.wisetrack_ingestion_log
  WHERE CONVERT(date, SWITCHOFFSET(period_from, '-04:00')) IN (
    '2026-04-29','2026-04-30',
    '2026-05-30','2026-05-31',
    '2026-06-29','2026-06-30',
    '2026-07-19','2026-07-20','2026-07-31'
  )
  ORDER BY period_from
`)
console.log(JSON.stringify(r.recordset, null, 2))

const gaps = await query(`
  WITH days AS (
    SELECT CONVERT(date, SWITCHOFFSET(period_from, '-04:00')) AS d
    FROM dbo.wisetrack_ingestion_log
    WHERE status IN (N'success', N'partial')
  )
  SELECT
    FORMAT(d, 'yyyy-MM') AS month,
    COUNT(*) AS days_with_log,
    MAX(d) AS last_day_in_log
  FROM days
  GROUP BY FORMAT(d, 'yyyy-MM')
  ORDER BY month
`)
console.log('by_month', JSON.stringify(gaps.recordset, null, 2))
await closePool()
