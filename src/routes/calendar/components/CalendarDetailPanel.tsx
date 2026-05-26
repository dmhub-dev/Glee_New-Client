// apps/admin/src/routes/calendar/components/CalendarDetailPanel.tsx
import { useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { SlidePanel } from '../../../components/ui/SlidePanel'
import { cn } from '@glee/ui'
import { MapPin, Clock, Ticket, ExternalLink } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  live:             'bg-green-500/20 text-green-400 border-green-500/30',
  draft:            'bg-amber-500/20 text-amber-400 border-amber-500/30',
  pending_approval: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  past:             'bg-admin-overlay text-admin-40 border-admin',
  cancelled:        'bg-red-500/20 text-red-400 border-red-500/30',
  postponed:        'bg-orange-500/20 text-orange-400 border-orange-500/30',
  rejected:         'bg-admin-overlay text-admin-30 border-admin',
}

const STATUS_LABELS: Record<string, string> = {
  live:             'Live',
  draft:            'Draft',
  pending_approval: 'Pending Approval',
  past:             'Past',
  cancelled:        'Cancelled',
  postponed:        'Postponed',
  rejected:         'Rejected',
}

const PLACEHOLDER = 'https://placehold.co/600x400/141419/FF2D8F?text=Glee'

interface CalendarDetailPanelProps {
  event: Event | null
  onClose: () => void
}

export function CalendarDetailPanel({ event, onClose }: CalendarDetailPanelProps) {
  const navigate = useNavigate()

  function formatDateTime(date: string, time: string, endTime?: string): string {
    const d = new Date(`${date}T${time}`)
    const datePart = d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    const timePart = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
    if (endTime) {
      const end = new Date(`${date}T${endTime}`)
      return `${datePart} · ${timePart} – ${end.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    }
    return `${datePart} · ${timePart}`
  }

  return (
    <SlidePanel
      open={!!event}
      onClose={onClose}
      title="Event Details"
      width="sm:max-w-md"
    >
      {event && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Banner */}
          <div className="shrink-0 h-48 bg-admin-overlay overflow-hidden">
            <img
              src={event.flyerSquareUrl ?? event.flyerPortraitUrl ?? PLACEHOLDER}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
            />
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Name + badge */}
            <div className="flex items-start gap-3">
              <h3 className="font-heading font-bold text-lg text-foreground flex-1 leading-snug">
                {event.title}
              </h3>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 mt-0.5',
                STATUS_BADGE[event.status] ?? STATUS_BADGE.past,
              )}>
                {STATUS_LABELS[event.status] ?? event.status}
              </span>
            </div>

            {/* Date/time */}
            {event.startDate && event.startTime && (
              <div className="flex items-start gap-2 text-sm text-admin-60">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-neon-pink" />
                <span>{formatDateTime(event.startDate, event.startTime, event.endTime)}</span>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-2 text-sm text-admin-60">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-neon-pink" />
                <span>{event.location}</span>
              </div>
            )}

            {/* Ticket tiers */}
            {event.ticketTiers.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-admin-40 uppercase tracking-wider">
                  <Ticket className="w-3.5 h-3.5" />
                  Ticket Tiers
                </div>
                <div className="flex flex-col gap-1.5">
                  {event.ticketTiers.map(tier => (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between bg-admin-overlay rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-admin-70 font-medium">{tier.name}</span>
                      <div className="flex items-center gap-3 text-xs text-admin-50">
                        <span className="font-mono font-semibold text-foreground">
                          KES {tier.price.toLocaleString()}
                        </span>
                        <span>
                          {tier.quantityRemaining}/{tier.quantity} left
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto px-6 py-4 border-t border-admin shrink-0">
            <button
              type="button"
              onClick={() => { onClose(); navigate(`/dashboard/events/${event.id}`) }}
              className="w-full flex items-center justify-center gap-2 bg-neon-pink hover:bg-neon-pink/90 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Event
            </button>
          </div>
        </div>
      )}
    </SlidePanel>
  )
}
