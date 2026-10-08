/** Mapeo columna UI → campo sortBy de API (FK con sufijo _name). */
export const MAINTAINER_FK_SORT_COLUMN_MAP = {
  ciudad_name: 'ciudad_id',
  comuna_name: 'comuna_id',
  empresa_name: 'empresa_id',
  organizacion_name: 'organization_id',
  organization_name: 'organization_id',
  owner_name: 'owner_id',
  seller_name: 'seller_id',
  business_unit_name: 'business_unit_id',
  customer_name: 'customer_name',
  tipo_egreso_name: 'tipo_egreso_id',
  product_name: 'product_id',
  fullname: 'nombre',
  modified_on: 'modified_on',
  created_on: 'created_on',
}

const IGNORED_SORT_KEYS = new Set(['selection', 'actions', 'acciones'])

export function resolveMaintainerSortKey(columnKey, columnMap = {}) {
  if (!columnKey || IGNORED_SORT_KEYS.has(String(columnKey))) return null
  return columnMap[columnKey] || MAINTAINER_FK_SORT_COLUMN_MAP[columnKey] || columnKey
}

export function buildMaintainerListParams({
  page,
  pageSize,
  query = '',
  sortBy,
  sortDir,
  extra = {},
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (String(query || '').trim()) params.set('q', String(query).trim())
  if (sortBy) params.set('sortBy', sortBy)
  if (sortDir) params.set('sortDir', sortDir)
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  return params
}
