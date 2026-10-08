import { cn } from './utils'

export function BaseCard({ className, ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-colors duration-200',
        className,
      )}
      {...props}
    />
  )
}

export function BaseCardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 px-6 pt-6', className)} {...props} />
}

export function BaseCardBody({ className, ...props }) {
  return <div className={cn('px-6 py-5', className)} {...props} />
}

export function BaseCardFooter({ className, ...props }) {
  return <div className={cn('flex items-center justify-between gap-3 px-6 pb-6 pt-3', className)} {...props} />
}
