import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyReservations, type ReservationStatus } from '@glee/api'
import { Badge, Button, Input, Skeleton, cn } from '@glee/ui'
import { Calendar, CalendarCheck, Clock, MapPin, QrCode, Search, Users } from 'lucide-react'

const PLACEHOLDER = 'https://placehold.co/900x600/141419/FF2D8F?text=Glee'

const PAID_RESERVATION_STATUSES: ReservationStatus[] = ['CONFIRMED', 'SEATED', 'COMPLETED']

function money(value: string | number | undefined) {
  return `KSh ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value?: string | null) {
  if (!value) return 'Time TBA'
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

function statusTone(status: ReservationStatus) {
  if (status === 'CONFIRMED') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
  if (status === 'SEATED' || status === 'COMPLETED') return 'border-sky-400/30 bg-sky-400/10 text-sky-300'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'border-red-400/30 bg-red-400/10 text-red-300'
  return 'border-amber-400/30 bg-amber-400/10 text-amber-300'
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, match => match.toUpperCase())
}

function venueImage(reservation: { location?: { pictures?: string[] } | null }) {
  return reservation.location?.pictures?.[0] ?? PLACEHOLDER
}

export default function ReservationBookingsList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useMyReservations({ page: 1, limit: 100 })
  const allReservations = useMemo(() => data?.items ?? [], [data?.items])
  const reservations = useMemo(() => {
    return allReservations.filter(reservation => {
      if (!PAID_RESERVATION_STATUSES.includes(reservation.status)) return false

      const paymentStatus = reservation.paymentStatus ?? reservation.payment?.status
      if (paymentStatus) return paymentStatus === 'SUCCESS'
      if (reservation.payments?.length) return reservation.payments.some(payment => payment.status === 'SUCCESS')

      return true
    })
  }, [allReservations])
  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reservations
    return reservations.filter(reservation => {
      const venue = reservation.location
      return [venue?.name, venue?.address, reservation.tableCategory, reservation.reference]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    })
  }, [reservations, search])
  const now = Date.now()
  const upcomingReservations = filteredReservations.filter(reservation => !reservation.startDateTime || new Date(reservation.startDateTime).getTime() >= now)
  const pastReservations = filteredReservations.filter(reservation => reservation.startDateTime && new Date(reservation.startDateTime).getTime() < now)

  function renderReservationCard(reservation: typeof reservations[number], status: 'upcoming' | 'past') {
    const venue = reservation.location
    return (
      <article key={reservation.id} className={cn('w-full overflow-hidden rounded-2xl bg-white text-black shadow-xl', status === 'past' && 'opacity-60')}>
        <div className="relative h-36 w-full">
          <img
            src={venueImage(reservation)}
            alt={venue?.name ?? reservation.tableCategory}
            className="h-full w-full object-cover"
            onError={event => { event.currentTarget.src = PLACEHOLDER }}
          />
          <div className="absolute inset-0 bg-black/45" />
          <Badge className="absolute right-3 top-3 border-0 bg-purple-600 px-3 text-white">
            Table Booking
          </Badge>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="line-clamp-2 font-heading text-xl font-black leading-tight">{venue?.name ?? reservation.tableCategory}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/90">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{venue?.address ?? 'Location TBA'}</span>
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
              <Calendar className="h-4 w-4 text-purple-600" />
              {formatDate(reservation.startDateTime)}
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-purple-600" />
              {formatTime(reservation.startDateTime)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">{reservation.tableCategory}</span>
              <span className="flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                <Users className="h-3 w-3" />
                {reservation.guestCount}
              </span>
              <span className="rounded bg-neon-pink/10 px-2 py-1 text-xs font-semibold text-neon-pink">{money(reservation.depositAmount)}</span>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/app/reservations/detail/${reservation.id}`)}
            className="h-16 w-16 shrink-0 rounded-xl bg-gray-100 p-0 text-slate-900 hover:bg-gray-200"
            aria-label={`View reservation for ${venue?.name ?? reservation.tableCategory}`}
          >
            <QrCode className="h-7 w-7" />
          </Button>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 pb-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
            <span className="font-mono font-semibold text-gray-500">Min spend {money(reservation.minimumSpend)}</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search reservations..."
            className="h-12 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35 focus-visible:ring-neon-pink/50"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl bg-white/10" />)}
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-10 text-center shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
          <CalendarCheck className="mx-auto h-10 w-10 text-neon-pink" />
          <p className="mt-3 text-sm font-semibold text-white">No reservations found</p>
          <p className="mt-1 text-xs text-white/50">Reserve a table and it will appear here.</p>
          <Button onClick={() => navigate('/app/reservations')} className="mt-5 rounded-full bg-neon-pink px-5 text-white hover:bg-neon-pink/90">
            Explore reservations
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingReservations.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Upcoming ({upcomingReservations.length})</h2>
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {upcomingReservations.map(reservation => renderReservationCard(reservation, 'upcoming'))}
              </div>
            </section>
          )}
          {pastReservations.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white/55">Past ({pastReservations.length})</h2>
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {pastReservations.map(reservation => renderReservationCard(reservation, 'past'))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
