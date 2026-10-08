import { Children, isValidElement } from 'react'
import { RequiredMark } from './RequiredMark'
import { StatusSwitchControl } from './StatusSwitch'

/** Unica configuracion visual para campos booleanos / estado. */
export const formSwitchFieldClassName =
  'inline-flex w-fit max-w-full items-center gap-3 rounded-full border border-border/70 bg-card px-4 py-2 shadow-sm'

function inferRequiredFromChildren(children, explicitRequired) {
  if (explicitRequired === true) return true
  if (explicitRequired === false) return false

  let found = false

  const visit = (node) => {
    if (found || !isValidElement(node)) return
    if (node.props?.required) {
      found = true
      return
    }
    if (node.props?.children) {
      Children.forEach(node.props.children, visit)
    }
  }

  Children.forEach(children, visit)
  return found
}

export function FormLabel({ children, required, className = '', hint }) {
  const isRequired = inferRequiredFromChildren(children, required)

  return (
    <span className={`inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="min-w-0">{children}</span>
      {isRequired && <RequiredMark />}
      {hint && <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/80">{hint}</span>}
    </span>
  )
}

export function FormSwitchField({
  label,
  checked,
  onChange,
  onLabel = 'Activo',
  offLabel = 'Inactivo',
  required,
  hint,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`${formSwitchFieldClassName} ${className}`.trim()}>
      <FormLabel
        required={required}
        className="mb-0 shrink-0 whitespace-nowrap text-xs font-bold uppercase leading-none tracking-wide text-muted-foreground"
        hint={hint}
      >
        {label}
      </FormLabel>
      <StatusSwitchControl
        checked={checked}
        onChange={onChange}
        onLabel={onLabel}
        offLabel={offLabel}
        disabled={disabled}
      />
    </div>
  )
}

export function FormField({ label, children, required, hint, className = '', size = 'default', layout = 'stacked' }) {
  const isRequired = inferRequiredFromChildren(children, required)
  const isCompact = size === 'xxs' || size === 'xs'
  const compactTextClass = size === 'xxs' ? 'text-xxs' : 'text-xs'
  const labelClass = isCompact
    ? `mb-0.5 block ${compactTextClass} font-bold uppercase tracking-wide text-muted-foreground`
    : 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground'
  const inlineLabelClass = isCompact
    ? `mb-0 ${compactTextClass} font-semibold normal-case tracking-normal text-muted-foreground`
    : 'mb-0 text-xs font-semibold normal-case tracking-normal text-muted-foreground'

  if (layout === 'inline') {
    const inlineRowClass = isCompact
      ? 'grid grid-cols-1 items-start gap-y-0.5 border-b border-border/40 py-1 last:border-b-0 min-[360px]:grid-cols-[minmax(5.75rem,46%)_minmax(0,1fr)] min-[360px]:items-center min-[360px]:gap-x-2 min-[360px]:gap-y-0'
      : 'grid grid-cols-1 items-center gap-x-3 gap-y-1 border-b border-border/40 py-1.5 last:border-b-0 sm:grid-cols-[minmax(8.5rem,38%)_minmax(0,1fr)]'

    return (
      <div className={`${inlineRowClass} ${className}`.trim()}>
        <FormLabel required={isRequired} className={inlineLabelClass} hint={hint}>
          {label}
        </FormLabel>
        <div className="min-w-0">{children}</div>
      </div>
    )
  }

  return (
    <div className={`block ${className}`}>
      <FormLabel required={isRequired} className={labelClass} hint={hint}>
        {label}
      </FormLabel>
      {children}
    </div>
  )
}

export const inputClass =
  'h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

export const inputClassXxs =
  'h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xxs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

export const inputClassXs =
  'h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

export const selectClass = inputClass
export const selectClassXxs = inputClassXxs
export const selectClassXs = inputClassXs

export const readonlyClassXxs =
  'min-h-8 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xxs font-semibold text-foreground'

export const readonlyClassXs =
  'min-h-8 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs font-semibold text-foreground'
