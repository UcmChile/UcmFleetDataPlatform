import { APP_LOGIN_ROUTE, isAppLoginPath } from '../lib/routes'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'ucm.fleet.token'
const USER_KEY = 'ucm.fleet.user'

export function isValidSession(session) {
  return Boolean(session?.token && session?.user && (session.user.id_usuario || session.user.email || session.user.username))
}

export function getStoredSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (!token || !userRaw) return null
    return { token, user: JSON.parse(userRaw) }
  } catch {
    return null
  }
}

export function setSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isSystemAdmin() {
  const session = getStoredSession()
  const user = session?.user
  if (!user) return false
  if (user.is_owner) return true
  const roles = Array.isArray(user.roles) ? user.roles : []
  return roles.includes('Administrador')
}

function handleSessionExpired() {
  clearSession()
  if (!isAppLoginPath(window.location.pathname)) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `${APP_LOGIN_ROUTE}?expired=1&returnTo=${returnTo}`
  }
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: options.cache || 'no-store',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (response.status === 401 && token && !String(path).startsWith('/auth/')) {
      handleSessionExpired()
    }
    const message = payload?.error?.message || payload?.message || `Error HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export async function login(credentials) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  setSession(result)
  return result
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  clearSession()
}

export function isApiError(error) {
  return Boolean(error && (error.status || error.payload))
}

export function getApiErrorMessage(error, fallback = 'Error inesperado') {
  return error?.message || fallback
}
