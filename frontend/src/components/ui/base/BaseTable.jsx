import { cn } from './utils'

export function BaseTable({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('min-w-full border-separate border-spacing-0 text-sm', className)} {...props} />
    </div>
  )
}

export function BaseTableHead({ className, ...props }) {
  return <thead className={cn('bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground', className)} {...props} />
}

export function BaseTableBody({ className, ...props }) {
  return <tbody className={cn('divide-y divide-border/70', className)} {...props} />
}

export function BaseTableRow({ className, ...props }) {
  return <tr className={cn('transition-colors hover:bg-accent/60', className)} {...props} />
}

export function BaseTableHeadCell({ className, ...props }) {
  return <th className={cn('whitespace-nowrap px-4 py-3 font-bold text-muted-foreground', className)} {...props} />
}

export function BaseTableCell({ className, ...props }) {
  return <td className={cn('whitespace-nowrap px-4 py-3 text-foreground/85', className)} {...props} />
}
