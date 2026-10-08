import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/crm/AppShell'
import Login from './pages/Login'
import FleetDashboard from './pages/FleetDashboard'
import CrmMaintainerPage from './pages/crm/CrmMaintainerPage'
import WisetrackConsole from './pages/WisetrackConsole'
import WisetrackCredentials from './pages/WisetrackCredentials'
import { APP_LOGIN_ROUTE, CRM_BASE, crmRoutes } from './lib/routes'
import { useSsoBootstrap } from './features/auth/useSsoBootstrap'
import UsersPage from './pages/UsersPage'
import {
  clearSession,
  getStoredSession,
  isValidSession,
  logout as apiLogout,
  setSession,
} from './services/api'

function RequireAuth({ session, children }) {
  if (!isValidSession(session)) {
    return <Navigate to={APP_LOGIN_ROUTE} replace />
  }
  return children
}

export default function App() {
  const navigate = useNavigate()
  const [session, setSessionState] = useState(() => getStoredSession())

  const authedSession = useMemo(
    () => (isValidSession(session) ? session : null),
    [session],
  )

  useEffect(() => {
    function onRefresh(event) {
      const stored = getStoredSession()
      if (stored) {
        setSessionState({
          ...stored,
          user: { ...stored.user, ...(event.detail || {}) },
        })
      }
    }
    window.addEventListener('crm-session-refreshed', onRefresh)
    return () => window.removeEventListener('crm-session-refreshed', onRefresh)
  }, [])

  const handleLogin = useCallback((result) => {
    if (result?.requires2fa) return
    setSession(result)
    setSessionState(result)
    navigate(crmRoutes.home, { replace: true })
  }, [navigate])

  const { bootstrapping: ssoBootstrapping, error: ssoError } = useSsoBootstrap(handleLogin)

  const handleLogout = useCallback(async () => {
    await apiLogout()
    clearSession()
    setSessionState(null)
    navigate(APP_LOGIN_ROUTE, { replace: true })
  }, [navigate])

  const handleUpdateUser = useCallback((user) => {
    const stored = getStoredSession()
    if (!stored?.token) return
    const next = { token: stored.token, user: { ...stored.user, ...user } }
    setSession(next)
    setSessionState(next)
  }, [])

  if (ssoBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-200">
        Iniciando sesión con UCM SSO…
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path={APP_LOGIN_ROUTE}
        element={<Login session={authedSession} onLogin={handleLogin} ssoError={ssoError} />}
      />
      <Route
        path={`${CRM_BASE}/*`}
        element={(
          <RequireAuth session={authedSession}>
            <AppShell
              session={authedSession}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
            />
          </RequireAuth>
        )}
      >
        <Route index element={<FleetDashboard />} />
        <Route path="mantenedores/*" element={<CrmMaintainerPage />} />
        <Route path="integraciones/wisetrack" element={<WisetrackConsole />} />
        <Route path="integraciones/wisetrack/credenciales" element={<WisetrackCredentials />} />
        <Route path="usuarios" element={<UsersPage session={authedSession} />} />
        <Route path="*" element={<Navigate to={crmRoutes.home} replace />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={authedSession ? crmRoutes.home : APP_LOGIN_ROUTE} replace />}
      />
    </Routes>
  )
}
