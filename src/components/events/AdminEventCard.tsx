import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { cn, Progress } from '@glee/ui'
import { Pencil, Trash2, MapPin } from 'lucide-react'

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

const STATUS_CONFIG = {
  active:           { label: 'Active',           dot: 'bg-green-400',  text: 'text-green-400'  },
  live:             { label: 'Live',             dot: 'bg-neon-pink',  text: 'text-neon-pink'  },
  ended:            { label: 'Ended',            dot: 'bg-admin-40',   text: 'text-admin-40'   },
  pending_approval: { label: 'Pending Approval', dot: 'bg-sky-400',    text: 'text-sky-400'    },
  draft:            { label: 'Draft',            dot: 'bg-amber-400',  text: 'text-amber-400'  },
  cancelled:        { label: 'Cancelled',        dot: 'bg-red-500',    text: 'text-red-400'    },
  rejected:         { label: 'Rejected',         dot: 'bg-red-400',    text: 'text-red-300'    },
  postponed:        { label: 'Postponed',        dot: 'bg-orange-400', text: 'text-orange-400' },
  sold_out:         { label: 'Sold Out',         dot: 'bg-admin-30',   text: 'text-admin-30'   },
}

function ticketsSoldPercent(event: Event): number {
  const totalQty = event.ticketTiers.reduce((s, t) => s + t.quantity, 0)
  const sold = event.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0)
  if (totalQty === 0) return 0
  return Math.round((sold / totalQty) * 100)
}

function lowestPrice(event: Event): number {
  if (event.ticketTiers.length === 0) return 0
  return Math.min(...event.ticketTiers.map(t => t.price))
}

function formatEventDate(startDate: string, endDate: string, startTime: string): string {
  const d = new Date(`${startDate}T${startTime}`)
  const datePart = endDate !== startDate
    ? new Date(startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) +
      ' – ' +
      new Date(endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
  return datePart + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

interface AdminEventCardProps {
  event: Event
  onDelete?: (id: string) => void
  canDelete?: boolean
}

export default function AdminEventCard({ event, onDelete, canDelete = true }: AdminEventCardProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const status = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft
  const soldPercent = ticketsSoldPercent(event)
  const categoryLabel = event.categoryName ?? 'Uncategorized'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/dashboard/events/${event.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/dashboard/events/${event.id}`)}
      className={cn(
        'bg-admin-surface border border-admin rounded-2xl overflow-hidden transition-all duration-200 shadow-admin cursor-pointer',
        hovered && 'border-neon-pink/40 shadow-neon'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.flyerSquareUrl ?? PLACEHOLDER}
          alt={event.title}
          className={cn('w-full h-full object-cover transition-transform duration-300', hovered && 'scale-105')}
          onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        {/* Category badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full px-2 py-0.5 max-w-[45%] truncate">
          {categoryLabel}
        </div>
        {/* Status badge */}
        <div className={cn('absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium', status.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.dot)} />
          {status.label}
        </div>
        {/* Hover actions */}
        {hovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); navigate(`/dashboard/events/${event.id}/edit`) }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-neon-pink/80 border border-white/20 flex items-center justify-center text-white transition-colors"
              title="Edit event"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {canDelete && onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(event.id) }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/80 border border-white/20 flex items-center justify-center text-white transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-heading font-bold text-sm text-foreground line-clamp-1">{event.title}</h3>
        <p className="text-xs text-admin-40 font-mono">{formatEventDate(event.startDate, event.endDate, event.startTime)}</p>
        {event.location && (
          <p className="text-xs text-admin-30 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-admin-40">Tickets sold</span>
            <span className="text-neon-pink font-mono font-semibold">{soldPercent}%</span>
          </div>
          <Progress value={soldPercent} className="h-1.5 bg-admin-overlay [&>div]:bg-neon-pink" />
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-admin-30">From</span>
          <span className="font-mono font-semibold text-sm text-neon-pink">
            KSh {lowestPrice(event).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
