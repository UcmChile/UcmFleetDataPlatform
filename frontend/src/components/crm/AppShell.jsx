import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useNotifications } from './Notifications'
import { getAreaIcon } from '../../lib/area-icons'
import { cn } from '../../lib/utils'
import { CrmFormModal, CrmFormModalFooter } from './CrmFormModal'
import { FormField, inputClass } from './FormField'
import { apiRequest } from '../../services/api'
import { updateUserProfile } from '../../features/auth/authApi'
import { useThemeProvider } from '../../utils/ThemeContext'
import { menuSections } from '../../lib/navigationConfig'
import { crmSidebarMenu } from '../../lib/crmNavigationConfig'
import { filterCrmMenuTree } from '../../lib/crmMenuData'
import { buildMaintainersSnapshot } from '../../lib/mantenedoresMap'
import { flattenCrmMenuForSearch, flattenPipelineMenuForSearch } from '../../lib/sidebarMenuSearch'
import { useDevUiSettings } from '../../lib/devUiSettings'
import { CrmSidebarTree } from './CrmSidebarTree'
import { SidebarMenuSearch } from './SidebarMenuSearch'
import { crmRoutes, pipelineRoutes } from '../../lib/routes'
import { detectWorkspaceFromPath, WORKSPACES, WORKSPACE_IDS } from '../../lib/workspaces'
import { MenuPermissionsProvider, useMenuPermissions } from '../../hooks/useMenuPermissions'
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess'
import { SidebarBrandLogo } from './SidebarBrandLogo'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { HeaderWorkspaceSwitcher } from './HeaderWorkspaceSwitcher'

const WIDTH_EXPANDED = 300
const WIDTH_COLLAPSED = 80

export function AppShell({ session, onLogout, onUpdateUser }) {
  const location = useLocation()
  const workspaceId = detectWorkspaceFromPath(location.pathname) || WORKSPACE_IDS.PIPELINE
  const workspace = WORKSPACES[workspaceId]
  const { settings: devUiSettings } = useDevUiSettings()
  const inactivityTimer = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarWidth = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED

  useEffect(() => {
    document.documentElement.dataset.workspace = workspaceId
    return () => {
      delete document.documentElement.dataset.workspace
    }
  }, [workspaceId])

  useEffect(() => {
    function handleSidebarRequest(event) {
      if (typeof event.detail?.collapsed === 'boolean') setCollapsed(event.detail.collapsed)
      if (event.detail?.closeMobile !== false) setMobileOpen(false)
    }

    window.addEventListener('crm:sidebar-request', handleSidebarRequest)
    return () => window.removeEventListener('crm:sidebar-request', handleSidebarRequest)
  }, [])

  useEffect(() => {
    if (!session?.token || workspaceId !== WORKSPACE_IDS.CRM) return undefined

    const timeoutMs = Math.max(1, devUiSettings.inactivityTimeoutMinutes) * 60 * 1000
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        window.localStorage.setItem('session_expired_reason', 'inactivity')
        onLogout?.()
      }, timeoutMs)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [devUiSettings.inactivityTimeoutMinutes, onLogout, session?.token, workspaceId])

  const shell = (
    <SidebarContent
      collapsed={collapsed}
      onCollapse={() => setCollapsed((value) => !value)}
      onCloseMobile={() => setMobileOpen(false)}
      workspaceId={workspaceId}
      workspace={workspace}
    />
  )

  return (
    <MenuPermissionsProvider>
    <div className="min-h-svh bg-background text-foreground">
      <button
        type="button"
        className="fixed left-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-gray-700 shadow-lg backdrop-blur md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className={cn('fixed inset-0 z-50 bg-gray-950/45 backdrop-blur-sm md:hidden', mobileOpen ? 'block' : 'hidden')} onClick={() => setMobileOpen(false)} />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {shell}
      </aside>

      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-[width] duration-200 ease-out md:flex"
        style={{ width: sidebarWidth }}
      >
        {shell}
      </aside>

      <div className="flex min-h-svh flex-col transition-[padding] duration-200 ease-out md:pl-[var(--sidebar-width)]" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
        <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between border-b border-border bg-card/85 px-3 py-2 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="ml-12 min-w-0 md:ml-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', workspace.accent.headerBadge)}>
                {workspace.breadcrumbPrefix}
              </span>
              <p className="truncate text-sm font-semibold text-muted-foreground">{workspace.label}</p>
            </div>
            <p className="hidden text-xs text-muted-foreground/70 sm:block">{workspace.description}</p>
          </div>
          <HeaderWorkspaceSwitcher currentWorkspaceId={workspaceId} />
          <HeaderUserMenu session={session} onLogout={onLogout} onUpdateUser={onUpdateUser} workspace={workspace} />
        </header>
        <main className="flex-1 overflow-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
    </MenuPermissionsProvider>
  )
}

