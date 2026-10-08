import { crmMenuSections } from './crmNavigationConfig'
import { CRM_BASE, crmRoutes, pipelineRoutes, WORKSPACE_PICKER_ROUTE } from './routes'

export const WORKSPACE_IDS = {
  PIPELINE: 'pipeline',
  CRM: 'crm',
  UCMCRM: 'crm',
  FLEET: 'crm',
}

/** Un solo workspace visual: mismos acentos violet/emerald del CRM template. */
export const WORKSPACES = {
  [WORKSPACE_IDS.PIPELINE]: {
    id: WORKSPACE_IDS.PIPELINE,
    label: 'UCM Fleet',
    shortLabel: 'Fleet',
    description: 'Administración de flota, kilometraje y combustible.',
    home: crmRoutes.home,
    basePath: CRM_BASE,
    accent: {
      sidebarGradient: 'from-violet-800 via-purple-800 to-emerald-800',
      sidebarShadow: 'shadow-violet-950/35',
      linkActive: 'from-violet-500/15 to-emerald-500/15',
      linkHover: 'hover:from-violet-500/10 hover:to-emerald-500/10',
      iconWrap: 'from-violet-500/15 to-emerald-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/10',
      headerBadge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
      pageHeaderGradient: 'from-violet-500/[0.08] via-card to-emerald-500/[0.06]',
      pageHeaderOrbA: 'bg-violet-400/20 dark:bg-violet-500/15',
      pageHeaderOrbB: 'bg-emerald-400/15 dark:bg-emerald-500/10',
      actionButton: 'from-violet-600 via-purple-600 to-emerald-600 shadow-violet-500/20',
    },
    breadcrumbPrefix: 'Fleet',
  },
  [WORKSPACE_IDS.CRM]: {
    id: WORKSPACE_IDS.CRM,
    label: 'UCM Fleet Data Platform',
    shortLabel: 'Fleet',
    description: 'Maestros, GPS, combustible, operacional e integraciones Wisetrack.',
    home: crmRoutes.home,
    basePath: crmRoutes.home,
    accent: {
      sidebarGradient: 'from-violet-800 via-purple-800 to-emerald-800',
      sidebarShadow: 'shadow-violet-950/35',
      linkActive: 'from-violet-500/15 to-emerald-500/15',
      linkHover: 'hover:from-violet-500/10 hover:to-emerald-500/10',
      iconWrap: 'from-violet-500/15 to-emerald-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/10',
      headerBadge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
      pageHeaderGradient: 'from-violet-500/[0.08] via-card to-emerald-500/[0.06]',
      pageHeaderOrbA: 'bg-violet-400/20 dark:bg-violet-500/15',
      pageHeaderOrbB: 'bg-emerald-400/15 dark:bg-emerald-500/10',
      actionButton: 'from-violet-600 via-purple-600 to-emerald-600 shadow-violet-500/20',
    },
    breadcrumbPrefix: 'Fleet',
  },
}

export function flattenWorkspaceMenuItems(workspaceId) {
  if (workspaceId === WORKSPACE_IDS.CRM || workspaceId === WORKSPACE_IDS.PIPELINE) {
    return crmMenuSections.flatMap((section) => section.items)
  }
  return []
}

export function detectWorkspaceFromPath(pathname = '') {
  const path = String(pathname)
  if (path.startsWith(CRM_BASE) || path.startsWith('/ucmcrm') || path.startsWith('/fleet')) {
    return WORKSPACE_IDS.CRM
  }
  if (path.startsWith(pipelineRoutes.home)) return WORKSPACE_IDS.PIPELINE
  return WORKSPACE_IDS.CRM
}

export function resolvePostLoginTarget(returnTo) {
  if (returnTo && returnTo !== WORKSPACE_PICKER_ROUTE) return returnTo
  return crmRoutes.home
}
