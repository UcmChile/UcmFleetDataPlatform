import { IconBadge } from './Icon'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { EntityDataSourceHint } from './EntityDataSourceHint'
import { WORKSPACES, WORKSPACE_IDS } from '../../lib/workspaces'
import { cn } from '../../lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  /** Clave fuente BD/SQL; badge + Ver query solo Owner/Administrador. */
  dataSourceKey = '',
  actionLabel,
  actionIcon = 'plus',
  icon,
  onAction,
  actions,
  workspace = WORKSPACE_IDS.PIPELINE,
}) {
  const theme = WORKSPACES[workspace]?.accent || WORKSPACES[WORKSPACE_IDS.PIPELINE].accent
  const breadcrumbPrefix = WORKSPACES[workspace]?.breadcrumbPrefix
  const headerIcon = icon || getHeaderIcon('', `${eyebrow || ''} ${title}`)

  const actionButton = actionLabel ? (
    <button
      type="button"
      onClick={onAction}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 sm:w-auto',
        theme.actionButton,
      )}
    >
      <IconBadge name={actionIcon} className="h-6 w-6 rounded-lg" iconClassName="h-3.5 w-3.5" />
      {actionLabel}
    </button>
  ) : null

  const actionContent = actions || actionButton

  return (
    <div className={cn(
      'relative mb-6 overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-br p-6 shadow-sm backdrop-blur-md sm:p-8',
      theme.pageHeaderGradient,
    )}>
      <div className={cn('pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full blur-3xl', theme.pageHeaderOrbA)} />
      <div className={cn('pointer-events-none absolute -bottom-12 left-8 h-36 w-36 rounded-full blur-3xl', theme.pageHeaderOrbB)} />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {breadcrumbPrefix && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{breadcrumbPrefix}</p>
          )}
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <HeaderLabel label={title} icon={headerIcon} size="lg" />
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          )}
          <EntityDataSourceHint dataSourceKey={dataSourceKey} className="mt-2" />
        </div>
        {actionContent && (
          <div className="flex flex-wrap items-center gap-2">{actionContent}</div>
        )}
      </div>
    </div>
  )
}