function SidebarContent({ collapsed, onCollapse, onCloseMobile, workspaceId, workspace }) {
  const { filterItems, isSystemAdmin: isOwner } = useMenuPermissions(true)
  const access = useWorkspaceAccess()
  const { settings: devUiSettings } = useDevUiSettings()
  const treeOptions = useMemo(() => ({ isOwner }), [isOwner])
  const maintainerSnapshot = useMemo(() => (
    workspaceId === WORKSPACE_IDS.CRM ? buildMaintainersSnapshot(crmSidebarMenu) : null
  ), [workspaceId])
  const showCrudIndicators = import.meta.env.DEV && isOwner && devUiSettings.showCrudIndicators

  const pipelineSections = menuSections.map((section) => ({
    ...section,
    items: filterItems(section.items),
  })).filter((section) => section.items.length > 0)

  const sidebarSearchItems = useMemo(() => {
    if (workspaceId === WORKSPACE_IDS.CRM) {
      return flattenCrmMenuForSearch(crmSidebarMenu, filterItems, treeOptions)
    }
    return flattenPipelineMenuForSearch(pipelineSections)
  }, [filterItems, pipelineSections, treeOptions, workspaceId])

  const activeSections = workspaceId === WORKSPACE_IDS.CRM ? null : pipelineSections
  const crmTreeVisible = workspaceId === WORKSPACE_IDS.CRM
    ? crmSidebarMenu.sections.some((section) => filterCrmMenuTree(section.items, filterItems, treeOptions).length > 0)
    : false

  return (
    <>
      <div className="p-3">
        <div
          className={cn(
            'rounded-2xl bg-gradient-to-r shadow-lg ring-1 ring-black/10',
            workspace.accent.sidebarGradient,
            workspace.accent.sidebarShadow,
            collapsed ? 'p-2' : 'p-3',
          )}
        >
          <div className={cn('flex flex-col gap-2.5', collapsed && 'items-center')}>
            <div
              className={cn(
                'flex w-full gap-2',
                collapsed ? 'flex-col items-center' : 'flex-row items-center justify-between',
              )}
            >
              <SidebarBrandLogo collapsed={collapsed} />
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition hover:bg-accent hover:text-accent-foreground',
                  collapsed
                    ? 'rounded-full border-white/25 bg-white text-indigo-900 shadow-sm md:inline-flex'
                    : 'hidden border-border bg-card md:inline-flex',
                )}
                onClick={onCollapse}
                aria-label={collapsed ? 'Expandir menu' : 'Contraer menu'}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-accent md:hidden"
                onClick={onCloseMobile}
                aria-label="Cerrar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!collapsed && (
              <p className="px-0.5 text-sm font-bold leading-snug text-pretty text-white/95">{workspace.label}</p>
            )}
          </div>
        </div>

        {access.hasMultiple && (
          <div className="mt-3">
            <WorkspaceSwitcher currentWorkspaceId={workspaceId} collapsed={collapsed} />
          </div>
        )}
      </div>

      <SidebarMenuSearch
        items={sidebarSearchItems}
        collapsed={collapsed}
        placeholder={workspaceId === WORKSPACE_IDS.CRM ? 'Buscar menu CRM...' : 'Buscar menu...'}
        onNavigate={onCloseMobile}
      />

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        {!crmTreeVisible && workspaceId === WORKSPACE_IDS.CRM ? (
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white/85">
            <p className="font-semibold text-white">Sin modulos visibles</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              Tu rol no tiene permisos de lectura para Organizacion o Seguridad en el CRM operativo. Solicita acceso en la matriz de roles.
            </p>
          </div>
        ) : null}
        {workspaceId === WORKSPACE_IDS.CRM ? (
          <CrmSidebarTree
            menu={crmSidebarMenu}
            collapsed={collapsed}
            filterItems={filterItems}
            treeOptions={treeOptions}
            onNavigate={onCloseMobile}
            workspace={workspace}
            homeRoute={crmRoutes.home}
            maintainerSnapshot={maintainerSnapshot}
            showCrudIndicators={showCrudIndicators}
          />
        ) : (
          activeSections.map((section) => (
            <SidebarSection key={section.key} title={section.title} collapsed={collapsed}>
              {section.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onClick={onCloseMobile}
                  workspace={workspace}
                  homeRoute={pipelineRoutes.home}
                />
              ))}
            </SidebarSection>
          ))
        )}
      </nav>
    </>
  )
}

