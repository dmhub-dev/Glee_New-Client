import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Input, Progress, Skeleton } from '@glee/ui'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Table2,
  Utensils,
  Users,
} from 'lucide-react'
import {
  canOpenBookingChat,
  useAdminReservations,
  useBookingChatThreads,
  type BookingChatThread,
  type Reservation,
  type ReservationStatus,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { FeedbackReadOnly, publicReservationFeedbackTargetId, reservationFeedbackTargetId } from '../../components/feedback'
import { normalizedReservationPreOrderMenu } from '../../components/reservations/reservationMenuUtils'

const PLACEHOLDER = 'https://placehold.co/900x560/141419/FF2D8F?text=Glee+Bookings'
type BookingVenueTab = 'all' | 'club' | 'restaurant' | 'other'
type BookingLocationView = 'grid' | 'list'

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

function statusTone(status: ReservationStatus | string) {
  switch (status) {
    case 'CONFIRMED': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    case 'SEATED': return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
    case 'COMPLETED': return 'border-admin bg-admin-overlay text-admin-60'
    case 'NO_SHOW': return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    case 'CANCELLED': return 'border-red-500/25 bg-red-500/10 text-red-300'
    case 'PENDING_PAYMENT': return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    default: return 'border-admin bg-admin-overlay text-admin-60'
  }
}

function preOrderStats(reservation: Reservation) {
  const items = normalizedReservationPreOrderMenu(reservation.preOrderMenu)
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
  }
}

function bookingChatUnread(reservation: Reservation, chatThreads: BookingChatThread[]) {
  return chatThreads.find(thread => thread.reservationId === reservation.id)?.unreadForStaff ?? 0
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

function groupActivePercent(reservations: Reservation[]) {
  if (reservations.length === 0) return 0
  const activeCount = reservations.filter(row => row.status === 'CONFIRMED' || row.status === 'SEATED').length
  return Math.round((activeCount / reservations.length) * 100)
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
  const activePercent = groupActivePercent(group.reservations)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group cursor-pointer overflow-hidden rounded-2xl border bg-admin-surface text-left shadow-admin transition-all duration-200',
        selected ? 'border-neon-pink/45 shadow-neon' : 'border-admin hover:border-neon-pink/40 hover:shadow-admin',
      ].join(' ')}
    >
      <div className="relative h-44 overflow-hidden bg-admin-overlay">
        <img
          src={group.imageUrl}
          alt={group.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={event => { event.currentTarget.src = PLACEHOLDER }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute left-2 top-2 max-w-[52%] rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          <span className="block truncate">{group.sourceLabel}</span>
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
          {dateGroups.length} date{dateGroups.length === 1 ? '' : 's'}
        </div>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2 p-4">
        <h2 className="line-clamp-1 font-heading text-sm font-bold text-foreground">{group.title}</h2>
        <p className="flex items-center gap-1 text-xs text-admin-30">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{group.subtitle}</span>
        </p>
        <p className="font-mono text-xs text-admin-40">
          {nextBooking ? formatDateTime(nextBooking.startDateTime) : 'No upcoming service'}
        </p>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-admin-40">In service</span>
            <span className="font-mono font-semibold text-neon-pink">{activePercent}%</span>
          </div>
          <Progress value={activePercent} className="h-1.5 bg-admin-overlay [&>div]:bg-neon-pink" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-admin-30">{group.reservations.length.toLocaleString()} bookings</span>
          <span className="font-mono text-sm font-semibold text-neon-pink">{money(groupDepositTotal(group.reservations))}</span>
        </div>
      </div>
    </button>
  )
}

function VenueGroupListRow({ group, onSelect }: { group: BookingVenueGroup; onSelect: () => void }) {
  const dateGroups = groupReservationsByDate(group.reservations)
  const nextBooking = group.reservations[0]
  const activePercent = groupActivePercent(group.reservations)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group overflow-hidden rounded-2xl border border-admin bg-admin-surface text-left shadow-admin transition-all duration-150 hover:border-neon-pink/30"
    >
      <div className="flex items-stretch">
        <div className="relative w-28 shrink-0 overflow-hidden bg-admin-overlay sm:w-40">
          <img
            src={group.imageUrl}
            alt={group.title}
            className="h-full min-h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={event => { event.currentTarget.src = PLACEHOLDER }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-neon-pink/20 bg-neon-pink/10 text-neon-pink">{group.sourceLabel}</Badge>
              <Badge className="border-admin bg-admin-overlay text-admin-40">{dateGroups.length} date{dateGroups.length === 1 ? '' : 's'}</Badge>
            </div>
            <h2 className="line-clamp-1 font-heading text-sm font-bold text-foreground">{group.title}</h2>
            <p className="line-clamp-1 text-xs text-admin-40">{group.subtitle}</p>
            <p className="font-mono text-xs text-admin-30">{nextBooking ? formatDateTime(nextBooking.startDateTime) : 'No upcoming service'}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:gap-5">
            <div className="w-24 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-admin-40">Service</span>
                <span className="font-mono font-semibold text-neon-pink">{activePercent}%</span>
              </div>
              <Progress value={activePercent} className="h-1.5 bg-admin-overlay [&>div]:bg-neon-pink" />
            </div>
            <Metric label="Bookings" value={group.reservations.length.toLocaleString()} />
            <Metric label="Guests" value={groupGuestTotal(group.reservations).toLocaleString()} />
            <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/10 px-3 py-2 text-center">
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-neon-pink/60">Deposits</p>
              <p className="font-heading text-base font-black leading-none text-neon-pink">{money(groupDepositTotal(group.reservations))}</p>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function DateGroupSection({ group, chatThreads }: { group: BookingDateGroup; chatThreads: BookingChatThread[] }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-3 border-b border-admin pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-black text-foreground">{group.label}</h2>
          <p className="mt-1 text-sm text-admin-40">{group.reservations.length} booking record{group.reservations.length === 1 ? '' : 's'}</p>
        </div>
        <Badge className="w-fit border-admin bg-admin-overlay text-admin-50">
          {groupGuestTotal(group.reservations).toLocaleString()} guest{groupGuestTotal(group.reservations) === 1 ? '' : 's'}
        </Badge>
      </div>
      <BookingDateTable reservations={group.reservations} chatThreads={chatThreads} />
    </section>
  )
}

