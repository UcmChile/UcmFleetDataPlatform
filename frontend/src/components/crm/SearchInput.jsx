import { Icon } from './Icon'

export function SearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Buscar',
  className = '',
  inputClassName = '',
}) {
  const wrapperClass = className.trim()
    ? `relative block w-full ${className}`
    : 'relative block w-full sm:max-w-sm'

  return (
    <label className={wrapperClass}>
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10 ${inputClassName}`.trim()}
      />
    </label>
  )
}
