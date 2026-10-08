import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '../../lib/utils'

import 'react-day-picker/style.css'

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim())
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const macNavButtonClass =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#007aff] transition hover:bg-black/[0.06] active:bg-black/10 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10'

const macCalendarClassNames = {
  months: 'flex flex-col',
  month: 'relative w-full',
  month_caption: 'relative z-10 mb-2 flex h-11 items-center justify-center px-12',
  caption_label:
    'pointer-events-none select-none text-[15px] font-semibold capitalize tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]',
  button_previous: cn(macNavButtonClass, 'absolute left-0 top-0 z-20'),
  button_next: cn(macNavButtonClass, 'absolute right-0 top-0 z-20'),
  month_grid: 'relative z-0 w-full border-collapse',
  weekdays: 'flex px-1',
  weekday: 'w-9 text-center text-[11px] font-semibold text-[#86868b]',
  week: 'mt-1 flex w-full px-1',
  day: 'relative h-9 w-9 p-0 text-center',
  day_button:
    'inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium text-[#1d1d1f] transition hover:bg-black/[0.06] dark:text-[#f5f5f7] dark:hover:bg-white/10',
  selected:
    '!bg-[#007aff] !text-white hover:!bg-[#007aff] hover:!text-white focus:!bg-[#007aff] focus:!text-white',
  today: 'font-semibold text-[#007aff]',
  outside: 'text-[#aeaeb2] opacity-70',
  disabled: 'pointer-events-none opacity-30',
  hidden: 'invisible',
}

function MacMonthNavButton({ className, children, ...props }) {
  return (
    <button {...props} className={cn(className)}>
      {children}
    </button>
  )
}

const macTriggerClass =
  'h-10 w-full rounded-[10px] border border-black/10 bg-[#f5f5f7] px-3 text-sm text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] outline-none transition focus:border-[#007aff] focus:bg-white focus:ring-4 focus:ring-[#007aff]/20 dark:border-white/10 dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:bg-[#1c1c1e]'

export function CrmDatePicker({
  value,
  onChange,
  placeholder = 'Seleccione fecha',
  required = false,
  disabled = false,
  allowClear = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = useMemo(() => parseIsoDate(value), [value])

  const displayValue = selectedDate
    ? format(selectedDate, 'dd MMM yyyy', { locale: es })
    : ''

  function handleSelect(date) {
    if (!date) return
    onChange(toIsoDate(date))
    setOpen(false)
  }

  function handleClear(event) {
    event.preventDefault()
    event.stopPropagation()
    onChange('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-required={required || undefined}
          aria-expanded={open}
          className={cn(
            macTriggerClass,
            'inline-flex min-w-0 items-center justify-between gap-2 overflow-hidden text-left',
            !displayValue && 'text-[#86868b] dark:text-[#98989d]',
            disabled && 'cursor-not-allowed opacity-60',
            className,
          )}
        >
          <span className="inline-flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#007aff]" aria-hidden="true" />
            <span className="truncate capitalize">{displayValue || placeholder}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-[#86868b]">
            Elegir
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-[220] w-auto overflow-hidden rounded-[12px] border border-black/10 bg-white/95 p-0 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/95"
      >
        <DayPicker
          mode="single"
          navLayout="around"
          locale={es}
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate || new Date()}
          showOutsideDays
          className="p-3 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif]"
          classNames={macCalendarClassNames}
          components={{
            PreviousMonthButton: (props) => (
              <MacMonthNavButton {...props} aria-label={props['aria-label'] || 'Mes anterior'}>
                <ChevronLeft className="pointer-events-none h-5 w-5" aria-hidden="true" />
              </MacMonthNavButton>
            ),
            NextMonthButton: (props) => (
              <MacMonthNavButton {...props} aria-label={props['aria-label'] || 'Mes siguiente'}>
                <ChevronRight className="pointer-events-none h-5 w-5" aria-hidden="true" />
              </MacMonthNavButton>
            ),
          }}
        />
        {allowClear && displayValue && (
          <div className="border-t border-black/5 px-3 py-2 dark:border-white/10">
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-md px-2 py-1.5 text-xs font-medium text-[#007aff] transition hover:bg-[#007aff]/10"
            >
              Quitar fecha
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
