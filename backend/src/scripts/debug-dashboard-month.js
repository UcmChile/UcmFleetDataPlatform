import 'dotenv/config'
import { getMonthlyPingCoverage } from '../services/dashboardService.js'
import { closePool, getPool } from '../database/db.js'

await getPool()
for (const month of [4, 5, 6, 7]) {
  const data = await getMonthlyPingCoverage({ year: 2026, month })
  const missing = data.days.filter((d) => !d.has_pings).map((d) => d.date)
  const lastWith = [...data.days].reverse().find((d) => d.has_pings)
  console.log(JSON.stringify({
    month,
    days_with: data.days_with_pings,
    days_in_month: data.days_in_month,
    last_with_data: lastWith?.date,
    last_day_of_month: data.days[data.days.length - 1],
    missing_tail: missing.slice(-5),
  }, null, 2))
}
await closePool()
