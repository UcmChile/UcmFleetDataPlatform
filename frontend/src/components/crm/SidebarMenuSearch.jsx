import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import { filterMenuSearchResults } from '../../lib/sidebarMenuSearch'
import { cn } from '../../lib/utils'

export function SidebarMenuSearch({
  items = [],
  collapsed = false,
  placeholder = 'Buscar en el menu...',
  onNavigate,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const results = useMemo(
    () => filterMenuSearchResults(items, query).slice(0, 12),
    [items, query],
  )

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  if (collapsed) {
    return (
      <div className={cn('px-3 pb-2', className)} title={placeholder}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40 text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative px-3 pb-3', className)}>
      <label className="relative block">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-9 w-full rounded-xl border border-sidebar-border bg-sidebar-accent/40 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
      </label>

      {open && query.trim() ? (
        <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-xl crm-scrollbar">
          {results.length ? results.map((item) => (
            <NavLink
              key={item.id}
              to={item.href}
              onClick={() => {
                setQuery('')
                setOpen(false)
                onNavigate?.()
              }}
              className="block px-3 py-2 text-sm transition hover:bg-accent"
            >
              <p className="font-semibold text-foreground">{item.title}</p>
              {item.breadcrumb?.length > 1 ? (
                <p className="truncate text-xs text-muted-foreground">
                  {item.breadcrumb.slice(0, -1).join(' › ')}
                </p>
              ) : null}
            </NavLink>
          )) : (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin coincidencias</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
