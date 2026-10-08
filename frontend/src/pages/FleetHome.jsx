import { NavLink } from 'react-router-dom'
import { FLEET_MENU } from '../lib/fleetMenuData'
import { PageHeader } from '../components/crm/PageHeader'
import { WORKSPACE_IDS } from '../lib/workspaces'

export default function FleetHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        workspace={WORKSPACE_IDS.FLEET}
        title="UCM Fleet Data Platform"
        description="Mantenedores del modelo de flota, kilometraje GPS y preparación de ingesta Wisetrack."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FLEET_MENU.map((section) => (
          <section
            key={section.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              {section.label}
            </h2>
            <ul className="mt-3 space-y-1.5">
              {(section.children || []).map((child) => (
                <li key={child.id}>
                  <NavLink
                    to={child.to}
                    className="text-sm font-medium text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-300"
                  >
                    {child.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
