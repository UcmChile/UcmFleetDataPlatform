import { StatusSwitch, isSwitchStatus } from './StatusSwitch'

const toneByStatus = {
  Activa: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  Activo: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  Vigente: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  Ganada: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  Alta: 'bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  Perdida: 'bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  Inactiva: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300',
  Inactivo: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300',
  Media: 'bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  Baja: 'bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300',
  'En proceso': 'bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300',
  'En espera': 'bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  Resuelto: 'bg-violet-500/15 text-violet-700 ring-violet-500/25 dark:text-violet-300',
  Cancelado: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300',
  Si: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  No: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300',
  true: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  false: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300',
}

export function StatusBadge({ value, asSwitch, tones }) {
  if (asSwitch !== false && isSwitchStatus(value)) {
    return <StatusSwitch value={value} />
  }

  const tone = (tones && tones[value]) || toneByStatus[value] || 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:text-slate-300'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>
      {value || 'Sin estado'}
    </span>
  )
}
