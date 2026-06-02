import { useNavigate } from 'react-router-dom'
import { useMyTickets } from '@glee/api'
import { Badge, Button, Skeleton } from '@glee/ui'
import { Calendar, MapPin, QrCode, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/240x320/F8FAFC/DB2777?text=Glee'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerTicketsPage() {
  const { data: groups, isLoading } = useMyTickets()
  const navigate = useNavigate()

  return (
    <CustomerLayout title="My Tickets" subtitle="Your event passes, QR codes, and purchase history.">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="rounded-xl border border-admin bg-admin-surface p-12 text-center shadow-admin">
          <Ticket className="mx-auto h-10 w-10 text-neon-pink" />
          <p className="mt-3 text-sm font-semibold text-foreground">No tickets yet</p>
          <p className="mt-1 text-xs text-admin-50">Tickets you buy will appear here with their QR codes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin">
          <div className="hidden grid-cols-[88px_1.5fr_1fr_120px_110px_110px] gap-4 border-b border-admin bg-admin-input px-4 py-3 text-xs font-semibold uppercase tracking-wide text-admin-50 lg:grid">
            <span>Event</span>
            <span>Details</span>
            <span>Location</span>
            <span>Tickets</span>
            <span>Total</span>
            <span></span>
          </div>
          <div className="divide-y divide-[color:var(--admin-border)]">
            {(groups ?? []).map(group => {
              const event = group.event
              const poster = event.photos?.[1] ?? event.photos?.[0] ?? PLACEHOLDER
              const category = event.category?.name ?? 'Event'
              const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
              const firstTicket = group.tickets[0]

              return (
                <div key={event.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[88px_1.5fr_1fr_120px_110px_110px] lg:items-center">
                  <img
                    src={poster}
                    alt={event.name}
                    className="h-24 w-20 rounded-lg border border-admin object-cover lg:h-20 lg:w-16"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                  />
                  <div className="min-w-0">
                    <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{category}</Badge>
                    <h2 className="mt-2 truncate font-heading text-lg font-black text-foreground">{event.name}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-admin-60">
                      <Calendar className="h-4 w-4 text-neon-pink" />
                      {formatDate(event.startDate)}
                    </p>
                  </div>
                  <p className="flex min-w-0 items-center gap-2 text-sm text-admin-70">
                    <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                    <span className="truncate">{location}</span>
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{group.noOfTicketsPurchased} purchased</p>
                    <p className="text-xs text-admin-50">{group.tickets.length} order{group.tickets.length === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">{money(Number(group.totalPrice ?? 0))}</p>
                  <Button
                    type="button"
                    onClick={() => navigate(`/app/tickets/${event.id}`)}
                    disabled={!firstTicket}
                    className="w-fit rounded-full bg-neon-pink text-white hover:bg-neon-pink/90"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
