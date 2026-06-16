import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Input, Skeleton } from '@glee/ui'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  MessageCircle,
  Search,
  Table2,
  Users,
} from 'lucide-react'
import {
  canOpenBookingChat,
  useAdminReservations,
  useBookingChatThreads,
  type BookingChatThread,
  type Reservation,
  type ReservationSource,
  type ReservationStatus,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { FeedbackReadOnly, publicReservationFeedbackTargetId, reservationFeedbackTargetId } from '../../components/feedback'
import { normalizedReservationPreOrderMenu } from '../../components/reservations/reservationMenuUtils'

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

const PLACEHOLDER = 'https://placehold.co/900x560/141419/FF2D8F?text=Glee+Bookings'
type BookingVenueTab = 'all' | 'club' | 'restaurant' | 'other'

const BOOKING_GROUP_TABS: Array<{ label: string; value: BookingVenueTab }> = [
  { label: 'All', value: 'all' },
  { label: 'Clubs', value: 'club' },
  { label: 'Restaurants/Hotels', value: 'restaurant' },
  { label: 'Events/Other', value: 'other' },
]

type BookingVenueGroup = {
  id: string
  title: string
  subtitle: string
  sourceLabel: string
  venueKind: Exclude<BookingVenueTab, 'all'>
  imageUrl: string
  reservations: Reservation[]
}

type BookingDateGroup = {
  key: string
  label: string
  reservations: Reservation[]
}

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

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function statusLabel(status: ReservationStatus | string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function venueTypeLabel(value?: string | null) {
  if (value === 'CLUB') return 'Club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'Restaurant/Hotel'
  if (value === 'LOUNGE') return 'Club'
  return 'Venue'
}

function venueKind(value?: string | null): Exclude<BookingVenueTab, 'all'> {
  if (value === 'CLUB' || value === 'LOUNGE') return 'club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'restaurant'
  return 'other'
}

function venueImage(reservation: Reservation) {
  return reservation.location?.pictures?.[0] ?? PLACEHOLDER
}

function customerName(reservation: Reservation) {
  return reservation.user?.name || reservation.guestName || reservation.user?.email || reservation.guestEmail || 'Guest'
}

function customerEmail(reservation: Reservation) {
  return reservation.user?.email ?? reservation.guestEmail ?? '-'
}

function customerPhone(reservation: Reservation) {
  return reservation.user?.phone ?? reservation.guestPhone ?? '-'
}

function paymentMethodLabel(reservation: Reservation) {
  return reservation.paymentMethod ?? reservation.payment?.method ?? reservation.payments?.[0]?.method ?? 'UNKNOWN'
}

function paymentStatusLabel(reservation: Reservation) {
  return reservation.paymentStatus ?? reservation.payment?.status ?? reservation.payments?.[0]?.status ?? 'PENDING'
}

function paymentStatusTone(status: string) {
  switch (status) {
    case 'SUCCESS': return 'border-green-500/30 bg-green-500/10 text-green-400'
    case 'FAILED': return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'REFUNDED': return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    default: return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
  }
}

function groupId(reservation: Reservation) {
  if (reservation.location?.id) return `location:${reservation.location.id}`
  if (reservation.event?.id) return `event:${reservation.event.id}`
  return `booking:${reservation.locationId || reservation.eventId || reservation.id}`
}

function groupReservationsByVenue(reservations: Reservation[]): BookingVenueGroup[] {
  const groups = new Map<string, BookingVenueGroup>()

  reservations.forEach(reservation => {
    const id = groupId(reservation)
    const existing = groups.get(id)
    if (existing) {
      const nextImage = venueImage(reservation)
      if (existing.imageUrl === PLACEHOLDER && nextImage !== PLACEHOLDER) existing.imageUrl = nextImage
      existing.reservations.push(reservation)
      return
    }

    const isEventOnly = !reservation.location?.name && Boolean(reservation.event?.name)
    groups.set(id, {
      id,
      title: reservation.location?.name ?? reservation.event?.name ?? reservation.tableCategory,
      subtitle: reservation.location?.address ?? (reservation.event?.name ? 'Event table booking' : 'Location details unavailable'),
      sourceLabel: isEventOnly ? 'Event table' : venueTypeLabel(reservation.location?.venueType),
      venueKind: isEventOnly ? 'other' : venueKind(reservation.location?.venueType),
      imageUrl: venueImage(reservation),
      reservations: [reservation],
    })
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      reservations: group.reservations.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

function groupReservationsByDate(reservations: Reservation[]): BookingDateGroup[] {
  const groups = new Map<string, BookingDateGroup>()

  reservations.forEach(reservation => {
    const key = bookingDateKey(reservation)
    const existing = groups.get(key)
    if (existing) {
      existing.reservations.push(reservation)
      return
    }
    groups.set(key, {
      key,
      label: bookingDateLabel(reservation),
      reservations: [reservation],
    })
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      reservations: group.reservations.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

function groupDepositTotal(reservations: Reservation[]) {
  return reservations.reduce((sum, reservation) => sum + Number(reservation.depositAmount ?? 0), 0)
}

function groupGuestTotal(reservations: Reservation[]) {
  return reservations.reduce((sum, reservation) => sum + reservation.guestCount, 0)
}

function bookingDateKey(reservation: Reservation) {
  return reservation.reservationDate || new Date(reservation.startDateTime).toISOString().slice(0, 10)
}

function bookingDateLabel(reservation: Reservation) {
  return formatDateLabel(reservation.reservationDate ? `${reservation.reservationDate}T00:00:00` : reservation.startDateTime)
}

function VenueGroupCard({ group, selected, onSelect }: { group: BookingVenueGroup; selected: boolean; onSelect: () => void }) {
  const dateGroups = groupReservationsByDate(group.reservations)
  const nextBooking = group.reservations[0]
  const activeCount = group.reservations.filter(row => row.status === 'CONFIRMED' || row.status === 'SEATED').length

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group overflow-hidden rounded-2xl border bg-admin-surface text-left shadow-admin transition',
        selected ? 'border-neon-pink/45 bg-neon-pink/5' : 'border-admin hover:border-neon-pink/35 hover:bg-admin-overlay/40',
      ].join(' ')}
    >
      <div className="relative h-40 overflow-hidden bg-admin-overlay">
        <img
          src={group.imageUrl}
          alt={group.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={event => { event.currentTarget.src = PLACEHOLDER }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="border-neon-pink/25 bg-neon-pink/20 text-neon-pink backdrop-blur">{group.sourceLabel}</Badge>
          <Badge className="border-white/15 bg-black/35 text-white/75 backdrop-blur">{dateGroups.length} date{dateGroups.length === 1 ? '' : 's'}</Badge>
        </div>
        <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/75 backdrop-blur transition group-hover:translate-x-1 group-hover:text-neon-pink">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div className="p-5">
        <h2 className="line-clamp-1 font-heading text-lg font-black text-foreground">{group.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-admin-40">{group.subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Bookings" value={group.reservations.length.toLocaleString()} />
          <Metric label="In service" value={activeCount.toLocaleString()} />
          <Metric label="Guests" value={groupGuestTotal(group.reservations).toLocaleString()} />
          <Metric label="Deposits" value={money(groupDepositTotal(group.reservations))} />
        </div>

        <p className="mt-4 text-xs text-admin-40">
          Next booking: <span className="font-semibold text-admin-70">{nextBooking ? formatDateTime(nextBooking.startDateTime) : 'None'}</span>
        </p>
      </div>
    </button>
  )
}

function DateGroupSection({ group, chatThreads }: { group: BookingDateGroup; chatThreads: BookingChatThread[] }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-lg font-black text-foreground">{group.label}</h2>
          <p className="mt-1 text-sm text-admin-40">{group.reservations.length} booking record{group.reservations.length === 1 ? '' : 's'}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Bookings" value={group.reservations.length.toLocaleString()} />
          <SummaryCard label="Guests" value={groupGuestTotal(group.reservations).toLocaleString()} />
          <SummaryCard label="Deposits" value={money(groupDepositTotal(group.reservations))} />
        </div>
      </div>
      <BookingDateTable reservations={group.reservations} chatThreads={chatThreads} />
    </section>
  )
}

function BookingDateTable({ reservations, chatThreads }: { reservations: Reservation[]; chatThreads: BookingChatThread[] }) {
  const navigate = useNavigate()

  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-admin">
      <table className="w-full min-w-[1280px] text-sm">
        <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
          <tr>
            <th className="px-4 py-3 font-medium">Full name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Guests</th>
            <th className="px-4 py-3 font-medium">Table / category</th>
            <th className="px-4 py-3 font-medium">Pre-order</th>
            <th className="px-4 py-3 font-medium">Chat</th>
            <th className="px-4 py-3 font-medium">Feedback</th>
            <th className="px-4 py-3 font-medium">Payment method</th>
            <th className="px-4 py-3 font-medium">Paid status</th>
            <th className="px-4 py-3 font-medium">Deposit paid</th>
            <th className="px-4 py-3 font-medium">Minimum spend</th>
            <th className="px-4 py-3 font-medium">Booking time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin">
          {reservations.map(reservation => {
            const paidStatus = paymentStatusLabel(reservation)
            const thread = chatThreads.find(thread => thread.reservationId === reservation.id)
            const unread = thread?.unreadForStaff ?? 0
            const preOrderItems = normalizedReservationPreOrderMenu(reservation.preOrderMenu)
            const preOrderCount = preOrderItems.reduce((sum, item) => sum + item.quantity, 0)
            const preOrderTotal = preOrderItems.reduce((sum, item) => sum + item.lineTotal, 0)
            return (
              <tr key={reservation.id} className="hover:bg-admin-overlay/60">
                <td className="px-4 py-3 font-medium text-admin-90">
                  <div className="min-w-0">
                    <button
                      type="button"
                      aria-label={`Open booking ${reservation.reference}`}
                      onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)}
                      className="truncate text-left transition hover:text-neon-pink"
                    >
                      {customerName(reservation)}
                    </button>
                    <p className="mt-1 font-mono text-xs text-admin-30">#{reservation.reference}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-admin-50">{customerEmail(reservation)}</td>
                <td className="px-4 py-3 text-admin-50">{customerPhone(reservation)}</td>
                <td className="px-4 py-3 font-mono text-neon-pink">{reservation.guestCount}</td>
                <td className="px-4 py-3 text-admin-60">
                  <p className="font-medium text-admin-80">{reservation.table?.name ?? reservation.tableCategory}</p>
                  <p className="mt-1 text-xs text-admin-40">{reservation.tableCategory}</p>
                </td>
                <td className="px-4 py-3">
                  {preOrderItems.length ? (
                    <Badge className="whitespace-nowrap border-neon-pink/25 bg-neon-pink/10 text-neon-pink">
                      Pre-order · {preOrderCount} item{preOrderCount === 1 ? '' : 's'} · {money(preOrderTotal)}
                    </Badge>
                  ) : (
                    <span className="text-admin-30">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canOpenBookingChat(reservation) ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/booking-chats?reservationId=${reservation.id}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1.5 text-xs font-semibold text-neon-pink transition hover:border-neon-pink/60 hover:bg-neon-pink/15"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {unread > 0 ? `${unread} unread` : thread ? statusLabel(thread.status) : 'Open'}
                    </button>
                  ) : (
                    <span className="text-admin-30">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <FeedbackReadOnly
                    targetType="RESERVATION"
                    targetIds={[
                      reservationFeedbackTargetId(reservation.id),
                      ...(reservation.publicAccessToken ? [publicReservationFeedbackTargetId(reservation.publicAccessToken)] : []),
                    ]}
                    compact
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge className="border-admin bg-admin-input text-admin-60">{paymentMethodLabel(reservation).replaceAll('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={paymentStatusTone(paidStatus)}>{statusLabel(paidStatus)}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-admin-70">{money(reservation.depositAmount)}</td>
                <td className="px-4 py-3 font-mono text-admin-70">{money(reservation.minimumSpend)}</td>
                <td className="px-4 py-3 text-admin-40">{formatDateTime(reservation.startDateTime)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
  const [activeVenueTab, setActiveVenueTab] = useState<BookingVenueTab>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const { data, isLoading } = useAdminReservations({ status, source, date: date || undefined, page: 1, limit: 100 })
  const { data: chatThreads = [] } = useBookingChatThreads()
  const reservations = useMemo(() => data?.items ?? [], [data?.items])

  const visibleReservations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return reservations.filter(reservation => {
      if (!query) return true
      return [
        reservation.reference,
        reservation.tableCategory,
        reservation.location?.name,
        reservation.location?.address,
        reservation.event?.name,
        reservation.user?.name,
        reservation.user?.email,
        reservation.guestName,
        reservation.guestEmail,
        reservation.guestPhone,
      ].some(value => String(value ?? '').toLowerCase().includes(query))
    })
  }, [reservations, search])

  const venueGroups = useMemo(() => groupReservationsByVenue(visibleReservations), [visibleReservations])
  const tabCounts = useMemo(() => {
    const counts: Record<BookingVenueTab, number> = { all: venueGroups.length, club: 0, restaurant: 0, other: 0 }
    venueGroups.forEach(group => {
      counts[group.venueKind] += 1
    })
    return counts
  }, [venueGroups])
  const filteredVenueGroups = useMemo(() => (
    activeVenueTab === 'all' ? venueGroups : venueGroups.filter(group => group.venueKind === activeVenueTab)
  ), [activeVenueTab, venueGroups])
  const selectedGroup = filteredVenueGroups.find(group => group.id === selectedGroupId) ?? null
  const selectedDateGroups = selectedGroup ? groupReservationsByDate(selectedGroup.reservations) : []
  const confirmedCount = reservations.filter(row => row.status === 'CONFIRMED').length
  const seatedCount = reservations.filter(row => row.status === 'SEATED').length
  const depositTotal = reservations.reduce((sum, row) => sum + Number(row.depositAmount ?? 0), 0)

  return (
    <AdminLayout title="Bookings" subtitle="Manage club, restaurant, hotel, and event table bookings by venue and service date.">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard icon={CalendarDays} label="Bookings" value={(data?.total ?? reservations.length).toLocaleString()} />
          <SummaryCard icon={Users} label="In service" value={(confirmedCount + seatedCount).toLocaleString()} />
          <SummaryCard icon={Table2} label="Deposits" value={money(depositTotal)} />
        </div>

        <section className="rounded-xl border border-admin bg-admin-surface p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search bookings, venues, guests..." className="border-admin bg-admin-input pl-8" />
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

        {!isLoading && visibleReservations.length > 0 && !selectedGroup && (
          <div className="overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2 rounded-2xl border border-admin bg-admin-surface p-1 shadow-admin sm:w-fit sm:min-w-0">
              {BOOKING_GROUP_TABS.map(tab => {
                const active = activeVenueTab === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveVenueTab(tab.value)
                      setSelectedGroupId(null)
                    }}
                    className={[
                      'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                      active ? 'bg-neon-pink text-white' : 'text-admin-50 hover:bg-admin-overlay hover:text-foreground',
                    ].join(' ')}
                  >
                    {tab.label}
                    <span className={active ? 'rounded-full bg-white/20 px-2 py-0.5 text-xs text-white' : 'rounded-full bg-admin-overlay px-2 py-0.5 text-xs text-admin-40'}>
                      {tabCounts[tab.value]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
          </div>
        ) : visibleReservations.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Table2 className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No bookings found</p>
            <p className="mt-1 text-xs text-admin-40">Try another date, status, or search term.</p>
          </div>
        ) : !selectedGroup && filteredVenueGroups.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Table2 className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No bookings in this tab</p>
            <p className="mt-1 text-xs text-admin-40">Choose another venue type tab or adjust the filters.</p>
          </div>
        ) : selectedGroup ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedGroupId(null)}
              className="inline-flex items-center gap-2 rounded-full border border-admin bg-admin-surface px-4 py-2 text-sm font-semibold text-admin-50 transition hover:border-neon-pink/40 hover:text-neon-pink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to venues
            </button>

            <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{selectedGroup.sourceLabel}</Badge>
                    <Badge className="border-admin bg-admin-overlay text-admin-50">{selectedDateGroups.length} date groups</Badge>
                  </div>
                  <h1 className="font-heading text-2xl font-black text-foreground">{selectedGroup.title}</h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-admin-40">
                    <MapPin className="h-4 w-4 text-neon-pink" />
                    {selectedGroup.subtitle}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
                  <Metric label="Bookings" value={selectedGroup.reservations.length.toLocaleString()} />
                  <Metric label="Guests" value={groupGuestTotal(selectedGroup.reservations).toLocaleString()} />
                  <Metric label="Deposits" value={money(groupDepositTotal(selectedGroup.reservations))} />
                  <Metric label="Dates" value={selectedDateGroups.length.toLocaleString()} />
                </div>
              </div>
            </section>

            <div className="space-y-5">
              {selectedDateGroups.map(group => <DateGroupSection key={group.key} group={group} chatThreads={chatThreads} />)}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredVenueGroups.map(group => (
              <VenueGroupCard
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={() => setSelectedGroupId(group.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon?: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-admin-40">{label}</p>
          <p className="mt-1 font-heading text-2xl font-black text-foreground">{value}</p>
        </div>
        {Icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  )
}
