import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Input, Skeleton } from '@glee/ui'
import { CalendarDays, Clock, CreditCard, MapPin, Search, Table2, Users } from 'lucide-react'
import { useAdminReservations, type Reservation, type ReservationSource, type ReservationStatus } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'

const STATUSES: Array<{ label: string; value?: ReservationStatus }> = [
  { label: 'All' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Seated', value: 'SEATED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'No show', value: 'NO_SHOW' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const SOURCES: Array<{ label: string; value?: ReservationSource }> = [
  { label: 'All sources' },
  { label: 'Venue', value: 'VENUE' },
  { label: 'Event', value: 'EVENT' },
]

function money(value: string | number | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusTone(status: ReservationStatus) {
  switch (status) {
    case 'CONFIRMED': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    case 'SEATED': return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
    case 'COMPLETED': return 'border-admin bg-admin-overlay text-admin-60'
    case 'NO_SHOW': return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    case 'CANCELLED': return 'border-red-500/25 bg-red-500/10 text-red-300'
    default: return 'border-admin bg-admin-overlay text-admin-60'
  }
}

function statusLabel(status: ReservationStatus | string) {
  return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function reservationTitle(reservation: Reservation) {
  if (reservation.source === 'EVENT' && reservation.event?.name) return reservation.event.name
  return reservation.location?.name ?? reservation.tableCategory
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const navigate = useNavigate()
  const payment = reservation.payment ?? reservation.payments?.[0] ?? null
  const paymentMethod = reservation.paymentMethod ?? payment?.method
  const paymentStatus = reservation.paymentStatus ?? payment?.status
  const customerName = reservation.user?.name || reservation.guestName || reservation.user?.email || reservation.guestEmail || 'Guest'
  return (
    <article className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin transition hover:border-neon-pink/35 hover:bg-admin-overlay/40">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
            <Badge className="border-admin bg-admin-overlay text-admin-50">{reservation.source === 'EVENT' ? 'Event table' : 'Venue table'}</Badge>
            {paymentMethod && <Badge className="border-admin bg-admin-overlay text-admin-50"><CreditCard className="mr-1 h-3 w-3" />{paymentMethod}</Badge>}
            {paymentStatus && <Badge className="border-admin bg-admin-overlay text-admin-50">Payment {statusLabel(paymentStatus)}</Badge>}
            <span className="text-xs text-admin-30">#{reservation.reference}</span>
          </div>
          <h2 className="truncate font-heading text-lg font-black text-foreground">{reservationTitle(reservation)}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-admin-40">
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-neon-pink" />{customerName}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-neon-pink" />{reservation.location?.name ?? 'Location TBA'}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-neon-pink" />{formatDateTime(reservation.startDateTime)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
          <Metric label="Guests" value={reservation.guestCount.toLocaleString()} />
          <Metric label="Table" value={reservation.tableCategory} />
          <Metric label="Deposit" value={money(reservation.depositAmount)} />
          <Metric label="Min spend" value={money(reservation.minimumSpend)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)} className="bg-neon-pink text-white hover:bg-neon-pink/90">
          Open Reservation
        </Button>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay px-3 py-2">
      <p className="text-[11px] text-admin-30">{label}</p>
      <p className="truncate font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export default function AdminReservationsPage() {
  const [status, setStatus] = useState<ReservationStatus | undefined>()
  const [source, setSource] = useState<ReservationSource | undefined>()
  const [date, setDate] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminReservations({ status, source, date: date || undefined, page: 1, limit: 100 })
  const reservations = data?.items ?? []

  const visibleReservations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return reservations.filter(reservation => {
      if (!query) return true
      return [
        reservation.reference,
        reservation.tableCategory,
        reservation.location?.name,
        reservation.event?.name,
        reservation.user?.name,
        reservation.user?.email,
        reservation.guestName,
        reservation.guestEmail,
        reservation.guestPhone,
      ].some(value => String(value ?? '').toLowerCase().includes(query))
    })
  }, [reservations, search])

  const confirmedCount = reservations.filter(row => row.status === 'CONFIRMED').length
  const seatedCount = reservations.filter(row => row.status === 'SEATED').length
  const depositTotal = reservations.reduce((sum, row) => sum + Number(row.depositAmount ?? 0), 0)

  return (
    <AdminLayout title="Reservations" subtitle="Manage venue and event table bookings.">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard icon={CalendarDays} label="Reservations" value={(data?.total ?? reservations.length).toLocaleString()} />
          <SummaryCard icon={Users} label="In service" value={(confirmedCount + seatedCount).toLocaleString()} />
          <SummaryCard icon={Table2} label="Deposits" value={money(depositTotal)} />
        </div>

        <section className="rounded-xl border border-admin bg-admin-surface p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reservations..." className="border-admin bg-admin-input pl-8" />
            </div>
            <Input type="date" value={date} onChange={event => setDate(event.target.value)} className="border-admin bg-admin-input lg:w-44" />
            <select value={status ?? ''} onChange={event => setStatus((event.target.value || undefined) as ReservationStatus | undefined)} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground lg:w-44">
              {STATUSES.map(item => <option key={item.label} value={item.value ?? ''}>{item.label}</option>)}
            </select>
            <select value={source ?? ''} onChange={event => setSource((event.target.value || undefined) as ReservationSource | undefined)} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground lg:w-44">
              {SOURCES.map(item => <option key={item.label} value={item.value ?? ''}>{item.label}</option>)}
            </select>
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-xl" />)}
          </div>
        ) : visibleReservations.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Table2 className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No reservations found</p>
            <p className="mt-1 text-xs text-admin-40">Try another date, status, or search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleReservations.map(reservation => <ReservationRow key={reservation.id} reservation={reservation} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-admin-40">{label}</p>
          <p className="mt-1 font-heading text-2xl font-black text-foreground">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}
