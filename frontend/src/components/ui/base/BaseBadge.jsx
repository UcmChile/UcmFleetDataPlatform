import { cn } from './utils'

const BADGE_STYLES = {
  info: 'border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  success: 'border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  neutral: 'border border-slate-500/25 bg-slate-500/15 text-slate-700 dark:text-slate-300',
}

export function BaseBadge({ tone = 'info', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
        BADGE_STYLES[tone] ?? BADGE_STYLES.info,
        className,
      )}
      {...props}
    />
  )
}
