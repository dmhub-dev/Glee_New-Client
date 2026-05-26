import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { Button, Skeleton } from '@glee/ui'

const PLACEHOLDER = 'https://placehold.co/1200x700/0B0B10/FF2D8F?text=Glee'

function formatCarouselDate(startDate: string, endDate: string, startTime: string): string {
  const d = new Date(`${startDate}T${startTime}`)
  const datePart = endDate !== startDate
    ? new Date(startDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' – ' +
      new Date(endDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return datePart + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
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
    return <Skeleton className="w-full h-[88vh]" />
  }

  if (events.length === 0) return null

  const event = events[current]

  return (
    <div className="relative w-full h-[88vh] overflow-hidden">
      {events.map((e, i) => (
        <div
          key={e.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={e.flyerPortraitUrl ?? e.flyerSquareUrl ?? PLACEHOLDER}
            alt={e.title}
            className="w-full h-full object-cover"
            onError={ev => { (ev.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

      {/* Floating logo with dark backdrop */}
      <div className="absolute top-7 left-8 z-10 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
        <Link to="/">
          <img src="/glee-logo-final.svg" alt="Glee" className="h-10" />
        </Link>
      </div>

      {/* Event info */}
      <div
        className="absolute bottom-0 left-0 right-0 px-8 pb-14 md:px-14 cursor-pointer max-w-3xl"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <h2 className="font-heading font-black text-5xl md:text-7xl text-white mb-3 leading-tight drop-shadow-lg">
          {event.title}
        </h2>
        <p className="text-white/60 font-mono text-sm mb-3 tracking-wide">
          {formatCarouselDate(event.startDate, event.endDate, event.startTime)}
        </p>
        <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8 line-clamp-2">
          {event.description}
        </p>
        <Button
          variant="outline"
          className="rounded-full border-white/70 text-white bg-transparent hover:bg-neon-pink hover:border-neon-pink hover:text-white px-8 py-2 text-sm font-semibold shadow-none transition-colors duration-200"
          onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
        >
          View Event
        </Button>
      </div>

      {events.length > 1 && (
        <div className="absolute bottom-10 right-8 flex items-center gap-2">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'bg-neon-pink w-6 h-2' : 'bg-white/35 w-2 h-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
