import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { ContractLinesSection } from './ContractLinesSection'
import { ContractObjectionsSection } from './ContractObjectionsSection'
import { ContractCustomerAccountSection, ContractPlaceholderSection } from './ContractPlaceholderSection'
import { CrmFormModalSection } from './CrmFormModal'
import { CrmFormPageGroup, CrmFormPageSection } from './CrmFormPageSection'
import { CrmSelect } from './CrmSelect'
import {
  FormField,
  FormLabel,
  inputClass,
  inputClassXs,
  readonlyClassXs,
} from './FormField'
import {
  CONTRACT_FIELD_MAP,
  CONTRACT_FORM_SECTIONS,
  CONTRACT_PAGE_LAYOUT,
  CONTRACT_READONLY_FIELD_LABELS,
  getCustomerFieldLabel,
  isContractFieldRequired,
  isContractFkField,
} from '../../lib/crmContractMaintainer'
import { cn } from '../../lib/utils'
import { formatDate, formatDateTime } from '../../utils/formatters'

const SECTION_ICONS = {
  encabezado: 'file',
  historial: 'clock',
  venta: 'users',
  estado: 'settings',
  precios: 'coins',
  medio_pago: 'credit-card',
  confirmacion: 'check',
  supervisor: 'users',
  convenio: 'building',
  lineas: 'file',
  objeciones: 'case',
  fecha_finalizacion: 'calendar',
  notas: 'file',
  comprobante_primera_cuota: 'credit-card',
  descuentos: 'coins',
  cuenta_corriente: 'money',
}

const SECTION_LEFT = 'lg:border-l-0 lg:pl-0 lg:border-t-0 lg:pt-0'
const SECTION_RIGHT = 'lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0'

const MODAL_PAIRS = [
  ['encabezado', 'historial'],
  ['venta', 'estado'],
  ['precios', 'medio_pago'],
  ['confirmacion', 'convenio'],
]

function formatConvenioNumeroRol(editing) {
  if (!editing) return '—'
  const parts = [editing.convenio_numero, editing.convenio_rol].filter((part) => part != null && String(part).trim() !== '')
  return parts.length > 0 ? parts.join(' / ') : '—'
}

function resolveReadOnlyValue(fieldId, editing) {
  if (!editing) return '—'
  if (fieldId === 'contract_guid') return editing.contract_crm_guid || editing.id || '—'
  if (fieldId === 'original_created_on') return formatDateTime(editing.original_created_on)
  if (fieldId === 'created_on') return formatDateTime(editing.created_on)
  if (fieldId === 'alta_original_date') return formatDate(editing.alta_original_date) || '—'
  if (fieldId === 'billing_date') return formatDate(editing.billing_date)
  if (fieldId === 'delivery_date') return formatDate(editing.delivery_date)
  if (fieldId === 'status_label') return editing.status_label || '—'
  if (fieldId === 'convenio_numero_rol') return formatConvenioNumeroRol(editing)
  if (fieldId === 'convenio_numero') return editing.convenio_numero || '—'
  if (fieldId === 'fecha_proceso_hites') return formatDate(editing.fecha_proceso_hites) || '—'
  if (['boleta_hites', 'sku_hites', 'cod_linea_hites'].includes(fieldId)) {
    const value = editing[fieldId]
    return value != null && String(value).trim() !== '' ? String(value) : '—'
  }
  return editing[fieldId] || '—'
}

