import type { Event } from '@glee/types'
import { Skeleton } from '@glee/ui'
import EventCard from './EventCard'

interface EventGridProps {
  events: Event[]
  isLoading?: boolean
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <Skeleton className="h-36 w-full" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  )
}

export default function EventGrid({ events, isLoading }: EventGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-lg">No upcoming events right now.</p>
        <p className="text-muted-foreground text-sm mt-1">Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
      {events.map(event => <EventCard key={event.id} event={event} />)}
    </div>
  )
}
