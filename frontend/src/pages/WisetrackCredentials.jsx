import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { KeyRound, RefreshCw, Save } from 'lucide-react'
import { PageHeader } from '../components/crm/PageHeader'
import { FormField, inputClass } from '../components/crm/FormField'
import { useNotifications } from '../components/crm/Notifications'
import { crmRoutes } from '../lib/routes'
import { WORKSPACE_IDS } from '../lib/workspaces'
import { apiRequest } from '../services/api'

export default function WisetrackCredentials() {
  const { notify } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [obtaining, setObtaining] = useState(false)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [form, setForm] = useState({
    base_url: 'https://api-gateway.wisetrack.cl/prod',
    auth_path: '/ucm/v1/auth/getToken',
    username: '',
    password: '',
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await apiRequest('/integrations/wisetrack/credentials')
      const config = payload.data?.config || {}
      const token = payload.data?.token || null
      setForm((prev) => ({
        base_url: config.base_url || prev.base_url,
        auth_path: config.auth_path || prev.auth_path,
        username: config.username || '',
        password: config.has_password ? '********' : '',
      }))
      setTokenInfo(token)
    } catch (error) {
      notify({ type: 'error', title: 'Credenciales', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const body = {
        base_url: form.base_url,
        auth_path: form.auth_path,
        username: form.username,
      }
      if (form.password && form.password !== '********') {
        body.password = form.password
      }
      await apiRequest('/integrations/wisetrack/credentials', {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      notify({ type: 'success', title: 'Guardado', message: 'Credenciales Wisetrack actualizadas' })
      await refresh()
    } catch (error) {
      notify({ type: 'error', title: 'Guardar', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleObtainToken() {
    setObtaining(true)
    try {
      const result = await apiRequest('/integrations/wisetrack/credentials/obtain-token', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      notify({
        type: 'success',
        title: 'Token obtenido',
        message: `Token ${result.data?.token?.access_token_masked || ''} guardado`,
      })
      await refresh()
    } catch (error) {
      notify({ type: 'error', title: 'Obtener token', message: error.message })
    } finally {
      setObtaining(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        workspace={WORKSPACE_IDS.CRM}
        eyebrow="Integraciones"
        title="Wisetrack — credenciales API"
        dataSourceKey="wisetrack-credentials"
        description="Administre usuario/clave del API Gateway y obtenga el token Bearer para las llamadas."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-violet-500/[0.06] via-card to-emerald-500/[0.05] p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-emerald-500/15 text-violet-700 ring-1 ring-violet-500/10 dark:text-violet-300">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Credenciales de acceso</h2>
              <p className="text-xs text-muted-foreground">
                Postman WT-UCM: <code>POST /ucm/v1/auth/getToken</code> con{' '}
                <code>{'{ username, password }'}</code> → respuesta <code>{'{ token }'}</code>.
              </p>
            </div>
          </div>

          <FormField label="URL base" required>
            <input
              className={inputClass}
              value={form.base_url}
              onChange={(e) => setForm((prev) => ({ ...prev, base_url: e.target.value }))}
              placeholder="https://api-gateway.wisetrack.cl/prod"
              required
              disabled={loading}
            />
          </FormField>

          <FormField label="Path de autenticación" required hint="Se concatena a la URL base">
            <input
              className={inputClass}
              value={form.auth_path}
              onChange={(e) => setForm((prev) => ({ ...prev, auth_path: e.target.value }))}
              placeholder="/ucm/v1/auth/getToken"
              required
              disabled={loading}
            />
          </FormField>

          <FormField label="Username" required>
            <input
              className={inputClass}
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              autoComplete="username"
              required
              disabled={loading}
            />
          </FormField>

          <FormField label="Password" required>
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              autoComplete="current-password"
              placeholder="********"
              disabled={loading}
            />
          </FormField>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar credenciales'}
            </button>
            <button
              type="button"
              disabled={obtaining || loading}
              onClick={handleObtainToken}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${obtaining ? 'animate-spin' : ''}`} />
              {obtaining ? 'Obteniendo…' : 'Obtener / renovar token'}
            </button>
          </div>
        </form>

        <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Estado del token</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token</dt>
                <dd className="mt-1 font-mono text-foreground">
                  {tokenInfo?.has_token ? tokenInfo.access_token_masked : '— sin token —'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</dt>
                <dd className="mt-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    tokenInfo?.has_token && !tokenInfo?.is_expired
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
                  }`}
                  >
                    {tokenInfo?.has_token
                      ? (tokenInfo.is_expired ? 'Expirado' : tokenInfo.status || 'active')
                      : 'Pendiente'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Obtenido</dt>
                <dd className="mt-1 text-foreground">{tokenInfo?.obtained_at ? String(tokenInfo.obtained_at) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expira</dt>
                <dd className="mt-1 text-foreground">{tokenInfo?.expires_at ? String(tokenInfo.expires_at) : '—'}</dd>
              </div>
            </dl>
          )}

          <div className="flex flex-wrap gap-4">
            <NavLink
              to={crmRoutes.mantenedoresCatalogo('wisetrack-api-tokens')}
              className="inline-flex text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
            >
              Ver mantenedor de tokens →
            </NavLink>
            <NavLink
              to={crmRoutes.wisetrack}
              className="inline-flex text-sm font-semibold text-muted-foreground hover:underline"
            >
              Consola de ingesta
            </NavLink>
          </div>
        </section>
      </div>
    </div>
  )
}
