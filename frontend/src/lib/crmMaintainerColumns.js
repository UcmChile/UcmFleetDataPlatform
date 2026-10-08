import { FLEET_FORM_FIELDS } from './fleetMenuData'

function fieldFormat(field) {
  if (field.type === 'number' || field.type === 'int' || field.type === 'bigint' || field.type === 'decimal') {
    return 'number'
  }
  if (field.type === 'date' || field.type === 'datetimeoffset') return 'date'
  const name = String(field.field || '')
  if (/(^ts$|_ts$|_at$|_date$|timestamp)/i.test(name)) return 'date'
  if (
    /(_id|_km|_amount|_liters|odometer|count)$/i.test(name)
    && !['vehicle_number', 'card_number', 'run_number', 'batch_id'].includes(name)
  ) {
    return 'number'
  }
  return 'text'
}

/** Mantenedores cuya columna vehicle_id es el id interno, no el Wisetrack. */
export const FLEET_VEHICLE_FILTER_SLUGS = [
  'gps-minute-pings',
  'gps-daily-km',
  'physical-readings',
  'reconciliation-periods',
  'odometer-daily',
  'fuel-cards',
  'fuel-transactions',
  'run-legs',
]

const VEHICLE_DISPLAY_COLUMNS = [
  { id: 'plate', field: 'plate', label: 'Patente', format: 'text' },
  { id: 'wisetrack_vehicle_id', field: 'wisetrack_vehicle_id', label: 'Wisetrack ID', format: 'text' },
]

function insertVehicleDisplayColumns(columns) {
  if (columns.some((col) => col.field === 'plate' || col.id === 'plate')) return columns
  const vehicleIdx = columns.findIndex((col) => col.field === 'vehicle_id' || col.id === 'vehicle_id')
  const at = vehicleIdx >= 0 ? vehicleIdx + 1 : 1
  return [
    ...columns.slice(0, at),
    ...VEHICLE_DISPLAY_COLUMNS,
    ...columns.slice(at),
  ]
}

/** El id Wisetrack es el identificador de negocio: siempre la segunda columna. */
function placeWisetrackSecond(columns) {
  const idx = columns.findIndex((col) => col.field === 'wisetrack_vehicle_id' || col.id === 'wisetrack_vehicle_id')
  if (idx < 0 || idx === 1) return columns
  const next = columns.slice()
  const [col] = next.splice(idx, 1)
  next.splice(1, 0, col)
  return next
}

function colsFromFields(slug, extras = []) {
  const fields = FLEET_FORM_FIELDS[slug] || []
  const dataFields = fields.filter((f) => !f.columnOnly)
  const displayFields = fields.filter((f) => f.columnOnly)
  const mapped = [
    { id: 'id', field: 'id', label: 'ID', format: 'number' },
    ...dataFields.slice(0, 8).map((f) => ({
      id: f.field,
      field: f.field,
      label: f.label || f.field,
      format: fieldFormat(f),
    })),
    ...extras,
  ]
  if (!displayFields.length) return mapped
  const displayCols = displayFields.map((f) => ({
    id: f.field,
    field: f.field,
    label: f.label || f.field,
    format: 'text',
  }))
  const vehicleIdx = mapped.findIndex((col) => col.field === 'vehicle_id')
  const at = vehicleIdx >= 0 ? vehicleIdx + 1 : 1
  return [...mapped.slice(0, at), ...displayCols, ...mapped.slice(at)]
}

const STATUS = { id: 'is_disabled', field: 'is_disabled', label: 'Estado', format: 'status' }

