import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, getStoredSession, isSystemAdmin, setSession } from '../services/api'
import { pipelineRoutes } from '../lib/routes'
import {
  hasUcmcrmAdminBridgeRead,
  hasUcmcrmAdminBridgeWrite,
  isUcmcrmMenuRoute,
  normalizeMenuKey,
  UCMCRM_MENU_ROUTES,
} from '../lib/menuPermissions'

const MenuPermissionsContext = createContext(null)

/** Menu lateral y pantallas mantenedor: solo permiso Visualizar (read). */
export function canVisualizeMenuItem(permissions, to) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  if (permissions.includes(`menu.${menuKey}.read`)) return true
  if (isUcmcrmMenuRoute(to) && hasUcmcrmAdminBridgeRead(permissions)) return true
  return false
}

export function canManageMenuItem(permissions, to) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  const manageCodes = [`menu.${menuKey}.write`, `menu.${menuKey}.modify`]
  if (manageCodes.some((code) => permissions.includes(code))) return true
  if (isUcmcrmMenuRoute(to) && hasUcmcrmAdminBridgeWrite(permissions)) return true
  return false
}

/** Alta desde Pipeline (Kanban / listado oportunidades). */
export function canCreateInPipeline(permissions, to = pipelineRoutes.oportunidades) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  return permissions.includes(`menu.${menuKey}.create.create`)
}

/** Edicion desde Pipeline (Kanban / listado oportunidades). */
export function canEditInPipeline(permissions, to = pipelineRoutes.oportunidades) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  return permissions.includes(`menu.${menuKey}.edit.modify`)
}

function hasPipelineFeaturePermission(permissions, to, featureKey) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  return [
    `menu.${menuKey}.${featureKey}.modify`,
    `menu.${menuKey}.${featureKey}.write`,
  ].some((code) => permissions.includes(code))
}

/** Mover etapas en Kanban. */
export function canKanbanMoveInPipeline(permissions, to = pipelineRoutes.oportunidades) {
  return canEditInPipeline(permissions, to) || hasPipelineFeaturePermission(permissions, to, 'kanban_move')
}

/** Archivar oportunidades cerradas. */
export function canArchiveInPipeline(permissions, to = pipelineRoutes.oportunidades) {
  return canEditInPipeline(permissions, to) || hasPipelineFeaturePermission(permissions, to, 'archive')
}

/** Reabrir oportunidad cerrada (Kanban / edicion de etapa). */
export function canReopenClosedInPipeline(permissions, to = pipelineRoutes.oportunidades) {
  return hasPipelineFeaturePermission(permissions, to, 'reopen_closed')
}

/** Reabrir caso cerrado (Resuelto / Cancelado). */
export function canReopenClosedCase(permissions, to = pipelineRoutes.casos) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  return [
    `menu.${menuKey}.reopen_closed.modify`,
    `menu.${menuKey}.reopen_closed.write`,
  ].some((code) => permissions.includes(code))
}

/** Alta de catalogo (origen / linea / servicio) desde formulario Pipeline. */
export function canCreatePipelineLookup(permissions, type) {
  const codes = {
    origen: 'menu.oportunidades.lookup_origen.create',
    linea: 'menu.oportunidades.lookup_linea.create',
    servicio: 'menu.oportunidades.lookup_servicio.create',
  }
  const code = codes[type]
  if (!code) return false
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true
  return permissions.includes(code)
}

/** Alta desde pantalla del mantenedor (no desde Pipeline). */
export function canCreateFromMaintainer(permissions, to, featureKey = 'create') {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  if (permissions.includes(`menu.${menuKey}.${featureKey}.create`)) return true
  if (isUcmcrmMenuRoute(to) && hasUcmcrmAdminBridgeWrite(permissions)) return true
  return false
}

/** Eliminar desde mantenedor (columna Eliminar de la matriz del modulo). */
export function canDeleteFromMaintainer(permissions, to) {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  if (permissions.includes(`menu.${menuKey}.delete`)) return true
  if (isUcmcrmMenuRoute(to) && hasUcmcrmAdminBridgeWrite(permissions)) return true
  return false
}

