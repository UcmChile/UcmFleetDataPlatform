import { crmRoutes } from './routes'

export function fleetRoutesCompat() {
  return {
    home: crmRoutes.home,
    login: '/login',
    mantenedores: crmRoutes.mantenedores,
    mantenedor: (slug) => crmRoutes.mantenedoresCatalogo(slug),
    wisetrack: crmRoutes.wisetrack,
    wisetrackCredentials: crmRoutes.wisetrackCredentials,
  }
}

export const fleetRoutes = {
  home: crmRoutes.home,
  login: '/login',
  mantenedores: crmRoutes.mantenedores,
  mantenedor: (slug) => crmRoutes.mantenedoresCatalogo(slug),
  wisetrack: crmRoutes.wisetrack,
  wisetrackCredentials: crmRoutes.wisetrackCredentials,
}

function item(slug, label) {
  return {
    id: slug,
    label,
    to: crmRoutes.mantenedoresCatalogo(slug),
    apiPath: `/${slug}`,
  }
}

export const FLEET_MENU = [
  {
    id: 'maestros',
    label: 'Maestros',
    children: [
      item('vehicles', 'Vehículos'),
      item('persons', 'Personas'),
    ],
  },
  {
    id: 'kilometraje',
    label: 'Kilometraje',
    children: [
      item('gps-minute-pings', 'GPS minute pings'),
      item('gps-daily-km', 'GPS daily km'),
      item('physical-readings', 'Lecturas físicas'),
      item('reconciliation-periods', 'Períodos reconciliación'),
      item('odometer-daily', 'Odómetro diario'),
    ],
  },
  {
    id: 'combustible',
    label: 'Combustible',
    children: [
      item('fuel-cards', 'Tarjetas combustible'),
      item('fuel-stations', 'Estaciones'),
      item('fuel-transactions', 'Transacciones'),
    ],
  },
  {
    id: 'operacional',
    label: 'Operacional',
    children: [
      item('ordering-facilities', 'Centros solicitantes'),
      item('placeholder-patients', 'Placeholder pacientes'),
      item('placeholder-vehicles', 'Placeholder vehículos'),
      item('shifts', 'Turnos'),
      item('shift-persons', 'Personas en turno'),
      item('runs', 'Servicios (runs)'),
      item('run-legs', 'Tramos (run legs)'),
    ],
  },
  {
    id: 'integraciones',
    label: 'Integraciones',
    children: [
      { id: 'wisetrack-credentials', label: 'Credenciales / Token', to: crmRoutes.wisetrackCredentials },
      { id: 'wisetrack-console', label: 'Wisetrack (ingesta)', to: crmRoutes.wisetrack },
      item('wisetrack-api-tokens', 'Tokens API'),
      item('wisetrack-ingestion-log', 'Bitácora ingesta'),
      item('wisetrack-rejected-pings', 'Pings rechazados'),
    ],
  },
]

export function flattenFleetMenu() {
  return FLEET_MENU.flatMap((section) => section.children || [])
}

export function findMenuItemByPath(pathname) {
  return flattenFleetMenu().find((entry) => entry.to === pathname) || null
}

const vehicleDisplayFields = [
  { field: 'plate', label: 'Patente', columnOnly: true },
  { field: 'wisetrack_vehicle_id', label: 'Wisetrack ID', columnOnly: true },
]

