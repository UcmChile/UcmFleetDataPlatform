import 'dotenv/config'
import { query, closePool, getPool } from '../database/db.js'

await getPool()
const r = await query(`
  SELECT
    CONVERT(varchar(10), reading_date, 23) AS d,
    COUNT(1) AS n,
    SUM(CASE WHEN has_anomaly = 1 THEN 1 ELSE 0 END) AS anom,
    AVG(CAST(km_raw AS FLOAT)) AS avg_km
  FROM dbo.gps_daily_km
  WHERE reading_date >= '2026-07-20'
  GROUP BY CONVERT(varchar(10), reading_date, 23)
  ORDER BY d
`)
console.log(JSON.stringify(r.recordset, null, 2))
await closePool()
