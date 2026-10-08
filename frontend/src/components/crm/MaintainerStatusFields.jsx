import { FormField, FormSwitchField, inputClass } from './FormField'
import { StatusBadge } from './StatusBadge'

/**
 * Indicador de estado y controles de activación en modales de mantenedores CRM.
 */
export function MaintainerStatusFields({
  isDisabled,
  mode = 'create',
  onActiveChange,
  disabledReason = '',
  onDisabledReasonChange,
  allowEditStatus = false,
  showReasonOnInactive = false,
}) {
  const isActive = !isDisabled
  const statusLabel = isActive ? 'Activo' : 'Inactivo'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estado actual</span>
        <StatusBadge value={statusLabel} />
        {mode === 'create' && (
          <span className="text-xs text-muted-foreground">Los registros nuevos se crean activos.</span>
        )}
      </div>

      {allowEditStatus && mode === 'edit' && (
        <FormSwitchField
          label="Activo"
          checked={isActive}
          onChange={(active) => onActiveChange?.(!active)}
        />
      )}

      {(showReasonOnInactive || (allowEditStatus && isDisabled)) && isDisabled && (
        <FormField label="Motivo de desactivación" required hint="Obligatorio al inactivar">
          <input
            className={inputClass}
            value={disabledReason}
            onChange={(event) => onDisabledReasonChange?.(event.target.value)}
            placeholder="Describe por qué se desactiva este registro"
            required
          />
        </FormField>
      )}
    </div>
  )
}