export const FLEET_FORM_FIELDS = {
  vehicles: [
    { field: 'vehicle_number', label: 'Nº vehículo', required: true },
    { field: 'plate', label: 'Patente', required: true },
    { field: 'vin', label: 'VIN' },
    { field: 'make', label: 'Marca' },
    { field: 'model', label: 'Modelo' },
    { field: 'status', label: 'Estado' },
    { field: 'division', label: 'División' },
    { field: 'cost_center', label: 'Centro de costo' },
    { field: 'station', label: 'Estación' },
    { field: 'district', label: 'Distrito' },
    { field: 'group_name', label: 'Grupo' },
    { field: 'initial_odometer', label: 'Odómetro inicial', type: 'number' },
    { field: 'wisetrack_vehicle_id', label: 'Wisetrack vehicle id' },
    { field: 'traumasoft_vehicle_id', label: 'Traumasoft id', type: 'number' },
  ],
  persons: [
    { field: 'rut', label: 'RUT', required: true },
    { field: 'name', label: 'Nombre', required: true },
    { field: 'category', label: 'Categoría' },
    { field: 'is_active', label: 'Activo', type: 'bit' },
  ],
  'gps-minute-pings': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'ts', label: 'Timestamp', required: true },
    { field: 'odometer_km', label: 'Odómetro km', type: 'number' },
    { field: 'latitude', label: 'Latitud', type: 'number' },
    { field: 'longitude', label: 'Longitud', type: 'number' },
    { field: 'speed_kmh', label: 'Velocidad', type: 'number' },
    { field: 'ignition_on', label: 'Ignición', type: 'bit' },
  ],
  'gps-daily-km': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'reading_date', label: 'Fecha', required: true },
    { field: 'first_odometer_km', label: 'Primer odómetro', type: 'number' },
    { field: 'last_odometer_km', label: 'Último odómetro', type: 'number' },
    { field: 'km_raw', label: 'Km día (max−min)', type: 'number' },
    { field: 'is_consistent', label: 'Consistencia', type: 'bit' },
    { field: 'ping_count', label: 'Ping count', type: 'number' },
    { field: 'has_anomaly', label: 'Anomalía', type: 'bit' },
  ],
  'physical-readings': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'recorded_by_person_id', label: 'Persona ID', type: 'number' },
    { field: 'reading_date', label: 'Fecha', required: true },
    { field: 'odometer_km', label: 'Odómetro', type: 'number', required: true },
    { field: 'status', label: 'Estado' },
  ],
  'reconciliation-periods': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'start_reading_id', label: 'Start reading ID', type: 'number' },
    { field: 'end_reading_id', label: 'End reading ID', type: 'number' },
    { field: 'start_date', label: 'Inicio' },
    { field: 'end_date', label: 'Fin' },
    { field: 'gps_total_km', label: 'GPS total km', type: 'number' },
    { field: 'correction_factor', label: 'Factor corrección', type: 'number' },
    { field: 'status', label: 'Estado' },
  ],
  'odometer-daily': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'reading_date', label: 'Fecha', required: true },
    { field: 'km_adjusted', label: 'Km ajustado', type: 'number' },
    { field: 'odometer_eod', label: 'Odómetro EOD', type: 'number' },
    { field: 'period_id', label: 'Period ID', type: 'number' },
    { field: 'is_final', label: 'Final', type: 'bit' },
  ],
  'fuel-cards': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'card_number', label: 'Nº tarjeta', required: true },
    { field: 'valid_from', label: 'Válida desde' },
    { field: 'valid_to', label: 'Válida hasta' },
  ],
  'fuel-stations': [
    { field: 'comuna', label: 'Comuna' },
    { field: 'direccion', label: 'Dirección' },
    { field: 'region', label: 'Región' },
  ],
  'fuel-transactions': [
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
    ...vehicleDisplayFields,
    { field: 'card_id', label: 'Card ID', type: 'number' },
    { field: 'station_id', label: 'Station ID', type: 'number' },
    { field: 'driver_person_id', label: 'Conductor ID', type: 'number' },
    { field: 'transaction_ts', label: 'Fecha/hora', required: true },
    { field: 'comprobante', label: 'Comprobante' },
    { field: 'product', label: 'Producto' },
    { field: 'volume_liters', label: 'Litros', type: 'number' },
    { field: 'total_amount', label: 'Monto', type: 'number' },
    { field: 'odometer_raw', label: 'Odómetro raw', type: 'number' },
    { field: 'odometer_clean', label: 'Odómetro clean', type: 'number' },
    { field: 'discarded', label: 'Descartada', type: 'bit' },
  ],
  'ordering-facilities': [
    { field: 'external_id', label: 'External ID', type: 'number' },
    { field: 'name', label: 'Nombre', required: true },
    { field: 'type', label: 'Tipo' },
    { field: 'is_active', label: 'Activo', type: 'bit' },
  ],
  'placeholder-patients': [
    { field: 'rut', label: 'RUT' },
    { field: 'los', label: 'LOS' },
    { field: 'placeholder_name', label: 'Nombre' },
    { field: 'is_patient_attention', label: 'Atención paciente', type: 'bit' },
    { field: 'is_productive_use', label: 'Uso productivo', type: 'bit' },
    { field: 'nature', label: 'Naturaleza' },
    { field: 'is_active', label: 'Activo', type: 'bit' },
  ],
  'placeholder-vehicles': [
    { field: 'movil_number', label: 'Nº móvil', type: 'number', required: true },
    { field: 'purpose', label: 'Propósito' },
    { field: 'is_active', label: 'Activo', type: 'bit' },
  ],
  shifts: [
    { field: 'shift_id', label: 'Shift ID', type: 'number', required: true },
    { field: 'unit_name', label: 'Unidad' },
    { field: 'puesto_trabajo', label: 'Puesto' },
    { field: 'vehicle_category', label: 'Categoría vehículo' },
    { field: 'name_template', label: 'Plantilla nombre' },
  ],
  'shift-persons': [
    { field: 'shift_fk', label: 'Shift FK', type: 'number', required: true },
    { field: 'person_id', label: 'Person ID', type: 'number', required: true },
    { field: 'date_line', label: 'Fecha' },
    { field: 'start_time', label: 'Inicio' },
    { field: 'end_time', label: 'Fin' },
    { field: 'start_actual', label: 'Inicio real' },
    { field: 'end_actual', label: 'Fin real' },
  ],
  runs: [
    { field: 'run_number', label: 'Run number', type: 'number', required: true },
    { field: 'ordering_facility_id', label: 'Facility ID', type: 'number' },
    { field: 'placeholder_patient_id', label: 'Patient placeholder ID', type: 'number' },
    { field: 'turno_code', label: 'Turno' },
    { field: 'tipo_atencion', label: 'Tipo atención' },
    { field: 'los', label: 'LOS' },
    { field: 'zona', label: 'Zona' },
    { field: 'vehiculo_category', label: 'Categoría vehículo' },
    { field: 'business_unit', label: 'Unidad negocio' },
    { field: 'is_patient_attention', label: 'Atención paciente', type: 'bit' },
    { field: 'is_productive_use', label: 'Uso productivo', type: 'bit' },
  ],
  'run-legs': [
    { field: 'run_id', label: 'Run ID', type: 'number', required: true },
    { field: 'leg_id', label: 'Leg ID', type: 'number', required: true },
    { field: 'vehicle_id', label: 'Vehicle ID', type: 'number' },
    ...vehicleDisplayFields,
    { field: 'placeholder_vehicle_id', label: 'Placeholder vehicle ID', type: 'number' },
    { field: 'movil_text', label: 'Móvil' },
    { field: 'is_third_party', label: 'Tercero', type: 'bit' },
    { field: 'last_status', label: 'Último estado' },
    { field: 'assigned_time', label: 'Asignado' },
    { field: 'enroute_time', label: 'En ruta' },
    { field: 'at_scene_time', label: 'En escena' },
    { field: 'transporting_time', label: 'Transportando' },
    { field: 'at_destination_time', label: 'En destino' },
    { field: 'clear_time', label: 'Liberado' },
  ],
  'wisetrack-ingestion-log': [
    { field: 'batch_id', label: 'Batch' },
    { field: 'status', label: 'Estado' },
    { field: 'period_from', label: 'Desde' },
    { field: 'period_to', label: 'Hasta' },
    { field: 'n_pings_inserted', label: 'Insertados', type: 'number' },
    { field: 'n_pings_rejected', label: 'Rechazados', type: 'number' },
  ],
  'wisetrack-rejected-pings': [
    { field: 'batch_id', label: 'Batch' },
    { field: 'wisetrack_vehicle_id', label: 'Wisetrack ID' },
    { field: 'plate', label: 'Patente' },
    { field: 'reason', label: 'Motivo' },
    { field: 'ingested_at', label: 'Ingestado' },
  ],
  'wisetrack-api-tokens': [
    { field: 'config_id', label: 'Config ID', type: 'number' },
    { field: 'token_type', label: 'Tipo' },
    { field: 'status', label: 'Estado' },
    { field: 'obtained_at', label: 'Obtenido' },
    { field: 'expires_at', label: 'Expira' },
    { field: 'source', label: 'Origen' },
    { field: 'is_active', label: 'Activo', type: 'bit' },
  ],
}

export const READ_ONLY_SLUGS = new Set([
  'wisetrack-ingestion-log',
  'wisetrack-rejected-pings',
  'wisetrack-api-tokens',
])
