/**
 * Registro de fuentes BD/SQL para el badge de mantenedores (solo Owner/Administrador).
 * Se genera desde FLEET_ENTITIES y se pueden sobrescribir casos especiales.
 */
import { FLEET_ENTITIES } from '../fleet/entities.js'

function humanizeSlug(slug) {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildSourceFromEntity(def) {
  const table = `dbo.[${def.table}]`
  const pk = def.pk || 'id'
  const fieldNames = (def.fields || []).map((f) => f.field)
  const listCols = [pk, ...fieldNames].slice(0, 10)
  const selectList = listCols.map((c) => `t.[${c}]`).join(',\n  ')
  const orderBy = def.defaultSort?.by || pk
  const orderDir = String(def.defaultSort?.dir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  return {
    label: def.auditEntity || humanizeSlug(def.routeSlug),
    objects: [`dbo.${def.table}`],
    notes: def.readOnly
      ? 'Mantenedor de solo lectura; el SQL real aplica paginación/filtros del API.'
      : 'SQL representativo del listado/detalle del mantenedor Fleet.',
    listSql: `SELECT TOP 25
  ${selectList}
FROM ${table} t
ORDER BY t.[${orderBy}] ${orderDir};`,
    detailSql: `SELECT TOP 1
  ${selectList}
FROM ${table} t
WHERE t.[${pk}] = @id;`,
  }
}

export const ENTITY_DATA_SOURCES = {}

for (const def of FLEET_ENTITIES) {
  ENTITY_DATA_SOURCES[def.routeSlug] = buildSourceFromEntity(def)
}

/** Pantallas de integración (no son CRUD de catálogo). */
ENTITY_DATA_SOURCES['wisetrack-credentials'] = {
  label: 'Wisetrack — credenciales API',
  objects: ['dbo.wisetrack_api_config', 'dbo.wisetrack_api_tokens'],
  notes: 'Configuración de usuario/clave (password cifrado) y tokens Bearer activos.',
  listSql: `SELECT TOP 25
  c.id,
  c.base_url,
  c.username,
  c.is_active,
  c.updated_at
FROM dbo.wisetrack_api_config c
ORDER BY c.id DESC;`,
  detailSql: `SELECT TOP 1
  c.id,
  c.base_url,
  c.auth_path,
  c.username,
  c.is_active,
  c.updated_at
FROM dbo.wisetrack_api_config c
WHERE c.id = @id;`,
}

ENTITY_DATA_SOURCES['wisetrack-console'] = {
  label: 'Wisetrack — consola de datos',
  objects: [
    'dbo.wisetrack_api_tokens',
    'dbo.vehicles',
    'dbo.gps_minute_pings',
    'dbo.gps_daily_km',
    'dbo.wisetrack_ingestion_log',
  ],
  notes: 'Pull remoto + ingesta: sincroniza vehicles, inserta gps_minute_pings y consolida gps_daily_km.',
  listSql: `SELECT TOP 25
  l.id,
  l.batch_id,
  l.started_at,
  l.completed_at,
  l.n_pings_received,
  l.n_pings_inserted,
  l.status
FROM dbo.wisetrack_ingestion_log l
ORDER BY l.id DESC;`,
  detailSql: `SELECT TOP 1 *
FROM dbo.wisetrack_ingestion_log l
WHERE l.id = @id;`,
}

function primaryTableOf(source) {
  const objects = source?.objects || []
  return objects[0] || null
}

export { primaryTableOf }

export function resolveEntityDataSource(rawKey) {
  const key = String(rawKey || '')
    .replace(/^\//, '')
    .replace(/^api\//, '')
    .trim()
  if (!key) return null
  if (ENTITY_DATA_SOURCES[key]) {
    const source = ENTITY_DATA_SOURCES[key]
    return { key, ...source, primaryTable: primaryTableOf(source) }
  }

  const aliases = {
    'wisetrack-credenciales': 'wisetrack-credentials',
    'credenciales-wisetrack': 'wisetrack-credentials',
    'wisetrack-ingesta': 'wisetrack-console',
  }
  const mapped = aliases[key]
  if (mapped && ENTITY_DATA_SOURCES[mapped]) {
    const source = ENTITY_DATA_SOURCES[mapped]
    return { key: mapped, ...source, primaryTable: primaryTableOf(source) }
  }
  return null
}
