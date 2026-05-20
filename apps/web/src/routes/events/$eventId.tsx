import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '@glee/api'
import { Button, Skeleton } from '@glee/ui'
import PageWrapper from '../../components/layout/PageWrapper'
import TicketTierList from '../../components/tickets/TicketTierList'

const PLACEHOLDER = 'https://placehold.co/400x600/0B0B10/FF2D8F?text=Glee'

function formatDetailDate(date: string, startTime: string, endTime?: string): string {
  const d = new Date(`${date}T${startTime}`)
  const dateStr = d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const startStr = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (!endTime) return `${dateStr} · ${startStr}`
  const endDate = new Date(`${date}T${endTime}`)
  const endStr = endDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${dateStr} · ${startStr} – ${endStr}`
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Skeleton className="w-full aspect-[2/3] rounded-lg" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            <Skeleton className="h-6 w-1/3" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            <Skeleton className="h-11 w-full mt-2" />
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!event) {
    navigate('/', { replace: true })
    return null
  }

  const selectedTier = event.ticketTiers.find(t => t.id === selectedTierId)
  const formattedDate = formatDetailDate(event.date, event.startTime, event.endTime)

  const handleProceed = () => {
    if (!selectedTier) return
    navigate('/checkout', {
      state: {
        eventId: event.id,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        tierPrice: selectedTier.price,
        eventTitle: event.title,
        eventDate: formattedDate,
      },
    })
  }

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <img
            src={event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER}
            alt={event.title}
            className="w-full max-h-[600px] object-cover rounded-lg"
            onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
          <div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-foreground mb-3">
              {event.title}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mb-1">{formattedDate}</p>
            <p className="text-glee-text-muted text-sm mb-6">{event.venueId}</p>
            <p className="text-foreground/80 leading-relaxed">{event.description}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24 flex flex-col gap-4">
            <h2 className="font-heading font-bold text-xl text-foreground">Get Tickets</h2>
            <TicketTierList
              tiers={event.ticketTiers}
              selectedTierId={selectedTierId}
              onSelect={setSelectedTierId}
            />
            <Button
              disabled={!selectedTierId}
              onClick={handleProceed}
              className="w-full mt-2 bg-neon-pink hover:bg-neon-hover text-white font-semibold disabled:opacity-40"
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