/** Edicion desde pantalla del mantenedor (no desde Pipeline). */
export function canEditFromMaintainer(permissions, to, featureKey = 'edit') {
  if (!permissions?.length) return true
  if (permissions.includes('*')) return true

  const menuKey = normalizeMenuKey(to)
  if (permissions.includes(`menu.${menuKey}.${featureKey}.modify`)) return true
  if (isUcmcrmMenuRoute(to) && hasUcmcrmAdminBridgeWrite(permissions)) return true
  return false
}

export function canAccessMenuItem(permissions, to) {
  return canVisualizeMenuItem(permissions, to)
}

function useMenuPermissionsState(enabled = true) {
  const [permissions, setPermissions] = useState(null)
  const [permissionMode, setPermissionMode] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled))
  const isAdmin = isSystemAdmin()

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    setLoading(true)

    apiRequest('/auth/me')
      .then((payload) => {
        if (!active) return
        setPermissionMode(payload?.permissionMode || 'legacy')
        setPermissions(payload?.permissions || [])
        const stored = getStoredSession()
        if (stored?.token && payload?.user) {
          const refreshedUser = { ...stored.user, ...payload.user, is_owner: payload.is_owner ?? payload.user?.is_owner }
          setSession({ token: stored.token, user: refreshedUser })
          window.dispatchEvent(new CustomEvent('crm-session-refreshed', { detail: refreshedUser }))
        }
      })
      .catch(() => {
        if (!active) return
        setPermissionMode('strict')
        setPermissions([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [enabled])

  const ready = !loading && permissionMode !== null
  const hasFullAccess = isAdmin || permissionMode === 'legacy'

  function resolveActionPermission(checkFn) {
    if (isAdmin || hasFullAccess) return true
    if (!ready) return false
    if (permissionMode === 'strict') return false
    return checkFn(permissions)
  }

  function resolveVisualizePermission(to) {
    if (isAdmin || hasFullAccess) return true
    if (!ready) return true
    if (permissionMode === 'strict') return false
    return canVisualizeMenuItem(permissions, to)
  }

  function filterItems(items = []) {
    if (isAdmin || hasFullAccess) return items
    if (!ready) return items
    if (permissionMode === 'strict') return []
    return items.filter((item) => canVisualizeMenuItem(permissions, item.to))
  }

  return useMemo(() => ({
    permissions,
    permissionMode,
    loading,
    ready,
    isSystemAdmin: isAdmin,
    hasFullAccess,
    filterItems,
    canAccessMenuItem: (to) => resolveVisualizePermission(to),
    canVisualizeMenuItem: (to) => resolveVisualizePermission(to),
    canManageMenuItem: (to) => resolveActionPermission((value) => canManageMenuItem(value, to)),
    canCreateInPipeline: (to) => resolveActionPermission((value) => canCreateInPipeline(value, to)),
    canEditInPipeline: (to) => resolveActionPermission((value) => canEditInPipeline(value, to)),
    canKanbanMoveInPipeline: (to) => resolveActionPermission((value) => canKanbanMoveInPipeline(value, to)),
    canArchiveInPipeline: (to) => resolveActionPermission((value) => canArchiveInPipeline(value, to)),
    canReopenClosedInPipeline: (to) => resolveActionPermission((value) => canReopenClosedInPipeline(value, to)),
    canReopenClosedCase: (to) => resolveActionPermission((value) => canReopenClosedCase(value, to)),
    canCreatePipelineLookup: (type) => resolveActionPermission((value) => canCreatePipelineLookup(value, type)),
    canCreateFromMaintainer: (to, featureKey) => resolveActionPermission((value) => canCreateFromMaintainer(value, to, featureKey)),
    canEditFromMaintainer: (to, featureKey) => resolveActionPermission((value) => canEditFromMaintainer(value, to, featureKey)),
    canDeleteFromMaintainer: (to) => resolveActionPermission((value) => canDeleteFromMaintainer(value, to)),
  }), [hasFullAccess, isAdmin, loading, permissionMode, permissions, ready])
}

export function MenuPermissionsProvider({ children, enabled = true }) {
  const value = useMenuPermissionsState(enabled)
  return (
    <MenuPermissionsContext.Provider value={value}>
      {children}
    </MenuPermissionsContext.Provider>
  )
}

export function useMenuPermissions(enabled = true) {
  const context = useContext(MenuPermissionsContext)
  const fallback = useMenuPermissionsState(context == null && enabled)
  return context ?? fallback
}
