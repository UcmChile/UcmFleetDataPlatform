import {
  Bus,
  Fuel,
  Gauge,
  LayoutDashboard,
  ListTree,
  MapPinned,
  Radio,
  Users,
  Workflow,
} from 'lucide-react'
import { crmRoutes } from './routes'

const cat = (slug) => crmRoutes.mantenedoresCatalogo(slug)

/** Rutas API por href del menú. */
export const CRM_MENU_API_PATHS = {
  [crmRoutes.wisetrack]: '/integrations/wisetrack/status',
  [crmRoutes.home]: '/dashboard/monthly-pings',
}

function resolveApiPath(href) {
  if (!href) return undefined
  if (CRM_MENU_API_PATHS[href]) return CRM_MENU_API_PATHS[href]
  const catalogMatch = href.match(/\/mantenedores\/catalogo\/([^/]+)/)
  if (catalogMatch) return `/${catalogMatch[1]}`
  return undefined
}

export function buildCrmSidebarMenu() {
  return {
    sections: [
      {
        id: 'home',
        title: 'Inicio',
        items: [
          {
            id: 'dashboard',
            title: 'Dashboard',
            icon: LayoutDashboard,
            href: crmRoutes.home,
          },
        ],
      },
      {
        id: 'maintainers',
        title: 'Catálogos operativos',
        items: [
          {
            id: 'mantenedores',
            title: 'Mantenedores',
            icon: ListTree,
            children: [
              {
                id: 'usuarios',
                title: 'Usuarios',
                icon: Users,
                href: crmRoutes.usuarios,
              },
              {
                id: 'mnt-maestros',
                title: 'Maestros',
                icon: Bus,
                children: [
                  { id: 'vehicles', title: 'Vehículos', icon: Bus, href: cat('vehicles') },
                  { id: 'persons', title: 'Personas', icon: Users, href: cat('persons') },
                ],
              },
              {
                id: 'mnt-kilometraje',
                title: 'Kilometraje',
                icon: Gauge,
                children: [
                  { id: 'gps-minute-pings', title: 'GPS minute pings', icon: MapPinned, href: cat('gps-minute-pings') },
                  { id: 'gps-daily-km', title: 'GPS daily km', icon: Gauge, href: cat('gps-daily-km') },
                  { id: 'physical-readings', title: 'Lecturas físicas', icon: Gauge, href: cat('physical-readings') },
                  { id: 'reconciliation-periods', title: 'Períodos reconciliación', icon: Gauge, href: cat('reconciliation-periods') },
                  { id: 'odometer-daily', title: 'Odómetro diario', icon: Gauge, href: cat('odometer-daily') },
                ],
              },
              {
                id: 'mnt-combustible',
                title: 'Combustible',
                icon: Fuel,
                children: [
                  { id: 'fuel-cards', title: 'Tarjetas combustible', icon: Fuel, href: cat('fuel-cards') },
                  { id: 'fuel-stations', title: 'Estaciones', icon: Fuel, href: cat('fuel-stations') },
                  { id: 'fuel-transactions', title: 'Transacciones', icon: Fuel, href: cat('fuel-transactions') },
                ],
              },
              {
                id: 'mnt-operacional',
                title: 'Operacional',
                icon: Workflow,
                children: [
                  { id: 'ordering-facilities', title: 'Centros solicitantes', icon: Workflow, href: cat('ordering-facilities') },
                  { id: 'placeholder-patients', title: 'Placeholder pacientes', icon: Users, href: cat('placeholder-patients') },
                  { id: 'placeholder-vehicles', title: 'Placeholder vehículos', icon: Bus, href: cat('placeholder-vehicles') },
                  { id: 'shifts', title: 'Turnos', icon: Workflow, href: cat('shifts') },
                  { id: 'shift-persons', title: 'Personas en turno', icon: Users, href: cat('shift-persons') },
                  { id: 'runs', title: 'Servicios (runs)', icon: Workflow, href: cat('runs') },
                  { id: 'run-legs', title: 'Tramos (run legs)', icon: Workflow, href: cat('run-legs') },
                ],
              },
              {
                id: 'mnt-integraciones',
                title: 'Integraciones',
                icon: Radio,
                children: [
                  { id: 'wisetrack-credentials', title: 'Credenciales / Token', icon: Radio, href: crmRoutes.wisetrackCredentials },
                  { id: 'wisetrack-console', title: 'Wisetrack (ingesta)', icon: Radio, href: crmRoutes.wisetrack },
                  { id: 'wisetrack-api-tokens', title: 'Tokens API', icon: Radio, href: cat('wisetrack-api-tokens') },
                  { id: 'wisetrack-ingestion-log', title: 'Bitácora ingesta', icon: Radio, href: cat('wisetrack-ingestion-log') },
                  { id: 'wisetrack-rejected-pings', title: 'Pings rechazados', icon: Radio, href: cat('wisetrack-rejected-pings') },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

export function filterCrmMenuTree(items, filterItems, options = {}) {
  const { isOwner = false } = options
  if (!items?.length) return []

  return items
    .map((item) => {
      if (item.ownerOnly && !isOwner) return null
      if (item.children?.length) {
        const children = filterCrmMenuTree(item.children, filterItems, options)
        if (!children.length) return null
        return { ...item, children }
      }
      if (!item.href) return null
      if (item.ownerOnly && !isOwner) return null
      const allowed = filterItems([{ to: item.href, label: item.title, match: item.title }])
      return allowed.length ? item : null
    })
    .filter(Boolean)
}

export function flattenCrmMenuTreeLeaves(menu = buildCrmSidebarMenu()) {
  const leaves = []
  function walk(nodes, sectionKey = 'maintainers') {
    for (const node of nodes || []) {
      if (node.children?.length) walk(node.children, sectionKey)
      else if (node.href) {
        leaves.push({
          to: node.href,
          label: node.title,
          match: node.title,
          apiPath: resolveApiPath(node.href),
          sectionKey,
        })
      }
    }
  }
  for (const section of menu.sections || []) {
    walk(section.items, section.id)
  }
  return leaves
}

export function flattenCrmMenuItems(menu = buildCrmSidebarMenu()) {
  return flattenCrmMenuTreeLeaves(menu).map((leaf) => ({
    to: leaf.to,
    label: leaf.label,
    apiPath: leaf.apiPath,
  }))
}

export const crmSidebarMenuData = buildCrmSidebarMenu()
