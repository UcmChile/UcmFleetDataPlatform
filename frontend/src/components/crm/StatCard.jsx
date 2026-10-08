import { IconBadge } from './Icon'

export function StatCard({ label, value, hint, icon, tone = 'gray' }) {
  const tones = {
    gray: 'text-slate-700 dark:text-slate-200',
    sky: 'text-sky-700 dark:text-sky-300',
    green: 'text-emerald-700 dark:text-emerald-300',
    yellow: 'text-amber-700 dark:text-amber-300',
    red: 'text-rose-700 dark:text-rose-300',
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <IconBadge name={icon} className={`h-11 w-11 ${tones[tone]}`} iconClassName="h-5 w-5" />
      </div>
      {hint && <p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  )
}
