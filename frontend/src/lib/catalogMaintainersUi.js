import { FLEET_FORM_FIELDS, READ_ONLY_SLUGS } from './fleetMenuData'
import { mergeRecordIntoFkOptions } from './selectOptions'

function toExtraFields(slug) {
  return (FLEET_FORM_FIELDS[slug] || []).filter((f) => !f.columnOnly).map((f) => ({
    field: f.field,
    label: f.label,
    type: f.type === 'number' ? 'number' : f.type === 'bit' ? 'boolean' : 'text',
    required: Boolean(f.required),
  }))
}

function buildFleetCatalogUi() {
  const out = {}
  for (const slug of Object.keys(FLEET_FORM_FIELDS)) {
    out[slug] = {
      hideName: true,
      readOnly: READ_ONLY_SLUGS.has(slug),
      extraFields: toExtraFields(slug),
      fkFields: [],
      fkLabelMappings: [],
    }
  }
  return out
}

export const CATALOG_UI_BY_SLUG = buildFleetCatalogUi()

export function getCatalogUiDef(slug) {
  return CATALOG_UI_BY_SLUG[slug] || null
}

export function buildCatalogEmptyForm(slug) {
  const def = getCatalogUiDef(slug)
  const form = { name: '', is_disabled: false }
  if (!def) return form
  for (const field of def.extraFields || []) {
    form[field.field] = field.type === 'boolean' ? true : ''
  }
  for (const field of def.fkFields || []) form[field.field] = ''
  return form
}

export function mapCatalogRowToForm(row = {}, slug) {
  const form = buildCatalogEmptyForm(slug)
  for (const key of Object.keys(form)) {
    if (row[key] == null || row[key] === '') continue
    if (typeof form[key] === 'boolean') {
      form[key] = Boolean(row[key])
    } else {
      form[key] = String(row[key])
    }
  }
  form.is_disabled = Boolean(row.is_disabled)
  if (row.name) form.name = String(row.name)
  return form
}

export function buildCatalogPayload(form, slug) {
  const def = getCatalogUiDef(slug)
  const payload = {}
  if (!def?.hideName) {
    payload.name = String(form.name || '').trim()
  }
  if (!def) return payload

  for (const field of def.extraFields || []) {
    const value = form[field.field]
    if (field.type === 'boolean') {
      payload[field.field] = Boolean(value)
      continue
    }
    if (value === '' || value == null) {
      payload[field.field] = null
    } else if (field.type === 'number') {
      const num = Number(value)
      payload[field.field] = Number.isFinite(num) ? num : null
    } else {
      payload[field.field] = String(value).trim()
    }
  }
  for (const field of def.fkFields || []) {
    const raw = form[field.field]
    if (raw === '' || raw == null) {
      payload[field.field] = null
      continue
    }
    if (field.valueAsNumber) {
      const num = Number(raw)
      payload[field.field] = Number.isFinite(num) ? num : null
    } else {
      payload[field.field] = String(raw).trim()
    }
  }
  return payload
}

export function validateCatalogForm(form, slug) {
  const def = getCatalogUiDef(slug)
  if (!def?.hideName && !String(form?.name || '').trim()) {
    return 'El nombre es obligatorio.'
  }
  for (const field of def?.extraFields || []) {
    if (!field.required) continue
    if (field.type === 'boolean') continue
    if (!String(form[field.field] ?? '').trim()) {
      return `${field.label} es requerido.`
    }
  }
  for (const field of def?.fkFields || []) {
    if (!field.required) continue
    if (!String(form[field.field] || '').trim()) {
      return `${field.label} es requerido.`
    }
  }
  return null
}

export function mergeCatalogFkOptions(current, row, slug) {
  const def = getCatalogUiDef(slug)
  if (!def?.fkLabelMappings?.length) return current
  return mergeRecordIntoFkOptions(current, row, def.fkLabelMappings)
}