/** Registro de columnas para CrmMaintainerPage / MaintainerDataTable (usa `label`, no `header`). */
export const MAINTAINER_COLUMN_REGISTRY = {
  vehicles: [
    { id: 'id', field: 'id', label: 'ID', format: 'number', defaultVisible: false },
    { id: 'wisetrack_vehicle_id', field: 'wisetrack_vehicle_id', label: 'Wisetrack ID' },
    { id: 'vehicle_number', field: 'vehicle_number', label: 'Nº vehículo' },
    { id: 'plate', field: 'plate', label: 'Patente' },
    { id: 'make', field: 'make', label: 'Marca' },
    { id: 'model', field: 'model', label: 'Modelo' },
    { id: 'division', field: 'division', label: 'División' },
    { id: 'cost_center', field: 'cost_center', label: 'Centro de costo' },
    { id: 'station', field: 'station', label: 'Estación' },
    { id: 'district', field: 'district', label: 'Distrito', defaultVisible: false },
    { id: 'group_name', field: 'group_name', label: 'Grupo', defaultVisible: false },
    { id: 'status', field: 'status', label: 'Estado' },
    { id: 'traumasoft_vehicle_id', field: 'traumasoft_vehicle_id', label: 'Traumasoft ID', format: 'number', defaultVisible: false },
  ],
  persons: [...colsFromFields('persons'), STATUS],
  'gps-minute-pings': colsFromFields('gps-minute-pings'),
  'gps-daily-km': [
    { id: 'id', field: 'id', label: 'ID', format: 'number' },
    { id: 'vehicle_id', field: 'vehicle_id', label: 'Vehicle ID', format: 'number' },
    { id: 'reading_date', field: 'reading_date', label: 'Fecha', format: 'date' },
    { id: 'first_odometer_km', field: 'first_odometer_km', label: 'Primer odómetro', format: 'number' },
    { id: 'last_odometer_km', field: 'last_odometer_km', label: 'Último odómetro', format: 'number' },
    { id: 'km_raw', field: 'km_raw', label: 'Km día (max−min)', format: 'number' },
    { id: 'is_consistent', field: 'is_consistent', label: 'Consistencia', format: 'consistency' },
    { id: 'ping_count', field: 'ping_count', label: 'Pings', format: 'number' },
    { id: 'has_anomaly', field: 'has_anomaly', label: 'Anomalía', format: 'bit' },
  ],
  'physical-readings': colsFromFields('physical-readings'),
  'reconciliation-periods': colsFromFields('reconciliation-periods'),
  'odometer-daily': colsFromFields('odometer-daily'),
  'fuel-cards': colsFromFields('fuel-cards'),
  'fuel-stations': colsFromFields('fuel-stations'),
  'fuel-transactions': colsFromFields('fuel-transactions'),
  'ordering-facilities': [...colsFromFields('ordering-facilities'), STATUS],
  'placeholder-patients': [...colsFromFields('placeholder-patients'), STATUS],
  'placeholder-vehicles': [...colsFromFields('placeholder-vehicles'), STATUS],
  shifts: colsFromFields('shifts'),
  'shift-persons': colsFromFields('shift-persons'),
  runs: colsFromFields('runs'),
  'run-legs': colsFromFields('run-legs'),
  'wisetrack-ingestion-log': colsFromFields('wisetrack-ingestion-log'),
  'wisetrack-rejected-pings': [
    { id: 'id', field: 'id', label: 'ID', format: 'number' },
    { id: 'wisetrack_vehicle_id', field: 'wisetrack_vehicle_id', label: 'Wisetrack ID', format: 'text' },
    { id: 'batch_id', field: 'batch_id', label: 'Batch', format: 'text' },
    { id: 'plate', field: 'plate', label: 'Patente', format: 'text' },
    { id: 'reason', field: 'reason', label: 'Motivo', format: 'text' },
    { id: 'ingested_at', field: 'ingested_at', label: 'Ingestado', format: 'date' },
  ],
  'wisetrack-api-tokens': [
    { id: 'id', field: 'id', label: 'ID', format: 'number' },
    { id: 'token_type', field: 'token_type', label: 'Tipo', format: 'text' },
    { id: 'status', field: 'status', label: 'Estado', format: 'text' },
    { id: 'obtained_at', field: 'obtained_at', label: 'Obtenido', format: 'date' },
    { id: 'expires_at', field: 'expires_at', label: 'Expira', format: 'date' },
    { id: 'is_active', field: 'is_active', label: 'Activo', format: 'text' },
    { id: 'source', field: 'source', label: 'Origen', format: 'text' },
  ],
}

export function getMaintainerColumnDefs(slug) {
  const columns = MAINTAINER_COLUMN_REGISTRY[slug] || [
    { id: 'id', field: 'id', label: 'ID', format: 'number' },
    { id: 'name', field: 'name', label: 'Nombre', format: 'text' },
  ]
  const withVehicle = FLEET_VEHICLE_FILTER_SLUGS.includes(slug)
    ? insertVehicleDisplayColumns(columns)
    : columns
  return placeWisetrackSecond(withVehicle)
}
