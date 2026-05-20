import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Autoplay from 'embla-carousel-autoplay'
import type { Event } from '@glee/types'
import { Carousel, CarouselContent, CarouselItem, Button, Skeleton } from '@glee/ui'

const PLACEHOLDER = 'https://placehold.co/1200x700/0B0B10/FF2D8F?text=Glee'

function formatCarouselDate(date: string, startTime: string): string {
  const d = new Date(`${date}T${startTime}`)
  return (
    d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
}

interface FeaturedCarouselProps {
  events: Event[]
  isLoading?: boolean
}

export default function FeaturedCarousel({ events, isLoading }: FeaturedCarouselProps) {
  const navigate = useNavigate()
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }))

  if (isLoading) {
    return <Skeleton className="w-full h-[70vh]" />
  }

  if (events.length === 0) return null

  return (
    <Carousel plugins={[plugin.current]} opts={{ loop: true }} className="w-full">
      <CarouselContent>
        {events.map(event => (
          <CarouselItem key={event.id}>
            <div
              className="relative w-full h-[70vh] overflow-hidden cursor-pointer"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <img
                src={event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-glee-bg via-glee-bg/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-3xl">
                <h2 className="font-heading font-black text-4xl md:text-6xl text-white mb-3 leading-tight">
                  {event.title}
                </h2>
                <p className="text-glee-text-muted font-mono text-sm mb-6">
                  {formatCarouselDate(event.date, event.startTime)}
                </p>
                <Button
                  className="bg-neon-pink hover:bg-neon-hover text-white font-semibold px-8 shadow-neon"
                  onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
                >
                  View Event
                </Button>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
