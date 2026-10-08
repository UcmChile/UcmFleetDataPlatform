/** Namespace base del producto Fleet (mismo patrón visual/rutas que CRM del template). */
export const PIPELINE_BASE = '/pipeline'
export const CRM_BASE = '/fleet'
export const UCMCRM_BASE = CRM_BASE
export const WORKSPACE_PICKER_ROUTE = '/workspace'

export const pipelineRoutes = {
  home: PIPELINE_BASE,
  login: `${PIPELINE_BASE}/login`,
  oportunidades: `${PIPELINE_BASE}/oportunidades`,
  empresas: `${PIPELINE_BASE}/empresas`,
  contactos: `${PIPELINE_BASE}/contactos`,
  casos: `${PIPELINE_BASE}/casos`,
  contratos: `${PIPELINE_BASE}/contratos`,
  tablasReferenciales: `${PIPELINE_BASE}/tablas-referenciales`,
  tablasMaestras: `${PIPELINE_BASE}/tablas-maestras`,
  administracion: `${PIPELINE_BASE}/administracion`,
  auditoria: `${PIPELINE_BASE}/auditoria`,
  mantenedores: `${PIPELINE_BASE}/mantenedores`,
}

export const crmRoutes = {
  home: CRM_BASE,
  login: `${CRM_BASE}/login`,
  organizaciones: `${CRM_BASE}`,
  unidadesNegocio: `${CRM_BASE}/dashboard`,
  usuarios: `${CRM_BASE}/usuarios`,
  roles: `${CRM_BASE}/roles`,
  auditoria: `${CRM_BASE}/auditoria`,
  mantenedores: `${CRM_BASE}/mantenedores`,
  mantenedoresCatalogo: (slug) => `${CRM_BASE}/mantenedores/catalogo/${slug}`,
  wisetrack: `${CRM_BASE}/integraciones/wisetrack`,
  wisetrackCredentials: `${CRM_BASE}/integraciones/wisetrack/credenciales`,
  configParametrosGenerales: `${CRM_BASE}/configuracion/parametros-generales`,
  configPreferencias: `${CRM_BASE}/configuracion/preferencias`,
  configMapaMantenedores: `${CRM_BASE}/configuracion/mapa-mantenedores`,
}

export const ucmcrmRoutes = crmRoutes
export const APP_LOGIN_ROUTE = '/login'

export const appRoutes = {
  login: APP_LOGIN_ROUTE,
  home: crmRoutes.home,
}

const PRODUCT_BASES = [PIPELINE_BASE, CRM_BASE]

export function stripProductNamespace(pathname = '') {
  let clean = String(pathname).trim().replace(/\/+$/, '')
  for (const base of PRODUCT_BASES) {
    if (clean === base) return '/'
    if (clean.startsWith(`${base}/`)) return clean.slice(base.length) || '/'
  }
  return clean || '/'
}

export function resolveAppReturnTo(value) {
  const fallback = crmRoutes.home
  if (!value || !String(value).startsWith('/')) return fallback
  return String(value)
}

export function isAppLoginPath(pathname) {
  const path = String(pathname || '')
  return path === APP_LOGIN_ROUTE || path === crmRoutes.login || path === pipelineRoutes.login
}
