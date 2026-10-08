import { useCallback, useEffect, useMemo, useState } from 'react'
import { MaintainerDataTable } from '../components/crm/MaintainerDataTable'
import { PageHeader } from '../components/crm/PageHeader'
import { FormField, inputClass } from '../components/crm/FormField'
import { CrmFormModal, CrmFormModalFooter } from '../components/crm/CrmFormModal'
import { useNotifications } from '../components/crm/Notifications'
import { apiRequest } from '../services/api'
import { formatDateTime } from '../utils/formatters'

const PROFILES = ['Administrador', 'Usuario']

const EMPTY_FORM = {
  username: '',
  nombre: '',
  email: '',
  password: '',
  perfil: 'Administrador',
  activo: true,
}

function statusLabel(row) {
  return row.activo ? 'Activo' : 'Inactivo'
}

export default function UsersPage({ session }) {
  const { notify } = useNotifications()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiRequest('/users')
      setRows(res.data || [])
    } catch (error) {
      setRows([])
      notify({ type: 'error', title: 'Usuarios', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditor({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      username: row.username || '',
      nombre: row.nombre || '',
      email: row.email || '',
      password: '',
      perfil: row.perfil === 'Usuario' ? 'Usuario' : 'Administrador',
      activo: Boolean(row.activo),
    })
    setEditor({ mode: 'edit', id: row.id_usuario, is_owner: row.is_owner })
  }

  async function saveUser(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editor?.mode === 'create') {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        notify({ type: 'success', title: 'Usuario creado', message: `Quedó con el perfil ${form.perfil}.` })
      } else {
        await apiRequest(`/users/${editor.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            username: form.username,
            nombre: form.nombre,
            email: form.email,
            perfil: form.perfil,
            activo: form.activo,
          }),
        })
        notify({ type: 'success', title: 'Usuario actualizado', message: form.nombre })
      }
      setEditor(null)
      await load()
    } catch (error) {
      notify({ type: 'error', title: 'Usuarios', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await apiRequest(`/users/${passwordTarget.id_usuario}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      notify({ type: 'success', title: 'Contraseña actualizada', message: passwordTarget.username })
      setPasswordTarget(null)
      setPassword('')
    } catch (error) {
      notify({ type: 'error', title: 'Contraseña', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function removeUser(row) {
    if (!window.confirm(`¿Eliminar a ${row.nombre} (${row.username})?`)) return
    try {
      await apiRequest(`/users/${row.id_usuario}`, { method: 'DELETE' })
      notify({ type: 'success', title: 'Usuario eliminado', message: row.username })
      await load()
    } catch (error) {
      notify({ type: 'error', title: 'Usuarios', message: error.message })
    }
  }

  const columns = useMemo(() => [
    { key: 'username', header: 'Usuario' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'email', header: 'Email' },
    { key: 'perfil', header: 'Perfil' },
    {
      key: 'activo',
      header: 'Estado',
      sortValue: (row) => (row.activo ? 1 : 0),
      exportValue: (row) => statusLabel(row),
      render: (row) => (
        <span className={row.activo
          ? 'font-semibold text-emerald-700 dark:text-emerald-300'
          : 'font-semibold text-rose-700 dark:text-rose-300'}
        >
          {statusLabel(row)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Creado',
      exportValue: (row) => (row.created_at ? formatDateTime(row.created_at) : ''),
      render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
    },
    {
      key: 'actions',
      header: 'Acciones',
      canSort: false,
      exportable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
            onClick={(event) => {
              event.stopPropagation()
              openEdit(row)
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
            onClick={(event) => {
              event.stopPropagation()
              setPassword('')
              setPasswordTarget(row)
            }}
          >
            Clave
          </button>
          {!row.is_owner && Number(row.id_usuario) !== Number(session?.user?.id_usuario) ? (
            <button
              type="button"
              className="text-xs font-semibold text-rose-700 hover:underline dark:text-rose-300"
              onClick={(event) => {
                event.stopPropagation()
                void removeUser(row)
              }}
            >
              Eliminar
            </button>
          ) : null}
        </div>
      ),
    },
  ], [session?.user?.id_usuario])

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Perfiles Administrador y Usuario. Por ahora ambos tienen acceso total. El alta queda en Administrador."
      />

      <MaintainerDataTable
        columnStorageKey="fleet.users"
        columns={columns}
        rows={loading ? [] : rows}
        enableSorting
        initialSortConfig={{ key: 'nombre', direction: 'asc' }}
        exportTitle="Usuarios Fleet"
        exportFilename="fleet-usuarios"
        rowKey={(row) => row.id_usuario}
        idKey="id_usuario"
        empty={loading ? 'Cargando…' : 'Sin usuarios'}
        onRowDoubleClick={openEdit}
        renderToolbarActions={() => (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            Nuevo usuario
          </button>
        )}
      />

      <CrmFormModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        onSubmit={saveUser}
        eyebrow="Usuarios"
        title={editor?.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
        titleIcon="user"
        size="sm"
        hint="Los usuarios nuevos quedan como Administrador. La contraseña se define al crear o con la acción Clave."
        footer={(
          <CrmFormModalFooter
            onClose={() => !saving && setEditor(null)}
            submitLabel={saving ? 'Guardando…' : 'Guardar'}
            submitDisabled={saving}
          />
        )}
      >
        <div className="grid gap-3">
          <FormField label="Usuario" required>
            <input
              className={inputClass}
              value={form.username}
              autoComplete="off"
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </FormField>
          <FormField label="Nombre" required>
            <input
              className={inputClass}
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
              required
            />
          </FormField>
          <FormField label="Email" required>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </FormField>
          {editor?.mode === 'create' ? (
            <FormField label="Contraseña" required>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                autoComplete="new-password"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                minLength={6}
              />
            </FormField>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.activo}
                disabled={editor?.is_owner}
                onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
              />
              Activo
            </label>
          )}
          <FormField label="Perfil" required>
            <select
              className={inputClass}
              value={form.perfil}
              disabled={editor?.is_owner}
              onChange={(event) => setForm((current) => ({ ...current, perfil: event.target.value }))}
            >
              {PROFILES.map((perfil) => (
                <option key={perfil} value={perfil}>{perfil}</option>
              ))}
            </select>
          </FormField>
        </div>
      </CrmFormModal>

      <CrmFormModal
        open={Boolean(passwordTarget)}
        onClose={() => !saving && setPasswordTarget(null)}
        onSubmit={savePassword}
        eyebrow="Usuarios"
        title={`Nueva clave · ${passwordTarget?.username || ''}`}
        titleIcon="shield"
        size="sm"
        footer={(
          <CrmFormModalFooter
            onClose={() => !saving && setPasswordTarget(null)}
            submitLabel={saving ? 'Guardando…' : 'Actualizar clave'}
            submitDisabled={saving}
          />
        )}
      >
        <FormField label="Contraseña" required>
          <input
            className={inputClass}
            type="password"
            value={password}
            autoComplete="new-password"
            minLength={6}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>
      </CrmFormModal>
    </div>
  )
}
