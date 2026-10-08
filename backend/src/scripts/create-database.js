import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'
import { env } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bootstrapPath = path.resolve(__dirname, '../../../database/000_create_database.sql')

const masterConfig = {
  ...env.database,
  database: 'master',
}

const pool = await sql.connect(masterConfig)
const content = await fs.readFile(bootstrapPath, 'utf8')
const batches = content
  .split(/^\s*GO\s*$/gim)
  .map((batch) => batch.trim())
  .filter(Boolean)

for (const batch of batches) {
  await pool.request().query(batch)
}

console.log(`Base de datos asegurada: ${env.database.database}`)
await pool.close()
process.exit(0)
