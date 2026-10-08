import { FormSwitchField } from './FormField'

/**
 * Control On/Off para incluir registros inactivos en grillas de mantenedores.
 * Off (default) = solo activos.
 */
export function MaintainerActiveFilter({
  showInactive,
  onChange,
  label = 'Mostrar inactivos',
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <FormSwitchField
        label={label}
        checked={Boolean(showInactive)}
        onChange={onChange}
        onLabel="On"
        offLabel="Off"
      />
      <span className="text-xs text-muted-foreground">
        {showInactive
          ? 'Incluye registros inactivos o cancelados.'
          : 'Solo registros activos (carga mas rapida).'}
      </span>
    </div>
  )
}
