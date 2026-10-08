import { chileRegions, getCommunesByRegion, isCommuneInRegion, resolveCommuneName, resolveRegionName } from '../../data/chileLocations'
import { sortSelectOptions, SELECT_LABEL_COLLATOR } from '../../lib/selectOptions'
import { selectClass } from './FormField'

const sortedRegions = sortSelectOptions(chileRegions, { optionLabel: (region) => region.name })

export function RegionSelect({ value, onChange, required = false }) {
  const resolvedValue = resolveRegionName(value)
  const hasCustomValue = resolvedValue && !chileRegions.some((region) => region.name === resolvedValue)

  return (
    <select className={selectClass} value={resolvedValue} onChange={(event) => onChange(event.target.value)} required={required}>
      <option value="">Seleccione region</option>
      {sortedRegions.map((region) => (
        <option key={region.code} value={region.name}>
          {region.name}
        </option>
      ))}
      {hasCustomValue && <option value={resolvedValue}>{resolvedValue}</option>}
    </select>
  )
}

export function CommuneSelect({ region, value, onChange, required = false }) {
  const communes = getCommunesByRegion(region)
  const sortedCommunes = [...communes].sort((left, right) => SELECT_LABEL_COLLATOR.compare(left, right))
  const resolvedValue = resolveCommuneName(region, value)
  const hasCustomValue = resolvedValue && !isCommuneInRegion(region, resolvedValue)

  return (
    <select
      className={selectClass}
      value={resolvedValue}
      onChange={(event) => onChange(event.target.value)}
      disabled={!communes.length}
      required={required}
    >
      <option value="">{communes.length ? 'Seleccione comuna' : 'Seleccione region primero'}</option>
      {sortedCommunes.map((commune) => (
        <option key={commune} value={commune}>
          {commune}
        </option>
      ))}
      {hasCustomValue && <option value={resolvedValue}>{resolvedValue}</option>}
    </select>
  )
}
