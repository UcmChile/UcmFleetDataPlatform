import { useMemo, useState } from 'react'

/**
 * Filtro On/Off: Off (default) → solo activos (`status=active`).
 * On → incluye inactivos/cancelados (sin filtro de estado).
 */
export function useMaintainerActiveFilter() {
  const [showInactive, setShowInactive] = useState(false)

  const statusFilterParams = useMemo(() => (
    showInactive ? {} : { status: 'active' }
  ), [showInactive])

  const clearActiveFilter = () => setShowInactive(false)

  return {
    showInactive,
    setShowInactive,
    statusFilterParams,
    clearActiveFilter,
  }
}
