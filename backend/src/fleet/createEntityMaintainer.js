import { query, sql } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { chileDayWindow } from '../lib/chileDay.js'

/**
 * @typedef {'bigint'|'int'|'smallint'|'string'|'bit'|'decimal'|'date'|'datetimeoffset'} FieldType
 * @typedef {{ field: string, column?: string, type: FieldType, required?: boolean, searchable?: boolean, readOnly?: boolean }} FieldDef
 * @typedef {{
 *   table: string,
 *   pk?: string,
 *   displayField?: string,
 *   fields: FieldDef[],
 *   softDisable?: { column: string, activeValue?: any, inactiveValue?: any } | null,
 *   defaultSort?: { by: string, dir?: 'asc'|'desc' },
 *   dateFilter?: { field: string, type?: 'date'|'datetimeoffset' },
 *   compositePk?: string[],
 *   readOnly?: boolean,
 *   joins?: Array<{
 *     alias: string,
 *     table: string,
 *     on: string,
 *     type?: 'left'|'inner',
 *     fields: Array<{ field: string, column: string, searchable?: boolean }>,
 *   }>,
 * }} EntityConfig
 */

function sqlType(type) {
  switch (type) {
    case 'bigint': return sql.BigInt
    case 'int': return sql.Int
    case 'smallint': return sql.SmallInt
    case 'bit': return sql.Bit
    case 'decimal': return sql.Decimal(18, 6)
    case 'date': return sql.Date
    case 'datetimeoffset': return sql.DateTimeOffset
    default: return sql.NVarChar(sql.MAX)
  }
}

function col(field) {
  return field.column || field.field
}

function coerce(value, type) {
  if (value === undefined || value === null || value === '') return null
  if (type === 'bit') {
    if (typeof value === 'boolean') return value ? 1 : 0
    if (value === 1 || value === '1' || value === 'true') return 1
    return 0
  }
  if (type === 'bigint' || type === 'int' || type === 'smallint') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (type === 'decimal') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return value
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** DATE de SQL como YYYY-MM-DD (evita que JS lo trate como UTC midnight y reste un día en Chile). */
function toDateOnlyString(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
  }
  const text = String(value)
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text)
  return match ? match[1] : text.slice(0, 10)
}

function joinFields(config) {
  return (config.joins || []).flatMap((join) => join.fields || [])
}

function emptyPage(page, pageSize) {
  return {
    data: [],
    total: 0,
    page: Math.max(1, Number(page) || 1),
    pageSize,
  }
}

function sqlBigIntValue(value) {
  if (typeof value === 'bigint') return value.toString()
  const n = Number(value)
  return Number.isSafeInteger(n) ? n : String(value)
}

function bindInParams(prefix, ids, params) {
  return ids.map((id, index) => {
    const key = `${prefix}${index}`
    params[key] = { type: sql.BigInt, value: sqlBigIntValue(id) }
    return `@${key}`
  }).join(', ')
}

/** Token numérico o patente (ABCD-12 / JZDX19), no texto libre. */
function isVehicleLookupToken(value) {
  const token = String(value ?? '').trim()
  if (!token) return false
  if (/^\d+$/.test(token)) return true
  const compact = token.toUpperCase().replace(/[\s-]/g, '')
  return /^[A-Z]{2,6}\d{2,4}$/.test(compact)
}

/**
 * Resuelve id interno contra dbo.vehicles (tabla chica) antes de tocar tablas hijas.
 * Coincidencia exacta: id, wisetrack_vehicle_id, traumasoft_vehicle_id o patente normalizada.
 */
