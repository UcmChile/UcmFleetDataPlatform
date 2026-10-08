import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HeaderLabel, getHeaderIcon } from './HeaderLabel'
import { Icon } from './Icon'
import { EntityDataSourceHint } from './EntityDataSourceHint'
import { useFormFieldNavigation } from '../../hooks/useFormFieldNavigation'

const SIZE_CLASS = {
  sm: 'max-w-xl',
  account: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-[min(1500px,calc(100vw-2rem))]',
}

const STACK_CLASS = {
  base: 'z-[190]',
  nested: 'z-[200]',
}

export function CrmFormModal({
  open,
  onClose,
  onSubmit,
  eyebrow,
  title,
  titleIcon,
  hint = 'Enter avanza, Shift+Enter retrocede. Tab y Shift+Tab tambien navegan campos.',
  /** Clave de fuente BD/SQL (solo Owner/Administrador ve el badge y Ver query). */
  dataSourceKey = '',
  size = 'md',
  stack = 'base',
  children,
  footer,
  headerActions,
  formRef: externalFormRef,
  lockScroll = true,
}) {
  const internalRef = useFormFieldNavigation({ enabled: open, onEscape: onClose })
  const formRef = externalFormRef || internalRef

  useEffect(() => {
    if (!open || !lockScroll) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, lockScroll])

  if (!open) return null

  const icon = titleIcon || getHeaderIcon('', title)

  return createPortal(
    <div
      className={`fixed inset-0 overflow-y-auto bg-gray-950/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 ${STACK_CLASS[stack] || STACK_CLASS.base}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-[calc(100dvh-2rem)] items-center justify-center">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onMouseDown={(event) => event.stopPropagation()}
          className={`flex max-h-[min(92dvh,calc(100dvh-2rem))] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${SIZE_CLASS[size] || SIZE_CLASS.md}`}
        >
        <div className="crm-modal-form-header shrink-0 px-4 py-4 sm:px-5 sm:py-5">
          {headerActions ? (
            <>
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{eyebrow}</p>
              )}
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 sm:pr-2">
                  <h2 className="text-xl font-bold text-gray-950 dark:text-gray-50">
                    <HeaderLabel label={title} icon={icon} size="lg" truncate={false} />
                  </h2>
                  {hint && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{hint}</p>
                  )}
                  <EntityDataSourceHint dataSourceKey={dataSourceKey} />
                </div>
                <div className="flex shrink-0 flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
                  {headerActions}
                  <button
                    type="button"
                    data-form-nav-ignore
                    onClick={onClose}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl border border-white/80 bg-white/90 text-gray-500 shadow-sm transition hover:bg-white hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white sm:self-auto"
                    aria-label="Cerrar"
                  >
                    <Icon name="close" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                {eyebrow && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{eyebrow}</p>
                )}
                <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-gray-50">
                  <HeaderLabel label={title} icon={icon} size="lg" />
                </h2>
                {hint && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{hint}</p>
                )}
                <EntityDataSourceHint dataSourceKey={dataSourceKey} />
              </div>
              <button
                type="button"
                data-form-nav-ignore
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-gray-500 shadow-sm transition hover:bg-white hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Cerrar"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto crm-scrollbar px-4 py-4 sm:px-5 sm:py-5">
          {children}
          {footer}
        </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export function CrmFormModalFooter({
  onClose,
  submitLabel = 'Guardar cambios',
  cancelLabel = 'Cancelar',
  submitDisabled = false,
  placement = 'footer',
  size = 'default',
}) {
  const isHeader = placement === 'header'
  const compact = size === 'xxs' || size === 'xs'
  const compactTextClass = size === 'xxs' ? 'text-xxs' : 'text-xs'
  const wrapperClass = isHeader
    ? 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center'
    : `${compact ? 'mt-0' : 'mt-4 pt-4'} flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 ${compact ? 'pt-2' : ''} sm:flex-row sm:justify-end`
  const buttonClass = compact
    ? `h-8 rounded-lg px-3 ${compactTextClass} font-semibold`
    : isHeader
      ? 'h-9 rounded-xl px-3 text-sm font-semibold sm:h-10 sm:px-4'
      : 'h-11 rounded-xl px-4 text-sm font-semibold sm:h-10'

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        data-form-nav-ignore
        onClick={onClose}
        className={`${buttonClass} border border-border bg-background transition hover:bg-accent`}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={submitDisabled}
        className={`${buttonClass} bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {submitLabel}
      </button>
    </div>
  )
}

export function CrmFormModalSection({ title, icon, children, className = '' }) {
  return (
    <section className={`min-w-0 space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0 xl:border-l xl:border-t-0 xl:pl-5 xl:first:border-l-0 xl:first:pl-0 ${className}`}>
      <h3 className="text-sm font-bold text-foreground">
        <HeaderLabel label={title} icon={icon} />
      </h3>
      {children}
    </section>
  )
}
