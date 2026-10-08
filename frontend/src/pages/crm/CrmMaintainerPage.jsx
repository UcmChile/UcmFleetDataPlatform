import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { CrmSelect } from '../../components/crm/CrmSelect'
import { ActionIconButton, ActionToolbar, ActionToolbarDivider } from '../../components/crm/ActionIconButton'
import { MaintainerActiveFilter } from '../../components/crm/MaintainerActiveFilter'
import { MaintainerDataTable } from '../../components/crm/MaintainerDataTable'
import { CrmFormModal, CrmFormModalFooter, CrmFormModalSection } from '../../components/crm/CrmFormModal'
import { FormField, inputClass } from '../../components/crm/FormField'
import { MaintainerStatusFields } from '../../components/crm/MaintainerStatusFields'
import { PageHeader } from '../../components/crm/PageHeader'
import { SearchInput } from '../../components/crm/SearchInput'
import { ServerPagination } from '../../components/crm/ServerPagination'
import { useNotifications } from '../../components/crm/Notifications'
import { ModuleVisualizeGuard } from '../../components/crm/ModuleVisualizeGuard'
import { toggleMaintainerStatus } from '../../hooks/useMaintainerDeactivate'
import { useFetchAllMaintainerRows } from '../../hooks/useFetchAllMaintainerRows'
import { useMaintainerActiveFilter } from '../../hooks/useMaintainerActiveFilter'
import { useMaintainerServerSort } from '../../hooks/useMaintainerServerSort'
import { buildMaintainerListParams } from '../../lib/maintainerListQuery'
import { apiRequest, isApiError, isSystemAdmin } from '../../services/api'
import { crmRoutes } from '../../lib/routes'
import { WORKSPACE_IDS } from '../../lib/workspaces'
import { useUcmcrmMaintainerPermissions } from '../../hooks/useUcmcrmMaintainerPermissions'
import { flattenCrmMenuItems } from '../../lib/crmNavigationConfig'
import { CRM_MENU_API_PATHS } from '../../lib/crmMenuData'
import { FLEET_VEHICLE_FILTER_SLUGS, getMaintainerColumnDefs } from '../../lib/crmMaintainerColumns'
import { buildMaintainerTableColumns } from '../../lib/buildMaintainerTableColumns'
import {
  buildCatalogEmptyForm,
  buildCatalogPayload,
  getCatalogUiDef,
  mapCatalogRowToForm,
  mergeCatalogFkOptions,
  validateCatalogForm,
} from '../../lib/catalogMaintainersUi'
import { mapApiRowsToFkOptions } from '../../lib/selectOptions'

const emptyForm = {
  name: '',
  is_disabled: false,
}

function normalizeMaintainerPath(pathname) {
  return String(pathname || '').replace(/\/+$/, '') || '/'
}

/** Incrementar al agregar columnas para resetear preferencias guardadas en localStorage. */
const COLUMN_SCHEMA_VERSIONS = {
  vehicles: 3,
  'wisetrack-rejected-pings': 1,
  ...Object.fromEntries(FLEET_VEHICLE_FILTER_SLUGS.map((slug) => [slug, 2])),
}

function maintainerColumnStorageKey(baseKey, slug) {
  const version = COLUMN_SCHEMA_VERSIONS[slug]
  return version ? `${baseKey}.v${version}` : baseKey
}

