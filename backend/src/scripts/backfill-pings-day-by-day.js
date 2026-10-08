/**
 * Limpia gps_minute_pings + bitácoras y re-descarga Wisetrack día a día.
 *
 * Uso:
 *   node src/scripts/backfill-pings-day-by-day.js 2026-04-20 2026-07-20
 */
import 'dotenv/config'
import { getPool, closePool } from '../database/db.js'
import {
  clearGpsIngestionData,
  pullAndIngestPings,
  pullAndSyncVehicles,
} from '../integrations/wisetrack/pullService.js'

function log(...args) {
  console.log(...args)
  if (typeof process.stdout?.write === 'function') {
    try { process.stdout.write('') } catch { /* ignore */ }
  }
}

async function main() {
  const from = process.argv[2] || '2026-04-20'
  const to = process.argv[3] || '2026-07-20'

  log(`[backfill] Conectando BD…`)
  await getPool()

  log(`[backfill] Sincronizando vehículos…`)
  const vehicles = await pullAndSyncVehicles()
  log(`[backfill] vehicles remote=${vehicles.remote_count} inserted=${vehicles.inserted} updated=${vehicles.updated}`)

  log(`[backfill] Limpiando gps_minute_pings / bitácoras / rejected / gps_daily_km…`)
  const cleared = await clearGpsIngestionData()
  log(`[backfill] counts after clear:`, cleared)

  log(`[backfill] Pull día a día ${from} → ${to} (bulk ingest)`)
  const started = Date.now()
  const result = await pullAndIngestPings({
    from,
    to,
    day_by_day: true,
    page_size: 1000,
    max_pages: 500,
  })

  const elapsedMin = ((Date.now() - started) / 60000).toFixed(1)
  log(`[backfill] DONE in ${elapsedMin} min`)
  log(JSON.stringify({
    mode: result.mode,
    from: result.from,
    to: result.to,
    days_requested: result.days_requested,
    days_completed: result.days_completed,
    days_failed: result.days_failed,
    totals: result.totals,
    sample_days: (result.days || []).slice(0, 5).map((d) => ({
      date: d.date,
      ok: d.ok !== false,
      pings_mapped: d.pings_mapped,
      inserted: d.ingest?.n_pings_inserted,
      rejected: d.ingest?.n_pings_rejected,
      error: d.error,
    })),
  }, null, 2))

  await closePool()
}

main().catch(async (error) => {
  console.error('[backfill] FAILED', error)
  try { await closePool() } catch { /* ignore */ }
  process.exit(1)
})
