import { useEffect, useRef } from 'react'

/** Stub compatible con CrmFormModal del template CRM. */
export function useFormFieldNavigation({ enabled = true, onEscape } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enabled || !onEscape) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onEscape])

  return ref
}
