import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { AccountContractsSection } from './AccountContractsSection'
import { CrmFormModalSection } from './CrmFormModal'
import { CrmSelect } from './CrmSelect'
import { FormField, FormLabel, inputClass } from './FormField'
import {
  ACCOUNT_FIELD_MAP,
  ACCOUNT_FORM_SECTIONS,
  isAccountFieldRequired,
  isAccountFkField,
} from '../../lib/crmCuentaEmpresaMaintainer'
import { formatRut, isValidRut } from '../../utils/rut'

const SECTION_LEFT = 'lg:border-l-0 lg:pl-0 lg:border-t-0 lg:pt-0'
const SECTION_RIGHT = 'lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0'

const SECTION_ICONS = {
  informacion_cuenta: 'building',
  representantes: 'users',
  direccion: 'map',
  datos_comerciales: 'phone',
  datos_operaciones: 'settings',
  ejecutivo_ucm: 'users',
}

const RUT_FIELDS = new Set(['rut_empresa', 'rut_representante_legal1', 'rut_representante_legal2'])

function AccountField({
  fieldId,
  values,
  onChange,
  fkOptions,
  selectOptions,
  labelRow,
  className = '',
}) {
  const def = ACCOUNT_FIELD_MAP[fieldId]
  if (!def) return null

  const required = isAccountFieldRequired(fieldId)
  const value = values[fieldId] ?? ''

  if (isAccountFkField(fieldId) || def.type === 'select') {
    const options = isAccountFkField(fieldId)
      ? (fkOptions[fieldId] || []).map((option) => ({ value: option.id, label: option.name }))
      : def.options || selectOptions[fieldId] || []

    const placeholder = fieldId === 'owner_id'
      ? 'Seleccionar propietario...'
      : fieldId === 'ejecutivo_ucm_id'
        ? 'Seleccionar ejecutivo UCM...'
        : fieldId === 'supervisor_ucm_id'
          ? 'Seleccionar supervisor UCM...'
          : `Seleccionar ${def.label.toLowerCase()}...`

    return (
      <FormField label={<FormLabel required={required}>{def.label}</FormLabel>} className={className}>
        <CrmSelect
          value={value || ''}
          onChange={(next) => onChange(fieldId, next === '_none' ? '' : next)}
          options={[{ value: '', label: required ? 'Seleccionar...' : 'Sin asignar' }, ...options]}
          placeholder={placeholder}
          fieldKey={fieldId}
          row={labelRow}
        />
      </FormField>
    )
  }

  return (
    <FormField label={<FormLabel required={required}>{def.label}</FormLabel>} className={className}>
      <input
        type="text"
        className={inputClass}
        placeholder={def.placeholder || ''}
        value={value}
        onChange={(event) => onChange(fieldId, event.target.value)}
        onBlur={RUT_FIELDS.has(fieldId)
          ? (event) => {
            const raw = event.target.value
            if (raw && isValidRut(raw)) onChange(fieldId, formatRut(raw))
          }
          : undefined}
      />
    </FormField>
  )
}

function SectionFields({ section, values, onChange, fkOptions, selectOptions, labelRow }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(section.fields || []).map((fieldId) => (
        <AccountField
          key={fieldId}
          fieldId={fieldId}
          values={values}
          onChange={onChange}
          fkOptions={fkOptions}
          selectOptions={selectOptions}
          labelRow={labelRow}
          className={fieldId === 'detalle_direccion' ? 'sm:col-span-2' : ''}
        />
      ))}
    </div>
  )
}

function ModalSectionPair({ left, right, values, onChange, fkOptions, selectOptions, labelRow }) {
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
            values={values}
            onChange={onChange}
            fkOptions={fkOptions}
            selectOptions={selectOptions}
            labelRow={labelRow}
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
            values={values}
            onChange={onChange}
            fkOptions={fkOptions}
            selectOptions={selectOptions}
            labelRow={labelRow}
          />
        </CrmFormModalSection>
      )}
    </div>
  )
}

function OwnerField({ values, onChange, fkOptions, labelRow }) {
  const def = ACCOUNT_FIELD_MAP.owner_id
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
        fieldKey="owner_id"
        row={labelRow}
      />
    </FormField>
  )
}

export function CrmCuentaEmpresaFormSections({
  values,
  onChange,
  fkOptions,
  selectOptions,
  accountId,
  isEditing,
  loading = false,
  labelRow = null,
}) {
  const fieldSections = useMemo(
    () => ACCOUNT_FORM_SECTIONS.filter(
      (section) => section.variant !== 'payer-contracts' && !(section.editOnly && !isEditing),
    ),
    [isEditing],
  )

  const sectionById = useMemo(
    () => Object.fromEntries(fieldSections.map((section) => [section.id, section])),
    [fieldSections],
  )

  const pairs = useMemo(() => {
    const ordered = [
      'informacion_cuenta',
      'representantes',
      'direccion',
      'datos_comerciales',
      'datos_operaciones',
      'ejecutivo_ucm',
    ]
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
          values={values}
          onChange={onChange}
          fkOptions={fkOptions}
          selectOptions={selectOptions}
          labelRow={labelRow}
        />
      ))}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <CrmFormModalSection title="Propietario" icon="settings" className={SECTION_LEFT}>
          <OwnerField
            values={values}
            onChange={onChange}
            fkOptions={fkOptions}
            labelRow={labelRow}
          />
          <p className="text-xs text-muted-foreground">
            Usuario de Dynamics (SystemUserBase) responsable de la cuenta.
          </p>
        </CrmFormModalSection>
      </div>

      {isEditing && <AccountContractsSection accountId={accountId} />}
    </div>
  )
}
