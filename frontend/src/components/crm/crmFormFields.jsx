import { useMemo, useState } from 'react'
import { CrmSelect } from './CrmSelect'
import { CrmDatePicker } from './CrmDatePicker'
import { FormField, FormSwitchField, inputClass } from './FormField'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { Icon } from './Icon'
import { CommuneSelect, RegionSelect } from './LocationSelects'
import { RutInput } from './RutInput'
import { StatusSwitchControl } from './StatusSwitch'
import { isCommuneInRegion } from '../../data/chileLocations'
import {
  resolveOptionId,
  resolveOptionLabel,
  resolveRowSelectLabel,
  sortSelectOptions,
} from '../../lib/selectOptions'

function resolveSectionSurfaceClass(section) {
  if (section.variant === 'reference') {
    return 'border-slate-200/90 bg-[#f5f5f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/10 dark:bg-[#2c2c2e]/55 dark:shadow-none'
  }
  if (section.variant === 'muted') {
    return 'border-border/60 bg-muted/25'
  }
  return 'border-border/60 bg-card/40'
}

function resolveSectionHeaderBorderClass(section, collapsed) {
  if (collapsed) return 'mb-0'
  if (section.variant === 'reference') {
    return 'mb-4 border-b border-slate-200/80 pb-2 dark:border-white/10'
  }
  return 'mb-4 border-b border-border/50 pb-2'
}

