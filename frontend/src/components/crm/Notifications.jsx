import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { FormField, inputClass } from './FormField'

const NotificationContext = createContext(null)
const DEFAULT_DURATION = 5200

const toneStyles = {
  success: {
    icon: 'check',
    badge: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
    border: 'border-l-emerald-400',
  },
  error: {
    icon: 'alert',
    badge: 'bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300',
    border: 'border-l-rose-400',
  },
  warning: {
    icon: 'alert',
    badge: 'bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-300',
    border: 'border-l-amber-400',
  },
  info: {
    icon: 'status',
    badge: 'bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300',
    border: 'border-l-sky-400',
  },
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [confirmRequest, setConfirmRequest] = useState(null)

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    ({ type = 'info', title, message, duration = DEFAULT_DURATION }) => {
      const id = createId()
      const item = { id, type, title, message, duration }

      setNotifications((current) => [item, ...current].slice(0, 5))
      if (duration !== 0) window.setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const confirm = useCallback((options) => new Promise((resolve) => {
    setConfirmRequest({
      tone: 'danger',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      ...options,
      resolve,
    })
  }), [])

  const confirmWithReason = useCallback((options) => new Promise((resolve) => {
    setConfirmRequest({
      tone: 'danger',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      reasonLabel: 'Motivo',
      reasonPlaceholder: '',
      ...options,
      requireReason: true,
      resolveReason: resolve,
    })
  }), [])

  const closeConfirm = useCallback((accepted, reason = '') => {
    setConfirmRequest((current) => {
      if (current?.resolveReason) {
        current.resolveReason(accepted && String(reason || '').trim() ? String(reason).trim() : null)
      } else {
        current?.resolve(Boolean(accepted))
      }
      return null
    })
  }, [])

  const value = useMemo(
    () => ({
      notify,
      confirm,
      confirmWithReason,
      success: (title, message, options = {}) => notify({ ...options, type: 'success', title, message }),
      error: (title, message, options = {}) => notify({ ...options, type: 'error', title, message }),
      warning: (title, message, options = {}) => notify({ ...options, type: 'warning', title, message }),
      info: (title, message, options = {}) => notify({ ...options, type: 'info', title, message }),
      dismiss,
    }),
    [confirm, confirmWithReason, dismiss, notify],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack notifications={notifications} onDismiss={dismiss} />
      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={closeConfirm} />}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  return context
}

function ToastStack({ notifications, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[300] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      {notifications.map((item) => (
        <Toast key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  )
}

function Toast({ item, onDismiss }) {
  const style = toneStyles[item.type] || toneStyles.info

  return (
    <article
      role={item.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex gap-3 rounded-2xl border border-border border-l-4 ${style.border} bg-card p-4 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-white/80 dark:bg-gray-950 dark:ring-white/15`}
    >
      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${style.badge}`}>
        <Icon name={style.icon} className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{item.title}</p>
        {item.message && <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.message}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label="Cerrar notificacion"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </article>
  )
}

function ConfirmDialog({ request, onClose }) {
  const danger = request.tone === 'danger'
  const needsReason = Boolean(request.requireReason)
  const [reason, setReason] = useState('')

  useEffect(() => {
    setReason('')
  }, [request.title, request.message, needsReason])

  const canConfirm = !needsReason || reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-gray-950/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-6" role="dialog" aria-modal="true">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
              danger
                ? 'bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300'
                : 'bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300'
            }`}
          >
            <Icon name={danger ? 'alert' : 'status'} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">{request.title}</h2>
            {request.message && <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.message}</p>}
          </div>
        </div>
        {needsReason && (
          <div className="mt-4">
            <FormField label={request.reasonLabel || 'Motivo'} required>
              <textarea
                className={`${inputClass} min-h-[88px] resize-y py-2`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={request.reasonPlaceholder || 'Indica el motivo…'}
                rows={3}
                autoFocus
              />
            </FormField>
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-accent sm:h-10"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onClose(true, reason)}
            className={`h-11 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:brightness-110'
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