function ContractField({
  fieldId,
  values,
  onChange,
  fkOptions,
  selectOptions,
  labelRow,
  mode,
  editing,
  compact = false,
  layout = 'stacked',
  className = '',
  fieldRules,
}) {
  const def = CONTRACT_FIELD_MAP[fieldId]
  if (!def) return null
  if (def.createOnly && mode === 'edit') return null
  if (def.editOnly && mode === 'create') return null
  if (fieldRules?.hiddenFields?.has?.(fieldId)) return null

  const required = isContractFieldRequired(fieldId, mode) || Boolean(fieldRules?.requiredFields?.has?.(fieldId))
  const locked = Boolean(fieldRules?.lockedFields?.has?.(fieldId))
  const value = values[fieldId] ?? ''
  const label = fieldId === 'customer_id'
    ? getCustomerFieldLabel(values.customer_id_type)
    : def.label
  const inputCls = compact ? inputClassXs : inputClass
  const fieldSize = compact ? 'xs' : 'default'

  if (def.type === 'readonly') {
    return (
      <FormField
        size={fieldSize}
        layout={layout}
        label={layout === 'inline' ? label : <FormLabel>{label}</FormLabel>}
        className={className}
      >
        <p className={compact ? readonlyClassXs : 'min-h-10 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground'}>
          {resolveReadOnlyValue(fieldId, editing)}
        </p>
      </FormField>
    )
  }

  const control = (() => {
    if (isContractFkField(fieldId) || def.type === 'select') {
      const options = isContractFkField(fieldId)
        ? (fkOptions[fieldId] || []).map((option) => ({ value: option.id, label: option.name }))
        : def.options || selectOptions[fieldId] || []

      return (
        <CrmSelect
          value={value || ''}
          onChange={(next) => onChange(fieldId, next === '_none' ? '' : next)}
          options={[{ value: '', label: required ? 'Seleccionar...' : 'Sin asignar' }, ...options]}
          placeholder={false}
          formMode={mode === 'create' ? 'create' : 'edit'}
          size={compact ? 'xs' : 'default'}
          fieldKey={fieldId}
          row={labelRow}
          disabled={locked}
        />
      )
    }

    if (def.type === 'date') {
      return (
        <input
          type="date"
          className={inputCls}
          value={value}
          disabled={locked}
          onChange={(event) => onChange(fieldId, event.target.value)}
        />
      )
    }

    if (def.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30"
          checked={value === '1' || value === 1 || value === true}
          disabled={locked}
          onChange={(event) => onChange(fieldId, event.target.checked ? '1' : '0')}
        />
      )
    }

    return (
      <input
        type="text"
        className={inputCls}
        value={value}
        disabled={locked}
        onChange={(event) => onChange(fieldId, event.target.value)}
      />
    )
  })()

  return (
    <FormField
      size={fieldSize}
      layout={layout}
      label={layout === 'inline' ? label : <FormLabel required={required}>{label}</FormLabel>}
      required={required}
      className={className}
    >
      {control}
    </FormField>
  )
}

function sectionFieldGridClass(columns, compact) {
  const gap = compact ? 'gap-2' : 'gap-3'
  const map = {
    1: `grid grid-cols-1 ${gap}`,
    2: `grid grid-cols-1 sm:grid-cols-2 ${gap}`,
    3: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 ${gap}`,
    4: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ${gap}`,
  }
  return map[columns] || map[1]
}

function SectionFields({
  section,
  values,
  onChange,
  fkOptions,
  selectOptions,
  labelRow,
  mode,
  editing,
  compact = false,
  fieldRules,
}) {
  const fieldLayout = section.fieldLayout === 'inline' ? 'inline' : 'stacked'
  const fieldColumns = Math.min(Math.max(Number(section.fieldColumns) || 1, 1), 4)
  const containerClass = fieldColumns > 1
    ? sectionFieldGridClass(fieldColumns, compact)
    : fieldLayout === 'inline'
      ? 'flex flex-col'
      : compact
        ? 'grid grid-cols-1 gap-2'
        : 'grid grid-cols-1 gap-3'

  return (
    <div className={containerClass}>
      {(section.fields || []).map((fieldId) => (
        <ContractField
          key={fieldId}
          fieldId={fieldId}
          values={values}
          onChange={onChange}
          fkOptions={fkOptions}
          selectOptions={selectOptions}
          labelRow={labelRow}
          mode={mode}
          editing={editing}
          compact={compact}
          layout={fieldLayout}
          fieldRules={fieldRules}
          className={CONTRACT_FIELD_MAP[fieldId]?.fullWidth ? 'sm:col-span-2 xl:col-span-4' : ''}
        />
      ))}
      {mode === 'edit' && (section.readOnlyFields || []).map((fieldId) => (
        <FormField
          key={fieldId}
          size={compact ? 'xs' : 'default'}
          layout={fieldLayout}
          label={CONTRACT_READONLY_FIELD_LABELS[fieldId] || fieldId}
        >
          <p className={compact ? readonlyClassXs : 'min-h-10 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground'}>
            {resolveReadOnlyValue(fieldId, editing)}
          </p>
        </FormField>
      ))}
    </div>
  )
}

