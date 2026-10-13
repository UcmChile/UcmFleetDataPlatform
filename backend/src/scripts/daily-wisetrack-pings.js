/**
 * Extracción diaria Wisetrack: pings del día civil anterior (America/Santiago).
 *
 * Uso:
 *   node src/scripts/daily-wisetrack-pings.js
 *   node src/scripts/daily-wisetrack-pings.js --date 2026-10-07
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { getPool, closePool } from '../database/db.js'
import { pullAndIngestPingsForDay } from '../integrations/wisetrack/pullService.js'
import { consolidateDailyKm } from '../integrations/wisetrack/ingestionService.js'
import { chileCalendarYesterday, chileDayWindow } from '../lib/chileDay.js'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const logFilePath = path.join(backendRoot, 'logs', 'daily-wisetrack-pings.log')

function fileLog(line) {
  try {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
    fs.appendFileSync(logFilePath, `${line}\n`, 'utf8')
  } catch {
    /* ignore */
  }
}

function log(...args) {
  const line = `[daily-pings] ${args.map((a) => String(a)).join(' ')}`
  fileLog(line)
  console.log(line)
}

function resolveReadingDate() {
  const idx = process.argv.indexOf('--date')
  if (idx >= 0 && process.argv[idx + 1]) {
    return String(process.argv[idx + 1]).slice(0, 10)
  }
  const positional = process.argv.slice(2).find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg))
  if (positional) return positional
  return chileCalendarYesterday()
}

async function main() {
  const envPath = path.join(backendRoot, '.env')
  log('node', process.version, 'cwd', process.cwd(), 'env', fs.existsSync(envPath) ? envPath : 'MISSING')

  if (!env.wisetrack.enabled) {
    log('WISETRACK_ENABLED=false — job omitido')
    return
  }

  const readingDate = resolveReadingDate()
  const range = chileDayWindow(readingDate)

  log(`inicio fecha=${readingDate} ventana=${range.from} -> ${range.to}`)
  log(`bd=${env.database.server}/${env.database.database}`)

  log('conectando SQL...')
  await getPool()
  log('SQL conectado')

  log('pull Wisetrack iniciado (puede tardar varios minutos)...')
  const pull = await pullAndIngestPingsForDay({
    date: readingDate,
    batch_id: `cron-day-${readingDate}`,
    page_size: 1000,
    max_pages: 500,
  })

  log(
    `pull mapped=${pull.pings_mapped} inserted=${pull.ingest?.n_pings_inserted ?? 0} `
    + `dup=${pull.ingest?.n_pings_duplicated ?? 0} rejected=${pull.ingest?.n_pings_rejected ?? 0} `
    + `pages=${pull.pages_fetched}${pull.hit_page_cap ? ' PAGE_CAP' : ''}`,
  )

  if (pull.hit_page_cap) {
    throw new Error(`Día ${readingDate}: se alcanzó max_pages; revisar ingesta incompleta`)
  }

  let consolidate = null
  try {
    log('consolidando gps_daily_km...')
    consolidate = await consolidateDailyKm(readingDate)
    log(`consolidate reading_date=${readingDate} rows=${consolidate.rows}`)
  } catch (error) {
    log(`consolidate advertencia: ${error?.message || error}`)
  }

  log('ok', JSON.stringify({
    reading_date: readingDate,
    pings_mapped: pull.pings_mapped,
    n_pings_inserted: pull.ingest?.n_pings_inserted ?? 0,
    n_pings_rejected: pull.ingest?.n_pings_rejected ?? 0,
    gps_daily_km_rows: consolidate?.rows ?? null,
  }))

  await closePool()
  log('fin')
}

main().catch(async (error) => {
  const msg = error?.message || String(error)
  fileLog(`[daily-pings] FAILED ${msg}`)
  if (error?.stack) fileLog(String(error.stack))
  console.error('[daily-pings] FAILED', msg)
  try { await closePool() } catch { /* ignore */ }
  process.exit(1)
})
