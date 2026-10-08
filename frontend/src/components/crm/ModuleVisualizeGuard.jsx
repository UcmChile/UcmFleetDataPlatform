import { Navigate } from 'react-router-dom'
import { isSystemAdmin } from '../../services/api'
import { useMenuPermissions } from '../../hooks/useMenuPermissions'
import { pipelineRoutes, crmRoutes } from '../../lib/routes'
import { isCrmMenuRoute, CRM_MENU_ROUTES } from '../../lib/menuPermissions'

function resolveCrmFallback(canVisualizeMenuItem) {
  const target = CRM_MENU_ROUTES.find((route) => canVisualizeMenuItem(route))
  return target || crmRoutes.organizaciones
}

export function ModuleVisualizeGuard({ to, children }) {
  const { loading, permissionMode, canVisualizeMenuItem } = useMenuPermissions()

  if (isSystemAdmin()) {
    return children
  }

  if (loading) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">Cargando permisos...</p>
  }

  if (permissionMode === 'strict') {
    return (
      <div className="px-6 py-10">
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200">
          Tu usuario no tiene permisos configurados en la matriz de roles. Contacta al administrador.
        </p>
      </div>
    )
  }

  if (permissionMode !== 'legacy' && !canVisualizeMenuItem(to)) {
    if (isCrmMenuRoute(to)) {
      const fallback = resolveCrmFallback(canVisualizeMenuItem)
      if (fallback !== to && canVisualizeMenuItem(fallback)) {
        return <Navigate to={fallback} replace />
      }
      return (
        <div className="px-6 py-10">
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200">
            No tienes permiso para ver este modulo del CRM operativo. Pide acceso a Organizaciones, Usuarios o Roles en la matriz de permisos.
          </p>
        </div>
      )
    }
    return <Navigate to={pipelineRoutes.home} replace />
  }

  return children
}
