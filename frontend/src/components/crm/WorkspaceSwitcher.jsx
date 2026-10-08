import { Navigate } from 'react-router-dom'
import { crmRoutes } from '../../lib/routes'

/** En Fleet no hay workspace picker: redirige al home. */
export function WorkspaceSwitcher() {
  return null
}

export default function WorkspacePickerRedirect() {
  return <Navigate to={crmRoutes.home} replace />
}
