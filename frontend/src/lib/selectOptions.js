/** Claves de id usadas en opciones de selectores CRM. */
export const OPTION_ID_KEYS = [
  'id_item',
  'id_linea_negocio',
  'id_tipo_servicio',
  'id_tipo_ambulancia',
  'id_origen_contacto',
  'id_motivo_perdida',
  'id_tipo_contacto',
  'id_tipo_caso',
  'id_empresa',
  'id_contacto',
  'id_usuario',
  'id_contrato',
  'id_caso',
  'id_rol',
  'id_oportunidad',
  'id_propietario',
  'id_ejecutivo_comercial',
  'value',
  'id',
  'code',
  'codigo',
]

/** Campos descriptivos en filas API para mostrar en edicion si la opcion aun no cargo. */
export const FIELD_DISPLAY_LABELS = {
  id_empresa: ['razon_social'],
  id_contacto: ['nombre_completo', 'contacto_principal'],
  id_owner: ['owner_nombre', 'ejecutivo_comercial'],
  id_linea_negocio: ['linea_negocio'],
  id_tipo_servicio: ['tipo_servicio'],
  id_origen_contacto: ['origen_contacto', 'origen_nombre'],
  id_tipo_ambulancia: ['tipo_ambulancia'],
  id_oportunidad: ['oportunidad_codigo', 'codigo', 'titulo'],
  id_contrato: ['contrato_codigo', 'codigo'],
  id_propietario: ['propietario_nombre'],
  id_ejecutivo_comercial: ['ejecutivo_comercial', 'owner_nombre'],
  id_tipo_caso: ['tipo_caso'],
  id_rol: ['rol_nombre', 'nombre'],
  owner_id: ['owner_name'],
  seller_id: ['seller_name'],
  ejecutivo_ucm_id: ['ejecutivo_ucm_name'],
  supervisor_ucm_id: ['supervisor_ucm_name'],
  customer_id: ['customer_name'],
  business_unit_id: ['business_unit_name'],
  clausula_salida_id: ['clausula_salida_name'],
  periodicidad_id: ['periodicidad_name'],
  convenio_id: ['convenio_name'],
  empresa_id: ['empresa_name'],
  originating_contract_id: ['originating_contract_name'],
  folio_material_id: ['folio_number'],
  currency_id: ['currency_name'],
  contrato_marco_id: ['contrato_marco_name'],
  medio_pago_id: ['medio_pago_name'],
  supervisor_id: ['supervisor_name'],
  contrato_id: ['contrato_folio', 'contrato_number', 'name'],
  ciudad_id: ['ciudad_name'],
  comuna_id: ['comuna_name'],
  region_id: ['region_name'],
  giro_id: ['giro_name'],
  industria_id: ['industria_name'],
  mediodepago_id: ['mediodepago_name', 'name'],
  emisor_id: ['emisor_name', 'name'],
  marca_automovil_id: ['marca_automovil_name', 'name'],
  alarma_id: ['alarma_name', 'name'],
  tipo_egreso_id: ['tipo_egreso_name', 'name'],
  tipo_cuenta_id: ['tipo_cuenta_name', 'name'],
  cuenta_id: ['cuenta_name', 'name'],
  material_asignado_id: ['material_asignado_name', 'name'],
  tipo_material_id: ['tipo_material_name', 'name'],
  transaction_currency_id: ['currency_name', 'name'],
  cargo: ['cargo_name'],
  tipo_de_material: ['tipo_de_material_name'],
  tipo_bodega: ['tipo_bodega_name'],
}

export function normalizeGuid(value) {
  return String(value ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase()
}

export function isGuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizeGuid(value))
}

export function mergeFkOptionList(options = [], id, name) {
  if (id == null || String(id).trim() === '') return options
  const idText = String(id).trim()
  const normalizedGuid = isGuidLike(idText) ? normalizeGuid(idText) : null
  const exists = options.some((option) => {
    const optionId = String(resolveOptionId(option) ?? '').trim()
    if (!optionId) return false
    if (optionId === idText) return true
    if (normalizedGuid && isGuidLike(optionId) && normalizeGuid(optionId) === normalizedGuid) return true
    return false
  })
  if (exists) return options
  const label = String(name ?? '').trim()
  // Do not inject GUID/id as the visible option label.
  if (!label || isGuidLike(label) || label === idText) return options
  return [{ id: idText, name: label }, ...options]
}

export function mergeRecordIntoFkOptions(fkOptions = {}, record = {}, mappings = []) {
  if (!record || mappings.length === 0) return fkOptions
  const next = { ...fkOptions }
  for (const { field, labelField } of mappings) {
    const id = record[field]
    const name = record[labelField]
    if (!id) continue
    next[field] = mergeFkOptionList(next[field] || [], id, name)
  }
  return next
}

function readOptionProperty(option, key) {
  if (!key || typeof option !== 'object' || option === null) return undefined
  const value = option[key]
  if (value === null || value === undefined || value === '') return undefined
  return value
}

export function resolveOptionId(option, customResolver) {
  if (typeof customResolver === 'function') return customResolver(option)
  if (option === null || option === undefined) return ''
  if (typeof option !== 'object') return option

  if (typeof customResolver === 'string') {
    const fromKey = readOptionProperty(option, customResolver.trim())
    if (fromKey !== undefined) return fromKey
  }

  for (const key of OPTION_ID_KEYS) {
    const value = option[key]
    if (value !== null && value !== undefined && value !== '') return value
  }

  return ''
}