function renderSectionContent(props) {
  const { section, mode, editing, compact } = props
  if (!section) return null
  if (section.editOnly && mode !== 'edit') return null

  if (section.variant === 'contract-lines') {
    return editing?.id ? (
      <ContractLinesSection
        contractId={editing.id}
        variant={compact ? 'page' : 'modal'}
        currencySymbol={editing.currency_symbol}
        currencyName={editing.currency_name}
      />
    ) : null
  }

  if (section.variant === 'contract-objections') {
    return editing?.id ? <ContractObjectionsSection variant={compact ? 'page' : 'modal'} /> : null
  }

  if (section.variant === 'contract-notes') {
    return <ContractPlaceholderSection title={section.title} icon="file" variant="notes" />
  }

  if (section.variant === 'placeholder-panel') {
    return (
      <ContractPlaceholderSection
        title={section.title}
        icon={SECTION_ICONS[section.id] || 'file'}
        message={section.placeholderMessage}
      />
    )
  }

  if (section.variant === 'customer-account') {
    if (mode !== 'edit' || !editing?.id) return null
    return (
      <ContractCustomerAccountSection customerName={editing.customer_name} />
    )
  }

  return <SectionFields {...props} compact={compact} />
}

function gridColumnStyle(colSpan) {
  if (!colSpan || colSpan <= 1) return undefined
  return { gridColumn: `span ${Math.min(colSpan, 4)} / span ${Math.min(colSpan, 4)}` }
}

