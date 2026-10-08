/** Indicador global de campo obligatorio (punto rojo). Usado via FormLabel / FormField. */
export function RequiredMark({ className = '' }) {
  return (
    <span className={`crm-required-mark group/required inline-flex shrink-0 items-center ${className}`}>
      <span className="crm-required-mark__halo" aria-hidden="true" />
      <span className="crm-required-mark__dot" aria-hidden="true" />
      <span className="sr-only">Campo obligatorio</span>
      <span className="crm-required-mark__tooltip" role="tooltip">
        Obligatorio
      </span>
    </span>
  )
}
