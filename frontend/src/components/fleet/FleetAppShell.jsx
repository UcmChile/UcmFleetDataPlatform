import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { FLEET_MENU } from '../../lib/fleetMenuData'
import { fleetRoutes } from '../../lib/routes'
import { useThemeProvider } from '../../utils/ThemeContext'
import { cn } from '../../lib/utils'

export function FleetAppShell({ session, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { currentTheme, changeCurrentTheme } = useThemeProvider()

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <NavLink to={fleetRoutes.home} className="block" onClick={() => setMobileOpen(false)}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600">UCM</p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Fleet Data Platform</h1>
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {FLEET_MENU.map((section) => (
          <div key={section.id} className="mb-5">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <ul className="space-y-1">
              {(section.children || []).map((child) => (
                <li key={child.id}>
                  <NavLink
                    to={child.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
                      )
                    }
                  >
                    {child.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {session?.user?.nombre || session?.user?.username}
        </p>
        <p className="truncate text-xs text-slate-500">{session?.user?.email}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => changeCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium dark:border-slate-700"
          >
            {currentTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            Tema
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="Cerrar" />
          <div className="relative z-50 h-full w-72 shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="font-semibold text-slate-900 dark:text-white">UCM Fleet</span>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