function PageSectionBlock({
  section,
  compact,
  colSpan = 1,
  symmetric = false,
  className = '',
  ...props
}) {
  if (!section) return null
  const content = renderSectionContent({ section, compact, ...props })
  if (!content) return null

  const spanStyle = gridColumnStyle(colSpan)
  const isEncabezado = section.id === 'encabezado'
  const shellClass = symmetric && !isEncabezado
    ? 'flex h-full min-h-[12rem] flex-col'
    : isEncabezado
      ? 'flex flex-col'
      : ''
  const wrapClass = `min-w-0 ${symmetric && !isEncabezado ? 'flex h-full flex-col' : ''} ${className}`.trim()

  if (section.variant === 'contract-lines' || section.variant === 'contract-objections') {
    return (
      <div className={wrapClass} style={spanStyle}>
        <div className={`rounded-2xl border border-border/60 bg-card/50 shadow-sm ${shellClass} ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
          <h3 className={cn(
            'shrink-0 border-b border-border/60 font-bold text-foreground',
            compact ? 'mb-2 pb-1 text-xs' : 'mb-3 pb-1.5 text-xs',
          )}>
            {section.title}
          </h3>
          <div className={symmetric ? 'min-h-0 flex-1 overflow-y-auto' : undefined}>
            {content}
          </div>
        </div>
      </div>
    )
  }

  if (section.variant === 'customer-account') {
    return (
      <div className={wrapClass} style={spanStyle}>
        <div className={`${shellClass} ${symmetric ? 'rounded-2xl border border-border/60 bg-card/50 shadow-sm' : ''}`}>
          {content}
        </div>
      </div>
    )
  }

  if (section.variant === 'contract-notes' || section.variant === 'placeholder-panel') {
    return (
      <div className={wrapClass} style={spanStyle}>
        <div className={`rounded-2xl border border-border/60 bg-card/50 shadow-sm ${shellClass} ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className={wrapClass} style={spanStyle}>
      <CrmFormPageSection
        title={section.title}
        icon={SECTION_ICONS[section.id] || 'file'}
        compact={compact}
        fillHeight={symmetric && !isEncabezado}
        className={symmetric && !isEncabezado ? 'h-full' : ''}
      >
        {content}
      </CrmFormPageSection>
    </div>
  )
}

function ContractPageLayout({ layout, sectionsById, sectionProps }) {
  const compact = sectionProps.compact
  const gridGap = compact ? 'gap-3' : 'gap-4'
  const rowGap = compact ? 'space-y-3' : 'space-y-4'

  return (
    <CrmFormPageGroup title={layout.title} compact={compact}>
      <div className={rowGap}>
        {(layout.rows || []).map((row, rowIndex) => (
          <div
            key={`layout-row-${rowIndex}`}
            className={`grid grid-cols-1 ${gridGap} xl:grid-cols-4 xl:items-stretch`}
          >
            {row.map((cell, cellIndex) => {
              if (!cell?.id) {
                if (!cell?.colSpan) return null
                return (
                  <div
                    key={`spacer-${rowIndex}-${cellIndex}`}
                    className="hidden min-h-[12rem] xl:block"
                    style={gridColumnStyle(cell.colSpan)}
                    aria-hidden="true"
                  />
                )
              }
              return (
                <PageSectionBlock
                  key={cell.id}
                  section={sectionsById[cell.id]}
                  colSpan={cell.colSpan}
                  symmetric
                  {...sectionProps}
                />
              )
            })}
          </div>
        ))}
      </div>
    </CrmFormPageGroup>
  )
}

function ModalSectionPair({ left, right, ...props }) {
  if (!left && !right) return null
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
      {left && (
        <CrmFormModalSection title={left.title} icon={SECTION_ICONS[left.id] || 'file'} className={SECTION_LEFT}>
          <SectionFields section={left} {...props} />
        </CrmFormModalSection>
      )}
      {right && (
        <CrmFormModalSection title={right.title} icon={SECTION_ICONS[right.id] || 'file'} className={SECTION_RIGHT}>
          <SectionFields section={right} {...props} />
        </CrmFormModalSection>
      )}
    </div>
  )
}

export function CrmContractFormSections({
  editing,
  isLoading,
  values,
  onChange,
  fkOptions,
  selectOptions,
  fieldRules,
  variant = 'modal',
}) {
  const sectionsById = useMemo(
    () => Object.fromEntries(CONTRACT_FORM_SECTIONS.map((section) => [section.id, section])),
    [],
  )
  const mode = editing?.id ? 'edit' : 'create'
  const labelRow = editing || {}
  const compact = variant === 'page'

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando contrato...
      </div>
    )
  }

  const sectionProps = {
    mode,
    editing,
    values,
    onChange,
    fkOptions,
    selectOptions,
    fieldRules,
    labelRow,
    compact,
  }

  if (variant === 'page') {
    return (
      <div className="space-y-4 text-xs">
        <ContractPageLayout
          layout={CONTRACT_PAGE_LAYOUT}
          sectionsById={sectionsById}
          sectionProps={sectionProps}
        />
      </div>
    )
  }

  const linesSection = sectionsById.lineas

  return (
    <div className="space-y-5">
      {MODAL_PAIRS.map(([leftId, rightId]) => (
        <ModalSectionPair
          key={`${leftId}-${rightId}`}
          left={sectionsById[leftId]}
          right={sectionsById[rightId]}
          {...sectionProps}
        />
      ))}
      {mode === 'edit' && linesSection && editing?.id && (
        <ContractLinesSection contractId={editing.id} />
      )}
    </div>
  )
}