function BookingDateTable({ reservations, chatThreads }: { reservations: Reservation[]; chatThreads: BookingChatThread[] }) {
  const navigate = useNavigate()

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 xl:hidden">
        {reservations.map(reservation => <BookingOpsRow key={reservation.id} reservation={reservation} chatThreads={chatThreads} />)}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-admin xl:block">
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
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="font-mono text-xs text-admin-30">#{reservation.reference}</span>
                      <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                    </div>
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
    </div>
  )
}

function BookingOpsRow({ reservation, chatThreads }: { reservation: Reservation; chatThreads: BookingChatThread[] }) {
  const navigate = useNavigate()
  const paidStatus = paymentStatusLabel(reservation)
  const preOrder = preOrderStats(reservation)
  const unread = bookingChatUnread(reservation, chatThreads)
  const canChat = canOpenBookingChat(reservation)

  return (
    <article className="rounded-xl border border-admin bg-admin-overlay/45 p-4 transition hover:border-neon-pink/35 hover:bg-admin-overlay">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)}
              className="truncate text-left font-heading text-base font-black text-foreground transition hover:text-neon-pink"
            >
              {customerName(reservation)}
            </button>
            <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
            <Badge className="border-admin bg-admin-input text-admin-50">{reservation.source === 'EVENT' ? 'Event table' : 'Venue table'}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-admin-30">#{reservation.reference}</p>
          <p className="mt-2 text-sm text-admin-50">{customerEmail(reservation)} · {customerPhone(reservation)}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px] xl:grid-cols-4">
          <Metric label="Guests" value={reservation.guestCount.toLocaleString()} />
          <Metric label="Deposit" value={money(reservation.depositAmount)} />
          <Metric label="Min spend" value={money(reservation.minimumSpend)} />
          <Metric label="Time" value={formatDateTime(reservation.startDateTime)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="border-admin bg-admin-input text-admin-60">
          <Table2 className="mr-1 h-3.5 w-3.5" />
          {reservation.table?.name ?? reservation.tableCategory}
        </Badge>
        <Badge className={paymentStatusTone(paidStatus)}>
          <CreditCard className="mr-1 h-3.5 w-3.5" />
          {statusLabel(paidStatus)}
        </Badge>
        {preOrder.count > 0 && (
          <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">
            <Utensils className="mr-1 h-3.5 w-3.5" />
            Pre-order · {preOrder.count} item{preOrder.count === 1 ? '' : 's'} · {money(preOrder.total)}
          </Badge>
        )}
        {canChat && (
          <button
            type="button"
            onClick={() => navigate(`/dashboard/booking-chats?reservationId=${reservation.id}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1 text-xs font-semibold text-neon-pink transition hover:border-neon-pink/60 hover:bg-neon-pink/15"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {unread > 0 ? `${unread} unread` : 'Booking chat'}
          </button>
        )}
      </div>
    </article>
  )
}

function SelectedVenueBookingsView({
  group,
  dateGroups,
  chatThreads,
  onBack,
}: {
  group: BookingVenueGroup
  dateGroups: BookingDateGroup[]
  chatThreads: BookingChatThread[]
  onBack: () => void
}) {
  const bookingCount = group.reservations.length
  const guestCount = groupGuestTotal(group.reservations)
  const depositTotal = groupDepositTotal(group.reservations)
  const activePercent = groupActivePercent(group.reservations)
  const nextBooking = group.reservations[0]

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 py-1.5 text-sm text-admin-40 transition-colors hover:text-admin-70"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to venues
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="relative h-56 overflow-hidden rounded-2xl bg-admin-overlay sm:h-72">
            <img
              src={group.imageUrl}
              alt={group.title}
              className="h-full w-full object-cover"
              onError={event => { event.currentTarget.src = PLACEHOLDER }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-black/45 text-white/80 backdrop-blur">{group.sourceLabel}</Badge>
              <Badge className="border-white/15 bg-black/45 text-white/70 backdrop-blur">{dateGroups.length} service date{dateGroups.length === 1 ? '' : 's'}</Badge>
            </div>
          </div>

          <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
            <h1 className="font-heading text-xl font-black text-foreground sm:text-2xl">{group.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span className="flex items-center gap-2 text-sm text-admin-50">
                <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                {group.subtitle}
              </span>
              <span className="flex items-center gap-2 text-sm text-admin-50">
                <CalendarDays className="h-4 w-4 shrink-0 text-neon-pink" />
                {nextBooking ? formatDateTime(nextBooking.startDateTime) : 'No upcoming service'}
              </span>
              <span className="flex items-center gap-2 text-sm text-admin-50">
                <Users className="h-4 w-4 shrink-0 text-neon-pink" />
                {guestCount.toLocaleString()} guest{guestCount === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          <div className="space-y-5">
            {dateGroups.map(dateGroup => <DateGroupSection key={dateGroup.key} group={dateGroup} chatThreads={chatThreads} />)}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-admin bg-admin-surface p-5">
            <h2 className="font-heading text-sm font-bold text-foreground">Overview</h2>
            <div className="mt-3 space-y-0">
              <VenueDetailRow label="Bookings" value={bookingCount.toLocaleString()} />
              <VenueDetailRow label="Guests" value={guestCount.toLocaleString()} />
              <VenueDetailRow label="Deposits" value={money(depositTotal)} />
              <VenueDetailRow label="Service dates" value={dateGroups.length.toLocaleString()} />
            </div>
          </section>

          <section className="rounded-2xl border border-admin bg-admin-surface p-5">
            <h2 className="font-heading text-sm font-bold text-foreground">Service Status</h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-admin-40">In service</span>
                <span className="font-mono font-semibold text-neon-pink">{activePercent}%</span>
              </div>
              <Progress value={activePercent} className="h-2 bg-admin-overlay [&>div]:bg-neon-pink" />
            </div>
            <p className="mt-4 text-xs leading-5 text-admin-40">
              Confirmed and seated bookings count toward the active service load for this venue.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function VenueDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin py-2.5 last:border-b-0">
      <span className="text-xs text-admin-40">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">{value}</span>
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
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeVenueTab, setActiveVenueTab] = useState<BookingVenueTab>('all')
  const [viewMode, setViewMode] = useState<BookingLocationView>('grid')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const { data, isLoading } = useAdminReservations({ page: 1, limit: 100 })
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
        {!selectedGroup && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard icon={CalendarDays} label="Bookings" value={(data?.total ?? reservations.length).toLocaleString()} />
              <SummaryCard icon={Users} label="In service" value={(confirmedCount + seatedCount).toLocaleString()} />
              <SummaryCard icon={Table2} label="Deposits" value={money(depositTotal)} />
            </div>

            <section className="rounded-xl border border-admin bg-admin-surface p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search bookings..."
                    className="h-9 rounded-full border-admin bg-admin-input pl-8 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg border border-admin bg-admin-overlay p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      title="Grid view"
                      aria-label="Grid view"
                      className={[
                        'rounded p-1.5 transition-colors',
                        viewMode === 'grid' ? 'bg-neon-pink/20 text-neon-pink' : 'text-admin-30 hover:text-admin-60',
                      ].join(' ')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      title="List view"
                      aria-label="List view"
                      className={[
                        'rounded p-1.5 transition-colors',
                        viewMode === 'list' ? 'bg-neon-pink/20 text-neon-pink' : 'text-admin-30 hover:text-admin-60',
                      ].join(' ')}
                    >
                      <ListIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/locations/new')}
                    className="flex items-center gap-2 rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#cc2272]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Location
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

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
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>
            {Array.from({ length: viewMode === 'grid' ? 8 : 5 }).map((_, index) => <Skeleton key={index} className={viewMode === 'grid' ? 'h-72 rounded-2xl' : 'h-24 rounded-2xl'} />)}
          </div>
        ) : visibleReservations.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Table2 className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No bookings found</p>
            <p className="mt-1 text-xs text-admin-40">Try another search term.</p>
          </div>
        ) : !selectedGroup && filteredVenueGroups.length === 0 ? (
          <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
            <Table2 className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No bookings in this tab</p>
            <p className="mt-1 text-xs text-admin-40">Choose another venue type tab or adjust the search.</p>
          </div>
        ) : selectedGroup ? (
          <SelectedVenueBookingsView
            group={selectedGroup}
            dateGroups={selectedDateGroups}
            chatThreads={chatThreads}
            onBack={() => setSelectedGroupId(null)}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredVenueGroups.map(group => (
              <VenueGroupCard
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={() => setSelectedGroupId(group.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVenueGroups.map(group => (
              <VenueGroupListRow
                key={group.id}
                group={group}
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
