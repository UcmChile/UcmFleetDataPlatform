import { buildCrmSidebarMenu, flattenCrmMenuTreeLeaves, flattenCrmMenuItems, crmSidebarMenuData } from './crmMenuData'
import { crmRoutes } from './routes'

export { flattenCrmMenuItems, flattenCrmMenuTreeLeaves }
export const crmSidebarMenu = crmSidebarMenuData

export const crmOrganizationItems = [
  { to: crmRoutes.home, label: 'Inicio Fleet', match: 'Inicio' },
]

export const crmSecurityItems = []

function maintainerLeaves() {
  return flattenCrmMenuTreeLeaves()
    .filter((leaf) => leaf.sectionKey === 'maintainers')
    .map(({ to, label, match, apiPath }) => ({ to, label, match, apiPath }))
}

export const crmMaintainerContratosItems = []
export const crmMaintainerCicloVidaItems = []
export const crmMaintainerFinancierosItems = []
export const crmMaintainerAutomotrizItems = []
export const crmMaintainerCoberturaItems = []
export const crmMaintainerAreasItems = []
export const crmMaintainerPersonasItems = []
export const crmMaintainerMaterialesItems = []
export const crmMaintainerGeograficosItems = []

export const crmMenuSections = [
  {
    id: 'fleet-home',
    title: 'Fleet',
    items: crmOrganizationItems,
  },
  {
    id: 'maintainers',
    title: 'Mantenedores',
    items: maintainerLeaves(),
  },
]

export function flattenCrmMenuForSearch(menu, filterItems, treeOptions) {
  const leaves = flattenCrmMenuTreeLeaves(menu || buildCrmSidebarMenu())
  const asItems = leaves.map((leaf) => ({ to: leaf.to, label: leaf.label, title: leaf.label }))
  return typeof filterItems === 'function' ? filterItems(asItems, treeOptions) : asItems
}
