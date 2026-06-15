import { useState, useEffect, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { Button, Skeleton } from '@glee/ui'
import { formatDateRange, formatTimeOnly } from '@glee/utils'

const PLACEHOLDER = 'https://placehold.co/900x1200/0B0B10/FF2D8F?text=Glee'

function formatCarouselDate(startDate: string, endDate: string, startTime: string): string {
  const datePart = formatDateRange(
    startDate,
    endDate,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    { weekday: 'short', day: 'numeric', month: 'short' },
    { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
  )
  const timePart = formatTimeOnly(startTime)
  return timePart ? `${datePart} · ${timePart}` : datePart
}

interface FeaturedCarouselProps {
  events: Event[]
  isLoading?: boolean
}

export default function FeaturedCarousel({ events, isLoading }: FeaturedCarouselProps) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent(i => (i + 1) % events.length)
  }, [events.length])

  useEffect(() => {
    if (events.length <= 1) return
    const id = setInterval(next, 4500)
    return () => clearInterval(id)
  }, [next, events.length])

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full rounded-2xl" />
  }

  if (events.length === 0) return null

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {events.map((e, i) => {
            const active = i === current
            const lowestPrice = Math.min(...e.ticketTiers.map(tier => tier.price))
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={active ? 0 : -1}
                aria-label={`View details for ${e.title}`}
                onClick={() => {
                  setCurrent(i)
                  navigate(`/events/${e.id}`)
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setCurrent(i)
                  navigate(`/events/${e.id}`)
                }}
                className={[
                  'group relative h-[350px] w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 text-left shadow-[0_18px_48px_rgba(0,0,0,0.42)] transition-transform duration-500',
                  active ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
              >
                <img
                  src={e.flyerPortraitUrl ?? e.flyerSquareUrl ?? PLACEHOLDER}
                  alt={e.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={ev => { (ev.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
                <div className="absolute left-3 top-3 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-white backdrop-blur-md">
                  {e.categoryName ?? 'Event'}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-neon-pink">
                    {formatCarouselDate(e.startDate, e.endDate, e.startTime)}
                  </p>
                  <h3 className="mt-1 max-w-xs font-heading text-xl font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    {e.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                    <MapPin className="h-3 w-3" />
                    {e.location ?? e.venueId ?? 'Location TBA'}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="font-heading text-lg font-black text-white">
                      From KSh {lowestPrice.toLocaleString()}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20"
                      onClick={clickEvent => { clickEvent.stopPropagation(); navigate(`/events/${e.id}`) }}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {events.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-neon-pink' : 'w-2 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

      <Link to="/" className="sr-only">Glee home</Link>
    </div>
  )
}