async function resolveVehicleInternalIds(raw) {
  const token = String(raw ?? '').trim()
  if (!token) return []

  const branches = []
  const params = {}
  const numericToken = /^\d+$/.test(token) ? Number(token) : null
  const numericOk = numericToken != null && Number.isSafeInteger(numericToken)

  if (numericOk) {
    branches.push('SELECT v.id FROM dbo.vehicles v WHERE v.id = @vid')
    params.vid = { type: sql.BigInt, value: numericToken }
    branches.push('SELECT v.id FROM dbo.vehicles v WHERE v.wisetrack_vehicle_id = @wvid')
    params.wvid = { type: sql.NVarChar(50), value: token }
    const canonical = String(numericToken)
    if (canonical !== token) {
      branches.push('SELECT v.id FROM dbo.vehicles v WHERE v.wisetrack_vehicle_id = @wvidCanon')
      params.wvidCanon = { type: sql.NVarChar(50), value: canonical }
    }
    if (numericToken <= 2147483647) {
      branches.push('SELECT v.id FROM dbo.vehicles v WHERE v.traumasoft_vehicle_id = @tvid')
      params.tvid = { type: sql.Int, value: numericToken }
    }
  }

  if (/[A-Za-z]/.test(token)) {
    const plateNorm = token.toUpperCase().replace(/\s+/g, '')
    const plateCompact = plateNorm.replace(/-/g, '')
    branches.push(`
      SELECT v.id
      FROM dbo.vehicles v
      WHERE UPPER(REPLACE(v.plate, ' ', '')) = @plateNorm
         OR UPPER(REPLACE(REPLACE(v.plate, ' ', ''), '-', '')) = @plateCompact
    `)
    params.plateNorm = { type: sql.NVarChar(32), value: plateNorm }
    params.plateCompact = { type: sql.NVarChar(32), value: plateCompact }
  }

  if (!branches.length) return []

  const result = await query(branches.join('\nUNION\n'), params)
  const seen = new Set()
  const ids = []
  for (const row of result.recordset) {
    const key = String(row.id)
    if (seen.has(key)) continue
    seen.add(key)
    ids.push(row.id)
  }
  return ids
}

function buildJoinClause(config) {
  if (!config.joins?.length) return ''
  return config.joins
    .map((join) => {
      const joinType = String(join.type || 'left').toUpperCase()
      return `${joinType} JOIN dbo.[${join.table}] ${join.alias} ON ${join.on}`
    })
    .join('\n      ')
}

function buildSelectList(config) {
  const pk = config.pk || 'id'
  const parts = [`t.[${pk}]`]
  for (const field of config.fields) {
    const c = col(field)
    if (field.type === 'date') {
      parts.push(`CONVERT(varchar(10), t.[${c}], 23) AS [${field.field}]`)
    } else if (field.column && field.column !== field.field) {
      parts.push(`t.[${c}] AS [${field.field}]`)
    } else {
      parts.push(`t.[${c}]`)
    }
  }
  for (const join of config.joins || []) {
    for (const field of join.fields || []) {
      parts.push(`${join.alias}.[${field.column}] AS [${field.field}]`)
    }
  }
  if (config.softDisable?.column) {
    parts.push(`t.[${config.softDisable.column}]`)
  }
  return [...new Set(parts)].join(', ')
}

function mapRow(config, row) {
  if (!row) return null
  const pk = config.pk || 'id'
  const out = { id: row[pk] }
  for (const field of config.fields) {
    const raw = row[field.field] !== undefined ? row[field.field] : row[col(field)]
    out[field.field] = field.type === 'date' ? toDateOnlyString(raw) : raw
  }
  for (const field of joinFields(config)) {
    out[field.field] = row[field.field] ?? null
  }
  if (config.softDisable?.column) {
    const activeValue = config.softDisable.activeValue ?? true
    const raw = row[config.softDisable.column]
    out.is_disabled = !(raw === activeValue || raw === 1 || raw === true)
    out[config.softDisable.column] = raw
  }
  if (config.displayField && out[config.displayField] != null) {
    out.name = out[config.displayField]
  }
  return out
}

