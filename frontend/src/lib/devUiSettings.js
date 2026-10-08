import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'ucmcrm.dev-ui-settings'
const SETTINGS_EVENT = 'ucmcrm:dev-ui-settings-changed'

const DEFAULT_SETTINGS = {
  showCrudIndicators: false,
  inactivityTimeoutMinutes: 30,
}

/** Valor que quedó guardado cuando el corte era de 5 minutos. */
const LEGACY_INACTIVITY_MINUTES = 5

function clampInactivity(minutes) {
  if (!Number.isFinite(minutes)) return DEFAULT_SETTINGS.inactivityTimeoutMinutes
  return Math.min(180, Math.max(1, Math.floor(minutes)))
}

function parseSettings(raw) {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw)
    const storedMinutes = Number(parsed.inactivityTimeoutMinutes ?? DEFAULT_SETTINGS.inactivityTimeoutMinutes)
    const minutes = storedMinutes === LEGACY_INACTIVITY_MINUTES
      ? DEFAULT_SETTINGS.inactivityTimeoutMinutes
      : storedMinutes
    return {
      showCrudIndicators: Boolean(parsed.showCrudIndicators),
      inactivityTimeoutMinutes: clampInactivity(minutes),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getDevUiSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  return parseSettings(window.localStorage.getItem(STORAGE_KEY))
}

export function updateDevUiSettings(next) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  const merged = {
    ...getDevUiSettings(),
    ...next,
  }
  merged.inactivityTimeoutMinutes = clampInactivity(merged.inactivityTimeoutMinutes)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: merged }))
  return merged
}

export function useDevUiSettings() {
  const [settings, setSettings] = useState(() => getDevUiSettings())

  useEffect(() => {
    const onChanged = () => setSettings(getDevUiSettings())
    window.addEventListener(SETTINGS_EVENT, onChanged)
    window.addEventListener('storage', onChanged)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, onChanged)
      window.removeEventListener('storage', onChanged)
    }
  }, [])

  const updateSettings = useCallback((next) => {
    const merged = updateDevUiSettings(next)
    setSettings(merged)
  }, [])

  return useMemo(() => ({ settings, updateSettings }), [settings, updateSettings])
}
