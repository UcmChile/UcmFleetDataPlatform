import { cn } from './utils'

export function BaseForm({ className, ...props }) {
  return <form className={cn('space-y-6', className)} {...props} />
}

export function BaseFormRow({ className, ...props }) {
  return <div className={cn('grid gap-3', className)} {...props} />
}

export function BaseFormLabel({ className, ...props }) {
  return <label className={cn('text-sm font-semibold text-slate-700 dark:text-slate-200', className)} {...props} />
}

export function BaseFormDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
}

export function BaseFormMessage({ className, ...props }) {
  return <p className={cn('text-sm text-red-600 dark:text-red-300', className)} {...props} />
}