function resolveMaintainerConfig(pathname, catalogSlug) {
  const path = normalizeMaintainerPath(pathname)
  const catalogMatch = path.match(/\/mantenedores\/catalogo\/([^/]+)/)
  const slug = catalogSlug || catalogMatch?.[1]
  if (slug) {
    const title = flattenCrmMenuItems().find((entry) => normalizeMaintainerPath(entry.to) === path)?.label
      || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return {
      title,
      apiPath: `/${slug}`,
      route: crmRoutes.mantenedoresCatalogo(slug),
      storageKey: maintainerColumnStorageKey(`crm.mantenedores.catalogo.${slug}`, slug),
      exportSlug: slug,
    }
  }

  const item = flattenCrmMenuItems().find((entry) => normalizeMaintainerPath(entry.to) === path)
  if (item?.apiPath) {
    const pathSlug = String(item.apiPath).replace(/^\//, '')
    return {
      title: item.label,
      apiPath: item.apiPath,
      route: item.to,
      storageKey: `crm.mantenedores.${pathSlug}`,
      exportSlug: pathSlug,
    }
  }

  const menuEntry = Object.entries(CRM_MENU_API_PATHS).find(([href]) => normalizeMaintainerPath(href) === path)
  if (menuEntry) {
    const [href, apiPath] = menuEntry
    const pathSlug = String(apiPath).replace(/^\//, '')
    const title = flattenCrmMenuItems().find((entry) => normalizeMaintainerPath(entry.to) === normalizeMaintainerPath(href))?.label
      || pathSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return {
      title,
      apiPath,
      route: href,
      storageKey: `crm.mantenedores.${pathSlug}`,
      exportSlug: pathSlug,
    }
  }

  return null
}

function hasStatusColumn(slug) {
  return getMaintainerColumnDefs(slug).some((col) => col.id === 'is_disabled' || col.field === 'is_disabled')
}

export default function CrmMaintainerPage() {
  const location = useLocation()
  const params = useParams()
  const catalogSlug = params.catalogSlug
  const config = useMemo(
    () => resolveMaintainerConfig(location.pathname, catalogSlug),
    [catalogSlug, location.pathname],
  )

  const notify = useNotifications()
  const route = config?.route || location.pathname
  const { canCreate, canEdit, canDelete } = useUcmcrmMaintainerPermissions(route)
  const admin = isSystemAdmin()

  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || '')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const { showInactive, setShowInactive, statusFilterParams } = useMaintainerActiveFilter()

  const apiPath = config?.apiPath
  const entityLabel = config?.title?.toLowerCase() || 'registro'
  const maintainerSlug = useMemo(() => String(apiPath || '').replace(/^\//, ''), [apiPath])
  const supportsDateRange = useMemo(
    () => ['gps-daily-km', 'odometer-daily', 'physical-readings', 'gps-minute-pings'].includes(maintainerSlug),
    [maintainerSlug],
  )
  const supportsVehicleFilter = useMemo(
    () => FLEET_VEHICLE_FILTER_SLUGS.includes(maintainerSlug),
    [maintainerSlug],
  )
  const { sortParams, handleSortChange } = useMaintainerServerSort({
    defaultSortBy: maintainerSlug === 'gps-daily-km' || maintainerSlug === 'odometer-daily'
      ? 'reading_date'
      : maintainerSlug === 'gps-minute-pings'
        ? 'ts'
        : 'id',
    defaultSortDir: 'desc',
  })
  const supportsActiveFilter = useMemo(() => hasStatusColumn(maintainerSlug), [maintainerSlug])
  const catalogUi = useMemo(() => getCatalogUiDef(maintainerSlug), [maintainerSlug])
  const [fkOptions, setFkOptions] = useState({})

  const listExtra = useMemo(() => ({
    ...(supportsActiveFilter ? statusFilterParams : {}),
    ...(supportsDateRange && dateFrom ? { dateFrom } : {}),
    ...(supportsDateRange && dateTo ? { dateTo } : {}),
    ...(supportsVehicleFilter && vehicleFilter.trim() ? { vehicle: vehicleFilter.trim() } : {}),
  }), [
    supportsActiveFilter,
    statusFilterParams,
    supportsDateRange,
    dateFrom,
    dateTo,
    supportsVehicleFilter,
    vehicleFilter,
  ])

  const fetchAllRows = useFetchAllMaintainerRows({
    apiPath,
    query,
    total,
    pageSize,
    extraParams: { ...sortParams, ...listExtra },
  })

  const refresh = useCallback(async (targetPage = page, targetQuery = query) => {
    if (!apiPath) return
    setLoading(true)
    try {
      const search = buildMaintainerListParams({
        page: targetPage,
        pageSize,
        query: targetQuery,
        ...sortParams,
        extra: listExtra,
      })
      const payload = await apiRequest(`${apiPath}?${search.toString()}`)
      const data = payload.data || payload.items || []
      setRows(data.map((row) => ({ ...row, is_disabled: Boolean(row.is_disabled) })))
      setTotal(Number(payload.total || payload.count || data.length || 0))
    } catch (error) {
      notify.error(`No se pudo cargar ${config?.title || 'mantenedor'}`, error.message)
    } finally {
      setLoading(false)
    }
  }, [apiPath, config?.title, listExtra, notify, page, pageSize, query, sortParams])

  useEffect(() => {
    setPage(1)
  }, [sortParams.sortBy, sortParams.sortDir, listExtra])

  useEffect(() => {
    const fromParam = searchParams.get('dateFrom') || ''
    const toParam = searchParams.get('dateTo') || ''
    setDateFrom(fromParam)
    setDateTo(toParam)
    setVehicleFilter('')
    setQuery('')
    setPage(1)
  }, [apiPath]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!supportsDateRange) return
    const next = new URLSearchParams(searchParams)
    if (dateFrom) next.set('dateFrom', dateFrom)
    else next.delete('dateFrom')
    if (dateTo) next.set('dateTo', dateTo)
    else next.delete('dateTo')
    const current = searchParams.toString()
    const upcoming = next.toString()
    if (current !== upcoming) setSearchParams(next, { replace: true })
  }, [dateFrom, dateTo, supportsDateRange, searchParams, setSearchParams])

  useEffect(() => {
    setPage(1)
    void refresh(1, query)
  }, [apiPath, query, listExtra])

  useEffect(() => {
    void refresh(page, query)
  }, [page, apiPath, sortParams.sortBy, sortParams.sortDir])

  useEffect(() => {
    if (!modalOpen || !catalogUi?.fkFields?.length) return
    let cancelled = false
    void (async () => {
      const next = {}
      await Promise.all(
        catalogUi.fkFields.map(async (fieldDef) => {
          try {
            const data = await apiRequest(fieldDef.optionsApi)
            const rows = Array.isArray(data) ? data : data?.data || data?.items || []
            next[fieldDef.field] = mapApiRowsToFkOptions(rows)
          } catch {
            /* silent */
          }
        }),
      )
      if (!cancelled) setFkOptions((prev) => ({ ...prev, ...next }))
    })()
    return () => {
      cancelled = true
    }
  }, [catalogUi, modalOpen])

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(catalogUi ? buildCatalogEmptyForm(maintainerSlug) : emptyForm)
    setFkOptions({})
  }

  function openCreate() {
    setEditing(null)
    setForm(catalogUi ? buildCatalogEmptyForm(maintainerSlug) : emptyForm)
    setModalOpen(true)
  }

  async function openEdit(row) {
    setEditing(row)
    if (catalogUi) {
      try {
        const detailPayload = await apiRequest(`${apiPath}/${row.id}`)
        const detail = detailPayload?.data || detailPayload
        setEditing(detail)
        setForm(mapCatalogRowToForm(detail, maintainerSlug))
        setFkOptions((current) => mergeCatalogFkOptions(current, detail, maintainerSlug))
      } catch {
        setForm(mapCatalogRowToForm(row, maintainerSlug))
      }
    } else {
      setForm({
        name: row.name || '',
        is_disabled: Boolean(row.is_disabled),
      })
    }
    setModalOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!apiPath) return
    const validationError = catalogUi
      ? validateCatalogForm(form, maintainerSlug)
      : (!String(form.name || '').trim() ? 'El nombre es obligatorio.' : null)
    if (validationError) {
      notify.warning('Validación', validationError)
      return
    }

    setSaving(true)
    try {
      const payload = catalogUi ? buildCatalogPayload(form, maintainerSlug) : { name: form.name.trim() }
      if (editing) {
        await apiRequest(`${apiPath}/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        notify.success('Registro actualizado')
      } else {
        await apiRequest(apiPath, { method: 'POST', body: JSON.stringify(payload) })
        notify.success('Registro creado')
      }
      closeModal()
      void refresh(editing ? page : 1, query)
      if (!editing) setPage(1)
    } catch (error) {
      notify.error('No se pudo guardar', isApiError(error) ? error.message : 'Revisa los datos.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(row) {
    if (!apiPath || togglingId) return
    setTogglingId(row.id)
    try {
      await toggleMaintainerStatus({
        notify,
        apiRequest,
        apiPath,
        row,
        entityLabel,
        onSuccess: () => void refresh(page, query),
      })
    } catch (error) {
      notify.error('No se pudo cambiar el estado', isApiError(error) ? error.message : 'Error')
    } finally {
      setTogglingId(null)
    }
  }

  const columns = useMemo(() => {
    const slug = String(apiPath || '').replace(/^\//, '')
    const base = buildMaintainerTableColumns(getMaintainerColumnDefs(slug))

    if (canEdit || canDelete || canCreate || admin) {
      base.push({
        key: 'acciones',
        canHide: false,
        header: 'Acciones',
        render: (row) => (
          <ActionToolbar>
            {(canEdit || admin) && (
              <ActionIconButton
                label="Editar"
                icon="edit"
                tone="sky"
                onClick={() => openEdit(row)}
              />
            )}
            {(canDelete || admin) && (canEdit || admin) && <ActionToolbarDivider />}
            {(canDelete || admin) && (
              <ActionIconButton
                label={row.is_disabled ? 'Activar' : 'Desactivar'}
                icon={row.is_disabled ? 'activate' : 'deactivate'}
                tone={row.is_disabled ? 'emerald' : 'rose'}
                onClick={() => void handleToggleStatus(row)}
                disabled={togglingId === row.id}
              />
            )}
          </ActionToolbar>
        ),
      })
    }

    return base
  }, [admin, apiPath, canCreate, canDelete, canEdit, togglingId])

  if (!config) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Mantenedor no configurado para esta ruta.</p>
      </div>
    )
  }

  const modalTitle = editing ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`

  return (
    <ModuleVisualizeGuard to={route}>
      <PageHeader
        eyebrow="Mantenedores"
        title={config.title}
        dataSourceKey={maintainerSlug}
        description="Catálogo operativo Fleet. Los cambios de estado quedan registrados en auditoría."
        actionLabel={!catalogUi?.readOnly && (canCreate || admin) ? `Nuevo ${entityLabel}` : undefined}
        onAction={!catalogUi?.readOnly && (canCreate || admin) ? openCreate : undefined}
        workspace={WORKSPACE_IDS.CRM}
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={supportsVehicleFilter
              ? (supportsDateRange
                ? 'Buscar por patente, Wisetrack ID o fecha YYYY-MM-DD...'
                : 'Buscar por patente o Wisetrack ID...')
              : `Buscar en ${entityLabel}...`}
          />
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground shadow-sm">
            {loading ? 'Cargando...' : `${total} registro${total === 1 ? '' : 's'}`}
          </span>
        </div>
        {(supportsVehicleFilter || supportsDateRange) ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            {supportsVehicleFilter ? (
              <FormField label="Vehículo" className="w-full sm:w-72">
                <input
                  className={inputClass}
                  value={vehicleFilter}
                  placeholder="id Wisetrack, id interno o patente"
                  onChange={(e) => setVehicleFilter(e.target.value)}
                />
              </FormField>
            ) : null}
            {supportsDateRange ? (
              <>
                <FormField label="Desde" className="w-full sm:w-44">
                  <input
                    type="date"
                    className={inputClass}
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </FormField>
                <FormField label="Hasta" className="w-full sm:w-44">
                  <input
                    type="date"
                    className={inputClass}
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </FormField>
              </>
            ) : null}
            {(vehicleFilter || dateFrom || dateTo) ? (
              <button
                type="button"
                onClick={() => {
                  setVehicleFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="h-11 text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
              >
                Limpiar filtros
              </button>
            ) : (
              <p className="pb-2 text-xs text-muted-foreground sm:max-w-sm">
                {supportsVehicleFilter
                  ? 'Vehículo: id Wisetrack, id interno, Traumasoft o patente.'
                  : 'Filtra consolidados por rango de fecha (reading_date / ts).'}
                {supportsVehicleFilter && supportsDateRange ? ' Las fechas filtran el día en Chile.' : ''}
              </p>
            )}
          </div>
        ) : null}
        {supportsActiveFilter ? (
          <MaintainerActiveFilter showInactive={showInactive} onChange={setShowInactive} />
        ) : null}
      </div>

      <ServerPagination
        className="mb-3"
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
      />

      <MaintainerDataTable
        columnStorageKey={config.storageKey}
        columns={columns}
        rows={rows}
        enableSorting
        serverSort
        initialSortConfig={{ key: sortParams.sortBy, direction: sortParams.sortDir }}
        onSortConfigChange={handleSortChange}
        exportTitle={config.title}
        exportFilename={`fleet-${config.exportSlug}`}
        exportDateKey={supportsDateRange
          ? (maintainerSlug === 'gps-minute-pings' ? 'ts' : 'reading_date')
          : 'id'}
        fetchAllRows={fetchAllRows}
        totalRecords={total}
        rowKey={(row) => row.id}
        empty={loading ? 'Cargando...' : 'Sin registros'}
      />

      {modalOpen && (
        <CrmFormModal
          open
          eyebrow="Mantenedores"
          title={modalTitle}
          titleIcon="settings"
          dataSourceKey={maintainerSlug}
          size="md"
          onClose={closeModal}
          onSubmit={handleSubmit}
          footer={(
            <CrmFormModalFooter
              onClose={closeModal}
              submitDisabled={saving}
              submitLabel={editing ? 'Guardar cambios' : 'Crear registro'}
            />
          )}
        >
          <CrmFormModalSection title="Datos del registro" icon="settings">
            {!catalogUi?.hideName && (
              <FormField label="Nombre" required>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  required
                />
              </FormField>
            )}
            {(catalogUi?.extraFields || []).map((fieldDef) => (
              <FormField key={fieldDef.field} label={fieldDef.label} required={Boolean(fieldDef.required)}>
                {fieldDef.type === 'boolean' ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(form[fieldDef.field])}
                      onChange={(e) => setForm((current) => ({ ...current, [fieldDef.field]: e.target.checked }))}
                    />
                    Activo / Sí
                  </label>
                ) : (
                  <input
                    className={inputClass}
                    type={fieldDef.type === 'number' ? 'number' : 'text'}
                    value={form[fieldDef.field] ?? ''}
                    required={Boolean(fieldDef.required)}
                    onChange={(e) => setForm((current) => ({ ...current, [fieldDef.field]: e.target.value }))}
                  />
                )}
              </FormField>
            ))}
            {(catalogUi?.fkFields || []).map((fieldDef) => (
              <FormField key={fieldDef.field} label={fieldDef.label} required={Boolean(fieldDef.required)}>
                <CrmSelect
                  value={form[fieldDef.field] || ''}
                  onChange={(next) => setForm((current) => ({
                    ...current,
                    [fieldDef.field]: next === '_none' ? '' : next,
                  }))}
                  options={fkOptions[fieldDef.field] || []}
                  placeholder={`Seleccionar ${fieldDef.label.toLowerCase()}...`}
                  fieldKey={fieldDef.field}
                  row={editing || {}}
                  label={fieldDef.label}
                  formMode={editing ? 'edit' : 'create'}
                />
              </FormField>
            ))}
            {!catalogUi?.hideName && (
              <MaintainerStatusFields
                isDisabled={form.is_disabled}
                mode={editing ? 'edit' : 'create'}
              />
            )}
          </CrmFormModalSection>
        </CrmFormModal>
      )}
    </ModuleVisualizeGuard>
  )
}

