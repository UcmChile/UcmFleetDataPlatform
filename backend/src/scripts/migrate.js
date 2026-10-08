import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from '../database/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseDir = path.resolve(__dirname, '../../../database')

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function ensureMigrationTable() {
  await query(`
    IF OBJECT_ID('dbo.fleet_schema_migrations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.fleet_schema_migrations (
        id_migration BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        checksum CHAR(64) NULL,
        applied_at DATETIME2 NOT NULL CONSTRAINT DF_fleet_schema_migrations_applied DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_fleet_schema_migrations_filename UNIQUE (filename)
      );
    END
  `)
}

async function getAppliedMigrations() {
  const result = await query('SELECT filename, checksum FROM dbo.fleet_schema_migrations')
  return new Map(result.recordset.map((row) => [row.filename, row.checksum]))
}

async function recordMigration(filename, fileChecksum) {
  await query(
    'INSERT INTO dbo.fleet_schema_migrations (filename, checksum) VALUES (@filename, @checksum)',
    { filename, checksum: fileChecksum },
  )
}

async function runMigrationFile(filePath, file) {
  const sqlText = await fs.readFile(filePath, 'utf8')
  const batches = sqlText
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean)

  for (const batch of batches) {
    await query(batch)
  }
  console.log(`Migracion aplicada: ${file}`)
}

const skipFiles = new Set(['000_create_database.sql'])

const files = (await fs.readdir(databaseDir))
  .filter((file) => file.endsWith('.sql'))
  .filter((file) => !skipFiles.has(file))
  .sort((a, b) => a.localeCompare(b))

await ensureMigrationTable()
const applied = await getAppliedMigrations()

let appliedCount = 0
let skippedCount = 0

for (const file of files) {
  const filePath = path.join(databaseDir, file)
  const content = await fs.readFile(filePath, 'utf8')
  const fileChecksum = checksum(content)
  const previousChecksum = applied.get(file)

  if (previousChecksum) {
    if (previousChecksum !== fileChecksum) {
      console.warn(`Migracion omitida (checksum distinto): ${file}`)
    } else {
      skippedCount += 1
    }
    continue
  }

  await runMigrationFile(filePath, file)
  await recordMigration(file, fileChecksum)
  appliedCount += 1
}

console.log(`Migraciones: ${appliedCount} nuevas, ${skippedCount} ya aplicadas.`)
process.exit(0)
