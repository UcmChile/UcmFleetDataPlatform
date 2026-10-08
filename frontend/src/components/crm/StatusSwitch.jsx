const activeValues = new Set(['si', 'true', '1', 'activa', 'activo', 'sí'])
const inactiveValues = new Set(['no', 'false', '0', 'inactiva', 'inactivo'])

export function isSwitchStatus(value) {
  const normalized = normalizeStatus(value)
  return activeValues.has(normalized) || inactiveValues.has(normalized)
}

export function StatusSwitch({ value }) {
  const active = activeValues.has(normalizeStatus(value))
  const label = switchLabel(value, active)

  return (
    <span className="inline-flex items-center gap-2.5 align-middle" title={String(value || '')} aria-label={label}>
      <span
        className={`relative inline-flex h-[26px] w-[44px] shrink-0 rounded-full ${
          active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        role="img"
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28),0_0_0_0.5px_rgba(0,0,0,0.04)] ${
            active ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </span>
  )
}

export function StatusSwitchControl({
  checked,
  onChange,
  onLabel = 'Activo',
  offLabel = 'Inactivo',
  disabled = false,
  showStatusText = true,
}) {
  const statusText = checked ? onLabel : offLabel

  return (
    <div className="inline-flex h-[26px] shrink-0 items-center gap-2 leading-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${fieldLabel(onLabel, offLabel)}: ${statusText}`}
        title={statusText}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative top-0 inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
      {showStatusText && (
        <span className="text-xs font-medium leading-none text-muted-foreground">{statusText}</span>
      )}
    </div>
  )
}

function switchLabel(value, active) {
  const normalized = normalizeStatus(value)
  if (normalized === 'activa') return 'Activa'
  if (normalized === 'activo') return 'Activo'
  if (normalized === 'inactiva') return 'Inactiva'
  if (normalized === 'inactivo') return 'Inactivo'
  return active ? 'Si' : 'No'
}

function fieldLabel(onLabel, offLabel) {
  return `${onLabel} o ${offLabel}`
}

function normalizeStatus(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