export function resolveOptionLabel(option, customResolver) {
  if (typeof customResolver === 'function') return customResolver(option)
  if (option === null || option === undefined) return ''
  if (typeof option !== 'object') return String(option)

  if (typeof customResolver === 'string') {
    const fromKey = readOptionProperty(option, customResolver.trim())
    if (fromKey !== undefined) return String(fromKey)
  }

  const candidates = [
    option.label,
    option.name,
    option.nombre,
    option.razon_social,
    option.nombre_completo,
    option.fullname_name,
    option.fullname,
    option.titulo,
    option.codigo,
    option.code,
  ]
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
      return String(candidate)
    }
  }

  const resolvedId = resolveOptionId(option)
  // Never surface a raw GUID/id as the visible select label.
  if (!resolvedId || isGuidLike(resolvedId)) return ''
  return String(resolvedId)
}

/** Comparador estandar para etiquetas visibles de selectores (locale es, numerico). */
export const SELECT_LABEL_COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

function resolveOrden(option) {
  if (typeof option !== 'object' || option === null) return null
  if (option.orden === undefined || option.orden === null || option.orden === '') return null
  const parsed = Number(option.orden)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Ordena opciones de select en ascendente: primero `orden` (si existe en ambos),
 * luego etiqueta visible (locale es).
 */
export function sortSelectOptions(options = [], { optionLabel } = {}) {
  if (!Array.isArray(options) || options.length <= 1) return options

  return [...options]
    .map((option, index) => ({ option, index }))
    .sort((left, right) => {
      const leftOrden = resolveOrden(left.option)
      const rightOrden = resolveOrden(right.option)
      if (leftOrden !== null && rightOrden !== null && leftOrden !== rightOrden) {
        return leftOrden - rightOrden
      }

      const labelCompare = SELECT_LABEL_COLLATOR.compare(
        String(resolveOptionLabel(left.option, optionLabel)),
        String(resolveOptionLabel(right.option, optionLabel)),
      )
      if (labelCompare !== 0) return labelCompare

      return left.index - right.index
    })
    .map(({ option }) => option)
}

export function valuesMatch(left, right) {
  if (left === null || left === undefined || left === '') return right === null || right === undefined || right === ''
  if (right === null || right === undefined || right === '') return false
  if (String(left) === String(right)) return true
  if (isGuidLike(left) && isGuidLike(right)) return normalizeGuid(left) === normalizeGuid(right)
  return false
}

export function findOptionByValue(options = [], value, optionValue) {
  if (value === null || value === undefined || value === '') return null
  return options.find((option) => valuesMatch(resolveOptionId(option, optionValue), value)) || null
}

export function resolveRowSelectLabel(row, fieldKey, explicitLabel = '') {
  if (explicitLabel) return explicitLabel
  if (!row || !fieldKey) return ''

  const keys = FIELD_DISPLAY_LABELS[fieldKey] || []
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value)
    }
  }

  return ''
}

export function resolveSelectDisplayLabel({
  value,
  options = [],
  optionValue,
  optionLabel,
  currentLabel = '',
  row = null,
  fieldKey = '',
}) {
  if (value === null || value === undefined || value === '') return ''

  const fromRow = resolveRowSelectLabel(row, fieldKey, currentLabel)
  if (fromRow) return fromRow

  const match = findOptionByValue(options, value, optionValue)
  if (match) return resolveOptionLabel(match, optionLabel)

  const raw = String(value)
  if (/^\d+$/.test(raw) || isGuidLike(raw)) return 'Valor no disponible'
  return raw
}

/** Normaliza items de catalogo/tabla para id_item consistente. */
export function normalizeLookupOption(item) {
  if (!item || typeof item !== 'object') return item
  return {
    ...item,
    id_item: item.id_item ?? item.id_linea_negocio ?? item.id_origen_contacto ?? item.id_motivo_perdida ?? item.id_tipo_contacto,
    id_tipo_servicio: item.id_tipo_servicio ?? item.id_item,
    id_tipo_ambulancia: item.id_tipo_ambulancia ?? item.id_item,
  }
}

function firstNonEmptyString(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue
    const text = String(candidate).trim()
    if (text) return text
  }
  return ''
}

/**
 * Normaliza filas de endpoints /options a { id, name } para selects FK.
 * Omite filas sin nombre descriptivo (nunca usa el GUID como etiqueta).
 */
export function mapApiRowsToFkOptions(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const id = firstNonEmptyString(row.id, row.value, row.code)
      const name = firstNonEmptyString(
        row.name,
        row.label,
        row.nombre,
        row.razon_social,
        row.nombre_completo,
        row.fullname_name,
        row.fullname,
        row.titulo,
        row.codigo,
      )
      if (!id || !name || isGuidLike(name) || name === id) return null
      return { id, name }
    })
    .filter(Boolean)
}

/**
 * Normaliza filas de catalogo a { value, label } para CrmSelect.
 * Omite etiquetas vacias o iguales a GUID.
 */
export function mapApiRowsToSelectOptions(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const value = firstNonEmptyString(row.code, row.id, row.value)
      const label = firstNonEmptyString(
        row.name,
        row.label,
        row.nombre,
        row.codigo,
        row.code,
      )
      if (!value || !label || isGuidLike(label)) return null
      return { value, label }
    })
    .filter(Boolean)
}
