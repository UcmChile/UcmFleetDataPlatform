const CHILE_LAT = { min: -56, max: -17 }
const CHILE_LON = { min: -75, max: -66 }

/**
 * Validaciones §6.1 del documento Requerimientos_API_Wisetrack_UCM.
 * @returns {{ ok: boolean, action: 'accept'|'reject'|'skip', reason?: string, warnings: string[] }}
 */
export function validatePing(ping, context = {}) {
  const warnings = []
  const vehicleMap = context.vehicleByWisetrackId || new Map()

  if (!ping?.vehicle_id) {
    return { ok: false, action: 'reject', reason: 'missing_vehicle_id', warnings }
  }

  const master = vehicleMap.get(String(ping.vehicle_id))
  if (!master) {
    return { ok: false, action: 'reject', reason: 'vehicle_id_not_mapped', warnings }
  }

  if (!ping.timestamp) {
    return { ok: false, action: 'reject', reason: 'missing_timestamp', warnings }
  }

  const ts = new Date(ping.timestamp)
  if (Number.isNaN(ts.getTime())) {
    return { ok: false, action: 'reject', reason: 'invalid_timestamp', warnings }
  }

  const skewMs = ts.getTime() - Date.now()
  if (skewMs > 5 * 60 * 1000) {
    return { ok: false, action: 'reject', reason: 'timestamp_in_future', warnings }
  }

  const lat = Number(ping.latitude)
  const lon = Number(ping.longitude)
  if (!Number.isFinite(lat) || lat < CHILE_LAT.min || lat > CHILE_LAT.max) {
    return { ok: false, action: 'reject', reason: 'latitude_out_of_range', warnings }
  }
  if (!Number.isFinite(lon) || lon < CHILE_LON.min || lon > CHILE_LON.max) {
    return { ok: false, action: 'reject', reason: 'longitude_out_of_range', warnings }
  }

  const speed = Number(ping.speed_kmh)
  if (!Number.isFinite(speed) || speed < 0 || speed > 200) {
    warnings.push('speed_out_of_range')
  }

  if (ping.plate && master.plate && String(ping.plate).toUpperCase() !== String(master.plate).toUpperCase()) {
    warnings.push('plate_mismatch')
  }

  const odo = Number(ping.odometer_km)
  if (!Number.isFinite(odo)) {
    // La API Wisetrack a menudo envía odometer_km null; se acepta con warning.
    warnings.push('missing_odometer_km')
  } else {
    const lastOdo = context.lastOdometerByVehicleId?.get(master.id)
    if (lastOdo != null && odo < lastOdo - 10) {
      warnings.push('odometer_rollback')
    }
  }

  if (ping.ignition_on === undefined || ping.ignition_on === null) {
    return { ok: false, action: 'reject', reason: 'missing_ignition_on', warnings }
  }

  return {
    ok: true,
    action: 'accept',
    warnings,
    vehicleId: master.id,
    ts,
  }
}
