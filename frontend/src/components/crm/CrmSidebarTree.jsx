import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getAreaIcon } from '../../lib/area-icons'
import { filterCrmMenuTree } from '../../lib/crmMenuData'
import { cn } from '../../lib/utils'

function branchIsActive(item, pathname) {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) return true
  return Boolean(item.children?.some((child) => branchIsActive(child, pathname)))
}

function CrmTreeBranch({
  item,
  depth,
  collapsed,
  filterItems,
  treeOptions,
  onNavigate,
  workspace,
  homeRoute,
  maintainerAvailableById,
  maintainerGroupStats,
  showCrudIndicators,
}) {
  const location = useLocation()
  const hasChildren = Boolean(item.children?.length)
  const active = branchIsActive(item, location.pathname)
  const [open, setOpen] = useState(active || depth < 1)
  const Icon = item.icon || getAreaIcon(item.title)

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  if (hasChildren) {
    const visibleChildren = filterCrmMenuTree(item.children, filterItems, treeOptions)
    if (!visibleChildren.length) return null
    const groupStats = maintainerGroupStats?.get(item.id)
    const groupBadgeText = groupStats ? `${groupStats.available}/${groupStats.total}` : null

    if (collapsed) {
      return visibleChildren.map((child) => (
        <CrmTreeBranch
          key={child.id}
          item={child}
          depth={depth}
          collapsed={collapsed}
          filterItems={filterItems}
          treeOptions={treeOptions}
          onNavigate={onNavigate}
          workspace={workspace}
          homeRoute={homeRoute}
          maintainerAvailableById={maintainerAvailableById}
          maintainerGroupStats={maintainerGroupStats}
          showCrudIndicators={showCrudIndicators}
        />
      ))
    }

    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold transition',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1', workspace.accent.iconWrap)}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          {showCrudIndicators && groupBadgeText ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground" title={`CRUD disponibles: ${groupStats?.available}/${groupStats?.total}`}>
              {groupBadgeText}
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')} />
        </button>
        {open ? (
          <div className="ml-3 space-y-1 border-l border-sidebar-border/70 pl-2">
            {visibleChildren.map((child) => (
              <CrmTreeBranch
                key={child.id}
                item={child}
                depth={depth + 1}
                collapsed={collapsed}
                filterItems={filterItems}
                treeOptions={treeOptions}
                onNavigate={onNavigate}
                workspace={workspace}
                homeRoute={homeRoute}
                maintainerAvailableById={maintainerAvailableById}
                maintainerGroupStats={maintainerGroupStats}
                showCrudIndicators={showCrudIndicators}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (!item.href) return null
  const allowed = filterItems([{ to: item.href, label: item.title, match: item.title }])
  if (!allowed.length) return null

  const LeafIcon = Icon
  const leafAvailable = maintainerAvailableById?.get(item.id)
  return (
    <NavLink
      to={item.href}
      end={item.href === homeRoute}
      onClick={onNavigate}
      title={collapsed ? item.title : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center rounded-xl py-2 text-sm font-semibold transition',
          collapsed ? 'justify-center px-2' : 'gap-2 px-2',
          depth > 0 && !collapsed && 'pl-3',
          isActive
            ? cn('bg-gradient-to-r text-foreground shadow-sm', workspace.accent.linkActive)
            : cn('text-muted-foreground hover:text-foreground bg-gradient-to-r', workspace.accent.linkHover),
        )
      }
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1', workspace.accent.iconWrap)}>
        <LeafIcon className="h-4 w-4" />
      </span>
      {!collapsed && <span className="truncate">{item.title}</span>}
      {!collapsed && showCrudIndicators && leafAvailable !== undefined ? (
        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${leafAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
          {leafAvailable ? '✓' : '×'}
        </span>
      ) : null}
    </NavLink>
  )
}

export function CrmSidebarTree({
  menu,
  collapsed,
  filterItems,
  treeOptions = {},
  onNavigate,
  workspace,
  homeRoute,
  maintainerSnapshot = null,
  showCrudIndicators = false,
}) {
  const sections = menu?.sections || []
  const maintainerAvailableById = maintainerSnapshot?.availableById
  const maintainerGroupStats = maintainerSnapshot?.groupStatsById

  return (
    <>
      {sections.map((section) => {
        const visibleItems = filterCrmMenuTree(section.items, filterItems, treeOptions)
        if (!visibleItems.length) return null

        return (
          <section key={section.id}>
            {!collapsed && section.title ? (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <CrmTreeBranch
                  key={item.id}
                  item={item}
                  depth={0}
                  collapsed={collapsed}
                  filterItems={filterItems}
                  treeOptions={treeOptions}
                  onNavigate={onNavigate}
                  workspace={workspace}
                  homeRoute={homeRoute}
                  maintainerAvailableById={maintainerAvailableById}
                  maintainerGroupStats={maintainerGroupStats}
                  showCrudIndicators={showCrudIndicators}
                />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
