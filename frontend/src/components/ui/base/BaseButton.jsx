import { cn } from './utils'

const VARIANTS = {
  primary: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 focus-visible:ring-primary/30',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-background text-foreground shadow-sm hover:bg-accent',
  ghost: 'bg-transparent text-foreground hover:bg-accent',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  default: 'h-11 px-5 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 px-0',
}

export function BaseButton({ variant = 'primary', size = 'default', className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
