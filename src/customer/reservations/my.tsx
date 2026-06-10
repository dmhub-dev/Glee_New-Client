import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyReservations, type ReservationStatus } from '@glee/api'
import { Badge, Button, Input, Skeleton, cn } from '@glee/ui'
import { Calendar, CalendarCheck, Clock, MapPin, Search, Users } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const STATUSES: Array<{ label: string; value?: ReservationStatus }> = [
  { label: 'All' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Seated', value: 'SEATED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

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

export default function CustomerMyReservationsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReservationStatus | undefined>()
  const { data, isLoading } = useMyReservations({ status, page: 1, limit: 100 })
  const reservations = data?.items ?? []
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

  return (
    <CustomerLayout title="My reservations" hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-32 pt-6 lg:px-8">
        <section className="rounded-3xl bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Reservation wallet</p>
              <h1 className="mt-3 font-heading text-3xl font-black leading-tight text-white sm:text-5xl">My Reservations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Track table deposits, venue details, cancellation windows, and reservation status.</p>
            </div>
            <Button onClick={() => navigate('/app/reservations')} className="h-11 rounded-full bg-neon-pink px-5 text-white hover:bg-neon-pink/90">
              Reserve table
            </Button>
          </div>
        </section>

        <section className="rounded-3xl bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search reservations..."
              className="h-12 rounded-2xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35 focus-visible:ring-neon-pink/50"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STATUSES.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStatus(item.value)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95',
                  status === item.value ? 'bg-neon-pink text-white shadow-[0_0_18px_rgba(255,45,143,0.28)]' : 'bg-white/8 text-white/60 hover:bg-white/12 hover:text-white',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl bg-white/10" />)}
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.08] p-10 text-center shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <CalendarCheck className="mx-auto h-10 w-10 text-white/35" />
            <p className="mt-3 text-sm font-semibold text-white">No reservations found</p>
            <p className="mt-1 text-xs text-white/50">Reserve a table and it will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReservations.map(reservation => {
              const venue = reservation.location
              return (
                <article key={reservation.id} className="rounded-3xl bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-white/[0.1]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                      <h2 className="mt-3 line-clamp-2 font-heading text-xl font-black text-white">{venue?.name ?? reservation.tableCategory}</h2>
                      <p className="mt-2 flex min-w-0 items-center gap-2 text-sm text-white/55">
                        <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                        <span className="truncate">{venue?.address ?? 'Location TBA'}</span>
                      </p>
                    </div>
                    <div className="rounded-2xl bg-black/20 px-3 py-2 text-right">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">Deposit</p>
                      <p className="font-mono text-sm font-bold text-neon-pink">{money(reservation.depositAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/55">
                    <span className="rounded-xl bg-black/20 p-3"><Calendar className="mb-1 h-4 w-4 text-neon-pink" />{formatDate(reservation.startDateTime)}</span>
                    <span className="rounded-xl bg-black/20 p-3"><Clock className="mb-1 h-4 w-4 text-neon-pink" />{formatTime(reservation.startDateTime)}</span>
                    <span className="rounded-xl bg-black/20 p-3"><Users className="mb-1 h-4 w-4 text-neon-pink" />{reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}</span>
                    <span className="rounded-xl bg-black/20 p-3">Min spend<br /><strong className="font-mono text-white">{money(reservation.minimumSpend)}</strong></span>
                  </div>
                  <Button onClick={() => navigate(`/app/reservations/detail/${reservation.id}`)} className="mt-4 h-11 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                    View Reservation
                  </Button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
