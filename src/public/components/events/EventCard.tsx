import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Event } from '@glee/types'
import { Button } from '@glee/ui'
import { formatDateRange, formatTimeOnly } from '@glee/utils'
import { RotatingMediaCover, normalizeMediaImages } from '../../../components/media/MediaGallery'

const PLACEHOLDER = '/glee-image-fallback.svg'

function formatEventDate(startDate: string, endDate: string, startTime: string): string {
  const datePart = formatDateRange(
    startDate,
    endDate,
    { weekday: 'short', day: 'numeric', month: 'short' },
    { day: 'numeric', month: 'short' },
    { day: 'numeric', month: 'short', year: 'numeric' },
  )
  const timePart = formatTimeOnly(startTime)
  return timePart ? `${datePart} · ${timePart}` : datePart
}

function lowestAvailablePrice(event: Event): number {
  const available = event.ticketTiers.filter(t => t.quantityRemaining > 0)
  const tiers = available.length > 0 ? available : event.ticketTiers
  return Math.min(...tiers.map(t => t.price))
}

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()
  const locationLabel = event.location ?? event.venueId ?? 'Location TBA'
  const price = lowestAvailablePrice(event)
  const mediaImages = normalizeMediaImages(event.images ?? [event.flyerSquareUrl, event.flyerPortraitUrl], PLACEHOLDER)

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex overflow-hidden rounded-2xl border border-white/15 bg-white/[0.10] p-3 text-left transition-all duration-300 hover:border-neon-pink/50 hover:bg-white/[0.14] hover:shadow-neon sm:h-[318px] sm:flex-col sm:p-0 lg:h-[300px]"
      onClick={() => navigate(`/events/${event.id}`)}
      onKeyDown={keyEvent => {
        if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return
        keyEvent.preventDefault()
        navigate(`/events/${event.id}`)
      }}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-44 sm:w-full sm:rounded-none lg:h-40">
        <RotatingMediaCover images={mediaImages} alt={event.title} fallback={PLACEHOLDER} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1.5 px-3 py-1 sm:p-3">
        <h3 className="shrink-0 font-heading text-base font-bold leading-tight text-white line-clamp-1 lg:text-sm">
          {event.title}
        </h3>
        <div className="min-w-0 shrink-0 space-y-1">
          <p className="line-clamp-1 text-xs font-mono font-bold uppercase leading-4 tracking-wide text-neon-pink">
            {formatEventDate(event.startDate, event.endDate, event.startTime)}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {locationLabel}
          </p>
        </div>
        <p className="hidden max-h-10 overflow-hidden text-xs leading-5 text-white/80 line-clamp-2 sm:block">{event.description}</p>

        <div className="flex shrink-0 items-center justify-between gap-2 pt-1">
          <span className="font-heading text-sm font-black text-white">KSh {price.toLocaleString()}</span>
          <Button
            size="sm"
            className="h-8 rounded-full bg-neon-pink px-3 text-xs font-semibold text-white transition-all hover:bg-neon-hover active:scale-95"
            onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  )
}
