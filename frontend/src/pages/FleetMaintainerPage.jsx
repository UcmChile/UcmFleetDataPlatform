import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '../components/crm/PageHeader'
import { FormField, inputClass } from '../components/crm/FormField'
import { CrmFormModal, CrmFormModalFooter } from '../components/crm/CrmFormModal'
import { useNotifications } from '../components/crm/Notifications'
import { ServerPagination } from '../components/crm/ServerPagination'
import { SearchInput } from '../components/crm/SearchInput'
import {
  FLEET_FORM_FIELDS,
  READ_ONLY_SLUGS,
  findMenuItemByPath,
  flattenFleetMenu,
} from '../lib/fleetMenuData'
import { fleetRoutes } from '../lib/routes'
import { WORKSPACE_IDS } from '../lib/workspaces'
import { apiRequest } from '../services/api'

function emptyFromFields(fields) {
  const form = {}
  for (const field of fields) {
    form[field.field] = field.type === 'bit' ? true : ''
  }
  return form
}

export default function FleetMaintainerPage() {
  const { slug } = useParams()
  const { notify } = useNotifications()
  const menuItem = useMemo(
    () => findMenuItemByPath(fleetRoutes.mantenedor(slug)) || flattenFleetMenu().find((i) => i.id === slug),
    [slug],
  )
  const apiPath = menuItem?.apiPath || `/${slug}`
  const title = menuItem?.label || slug
  const fields = FLEET_FORM_FIELDS[slug] || []
  const formFields = useMemo(() => fields.filter((field) => !field.columnOnly), [fields])
  const readOnly = READ_ONLY_SLUGS.has(slug)

  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => emptyFromFields(formFields))
  const [saving, setSaving] = useState(false)
  const pageSize = 25

  const refresh = useCallback(async (targetPage = 1, targetQuery = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
        q: targetQuery || '',
        sortBy: 'id',
        sortDir: 'desc',
      })
      const result = await apiRequest(`${apiPath}?${params}`)
      setRows(result.data || [])
      setTotal(result.total || 0)
      setPage(result.page || targetPage)
    } catch (error) {
      notify({ type: 'error', title: 'Error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [apiPath, notify, pageSize])

  useEffect(() => {
    setQuery('')
    setForm(emptyFromFields(formFields))
    refresh(1, '')
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo(() => {
    const keys = fields.length
      ? ['id', ...fields.slice(0, 6).map((f) => f.field)]
      : rows[0]
        ? Object.keys(rows[0]).slice(0, 8)
        : ['id']
    return [...new Set(keys)]
  }, [fields, rows])

  function openCreate() {
    setEditing(null)
    setForm(emptyFromFields(formFields))
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    const next = emptyFromFields(formFields)
    for (const field of formFields) {
      next[field.field] = row[field.field] ?? next[field.field]
    }
    setForm(next)
    setModalOpen(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      for (const field of formFields) {
        if (field.type === 'number' && payload[field.field] !== '' && payload[field.field] != null) {
          payload[field.field] = Number(payload[field.field])
        }
        if (field.type === 'bit') {
          payload[field.field] = Boolean(payload[field.field])
        }
        if (payload[field.field] === '') payload[field.field] = null
      }

      if (editing?.id != null) {
        await apiRequest(`${apiPath}/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        notify({ type: 'success', title: 'Actualizado', message: 'Registro guardado' })
      } else {
        await apiRequest(apiPath, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        notify({ type: 'success', title: 'Creado', message: 'Registro creado' })
      }
      setModalOpen(false)
      await refresh(page, query)
    } catch (error) {
      notify({ type: 'error', title: 'Error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        workspace={WORKSPACE_IDS.FLEET}
        title={title}
        dataSourceKey={slug}
        description={readOnly ? 'Vista de solo lectura' : 'Mantenedor CRUD'}
        actions={!readOnly && fields.length > 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Nuevo
          </button>
        ) : null}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter') refresh(1, query)
            }}
            placeholder="Buscar…"
          />
        </div>
        <button
          type="button"
          onClick={() => refresh(1, query)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
        >
          Buscar
        </button>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-3 font-semibold">{col}</th>
              ))}
              {!readOnly && <th className="px-3 py-3 font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500">Cargando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500">Sin registros</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-900">
                  {columns.map((col) => (
                    <td key={col} className="max-w-[220px] truncate px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      {row[col] == null ? '—' : String(row[col])}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServerPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => refresh(next, query)}
      />

      <CrmFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        title={editing ? `Editar ${title}` : `Nuevo ${title}`}
        dataSourceKey={slug}
        footer={(
          <CrmFormModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel={saving ? 'Guardando…' : 'Guardar'}
            submitDisabled={saving}
          />
        )}
      >
        <div className="space-y-3">
          {formFields.map((field) => (
            <FormField key={field.field} label={field.label} required={field.required}>
              {field.type === 'bit' ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.field])}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.field]: e.target.checked }))}
                  />
                  Activo / Sí
                </label>
              ) : (
                <input
                  className={inputClass}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={form[field.field] ?? ''}
                  required={field.required}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.field]: e.target.value }))}
                />
              )}
            </FormField>
          ))}
        </div>
      </CrmFormModal>
    </div>
  )
}
