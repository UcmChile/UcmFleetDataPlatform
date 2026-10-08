import { useMemo } from 'react'
import { useMenuPermissions } from './useMenuPermissions'

/** Permisos CRUD para pantallas mantenedor del namespace /ucmcrm/*. */
export function useUcmcrmMaintainerPermissions(route) {
  const {
    canCreateFromMaintainer,
    canEditFromMaintainer,
    canDeleteFromMaintainer,
    isSystemAdmin,
    hasFullAccess,
    permissionMode,
  } = useMenuPermissions()

  const canCreate = canCreateFromMaintainer(route)
  const canEdit = canEditFromMaintainer(route)

  const canDelete = useMemo(() => {
    if (isSystemAdmin || hasFullAccess) return true
    if (permissionMode === 'legacy') return false
    return canDeleteFromMaintainer(route)
  }, [canDeleteFromMaintainer, hasFullAccess, isSystemAdmin, permissionMode, route])

  const canManage = canCreate || canEdit || canDelete

  return {
    canCreate,
    canEdit,
    canDelete,
    canManage,
  }
}