function HeaderUserMenu({ session, onLogout, onUpdateUser, workspace }) {
  const { currentTheme, changeCurrentTheme } = useThemeProvider()
  const notify = useNotifications()
  const menuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [profileForm, setProfileForm] = useState({ nombre: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const user = session?.user || { nombre: 'Usuario', roles: [] }
  const roleText = formatUserRoles(user)
  const initials = getInitials(user.nombre)

  useEffect(() => {
    if (!menuOpen) return undefined
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  const toggleTheme = () => changeCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')

  function openProfileModal() {
    setMenuOpen(false)
    setProfileForm({
      nombre: user.nombre || '',
      email: user.email || '',
    })
    setProfileOpen(true)
  }

  function openPasswordModal() {
    setMenuOpen(false)
    setPasswordForm({ current: '', next: '', confirm: '' })
    setPasswordOpen(true)
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    if (user.demo) {
      notify.warning('Modo demo', 'El usuario demo no permite editar datos personales.')
      return
    }

    const nombre = profileForm.nombre.trim()
    const email = profileForm.email.trim()

    if (!nombre || !email) {
      notify.warning('Datos incompletos', 'Nombre y email son obligatorios.')
      return
    }

    try {
      setProfileSubmitting(true)
      const result = await updateUserProfile({ nombre, email })
      const updatedUser = { ...user, ...result.data }
      onUpdateUser?.(updatedUser)
      setProfileOpen(false)
      notify.success('Datos actualizados', 'Tus datos personales quedaron guardados.')
    } catch (error) {
      notify.error('No se pudieron guardar los datos', error.message)
    } finally {
      setProfileSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()

    if (user.demo) {
      notify.warning('Modo demo', 'El usuario demo no permite cambiar contrasena.')
      return
    }

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      notify.warning('Datos incompletos', 'Ingresa la contrasena actual, la nueva contrasena y su confirmacion.')
      return
    }

    if (passwordForm.next.length < 6) {
      notify.warning('Contrasena muy corta', 'La nueva contrasena debe tener al menos 6 caracteres.')
      return
    }

    if (passwordForm.next !== passwordForm.confirm) {
      notify.warning('Confirmacion distinta', 'La nueva contrasena y la confirmacion no coinciden.')
      return
    }

    try {
      setPasswordSubmitting(true)
      await apiRequest('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.next,
        }),
      })
      setPasswordForm({ current: '', next: '', confirm: '' })
      setPasswordOpen(false)
      notify.success('Contrasena actualizada', 'Tu nueva contrasena quedo guardada correctamente.')
    } catch (error) {
      notify.error('No se pudo cambiar la contrasena', error.message)
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {user.demo && (
        <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 sm:inline-flex">Modo demo</span>
      )}
      <span className={cn('hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] lg:inline-flex', workspace.accent.headerBadge)}>
        {workspace.shortLabel}
      </span>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/90 text-muted-foreground shadow-sm ring-1 ring-white/70 transition hover:bg-accent hover:text-foreground dark:ring-white/10"
        aria-label={currentTheme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
        title={currentTheme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
      >
        {currentTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background/90 px-2.5 py-2 text-left shadow-sm ring-1 ring-white/70 transition hover:bg-accent dark:ring-white/10 sm:min-w-64 sm:px-3"
        aria-expanded={menuOpen}
        aria-label="Abrir opciones de usuario"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:from-indigo-950 dark:to-cyan-950 dark:text-indigo-200 dark:ring-indigo-900">
          {initials}
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-medium text-foreground">{user.nombre}</span>
          <span className="block truncate text-xs text-muted-foreground">{roleText}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', menuOpen && 'rotate-180')} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-[min(92vw,340px)] rounded-2xl border border-border bg-card p-3 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-white/70 backdrop-blur dark:ring-white/10">
          <div className="mb-2 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-gray-900 dark:text-indigo-200 dark:ring-indigo-900">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email || 'Sin email'}</p>
              </div>
            </div>
          </div>

          <MenuAction icon={UserRound} label="Mis datos personales" onClick={openProfileModal} />
          <MenuAction icon={KeyRound} label="Cambiar contrasena" onClick={openPasswordModal} />
          <MenuAction icon={LogOut} label="Salir del sistema" danger onClick={onLogout} />
        </div>
      )}

      <ProfileDialog
        open={profileOpen}
        form={profileForm}
        roles={roleText}
        submitting={profileSubmitting}
        onChange={setProfileForm}
        onClose={() => setProfileOpen(false)}
        onSubmit={handleProfileSubmit}
      />

      <PasswordDialog
        open={passwordOpen}
        form={passwordForm}
        submitting={passwordSubmitting}
        onChange={setPasswordForm}
        onClose={() => setPasswordOpen(false)}
        onSubmit={handlePasswordSubmit}
      />
    </div>
  )
}

function MenuAction({ icon: ActionIcon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mt-1 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-normal transition',
        danger
          ? 'border border-rose-200 bg-rose-50 font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
          : 'text-foreground hover:bg-accent',
      )}
    >
      <ActionIcon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  )
}

