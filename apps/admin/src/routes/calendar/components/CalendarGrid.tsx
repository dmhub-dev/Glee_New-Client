import { useState } from 'react'
import type { Event } from '@glee/types'
import { cn } from '@glee/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EventChip } from './EventChip'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface CalendarGridProps {
  eventsByDate: Map<string, Event[]>
  onSelectEvent: (event: Event) => void
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarGrid({ eventsByDate, onSelectEvent }: CalendarGridProps) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Build 6×7 grid of { year, month, day, isCurrentMonth }
  type Cell = { year: number; month: number; day: number; isCurrentMonth: boolean }
  const cells: Cell[] = []

  // Prev month fill
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ year: y, month: m, day: d, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, isCurrentMonth: true })
  }

  // Next month fill
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ year: y, month: m, day: d, isCurrentMonth: false })
  }

  function isToday(cell: Cell): boolean {
    return (
      cell.isCurrentMonth &&
      cell.day === today.getDate() &&
      cell.month === today.getMonth() &&
      cell.year === today.getFullYear()
    )
  }

  function prevMonth() {
    setCursor(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCursor(new Date(year, month + 1, 1))
  }

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
      {/* Month nav header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-admin">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-admin-40 hover:text-foreground hover:bg-admin-overlay transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="font-heading font-bold text-base text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-admin-40 hover:text-foreground hover:bg-admin-overlay transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-admin">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-admin-40 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-admin">
        {cells.map((cell, idx) => {
          const key = toKey(cell.year, cell.month, cell.day)
          const events = eventsByDate.get(key) ?? []
          const visible = events.slice(0, 2)
          const overflow = events.length - visible.length

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[96px] p-1.5 flex flex-col gap-1',
                !cell.isCurrentMonth && 'opacity-30',
              )}
            >
              {/* Date number */}
              <span className={cn(
                'text-xs font-semibold self-end w-6 h-6 flex items-center justify-center rounded-full',
                isToday(cell)
                  ? 'bg-neon-pink text-white'
                  : 'text-admin-50',
              )}>
                {cell.day}
              </span>

              {/* Event chips */}
              {visible.map(event => (
                <EventChip key={event.id} event={event} onClick={onSelectEvent} />
              ))}

              {/* Overflow */}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectEvent(events[2])}
                  className="text-[10px] text-admin-40 hover:text-neon-pink transition-colors text-left px-1"
                >
                  +{overflow} more
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
