import { useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { Button } from '@glee/ui'

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

function formatEventDate(startDate: string, endDate: string, startTime: string): string {
  const d = new Date(`${startDate}T${startTime}`)
  const datePart = endDate !== startDate
    ? new Date(startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) +
      ' – ' +
      new Date(endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
  return datePart + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
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

  return (
    <div
      className="group flex flex-col bg-card rounded-lg overflow-hidden border border-border hover:border-neon-pink hover:shadow-neon transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.flyerSquareUrl ?? PLACEHOLDER}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="absolute top-3 right-3 bg-neon-pink text-white text-xs font-mono font-semibold px-3 py-1 rounded-full">
          From KSh {lowestAvailablePrice(event).toLocaleString()}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-heading font-bold text-lg text-foreground leading-tight line-clamp-1">
          {event.title}
        </h3>
        <p className="text-xs text-muted-foreground font-mono">
          {formatEventDate(event.startDate, event.endDate, event.startTime)}
        </p>
        <p className="text-xs text-glee-text-muted">{locationLabel}</p>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{event.description}</p>

        <Button
          size="sm"
          className="mt-2 w-full rounded-full bg-neon-pink hover:bg-neon-hover text-white font-semibold transition-all hover:scale-[1.02] active:scale-95"
          onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
        >
          View More
        </Button>
      </div>
    </div>
  )
}
