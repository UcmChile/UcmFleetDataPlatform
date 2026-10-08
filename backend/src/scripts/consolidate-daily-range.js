import 'dotenv/config'
import { closePool, getPool } from '../database/db.js'
import { consolidateDailyKm } from '../integrations/wisetrack/ingestionService.js'

const from = process.argv[2] || '2026-04-20'
const to = process.argv[3] || '2026-07-20'

console.log(`[consolidate] ${from} → ${to}`)
await getPool()
const started = Date.now()
const start = new Date(`${from}T12:00:00Z`)
const end = new Date(`${to}T12:00:00Z`)
const days = []
for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
  const yyyy = d.toISOString().slice(0, 10)
  const dayStarted = Date.now()
  const result = await consolidateDailyKm(yyyy)
  days.push(result)
  console.log(`[consolidate] ${yyyy} rows=${result.rows} ${Date.now() - dayStarted}ms`)
}
console.log(JSON.stringify({
  from,
  to,
  days_consolidated: days.length,
  rows_total: days.reduce((a, x) => a + Number(x.rows || 0), 0),
  elapsed_ms: Date.now() - started,
}, null, 2))
await closePool()
