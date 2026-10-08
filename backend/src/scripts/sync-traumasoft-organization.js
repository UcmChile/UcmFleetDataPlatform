import 'dotenv/config'
import { closePool, query, sql } from '../database/db.js'
import { connectTraumasoft } from '../integrations/traumasoft/client.js'

function normalizePlate(value) {
  if (value == null || value === '') return null
  return String(value).trim().toUpperCase().replace(/[\s-]/g, '')
}

async function mergeCatalog(table, rows) {
  let upserted = 0
  for (const row of rows) {
    const externalId = Number(row.id)
    const name = String(row.name || '').trim()
    if (!Number.isFinite(externalId) || !name) continue

    await query(
      `
      MERGE dbo.[${table}] AS target
      USING (SELECT @external_id AS external_id, @name AS name) AS source
      ON target.external_id = source.external_id
      WHEN MATCHED AND target.name <> source.name THEN
        UPDATE SET name = source.name, synced_at = SYSUTCDATETIME(), is_active = 1
      WHEN NOT MATCHED THEN
        INSERT (external_id, name, synced_at)
        VALUES (source.external_id, source.name, SYSUTCDATETIME());
      `,
      {
        external_id: { type: sql.Int, value: externalId },
        name: { type: sql.NVarChar(150), value: name.slice(0, 150) },
      },
    )
    upserted += 1
  }
  return upserted
}

async function syncVehicleOrganization(ts) {
  const rows = await ts.query(`
    SELECT
      id,
      plate,
      division_id,
      district_id,
      group_id,
      cost_center_id,
      station_id
    FROM sched_vehicles
    WHERE IFNULL(deleted, 'false') = 'false'
  `)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const tsId = Number(row.id)
    const plate = normalizePlate(row.plate)
    if (!Number.isFinite(tsId)) {
      skipped += 1
      continue
    }

    const result = await query(
      `
      UPDATE dbo.vehicles
      SET
        traumasoft_vehicle_id = @ts_id,
        division_id = @division_id,
        district_id = @district_id,
        group_id = @group_id,
        cost_center_id = @cost_center_id,
        station_id = @station_id,
        updated_at = SYSUTCDATETIME()
      WHERE traumasoft_vehicle_id = @ts_id
         OR (@plate IS NOT NULL AND UPPER(REPLACE(REPLACE(LTRIM(RTRIM(plate)), '-', ''), ' ', '')) = @plate)
      `,
      {
        ts_id: { type: sql.Int, value: tsId },
        plate: { type: sql.NVarChar(20), value: plate },
        division_id: { type: sql.Int, value: row.division_id != null ? Number(row.division_id) : null },
        district_id: { type: sql.Int, value: row.district_id != null ? Number(row.district_id) : null },
        group_id: { type: sql.Int, value: row.group_id != null ? Number(row.group_id) : null },
        cost_center_id: { type: sql.Int, value: row.cost_center_id != null ? Number(row.cost_center_id) : null },
        station_id: { type: sql.Int, value: row.station_id != null ? Number(row.station_id) : null },
      },
    )
    if (result.rowsAffected?.[0] > 0) updated += 1
    else skipped += 1
  }

  return { source_rows: rows.length, updated, skipped }
}

console.log('[sync-org] Conectando Traumasoft…')
const ts = await connectTraumasoft()

try {
  const [divisions, districts, groups, costCenters, stations] = await Promise.all([
    ts.query('SELECT id, name FROM sched_divisions ORDER BY name'),
    ts.query('SELECT id, name FROM sched_districts ORDER BY name'),
    ts.query('SELECT id, name FROM sched_groups ORDER BY name'),
    ts.query('SELECT id, name FROM cost_centers ORDER BY name'),
    ts.query('SELECT id, name FROM sched_stations ORDER BY name'),
  ])

  const summary = {
    divisions: await mergeCatalog('divisions', divisions),
    districts: await mergeCatalog('districts', districts),
    groups: await mergeCatalog('org_groups', groups),
    cost_centers: await mergeCatalog('cost_centers', costCenters),
    stations: await mergeCatalog('stations', stations),
    vehicles: await syncVehicleOrganization(ts),
  }

  console.log(JSON.stringify(summary, null, 2))
} finally {
  await ts.close()
  await closePool()
}
