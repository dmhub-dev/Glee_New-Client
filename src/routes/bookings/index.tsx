import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { useAdminEventTickets, useAdminEvents } from '@glee/api'
import { Badge, Button, Input, Progress, Skeleton } from '@glee/ui'
import { CalendarClock, MapPin, Search, Ticket, Users } from 'lucide-react'
import type { Event } from '@glee/types'

const PLACEHOLDER = '/glee-image-fallback.svg'

function eventDate(event: Event) {
  return new Date(`${event.startDate}T${event.startTime || '00:00'}`).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function allTiers(event: Event) {
  return event.ticketWaves?.length ? event.ticketWaves.flatMap(wave => wave.ticketTiers) : event.ticketTiers
}

function EventBookingRow({ event }: { event: Event }) {
  const navigate = useNavigate()
  const { data, isLoading } = useAdminEventTickets(event.id)
  const tickets = data?.tickets ?? []
  const capacity = allTiers(event).reduce((sum, tier) => sum + tier.quantity, 0)
  const sold = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
  const remaining = Math.max(0, capacity - sold)
  const soldPct = capacity === 0 ? 0 : Math.min(100, Math.round((sold / capacity) * 100))
  const poster = event.flyerSquareUrl ?? event.flyerPortraitUrl ?? PLACEHOLDER

  return (
    <article className="rounded-xl border border-admin bg-admin-surface p-3 shadow-admin transition hover:border-neon-pink/30 hover:bg-admin-overlay/40">
      <div className="grid gap-4 md:grid-cols-[144px_1fr_auto] md:items-center">
        <button type="button" onClick={() => navigate(`/dashboard/bookings/${event.id}`)} className="overflow-hidden rounded-lg bg-admin-overlay text-left">
          <img
            src={poster}
            alt={event.title}
            className="h-32 w-full object-cover md:h-24"
            onError={imageEvent => { imageEvent.currentTarget.src = PLACEHOLDER }}
          />
        </button>

        <div className="min-w-0 space-y-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-admin bg-admin-overlay text-admin-60">{event.status.replace('_', ' ')}</Badge>
              {event.categoryName && <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{event.categoryName}</Badge>}
            </div>
            <button type="button" onClick={() => navigate(`/dashboard/bookings/${event.id}`)} className="block truncate text-left font-heading text-base font-black text-foreground hover:text-neon-pink">
              {event.title}
            </button>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-admin-40">
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-neon-pink" />{eventDate(event)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-neon-pink" />{event.location ?? 'No location'}</span>
            </div>
          </div>

          <div className="max-w-xl space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-admin-40">{sold.toLocaleString()} sold</span>
              <span className="text-admin-40">{remaining.toLocaleString()} remaining</span>
            </div>
            <Progress value={soldPct} className="h-2 bg-admin-body [&>div]:bg-neon-pink" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
          <div className="text-right">
            <p className="text-xs text-admin-40">Tickets sold</p>
            <p className="font-heading text-2xl font-black text-foreground">{isLoading ? '...' : sold.toLocaleString()}</p>
          </div>
          <Button size="sm" onClick={() => navigate(`/dashboard/bookings/${event.id}`)} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
            <Users className="h-4 w-4" />
            Open check-in
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function BookingsPage() {
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return (events ?? []).filter(event =>
      search.trim() === '' ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      (event.location ?? '').toLowerCase().includes(search.toLowerCase()),
    )
  }, [events, search])

  return (
    <AdminLayout
      title="Event Check-ins"
      subtitle="Select an event, validate attendee QR codes, and monitor entry progress."
    >
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search events..."
            className="bg-admin-input border-admin pl-8"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No events found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => <EventBookingRow key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
