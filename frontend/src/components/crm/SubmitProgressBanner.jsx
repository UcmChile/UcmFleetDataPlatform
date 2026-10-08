export function SubmitProgressBanner({ message }) {
  if (!message) return null

  return (
    <div
      className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/30"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">{message}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-200 dark:bg-sky-900/60">
        <div className="crm-progress-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
      </div>
    </div>
  )
}