function ProfileDialog({ open, form, roles, submitting, onChange, onClose, onSubmit }) {
  return (
    <CrmFormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      eyebrow="Cuenta"
      title="Mis datos personales"
      titleIcon="user"
      size="account"
      stack="nested"
      hint="Actualiza tu nombre y correo de acceso."
      headerActions={(
        <CrmFormModalFooter
          placement="header"
          onClose={onClose}
          submitLabel={submitting ? 'Guardando...' : 'Guardar cambios'}
          submitDisabled={submitting}
        />
      )}
    >
      <div className="grid gap-4">
        <FormField label="Nombre" required>
          <input
            type="text"
            value={form.nombre}
            onChange={(event) => onChange((current) => ({ ...current, nombre: event.target.value }))}
            className={inputClass}
            required
          />
        </FormField>
        <FormField label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange((current) => ({ ...current, email: event.target.value }))}
            className={inputClass}
            required
          />
        </FormField>
        <div className="rounded-xl border border-input bg-muted/20 px-3 py-2.5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Roles</p>
          <p className="text-sm text-foreground">{roles}</p>
        </div>
      </div>
    </CrmFormModal>
  )
}

function PasswordDialog({ open, form, submitting, onChange, onClose, onSubmit }) {
  return (
    <CrmFormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      eyebrow="Seguridad"
      title="Cambiar contrasena"
      titleIcon="shield"
      size="account"
      stack="nested"
      hint="Ingresa tu contrasena actual y define una nueva contrasena segura."
      headerActions={(
        <CrmFormModalFooter
          placement="header"
          onClose={onClose}
          submitLabel={submitting ? 'Guardando...' : 'Guardar contrasena'}
          submitDisabled={submitting}
        />
      )}
    >
      <div className="grid gap-4">
        <FormField label="Contrasena actual" required>
          <input
            type="password"
            value={form.current}
            onChange={(event) => onChange((current) => ({ ...current, current: event.target.value }))}
            className={inputClass}
            required
            autoComplete="current-password"
          />
        </FormField>
        <FormField label="Nueva contrasena" required>
          <input
            type="password"
            value={form.next}
            onChange={(event) => onChange((current) => ({ ...current, next: event.target.value }))}
            className={inputClass}
            required
            autoComplete="new-password"
          />
        </FormField>
        <FormField label="Confirmar nueva contrasena" required>
          <input
            type="password"
            value={form.confirm}
            onChange={(event) => onChange((current) => ({ ...current, confirm: event.target.value }))}
            className={inputClass}
            required
            autoComplete="new-password"
          />
        </FormField>
      </div>
    </CrmFormModal>
  )
}

function formatUserRoles(user) {
  const pipeline = normalizeRoles(user?.roles)
  const crm = Array.isArray(user?.crm_roles)
    ? user.crm_roles.map((role) => role?.role_name || role).filter(Boolean)
    : []
  const merged = [...new Set([...pipeline, ...crm])]
  if (merged.length) return merged.join(', ')
  if (user?.crm_profile) return user.crm_profile
  if (user?.is_owner) return 'Owner'
  return 'Sin rol'
}

function normalizeRoles(roles) {
  if (Array.isArray(roles)) return roles
  return String(roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean)
}

function getInitials(name) {
  return String(name || 'Usuario')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('')
}

function SidebarSection({ title, collapsed, children }) {
  return (
    <section>
      {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{title}</p>}
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function SidebarLink({ item, collapsed, onClick, workspace, homeRoute }) {
  const ItemIcon = getAreaIcon(item.match)

  return (
    <NavLink
      to={item.to}
      end={item.to === homeRoute}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-11 items-center rounded-xl py-2.5 text-sm font-semibold transition',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive
            ? cn('bg-gradient-to-r text-foreground shadow-sm', workspace.accent.linkActive)
            : cn('text-muted-foreground hover:text-foreground bg-gradient-to-r', workspace.accent.linkHover),
        )
      }
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1', workspace.accent.iconWrap)}>
        <ItemIcon className="h-4.5 w-4.5" />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}
