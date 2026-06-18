import type { ReactNode } from 'react'
import type { Event } from '@glee/types'
import { EmptyState, Skeleton } from '@glee/ui'
import { CalendarX2 } from 'lucide-react'
import EventCard from './EventCard'

interface EventGridProps {
  events: Event[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
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

export default function EventGrid({ events, isLoading, emptyTitle, emptyDescription, emptyAction }: EventGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 className="h-6 w-6" />}
        title={emptyTitle ?? 'No upcoming events right now'}
        description={emptyDescription ?? 'Check back soon for new Glee experiences.'}
        action={emptyAction}
        variant="customer"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
      {events.map(event => <EventCard key={event.id} event={event} />)}
    </div>
  )
}
