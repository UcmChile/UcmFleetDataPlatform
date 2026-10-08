import { cn } from './utils'

export function BaseInput({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
