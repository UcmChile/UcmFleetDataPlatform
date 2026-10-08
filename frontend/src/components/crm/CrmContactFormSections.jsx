import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { ContactContractsSection } from './ContactContractsSection'
import { CrmFormModalSection } from './CrmFormModal'
import { CrmSelect } from './CrmSelect'
import { FormField, FormLabel, inputClass } from './FormField'
import {
  CONTACT_FIELD_MAP,
  CONTACT_FORM_SECTIONS,
  getGeneralSectionFields,
  isContactFieldRequired,
  isContactFkField,
} from '../../lib/crmContactMaintainer'
import { formatRut, isValidRut } from '../../utils/rut'

const SECTION_LEFT = 'lg:border-l-0 lg:pl-0 lg:border-t-0 lg:pt-0'
const SECTION_RIGHT = 'lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0'

const SECTION_ICONS = {
  general: 'users',
  direccion: 'map',
  informacion_personal: 'phone',
  base_datos_externa: 'database',
  equifax: 'file',
  fonos_centro_servicios: 'phone',
  informacion_contratos: 'file',
}

function ContactField({
  fieldId,
  values,
  onChange,
  nacionalidad,
  fkOptions,
  selectOptions,
  className = '',
}) {
  const def = CONTACT_FIELD_MAP[fieldId]
  if (!def) return null

  const required = isContactFieldRequired(fieldId, nacionalidad)
  const value = values[fieldId] ?? ''

  if (def.readOnly || def.type === 'readonly') {
    return (
      <FormField label={def.label} className={className}>
        <input
          readOnly
          disabled
          className={`${inputClass} bg-muted/60`}
          value={value !== '' ? String(value) : '—'}
        />
      </FormField>
    )
  }

  if (isContactFkField(fieldId) || def.type === 'select') {
    const options = isContactFkField(fieldId)
      ? (fkOptions[fieldId] || []).map((option) => ({ value: option.id, label: option.name }))
      : def.options || selectOptions[fieldId] || []

    const placeholder = fieldId === 'owner_id'
      ? 'Seleccionar usuario...'
      : fieldId === 'clinica_id'
        ? 'Seleccionar centro asistencial...'
        : `Seleccionar ${def.label.toLowerCase()}...`

    return (
      <FormField label={<FormLabel required={required}>{def.label}</FormLabel>} className={className}>
        <CrmSelect
          value={value || ''}
          onChange={(next) => onChange(fieldId, next === '_none' ? '' : next)}
          options={[{ value: '', label: 'Sin asignar' }, ...options]}
          placeholder={placeholder}
        />
      </FormField>
    )
  }

  return (
    <FormField label={<FormLabel required={required}>{def.label}</FormLabel>} className={className}>
      <input
        type={def.type === 'date' ? 'date' : 'text'}
        className={inputClass}
        placeholder={def.placeholder || ''}
        value={value}
        onChange={(event) => onChange(fieldId, event.target.value)}
        onBlur={fieldId === 'rut'
          ? (event) => {
            const raw = event.target.value
            if (raw && isValidRut(raw)) onChange('rut', formatRut(raw))
          }
          : undefined}
      />
    </FormField>
  )
}

function SectionFields({
  section,
  nacionalidad,
  values,
  onChange,
  fkOptions,
  selectOptions,
}) {
  const fieldIds = section.id === 'general'
    ? getGeneralSectionFields(nacionalidad)
    : (section.fields || [])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fieldIds.map((fieldId) => (
        <ContactField
          key={fieldId}
          fieldId={fieldId}
          values={values}
          onChange={onChange}
          nacionalidad={nacionalidad}
          fkOptions={fkOptions}
          selectOptions={selectOptions}
          className={fieldId === 'detalle_direccion' || fieldId === 'detalle_direccion_equifax' ? 'sm:col-span-2' : ''}
        />
      ))}
    </div>
  )
}

function ModalSectionPair({ left, right, nacionalidad, values, onChange, fkOptions, selectOptions }) {
  if (!left && !right) return null

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
      {left && (
        <CrmFormModalSection
          title={left.title}
          icon={SECTION_ICONS[left.id] || 'file'}
          className={SECTION_LEFT}
        >
          <SectionFields
            section={left}
            nacionalidad={nacionalidad}
            values={values}
            onChange={onChange}
            fkOptions={fkOptions}
            selectOptions={selectOptions}
          />
        </CrmFormModalSection>
      )}
      {right && (
        <CrmFormModalSection
          title={right.title}
          icon={SECTION_ICONS[right.id] || 'file'}
          className={SECTION_RIGHT}
        >
          <SectionFields
            section={right}
            nacionalidad={nacionalidad}
            values={values}
            onChange={onChange}
            fkOptions={fkOptions}
            selectOptions={selectOptions}
          />
        </CrmFormModalSection>
      )}
    </div>
  )
}

function OwnerField({ values, onChange, fkOptions }) {
  const def = CONTACT_FIELD_MAP.owner_id
  const options = (fkOptions.owner_id || []).map((option) => ({
    value: option.id,
    label: option.name,
  }))

  return (
    <FormField label={<FormLabel>{def.label}</FormLabel>}>
      <CrmSelect
        value={values.owner_id || ''}
        onChange={(next) => onChange('owner_id', next)}
        options={[{ value: '', label: 'Sin asignar' }, ...options]}
        placeholder="Seleccionar propietario..."
      />
    </FormField>
  )
}

export function CrmContactFormSections({
  values,
  onChange,
  fkOptions,
  selectOptions,
  contactId,
  isEditing,
  loading = false,
}) {
  const nacionalidad = String(values.nacionalidad || '')

  const fieldSections = useMemo(
    () => CONTACT_FORM_SECTIONS.filter(
      (section) => section.variant !== 'service-phones'
        && section.variant !== 'contract-info'
        && !(section.editOnly && !isEditing),
    ),
    [isEditing],
  )

  const sectionById = useMemo(
    () => Object.fromEntries(fieldSections.map((section) => [section.id, section])),
    [fieldSections],
  )

  const pairs = useMemo(() => {
    const ordered = ['general', 'direccion', 'informacion_personal', 'base_datos_externa', 'equifax']
    const rows = []
    for (let index = 0; index < ordered.length; index += 2) {
      const left = sectionById[ordered[index]]
      const right = sectionById[ordered[index + 1]]
      if (left || right) rows.push({ left, right })
    }
    return rows
  }, [sectionById])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {pairs.map((pair, index) => (
        <ModalSectionPair
          key={`${pair.left?.id || 'left'}-${pair.right?.id || 'right'}-${index}`}
          left={pair.left}
          right={pair.right}
          nacionalidad={nacionalidad}
          values={values}
          onChange={onChange}
          fkOptions={fkOptions}
          selectOptions={selectOptions}
        />
      ))}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <CrmFormModalSection title="Propietario" icon="settings" className={SECTION_LEFT}>
          <OwnerField values={values} onChange={onChange} fkOptions={fkOptions} />
          <p className="text-xs text-muted-foreground">
            Usuario de Dynamics (SystemUserBase) responsable del contacto.
          </p>
        </CrmFormModalSection>
      </div>

      {isEditing && <ContactContractsSection contactId={contactId} />}

      {isEditing && (
        <CrmFormModalSection title="Fonos Centro de servicios" icon="phone">
          <p className="text-sm text-muted-foreground">No se encontro ningun registro de Caso.</p>
        </CrmFormModalSection>
      )}
    </div>
  )
}
