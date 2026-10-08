import { useMemo } from 'react'
import { selectClass, selectClassXxs, selectClassXs } from './FormField'
import { cn } from '../../lib/utils'
import {
  findOptionByValue,
  resolveOptionId,
  resolveOptionLabel,
  resolveSelectDisplayLabel,
  sortSelectOptions,
} from '../../lib/selectOptions'

/** Texto estandar para la primera opcion vacia en formularios de creacion. */
export function buildSelectPlaceholder(label) {
  const text = String(label || '').trim().toLowerCase()
  if (!text) return 'Seleccione una opcion'
  return `Seleccione ${text}`
}

/**
 * Select CRM con placeholder en creacion y sin valor preseleccionado.
 * @param {'create'|'edit'} formMode
 */
export function CrmSelect({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  size = 'default',
  formMode = 'edit',
  label = '',
  placeholder,
  emptyLabel = 'Sin opciones disponibles',
  options = [],
  optionValue,
  optionLabel,
  sortOptions = true,
  title,
  currentLabel,
  fieldKey = '',
  row = null,
  children,
}) {
  const normalizedValue = value === null || value === undefined ? '' : value
  const sortedOptions = useMemo(
    () => (sortOptions ? sortSelectOptions(options, { optionLabel }) : options),
    [options, optionLabel, sortOptions],
  )
  const hasOptions = sortedOptions.length > 0
  const selectedOption = findOptionByValue(sortedOptions, normalizedValue, optionValue)
  const selectedExists = Boolean(selectedOption)
  const resolvedDisplayLabel = resolveSelectDisplayLabel({
    value: normalizedValue,
    options: sortedOptions,
    optionValue,
    optionLabel,
    currentLabel,
    row,
    fieldKey,
  })
  const resolvedTitle = title ?? (selectedOption
    ? resolveOptionLabel(selectedOption, optionLabel)
    : resolvedDisplayLabel)
  const placeholderText = placeholder ?? buildSelectPlaceholder(label)
  const showEmptyOption = hasOptions && (formMode === 'create' || !normalizedValue) && placeholder !== false
  const baseSelectClass = size === 'xxs'
    ? selectClassXxs
    : size === 'xs'
      ? selectClassXs
      : selectClass

  return (
    <select
      className={cn(baseSelectClass, className)}
      value={normalizedValue || ''}
      title={resolvedTitle}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      disabled={disabled}
    >
      {!hasOptions && <option value="">{emptyLabel}</option>}
      {showEmptyOption && <option value="">{placeholderText}</option>}
      {normalizedValue && !selectedExists && (
        <option value={normalizedValue}>{resolvedDisplayLabel}</option>
      )}
      {sortedOptions.map((option) => {
        const resolved = resolveOptionId(option, optionValue)
        return (
          <option key={String(resolved)} value={resolved}>
            {resolveOptionLabel(option, optionLabel)}
          </option>
        )
      })}
      {children}
    </select>
  )
}
