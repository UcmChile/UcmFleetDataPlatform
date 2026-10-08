import {
  History,
  CircleCheck,
  CircleMinus,
  Download,
  Fingerprint,
  KeyRound,
  Settings,
  SquarePen,
  TableProperties,
  Trash2,
  UserPlus,
} from 'lucide-react'

/** Iconos semanticos: mas claros que el set anterior. */
const icons = {
  edit: SquarePen,
  pencil: SquarePen,
  history: History,
  log: History,
  matrix: TableProperties,
  '2fa': Fingerprint,
  shield: Fingerprint,
  activate: CircleCheck,
  power: CircleCheck,
  deactivate: CircleMinus,
  powerOff: CircleMinus,
  delete: Trash2,
  trash: Trash2,
  download: Download,
  settings: Settings,
  userPlus: UserPlus,
  key: KeyRound,
}

const iconColors = {
  slate: 'text-slate-600 dark:text-slate-300',
  sky: 'text-sky-600 dark:text-sky-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-700 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
}

/** Barra compacta estilo macOS (solo iconos, una sola fila). */
export function ActionToolbar({ children, className = '' }) {
  return (
    <div
      className={`inline-flex w-max max-w-none flex-nowrap items-center gap-0.5 rounded-xl border border-black/[0.06] bg-white/90 p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/90 ${className}`}
      onClick={(event) => event.stopPropagation()}
      role="toolbar"
      aria-label="Acciones"
    >
      {children}
    </div>
  )
}

export function ActionToolbarDivider() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-black/10 dark:bg-white/12" aria-hidden />
}

export function ActionIconButton({
  icon,
  label,
  tone = 'slate',
  onClick,
  disabled = false,
  className = '',
}) {
  const IconComponent = icons[icon] || Settings
  const iconClass = iconColors[tone] || iconColors.slate

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors duration-150 hover:bg-black/[0.06] focus:outline-none focus-visible:bg-black/[0.08] focus-visible:ring-2 focus-visible:ring-sky-400/35 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.08] dark:focus-visible:bg-white/[0.1] ${className}`}
    >
      <IconComponent className={`h-[18px] w-[18px] ${iconClass}`} strokeWidth={2.25} aria-hidden />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-[90] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-gray-950">
        {label}
      </span>
    </button>
  )
}
