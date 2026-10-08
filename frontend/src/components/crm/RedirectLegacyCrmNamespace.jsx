import { Navigate, useLocation } from 'react-router-dom'
import { CRM_BASE } from '../../lib/routes'

/** Redirige /ucmcrm/* al namespace canonico /crm/*. */
export function RedirectLegacyCrmNamespace() {
  const location = useLocation()
  const target = `${location.pathname.replace(/^\/ucmcrm(?=\/|$)/, CRM_BASE)}${location.search}${location.hash}`
  return <Navigate to={target} replace />
}
