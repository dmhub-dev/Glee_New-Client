import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMyReservations, useMyTickets } from '@glee/api'
import { Badge, Button, Input, Skeleton, cn } from '@glee/ui'
import { Calendar, CalendarCheck, Clock, MapPin, MessageCircle, QrCode, Search, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import ReservationBookingsList from '../reservations/ReservationBookingsList'
import { ENABLE_RESERVATIONS } from '../../config/features'

const PLACEHOLDER = 'https://placehold.co/900x600/141419/FF2D8F?text=Glee'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value?: string | null) {
  if (!value) return 'Time TBA'
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

export default function CustomerTicketsPage() {
  const { data: groups, isLoading } = useMyTickets()
  const { data: reservationsData } = useMyReservations({ page: 1, limit: 100 }, { enabled: ENABLE_RESERVATIONS })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = ENABLE_RESERVATIONS && searchParams.get('tab') === 'reservations' ? 'reservations' : 'tickets'
  const [searchQuery, setSearchQuery] = useState('')
  const totalTickets = (groups ?? []).reduce((sum, group) => sum + group.noOfTicketsPurchased, 0)
  const paidReservationCount = useMemo(() => {
    return (reservationsData?.items ?? []).filter(reservation => {
      if (!['CONFIRMED', 'SEATED', 'COMPLETED'].includes(reservation.status)) return false

      const paymentStatus = reservation.paymentStatus ?? reservation.payment?.status
      if (paymentStatus) return paymentStatus === 'SUCCESS'
      if (reservation.payments?.length) return reservation.payments.some(payment => payment.status === 'SUCCESS')

      return true
    }).length
  }, [reservationsData?.items])
  const totalReservations = paidReservationCount
  const tabs = [
    { key: 'tickets' as const, label: `Tickets (${totalTickets})`, icon: Ticket },
    ...(ENABLE_RESERVATIONS ? [{ key: 'reservations' as const, label: `Reservations / Bookings (${totalReservations})`, icon: CalendarCheck }] : []),
  ]
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groups ?? []
    return (groups ?? []).filter(group => {
      const event = group.event
      const category = event.category?.name ?? ''
      const location = event.location?.name ?? event.location?.address ?? ''
      return [event.name, category, location]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query))
    })
  }, [groups, searchQuery])
  const now = Date.now()
  const upcomingGroups = filteredGroups.filter(group => !group.event.startDate || new Date(group.event.startDate).getTime() >= now)
  const pastGroups = filteredGroups.filter(group => group.event.startDate && new Date(group.event.startDate).getTime() < now)

  function renderTicketCard(group: NonNullable<typeof groups>[number], status: 'upcoming' | 'past') {
    const event = group.event
    const poster = event.photos?.[1] ?? event.photos?.[0] ?? PLACEHOLDER
    const category = event.category?.name ?? 'Event'
    const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
    const firstTicket = group.tickets[0]

    return (
      <article key={event.id} className={cn('w-full overflow-hidden rounded-2xl bg-white text-black shadow-xl', status === 'past' && 'opacity-60')}>
        <div className="relative h-36 w-full">
          <img
            src={poster}
            alt={event.name}
            className="h-full w-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
          <div className="absolute inset-0 bg-black/45" />
          <Badge className="absolute right-3 top-3 border-0 bg-neon-pink px-3 text-sm text-white">
            {group.noOfTicketsPurchased}x {category}
          </Badge>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="line-clamp-2 font-heading text-xl font-black leading-tight">{event.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/90">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{location}</span>
            </p>
          </div>
        </div>

        <div className="relative flex h-6 items-center bg-white px-2">
          <div className="absolute -left-2 h-4 w-4 rounded-full bg-[#050017]" />
          <div className="mx-2 w-full border-t-2 border-dashed border-gray-300" />
          <div className="absolute -right-2 h-4 w-4 rounded-full bg-[#050017]" />
        </div>

        <div className="flex items-center justify-between gap-4 bg-white p-4 pt-2">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Calendar className="h-4 w-4 text-neon-pink" />
              {formatDate(event.startDate)}
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-neon-pink" />
              {formatTime(event.startDate)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs uppercase tracking-wider text-gray-500">{group.tickets.length} order{group.tickets.length === 1 ? '' : 's'}</span>
              <span className="rounded bg-neon-pink/10 px-2 py-1 text-xs font-semibold text-neon-pink">{money(Number(group.totalPrice ?? 0))}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              onClick={() => navigate(`/app/events/${event.id}/chat`)}
              disabled={!firstTicket}
              className="h-12 w-12 rounded-xl bg-neon-pink p-0 text-white hover:bg-neon-pink/90 disabled:opacity-40"
              aria-label={`Open chat for ${event.name}`}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/app/tickets/${event.id}`)}
              disabled={!firstTicket}
              className="h-16 w-16 rounded-xl bg-gray-100 p-0 text-slate-900 hover:bg-gray-200 disabled:opacity-40"
              aria-label={`View QR for ${event.name}`}
            >
              <QrCode className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <CustomerLayout title="Tickets" subtitle="Your event passes, QR codes, and purchase history." hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-32 pt-6 lg:px-8">
        <section className="space-y-5">
          <div>
            <h1 className="font-heading text-2xl font-black text-white">{ENABLE_RESERVATIONS ? 'Tickets & Bookings' : 'Tickets'}</h1>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {ENABLE_RESERVATIONS ? 'Your tickets and reservations/bookings in one place.' : 'Your event passes, QR codes, and purchase history.'}
            </p>
          </div>

          <div className={ENABLE_RESERVATIONS ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3 sm:max-w-xs'}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <Ticket className="mx-auto mb-2 h-6 w-6 text-neon-pink" />
              <p className="text-2xl font-bold text-white">{totalTickets}</p>
              <p className="text-xs text-white/50">Total Tickets</p>
            </div>
            {ENABLE_RESERVATIONS && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-purple-400" />
                <p className="text-2xl font-bold text-white">{totalReservations}</p>
                <p className="text-xs text-white/50">Reservations / Bookings</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3" aria-label="Tickets and bookings tabs">
            {tabs.map(tab => {
              const active = activeTab === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSearchParams(tab.key === 'reservations' ? { tab: 'reservations' } : {})}
                  className={cn(
                    'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-xs font-bold transition active:scale-95 sm:flex-none sm:text-sm',
                    active
                      ? 'border-neon-pink bg-neon-pink text-white shadow-[0_0_22px_rgba(255,45,143,0.25)]'
                      : 'border-white/10 bg-white/[0.08] text-white/62 hover:border-white/20 hover:bg-white/[0.12] hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'tickets' && (
            <div className="space-y-2">
              <div className="group relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-white/55 transition-colors group-focus-within:text-neon-pink" />
                <Input
                  placeholder="Search bought tickets..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40 focus-visible:ring-neon-pink/50"
                />
              </div>
            </div>
          )}
        </section>

        {ENABLE_RESERVATIONS && activeTab === 'reservations' ? (
          <ReservationBookingsList />
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl bg-white/10" />)}
          </div>
        ) : (groups ?? []).length === 0 ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <Ticket className="mx-auto h-10 w-10 text-neon-pink" />
            <p className="mt-3 text-sm font-semibold text-white">No tickets yet</p>
            <p className="mt-1 text-xs text-white/50">Tickets you buy will appear here with QR codes.</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-10 text-center shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <Search className="mx-auto h-9 w-9 text-white/35" />
            <p className="mt-3 text-sm font-semibold text-white">No matching tickets</p>
            <p className="mt-1 text-xs text-white/50">Try event name, category, or location.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcomingGroups.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Upcoming ({upcomingGroups.length})</h2>
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {upcomingGroups.map(group => renderTicketCard(group, 'upcoming'))}
                </div>
              </section>
            )}
            {pastGroups.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white/55">Past ({pastGroups.length})</h2>
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {pastGroups.map(group => renderTicketCard(group, 'past'))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
