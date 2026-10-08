import { useEffect, useRef, useState } from 'react'
import { exchangeSsoToken } from './authApi'

export const PENDING_SSO_TOKEN_KEY = 'ucm.fleet.pending_sso_token'

function readSsoTokenFromUrl() {
  if (typeof window === 'undefined') return null
  try {
    const hashToken = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('sso_token')
    const queryToken = new URLSearchParams(window.location.search).get('sso_token')
    return (hashToken || queryToken || '').trim() || null
  } catch {
    return null
  }
}

function readPendingSsoToken() {
  try {
    return sessionStorage.getItem(PENDING_SSO_TOKEN_KEY)
  } catch {
    return null
  }
}

function clearPendingSsoToken() {
  try {
    sessionStorage.removeItem(PENDING_SSO_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function persistPendingSsoToken(token) {
  try {
    sessionStorage.setItem(PENDING_SSO_TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

function clearSsoTokenFromUrl() {
  try {
    const next = new URL(window.location.href)
    const hadHash = Boolean(next.hash && next.hash.includes('sso_token'))
    const hadQuery = next.searchParams.has('sso_token')
    if (!hadHash && !hadQuery) return
    next.hash = ''
    next.searchParams.delete('sso_token')
    window.history.replaceState(null, '', `${next.pathname}${next.search}`)
  } catch {
    /* ignore */
  }
}

export function hasPendingSsoBootstrap() {
  return Boolean(readSsoTokenFromUrl() || readPendingSsoToken()?.trim())
}

export function captureSsoTokenFromUrl() {
  const token = readSsoTokenFromUrl()
  if (!token) return
  persistPendingSsoToken(token)
  clearSsoTokenFromUrl()
}

/** Intercambia `#sso_token` del portal UCM SSO por la sesión local de Fleet. */
export function useSsoBootstrap(onLogin) {
  const [bootstrapping, setBootstrapping] = useState(() => hasPendingSsoBootstrap())
  const [error, setError] = useState(null)
  const onLoginRef = useRef(onLogin)
  onLoginRef.current = onLogin

  useEffect(() => {
    captureSsoTokenFromUrl()
    const sso = (readPendingSsoToken() || '').trim()
    if (!sso) {
      setBootstrapping(false)
      return
    }

    setBootstrapping(true)
    setError(null)
    let cancelled = false

    ;(async () => {
      try {
        const payload = await exchangeSsoToken(sso)
        if (cancelled) return
        clearPendingSsoToken()
        if (payload?.token && payload?.user) {
          onLoginRef.current(payload)
        } else {
          setError('No se pudo iniciar sesión con SSO.')
        }
      } catch (err) {
        if (cancelled) return
        clearPendingSsoToken()
        const message = err?.status === 403
          ? 'Tu usuario no está dado de alta en Fleet (mismo correo que el portal SSO).'
          : err?.message || 'No se pudo iniciar sesión con SSO.'
        setError(message)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { bootstrapping, error }
}
