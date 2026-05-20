import { useMemo } from 'react'
import { useEvents } from '@glee/api'
import PageWrapper from '../components/layout/PageWrapper'
import FeaturedCarousel from '../components/events/FeaturedCarousel'
import EventGrid from '../components/events/EventGrid'

export default function LandingPage() {
  const { data: events = [], isLoading } = useEvents()

  const liveEvents = useMemo(
    () =>
      events
        .filter(e => e.status === 'live')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  )

  return (
    <PageWrapper
      fullWidthTop={<FeaturedCarousel events={liveEvents.slice(0, 5)} isLoading={isLoading} />}
      fullWidthContent={
        <section className="px-4 sm:px-6 lg:px-8 mt-10 pb-16">
          <h2 className="font-heading font-black text-3xl text-foreground mb-6">Upcoming Events</h2>
          <EventGrid events={liveEvents} isLoading={isLoading} />
        </section>
      }
    />
  )
}
