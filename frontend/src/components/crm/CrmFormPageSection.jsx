import { HeaderLabel } from './HeaderLabel'
import { cn } from '../../lib/utils'

export function CrmFormPageSection({ title, icon, children, className = '', compact = false, fillHeight = false }) {
  return (
    <section className={cn(
      'min-w-0 rounded-2xl border border-border/60 bg-card/50 shadow-sm',
      compact ? 'p-2.5' : 'p-3 sm:p-4',
      fillHeight ? 'flex h-full min-h-[12rem] flex-col' : '',
      className,
    )}>
      <h3 className={cn(
        'shrink-0 border-b border-border/60 font-bold text-foreground',
        compact ? 'mb-2 pb-1 text-xs' : 'mb-3 pb-1.5 text-xs',
      )}>
        <HeaderLabel label={title} icon={icon} />
      </h3>
      <div className={fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : undefined}>
        {children}
      </div>
    </section>
  )
}

export function CrmFormPageGroup({ title, children, defaultOpen = true, compact = false }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border/70 bg-card/40 shadow-sm">
      <summary className={cn(
        'flex cursor-pointer list-none items-center gap-2 border-b border-border/50 font-bold text-foreground marker:content-none',
        compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-xs sm:px-4',
      )}>
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-muted text-xs transition group-open:rotate-90">
          ›
        </span>
        {title}
      </summary>
      <div className={compact ? 'p-2.5' : 'p-3 sm:p-4'}>{children}</div>
    </details>
  )
}