export function createEntityMaintainer(config) {
  const pk = config.pk || 'id'
  const table = config.table
  const writableFields = config.fields.filter((f) => !f.readOnly)
  const searchable = config.fields.filter((f) => f.searchable !== false && ['string'].includes(f.type))
  const joinSearchable = (config.joins || []).flatMap((join) =>
    (join.fields || [])
      .filter((field) => field.searchable !== false)
      .map((field) => ({ join, field })),
  )

  async function getAll({
    page = 1,
    pageSize = 25,
    q = '',
    sortBy,
    sortDir = 'desc',
    status,
    dateFrom,
    dateTo,
    vehicle,
  } = {}) {
    const offset = (Math.max(1, page) - 1) * pageSize
    const where = []
    const params = {
      offset: { type: sql.Int, value: offset },
      pageSize: { type: sql.Int, value: pageSize },
    }
    const vehicleIdField = config.fields.find((field) => field.field === 'vehicle_id')

    // vehicle_id de las tablas hijas es el id interno. Resolver antes y filtrar con IN sargable.
    if (vehicleIdField && String(vehicle ?? '').trim()) {
      const ids = await resolveVehicleInternalIds(vehicle)
      if (!ids.length) return emptyPage(page, pageSize)
      where.push(`t.[${col(vehicleIdField)}] IN (${bindInParams('vf', ids, params)})`)
    }

    if (q) {
      const token = String(q).trim()
      const parts = []
      searchable.forEach((field, idx) => {
        const key = `q${idx}`
        parts.push(`CAST(t.[${col(field)}] AS NVARCHAR(400)) LIKE @${key}`)
        params[key] = { type: sql.NVarChar(400), value: `%${token}%` }
      })

      const vehicleShaped = Boolean(vehicleIdField) && isVehicleLookupToken(token)
      let resolvedVehicle = false
      if (vehicleShaped) {
        const ids = await resolveVehicleInternalIds(token)
        if (ids.length) {
          resolvedVehicle = true
          parts.push(`t.[${col(vehicleIdField)}] IN (${bindInParams('qv', ids, params)})`)
        }
      }

      // Igualdad numérica en otros ids. vehicle_id no se compara con el token crudo (ese valor suele ser Wisetrack).
      const asNumber = Number(token)
      const idFields = config.fields.filter((field) => {
        if (!['bigint', 'int'].includes(field.type)) return false
        if (vehicleShaped && field.field === 'vehicle_id') return false
        if (resolvedVehicle) return false
        return true
      })
      if (/^\d+$/.test(token) && Number.isFinite(asNumber) && idFields.length && !resolvedVehicle) {
        idFields.forEach((field, idx) => {
          const key = `qid${idx}`
          parts.push(`t.[${col(field)}] = @${key}`)
          params[key] = { type: sqlType(field.type), value: asNumber }
        })
      }
      // Fecha exacta YYYY-MM-DD sobre el campo de filtro de fechas.
      if (config.dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(token)) {
        const df = config.dateFilter
        parts.push(`CAST(t.[${df.field}] AS DATE) = @qDate`)
        params.qDate = { type: sql.Date, value: token }
      }
      if (!vehicleShaped) {
        joinSearchable.forEach(({ join, field }, idx) => {
          const key = `jq${idx}`
          parts.push(`CAST(${join.alias}.[${field.column}] AS NVARCHAR(400)) LIKE @${key}`)
          params[key] = { type: sql.NVarChar(400), value: `%${token}%` }
        })
      }
      if (vehicleShaped && !parts.length) return emptyPage(page, pageSize)
      if (parts.length) where.push(`(${parts.join(' OR ')})`)
    }

    if (config.dateFilter && (dateFrom || dateTo)) {
      const df = config.dateFilter
      const fieldCol = df.field
      const isDto = df.type === 'datetimeoffset'
      if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(String(dateFrom))) {
        if (isDto) {
          where.push(`t.[${fieldCol}] >= @dateFrom`)
          params.dateFrom = { type: sql.DateTimeOffset, value: new Date(chileDayWindow(dateFrom).from) }
        } else {
          where.push(`t.[${fieldCol}] >= @dateFrom`)
          params.dateFrom = { type: sql.Date, value: String(dateFrom) }
        }
      }
      if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(String(dateTo))) {
        if (isDto) {
          where.push(`t.[${fieldCol}] <= @dateTo`)
          params.dateTo = { type: sql.DateTimeOffset, value: new Date(chileDayWindow(dateTo).to) }
        } else {
          where.push(`t.[${fieldCol}] <= @dateTo`)
          params.dateTo = { type: sql.Date, value: String(dateTo) }
        }
      }
    }

    if (status && config.softDisable?.column) {
      const activeValue = config.softDisable.activeValue ?? 1
      if (status === 'active') {
        where.push(`t.[${config.softDisable.column}] = @statusActive`)
        params.statusActive = { type: sql.Bit, value: activeValue }
      } else if (status === 'inactive') {
        where.push(`(t.[${config.softDisable.column}] = 0 OR t.[${config.softDisable.column}] IS NULL)`)
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const defaultBy = config.defaultSort?.by || pk
    const joinSortMap = new Map(
      (config.joins || []).flatMap((join) =>
        (join.fields || []).map((field) => [field.field, `${join.alias}.[${field.column}]`]),
      ),
    )
    const allowedSort = new Set([
      pk,
      ...config.fields.map((f) => f.field),
      ...joinSortMap.keys(),
      'created_at',
      'updated_at',
      config.softDisable?.column,
    ].filter(Boolean))
    let sortColumn = defaultBy
    if (allowedSort.has(sortBy)) {
      if (joinSortMap.has(sortBy)) {
        sortColumn = joinSortMap.get(sortBy)
      } else {
        const fieldDef = config.fields.find((f) => f.field === sortBy)
        sortColumn = fieldDef ? col(fieldDef) : sortBy
      }
    }
    const dir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    // COUNT(*) exacto sobre gps_minute_pings (~millones) supera el timeout; usar stats.
    let total = 0
    if (!where.length) {
      const approx = await query(
        `
        SELECT SUM(row_count) AS total
        FROM sys.dm_db_partition_stats
        WHERE object_id = OBJECT_ID(@obj)
          AND index_id IN (0, 1)
        `,
        { obj: { type: sql.NVarChar(256), value: `dbo.${table}` } },
      )
      total = Number(approx.recordset[0]?.total || 0)
    } else {
      const joinSql = buildJoinClause(config)
      // El join de lectura no entra al COUNT: el predicado ya está en t.vehicle_id.
      const countJoinSql = (config.joins || []).some((join) => whereSql.includes(`${join.alias}.`))
        ? joinSql
        : ''
      const countResult = await query(
        `
        SELECT COUNT(1) AS total
        FROM dbo.[${table}] t
        ${countJoinSql}
        ${whereSql}
        `,
        params,
      )
      total = Number(countResult.recordset[0]?.total || 0)
    }

    const joinSql = buildJoinClause(config)
    const orderExpr = sortColumn.includes('.') || sortColumn.includes('[')
      ? sortColumn
      : `t.[${sortColumn}]`
    const result = await query(
      `
      SELECT ${buildSelectList(config)}
      FROM dbo.[${table}] t
      ${joinSql}
      ${whereSql}
      ORDER BY ${orderExpr} ${dir}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `,
      params,
    )

    return {
      data: result.recordset.map((row) => mapRow(config, row)),
      total,
      page: Math.max(1, page),
      pageSize,
    }
  }

  async function getById(id) {
    const joinSql = buildJoinClause(config)
    const result = await query(
      `
      SELECT ${buildSelectList(config)}
      FROM dbo.[${table}] t
      ${joinSql}
      WHERE t.[${pk}] = @id
      `,
      { id: { type: sql.BigInt, value: id } },
    )
    const row = mapRow(config, result.recordset[0])
    if (!row) throw new ApiError(404, 'Registro no encontrado')
    return row
  }

  async function create(body) {
    if (config.readOnly) throw new ApiError(405, 'Entidad de solo lectura')
    const cols = []
    const vals = []
    const params = {}

    for (const field of writableFields) {
      const value = coerce(body[field.field], field.type)
      if (field.required && (value === null || value === undefined)) {
        throw new ApiError(422, `Campo requerido: ${field.field}`)
      }
      if (value === null || value === undefined) continue
      const c = col(field)
      cols.push(`[${c}]`)
      vals.push(`@${field.field}`)
      params[field.field] = { type: sqlType(field.type), value }
    }

    if (!cols.length) throw new ApiError(422, 'Sin datos para crear')

    const result = await query(
      `
      INSERT INTO dbo.[${table}] (${cols.join(', ')})
      OUTPUT INSERTED.[${pk}]
      VALUES (${vals.join(', ')})
      `,
      params,
    )
    return getById(result.recordset[0][pk])
  }

  async function update(id, body) {
    if (config.readOnly) throw new ApiError(405, 'Entidad de solo lectura')
    await getById(id)
    const sets = []
    const params = { id: { type: sql.BigInt, value: id } }

    for (const field of writableFields) {
      if (!(field.field in body)) continue
      const value = coerce(body[field.field], field.type)
      if (field.required && (value === null || value === undefined)) {
        throw new ApiError(422, `Campo requerido: ${field.field}`)
      }
      sets.push(`[${col(field)}] = @${field.field}`)
      params[field.field] = { type: sqlType(field.type), value }
    }

    if (!sets.length) throw new ApiError(422, 'Sin cambios')

    await query(
      `UPDATE dbo.[${table}] SET ${sets.join(', ')} WHERE [${pk}] = @id`,
      params,
    )
    return getById(id)
  }

  async function setDisabled(id, disabled) {
    if (!config.softDisable?.column) {
      throw new ApiError(405, 'Esta entidad no soporta desactivacion')
    }
    await getById(id)
    const activeValue = config.softDisable.activeValue ?? 1
    const inactiveValue = config.softDisable.inactiveValue ?? 0
    await query(
      `UPDATE dbo.[${table}] SET [${config.softDisable.column}] = @value WHERE [${pk}] = @id`,
      {
        id: { type: sql.BigInt, value: id },
        value: { type: sql.Bit, value: disabled ? inactiveValue : activeValue },
      },
    )
    return getById(id)
  }

  async function getOptions({ limit = 50, q = '' } = {}) {
    const display = config.displayField || writableFields.find((f) => f.type === 'string')?.field || pk
    const displayCol = config.fields.find((f) => f.field === display)
      ? col(config.fields.find((f) => f.field === display))
      : display
    const params = { limit: { type: sql.Int, value: Math.min(Number(limit) || 50, 500) } }
    let where = ''
    if (q) {
      where = `WHERE CAST(t.[${displayCol}] AS NVARCHAR(400)) LIKE @q`
      params.q = { type: sql.NVarChar(400), value: `%${q}%` }
    }
    if (config.softDisable?.column) {
      where += where ? ` AND t.[${config.softDisable.column}] = 1` : `WHERE t.[${config.softDisable.column}] = 1`
    }
    const result = await query(
      `
      SELECT TOP (@limit) t.[${pk}] AS id, CAST(t.[${displayCol}] AS NVARCHAR(400)) AS name
      FROM dbo.[${table}] t
      ${where}
      ORDER BY t.[${displayCol}]
      `,
      params,
    )
    return result.recordset.map((row) => ({ id: String(row.id), name: row.name }))
  }

  return {
    config,
    getAll,
    getById,
    create,
    update,
    setDisabled,
    getOptions,
  }
}
