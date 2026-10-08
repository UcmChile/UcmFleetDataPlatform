import { CRM_BASE, crmRoutes, PIPELINE_BASE, stripProductNamespace } from './routes'

/** Clave de permiso de menu a partir de la ruta (prefijo crm-auditoria evita colision con Pipeline). */
export function normalizeMenuKey(pathname = '') {
  const path = String(pathname).trim().replace(/^\/ucmcrm(?=\/|$)/, CRM_BASE)
  const isCrm = path.startsWith(CRM_BASE)
  let clean = stripProductNamespace(path).replace(/\/+$/, '')
  if (clean === '' || clean === '/') return isCrm ? 'crm' : 'dashboard'
  const key = clean.replace(/^\//, '').replace(/\//g, '.')
  if (isCrm && key === 'auditoria') return 'crm-auditoria'
  if (isCrm && key.startsWith('mantenedores.')) return 'mantenedores'
  return key
}

export function isCrmMenuRoute(pathname = '') {
  const path = String(pathname).trim()
  return path.startsWith(CRM_BASE) || path.startsWith('/ucmcrm')
}

/** @deprecated Usar isCrmMenuRoute */
export const isUcmcrmMenuRoute = isCrmMenuRoute

/** Puente: quien gestiona Administracion en Pipeline ve mantenedores CRM. */
const CRM_ADMIN_BRIDGE_READ = [
  'menu.administracion.read',
  'menu.administracion.write',
  'menu.administracion.modify',
  'menu.administracion.access',
  'menu.administracion.view',
]

const CRM_ADMIN_BRIDGE_WRITE = [
  'menu.administracion.write',
  'menu.administracion.modify',
]

function hasAdministracionBridgePermission(permissions, codes) {
  if (!permissions?.length) return false
  return permissions.some(
    (code) => codes.includes(code) || String(code).startsWith('menu.administracion.'),
  )
}

export function hasCrmAdminBridgeRead(permissions) {
  return hasAdministracionBridgePermission(permissions, CRM_ADMIN_BRIDGE_READ)
}

export function hasCrmAdminBridgeWrite(permissions) {
  return hasAdministracionBridgePermission(permissions, CRM_ADMIN_BRIDGE_WRITE)
}

/** @deprecated Usar hasCrmAdminBridgeRead */
export const hasUcmcrmAdminBridgeRead = hasCrmAdminBridgeRead

/** @deprecated Usar hasCrmAdminBridgeWrite */
export const hasUcmcrmAdminBridgeWrite = hasCrmAdminBridgeWrite

export const CRM_MENU_ROUTES = [
  crmRoutes.home,
  crmRoutes.organizaciones,
  crmRoutes.unidadesNegocio,
  crmRoutes.usuarios,
  crmRoutes.roles,
  crmRoutes.auditoria,
  crmRoutes.configParametrosGenerales,
  crmRoutes.configPreferencias,
  crmRoutes.configMapaMantenedores,
]

/** @deprecated Usar CRM_MENU_ROUTES */
export const UCMCRM_MENU_ROUTES = CRM_MENU_ROUTES
