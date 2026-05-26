import type { Event } from '@glee/types'
import { cn } from '@glee/ui'

const STATUS_CHIP: Record<string, string> = {
  active:    'bg-green-500/20 text-green-400 border-green-500/30',
  draft:     'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  postponed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  sold_out:  'bg-admin-overlay text-admin-40 border-admin',
}

interface EventChipProps {
  event: Event
  onClick: (event: Event) => void
}

export function EventChip({ event, onClick }: EventChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={cn(
        'w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate',
        'transition-opacity hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-neon-pink/50',
        STATUS_CHIP[event.status] ?? STATUS_CHIP.draft,
      )}
    >
      {event.title}
    </button>
  )
}