export function CrmFieldGrid({ fields, form, setForm, row, lookups, className = 'grid min-w-0 gap-4 md:grid-cols-2', formMode = 'edit', columnDivider = false }) {
  if (!columnDivider) {
    return (
      <div className={className}>
        {fields.map((field) => (
          <EditField key={field.key} field={field} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
        ))}
      </div>
    )
  }

  const blocks = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field.wide || field.colSpan === 'full') {
      blocks.push({ type: 'full', field })
      continue
    }

    const next = fields[index + 1]
    if (next && !next.wide && next.colSpan !== 'full') {
      blocks.push({ type: 'split', left: field, right: next })
      index += 1
      continue
    }

    blocks.push({ type: 'split', left: field, right: null })
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === 'full') {
          return (
            <EditField
              key={block.field.key}
              field={block.field}
              form={form}
              row={row}
              setForm={setForm}
              lookups={lookups}
              formMode={formMode}
            />
          )
        }

        return (
          <div
            key={`${block.left.key}-${block.right?.key || 'single'}`}
            className="grid gap-y-4 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:gap-x-5"
          >
            <div className="min-w-0">
              <EditField field={block.left} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
            </div>
            <div className="hidden self-stretch bg-border/70 md:block" aria-hidden="true" />
            <div className="min-w-0">
              {block.right ? (
                <EditField field={block.right} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SectionedEditFields({ fields, sections, form, row, setForm, lookups, formMode = 'edit', layout = 'columns' }) {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]))
  const sectionFieldKeys = useMemo(() => {
    const keys = new Set()
    for (const section of sections || []) {
      for (const item of section.fields || []) {
        keys.add(typeof item === 'string' ? item : item.key)
      }
    }
    return keys
  }, [sections])
  const [collapsedSections, setCollapsedSections] = useState(() =>
    Object.fromEntries(
      (sections || [])
        .filter((section) => section.collapsible)
        .map((section) => [section.title, section.defaultCollapsed !== false]),
    ),
  )

  function toggleSection(title) {
    setCollapsedSections((current) => ({ ...current, [title]: !current[title] }))
  }

  function isSectionCollapsed(section) {
    return Boolean(section.collapsible && collapsedSections[section.title])
  }

  function renderSectionHeader(section) {
    const collapsed = isSectionCollapsed(section)

    return (
      <div
        className={`flex items-center justify-between gap-3 ${resolveSectionHeaderBorderClass(section, collapsed)}`}
      >
        <h3 className={`min-w-0 text-sm font-semibold ${section.variant === 'reference' ? 'text-slate-700 dark:text-slate-200' : 'text-foreground'}`}>
          <HeaderLabel label={section.title} icon={section.icon || getHeaderIcon('', section.title)} />
        </h3>
        {section.collapsible ? (
          <button
            type="button"
            data-form-nav-ignore
            onClick={() => toggleSection(section.title)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-600 transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expandir ${section.title}` : `Contraer ${section.title}`}
          >
            <Icon name={collapsed ? 'plus' : 'minus'} className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    )
  }

  function renderSectionFields(sectionFields = []) {
    return (sectionFields || []).map((item) => {
      const key = typeof item === 'string' ? item : item.key
      const field = fieldsByKey.get(key)
      if (!field) return null
      return <EditField key={field.key} field={field} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
    })
  }

  if (layout === 'stack') {
    return (
      <>
        <div className="space-y-5">
          {sections.map((section) => {
            const collapsed = isSectionCollapsed(section)

            return (
            <section
              key={section.title}
              className={`rounded-2xl border ${
                collapsed ? 'p-3 sm:p-4' : 'p-4 sm:p-5'
              } ${resolveSectionSurfaceClass(section)}`}
            >
              {renderSectionHeader(section)}
              {!collapsed ? (
                <div className={section.gridClassName || 'grid min-w-0 gap-4 md:grid-cols-2'}>
                  {renderSectionFields(section.fields)}
                </div>
              ) : null}
            </section>
            )
          })}
        </div>

        {fields.some((field) => !sectionFieldKeys.has(field.key)) && (
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
            {fields.filter((field) => !sectionFieldKeys.has(field.key)).map((field) => (
              <EditField key={field.key} field={field} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className={`grid gap-3 md:grid-cols-2 ${sections.length >= 4 ? 'xl:grid-cols-[1.1fr_1.1fr_1fr_minmax(140px,0.55fr)]' : 'xl:grid-cols-3'}`}>
        {sections.map((section) => (
          <section key={section.title} className="flex min-w-0 flex-col space-y-2.5 border-t border-border pt-3 first:border-t-0 first:pt-0 xl:border-l xl:border-t-0 xl:pl-4 xl:first:border-l-0 xl:first:pl-0">
            <h3 className="text-sm font-semibold text-foreground">
              <HeaderLabel label={section.title} icon={section.icon || getHeaderIcon('', section.title)} />
            </h3>
            <div className="space-y-2.5">
              {renderSectionFields(section.fields)}
            </div>
          </section>
        ))}
      </div>

      {fields.some((field) => !sectionFieldKeys.has(field.key)) && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {fields.filter((field) => !sectionFieldKeys.has(field.key)).map((field) => (
            <EditField key={field.key} field={field} form={form} row={row} setForm={setForm} lookups={lookups} formMode={formMode} />
          ))}
        </div>
      )}
    </>
  )
}

export function EditField({ field, form, row, setForm, lookups, formMode = 'edit' }) {
  if (field.type === 'bit') {
    const checked = toBoolean(form[field.key] ?? row?.[field.key] ?? false)

    return (
      <FormSwitchField
        label={field.label}
        checked={checked}
        onLabel={field.onLabel || 'Si'}
        offLabel={field.offLabel || 'No'}
        onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
        required={field.required}
        hint={field.hint}
        className={resolveFieldSpanClass(field)}
      />
    )
  }

  if (field.type === 'boolean') {
    const checked = toBoolean(form[field.key] ?? row?.[field.key] ?? '')
    const onToggle = (next) => {
      const stored = next ? (field.onLabel || 'Si') : (field.offLabel || 'No')
      setForm((current) => updateEditorForm(current, field, stored, lookups))
    }

    return (
      <FormSwitchField
        label={field.label}
        checked={checked}
        onLabel={field.onLabel || 'Si'}
        offLabel={field.offLabel || 'No'}
        onChange={onToggle}
        required={field.required}
        hint={field.hint}
        className={resolveFieldSpanClass(field)}
      />
    )
  }

  const spanClass = resolveFieldSpanClass(field)

  if (field.type === 'select') {
    const rawOptions = resolveFieldOptions(field, form, lookups)
    const binaryStatus = getBinaryStatusOptions(rawOptions)
    if (binaryStatus) {
      const currentValue = form[field.key] ?? row?.[field.key] ?? ''
      return (
        <FormSwitchField
          label={field.label}
          checked={(currentValue || binaryStatus.on) === binaryStatus.on}
          onLabel={binaryStatus.on}
          offLabel={binaryStatus.off}
          onChange={(checked) => setForm((current) => updateEditorForm(current, field, checked ? binaryStatus.on : binaryStatus.off, lookups))}
          required={field.required}
          hint={field.hint}
          className={resolveFieldSpanClass(field)}
        />
      )
    }
  }

  return (
    <div className={spanClass}>
      <FormField label={field.label} required={field.required}>
        <EditorControl
          field={{
            ...field,
            readOnly: field.readOnly || (field.readOnlyOnEdit && formMode === 'edit'),
          }}
          form={form}
          row={row}
          lookups={lookups}
          formMode={formMode}
          value={form[field.key] ?? ''}
          onChange={(value) => setForm((current) => updateEditorForm(current, field, value, lookups))}
        />
      </FormField>
    </div>
  )
}

export function EditorControl({ field, form, row, lookups, formMode = 'edit', value, onChange }) {
  if (field.render) {
    return field.render({ field, form, row, lookups, value, onChange })
  }

  if (field.type === 'rut') {
    const duplicateMessage = field.getDuplicateMessage
      ? field.getDuplicateMessage({ field, form, row, lookups, value })
      : null

    return <RutInput value={value} onChange={onChange} required={field.required} duplicateMessage={duplicateMessage} />
  }

  if (field.type === 'region') {
    return <RegionSelect value={value} onChange={onChange} required={field.required} />
  }

  if (field.type === 'comuna') {
    return <CommuneSelect region={form?.[field.regionKey || 'region']} value={value} onChange={onChange} required={field.required} />
  }

  if (field.type === 'boolean') {
    return (
      <StatusSwitchControl
        checked={toBoolean(value)}
        onLabel={field.onLabel || 'Si'}
        offLabel={field.offLabel || 'No'}
        onChange={(next) => onChange(next ? (field.onLabel || 'Si') : (field.offLabel || 'No'))}
      />
    )
  }

  if (field.type === 'select') {
    const rawOptions = resolveFieldOptions(field, form, lookups)
    const binaryStatus = getBinaryStatusOptions(rawOptions)
    if (binaryStatus) {
      return (
        <StatusSwitchControl
          checked={(value || binaryStatus.on) === binaryStatus.on}
          onLabel={binaryStatus.on}
          offLabel={binaryStatus.off}
          onChange={(checked) => onChange(checked ? binaryStatus.on : binaryStatus.off)}
        />
      )
    }

    return (
      <CrmSelect
        className={field.inputClassName || ''}
        value={value}
        onChange={onChange}
        required={field.required}
        disabled={field.disabled}
        formMode={field.formMode || formMode}
        label={field.label}
        placeholder={field.placeholder}
        emptyLabel={field.emptyLabel || 'Sin opciones disponibles'}
        options={rawOptions}
        optionValue={(option) => optionValue(option, field)}
        optionLabel={(option) => optionLabel(option, field)}
        currentLabel={field.currentLabel ?? resolveRowSelectLabel(row, field.key)}
        fieldKey={field.key}
        row={row}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        data-form-focus={field.initialFocus ? 'initial' : field.key === 'titulo' ? 'initial' : undefined}
        className={`${inputClass} ${field.compact ? 'h-16 min-h-16 resize-none' : 'min-h-20 resize-y'} py-2`}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        readOnly={field.readOnly}
        placeholder={field.placeholder}
      />
    )
  }

  if (field.type === 'date') {
    return (
      <CrmDatePicker
        value={value || ''}
        onChange={onChange}
        placeholder={field.placeholder || `Seleccione ${String(field.label || 'fecha').toLowerCase()}`}
        required={field.required}
        disabled={field.readOnly || field.disabled}
        allowClear={!field.required}
      />
    )
  }

  return (
    <input
      data-form-focus={field.initialFocus ? 'initial' : field.key === 'titulo' ? 'initial' : undefined}
      className={inputClass}
      type={field.type || 'text'}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
      readOnly={field.readOnly}
      placeholder={field.placeholder}
    />
  )
}

export function resolveFieldOptions(field, form, lookups) {
  let resolved = []
  if (typeof field.options !== 'function') {
    resolved = field.options || []
  } else {
    const contextual = field.options({ form, lookups })
    if (Array.isArray(contextual)) {
      resolved = contextual
    } else {
      resolved = field.options(form) || []
    }
  }

  if (field.sortOptions === false) return resolved
  return sortSelectOptions(resolved, { optionLabel: (option) => optionLabel(option, field) })
}

export function optionValue(option, field) {
  if (field?.optionValue) return field.optionValue(option)
  return resolveOptionId(option)
}

export function optionLabel(option, field) {
  if (field?.optionLabel) return field.optionLabel(option)
  return resolveOptionLabel(option)
}

export function getBinaryStatusOptions(options = []) {
  const values = options.map((option) => String(option))
  if (values.length !== 2) return null
  if (values.includes('Activa') && values.includes('Inactiva')) return { on: 'Activa', off: 'Inactiva' }
  if (values.includes('Activo') && values.includes('Inactivo')) return { on: 'Activo', off: 'Inactivo' }
  return null
}

export function toBoolean(value) {
  return value === true || value === 1 || ['true', '1', 'si', 'sí', 'activo', 'activa', 'vigente'].includes(String(value).toLowerCase())
}

export function updateEditorForm(current, field, value, lookups) {
  if (field.onChange) {
    if (field.onChange.length >= 3) return field.onChange(current, value, { lookups })
    return field.onChange(current, value)
  }

  if (field.type === 'region') {
    const comunaKey = field.comunaKey || 'comuna'
    return {
      ...current,
      [field.key]: value,
      [comunaKey]: isCommuneInRegion(value, current[comunaKey]) ? current[comunaKey] : '',
    }
  }

  return { ...current, [field.key]: value }
}

export function resolveFieldSpanClass(field) {
  if (field.type === 'bit' || field.type === 'boolean') {
    return 'w-fit min-w-0'
  }
  if (field.wide || field.colSpan === 'full') return 'min-w-0 col-span-full w-full'
  if (field.colSpan === 2) return 'min-w-0 col-span-full sm:col-span-2'
  if (field.colSpan === 3) return 'min-w-0 col-span-full sm:col-span-2 xl:col-span-3'
  return 'min-w-0'
}

export function isPersistedField(field) {
  return field.persist !== false && !field.readOnly && !field.render
}

export function normalizeFieldValue(value, type) {
  if (type === 'boolean' || type === 'bit') return toBoolean(value)
  if (value === undefined || value === null) return ''
  if (type === 'date') return String(value).slice(0, 10)
  return value
}
