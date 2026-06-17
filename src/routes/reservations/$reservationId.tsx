import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '@glee/ui'
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Table2,
  UserRound,
  Utensils,
  Users,
} from 'lucide-react'
import {
  useAdminReservation,
  useAdminReservations,
  useUpdateAdminReservationStatus,
  type Reservation,
  type ReservationPayment,
  type ReservationStatus,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { BookingChatPanel } from '../../components/chat/BookingChatPanel'
import { FeedbackReadOnly, publicReservationFeedbackTargetId, reservationFeedbackTargetId } from '../../components/feedback'
import { normalizedReservationPreOrderMenu } from '../../components/reservations/reservationMenuUtils'

const TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  CONFIRMED: ['SEATED', 'NO_SHOW', 'CANCELLED'],
  SEATED: ['COMPLETED', 'CANCELLED'],
}

const PLACEHOLDER = '/glee-image-fallback.svg'
type BookingDetailTab = 'overview' | 'payment' | 'preorder' | 'chat' | 'feedback' | 'history'

const BOOKING_DETAIL_TABS: Array<{ label: string; value: BookingDetailTab }> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Payment', value: 'payment' },
  { label: 'Pre-order', value: 'preorder' },
  { label: 'Booking Chat', value: 'chat' },
  { label: 'Feedback', value: 'feedback' },
  { label: 'Previous Bookings', value: 'history' },
]

function money(value: string | number | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelize(value?: string | null) {
  return String(value ?? 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function statusLabel(status: ReservationStatus) {
  return labelize(status)
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

function paymentStatusTone(status?: string | null) {
  switch (status) {
    case 'SUCCESS': return 'border-green-500/30 bg-green-500/10 text-green-400'
    case 'FAILED': return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'REFUNDED': return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    default: return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
  }
}

function shortTime(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

function bookingImage(reservation: Reservation) {
  return reservation.location?.pictures?.[0] ?? PLACEHOLDER
}

function bookingDateKey(value?: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function contactEmail(reservation: Reservation) {
  return (reservation.user?.email ?? reservation.guestEmail ?? '').trim().toLowerCase()
}

function contactPhone(reservation: Reservation) {
  return (reservation.user?.phone ?? reservation.guestPhone ?? '').trim()
}

function isSameBookingCustomer(current: Reservation, candidate: Reservation) {
  if (current.userId && candidate.userId && current.userId === candidate.userId) return true
  const currentEmail = contactEmail(current)
  const candidateEmail = contactEmail(candidate)
  if (currentEmail && candidateEmail && currentEmail === candidateEmail) return true
  const currentPhone = contactPhone(current)
  const candidatePhone = contactPhone(candidate)
  return Boolean(currentPhone && candidatePhone && currentPhone === candidatePhone)
}

export default function AdminReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const user = useAdminUser()
  const { toast } = useToast()
  const { data: reservation, isLoading } = useAdminReservation(reservationId ?? '')
  const updateStatus = useUpdateAdminReservationStatus()
  const nextStatuses = useMemo(() => reservation ? TRANSITIONS[reservation.status] ?? [] : [], [reservation])
  const [activeTab, setActiveTab] = useState<BookingDetailTab>('overview')
  const [historyDate, setHistoryDate] = useState('')
  const [statusDialog, setStatusDialog] = useState<{ status: ReservationStatus; reason: string } | null>(null)
  const { data: historyData, isLoading: isHistoryLoading } = useAdminReservations({ page: 1, limit: 100 })
  const historyReservations = useMemo(() => historyData?.items ?? [], [historyData?.items])
  const previousBookings = useMemo(() => {
    if (!reservation) return []
    const currentTime = new Date(reservation.startDateTime).getTime()
    return historyReservations
      .filter(candidate => {
        if (candidate.id === reservation.id) return false
        if (!isSameBookingCustomer(reservation, candidate)) return false
        if (new Date(candidate.startDateTime).getTime() >= currentTime) return false
        if (!historyDate) return true
        return bookingDateKey(candidate.reservationDate || candidate.startDateTime) === historyDate
      })
      .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime())
  }, [historyDate, historyReservations, reservation])

  async function submitStatus(status: ReservationStatus, reason?: string) {
    if (!reservation) return
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status, reason })
      toast({ title: 'Booking updated', description: `Status changed to ${statusLabel(status)}.` })
    } catch (error) {
      toast({ title: 'Could not update booking', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleStatus(status: ReservationStatus) {
    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      setStatusDialog({ status, reason: '' })
      return
    }
    await submitStatus(status)
  }

  async function handleReasonedStatus() {
    if (!statusDialog) return
    await submitStatus(statusDialog.status, statusDialog.reason.trim() || undefined)
    setStatusDialog(null)
  }

  if (isLoading) {
    return (
      <AdminLayout title="Booking">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </AdminLayout>
    )
  }

  if (!reservation) {
    return (
      <AdminLayout title="Booking not found">
        <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
          <p className="text-sm text-admin-50">This booking is no longer available.</p>
          <Button onClick={() => navigate('/dashboard/reservations')} variant="ghost" className="mt-4">Back to Bookings</Button>
        </div>
      </AdminLayout>
    )
  }

  const customer = {
    name: reservation.user?.name ?? reservation.guestName ?? 'Guest',
    email: reservation.user?.email ?? reservation.guestEmail ?? null,
    phone: reservation.user?.phone ?? reservation.guestPhone ?? null,
  }
  const title = reservation.source === 'EVENT' && reservation.event?.name ? reservation.event.name : reservation.location?.name ?? reservation.tableCategory
  const payment = reservation.payment ?? reservation.payments?.[0]
  const paymentMethod = reservation.paymentMethod ?? payment?.method ?? 'WALLET'
  const paymentStatus = reservation.paymentStatus ?? payment?.status ?? 'SUCCESS'
  const preOrderItems = normalizedReservationPreOrderMenu(reservation.preOrderMenu)
  const preOrderTotal = preOrderItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const canUpdateStatus = nextStatuses.length > 0 && user.role !== 'customer_support'

  return (
    <AdminLayout title="Booking Detail">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => navigate('/dashboard/reservations')} className="flex w-fit items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 py-1.5 text-sm text-admin-40 transition-colors hover:text-admin-70">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bookings
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
            <Badge className="border-admin bg-admin-overlay text-admin-50">{reservation.source === 'EVENT' ? 'Event table' : 'Venue table'}</Badge>
            <Badge className={paymentStatusTone(paymentStatus)}>{labelize(paymentStatus)}</Badge>
          </div>
        </div>

        <BookingDetailTabs activeTab={activeTab} onSelect={setActiveTab} />

        {activeTab === 'payment' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <BookingMoneyPanel
              reservation={reservation}
              payment={payment}
              paymentMethod={paymentMethod}
              paymentStatus={paymentStatus}
            />
            <StatusActionRail
              reservation={reservation}
              nextStatuses={nextStatuses}
              canUpdate={canUpdateStatus}
              isPending={updateStatus.isPending}
              onStatus={handleStatus}
            />
          </div>
        ) : activeTab === 'preorder' ? (
          <PreOrderPanel items={preOrderItems} total={preOrderTotal} />
        ) : activeTab === 'chat' ? (
          <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin" aria-label="Booking chat">
            <div className="mb-4 border-b border-admin pb-4">
              <h2 className="font-heading text-lg font-black text-foreground">Booking chat</h2>
              <p className="mt-1 text-sm text-admin-40">Manage messages with the customer for this reservation.</p>
            </div>
            <BookingChatPanel
              reservation={reservation}
              viewer="STAFF"
              viewerName={user.name ?? 'Venue team'}
              tone="admin"
            />
          </section>
        ) : activeTab === 'feedback' ? (
          <FeedbackPanel reservation={reservation} />
        ) : activeTab === 'history' ? (
          <PreviousBookingsPanel
            currentReservation={reservation}
            reservations={previousBookings}
            isLoading={isHistoryLoading}
            dateFilter={historyDate}
            onDateFilterChange={setHistoryDate}
          />
        ) : (
          <OverviewPanel
            reservation={reservation}
            title={title}
            customer={customer}
            payment={payment}
            paymentMethod={paymentMethod}
            paymentStatus={paymentStatus}
            preOrderTotal={preOrderTotal}
          />
        )}

        {reservation.cancellationReason && activeTab === 'overview' && (
          <section className="rounded-2xl border border-admin bg-admin-surface p-5">
            <h2 className="font-heading text-base font-black text-foreground">Operational Note</h2>
            <Textarea readOnly value={reservation.cancellationReason} className="mt-3 min-h-[96px] resize-none border-admin bg-admin-input text-admin-70" />
          </section>
        )}
      </div>
      <Dialog
        open={Boolean(statusDialog)}
        onOpenChange={open => {
          if (!open && !updateStatus.isPending) setStatusDialog(null)
        }}
      >
        <DialogContent className="border-admin bg-admin-surface text-foreground">
          <DialogHeader>
            <DialogTitle>{statusDialog?.status === 'NO_SHOW' ? 'Mark as no-show?' : 'Cancel booking?'}</DialogTitle>
            <DialogDescription>
              Add the operational note that should be stored with this booking status change.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={statusDialog?.reason ?? ''}
            onChange={event => setStatusDialog(current => current ? { ...current, reason: event.target.value } : current)}
            placeholder={statusDialog?.status === 'NO_SHOW' ? 'Example: Guest did not arrive by cutoff time.' : 'Example: Customer requested cancellation.'}
            className="min-h-[120px] resize-none border-admin bg-admin-input"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusDialog(null)} disabled={updateStatus.isPending}>
              Keep booking
            </Button>
            <Button type="button" onClick={handleReasonedStatus} disabled={updateStatus.isPending} className="bg-neon-pink text-white hover:bg-neon-pink/90">
              {updateStatus.isPending ? 'Updating...' : 'Update booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

function BookingDetailTabs({ activeTab, onSelect }: { activeTab: BookingDetailTab; onSelect: (tab: BookingDetailTab) => void }) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex w-max min-w-full justify-start">
        <div className="flex shrink-0 rounded-full border border-admin bg-admin-surface p-1">
          {BOOKING_DETAIL_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelect(tab.value)}
              className={[
                'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition',
                activeTab === tab.value ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-neon-pink',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverviewPanel({
  reservation,
  title,
  customer,
  payment,
  paymentMethod,
  paymentStatus,
  preOrderTotal,
}: {
  reservation: Reservation
  title: string
  customer: { name: string; email: string | null; phone: string | null }
  payment?: ReservationPayment | null
  paymentMethod: string
  paymentStatus: string
  preOrderTotal: number
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div className="relative h-56 overflow-hidden rounded-2xl bg-admin-overlay sm:h-72">
          <img
            src={bookingImage(reservation)}
            alt={title}
            className="h-full w-full object-cover"
            onError={event => { event.currentTarget.src = PLACEHOLDER }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <div className="absolute left-4 top-4">
            <Badge className="border-white/15 bg-black/45 text-white/75 backdrop-blur">#{reservation.reference}</Badge>
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
          <h1 className="font-heading text-xl font-black text-foreground sm:text-2xl">{title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span className="flex items-center gap-2 text-sm text-admin-50">
              <CalendarClock className="h-4 w-4 shrink-0 text-neon-pink" />
              {formatDateTime(reservation.startDateTime)} - {shortTime(reservation.endDateTime)}
            </span>
            <span className="flex items-center gap-2 text-sm text-admin-50">
              <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
              {reservation.location?.name ?? reservation.event?.name ?? 'Location TBA'}
            </span>
            <span className="flex items-center gap-2 text-sm text-admin-50">
              <Table2 className="h-4 w-4 shrink-0 text-neon-pink" />
              {reservation.table?.name ?? reservation.tableCategory}
            </span>
            <span className="flex items-center gap-2 text-sm text-admin-50">
              <Users className="h-4 w-4 shrink-0 text-neon-pink" />
              {reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}
            </span>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <CustomerPanel reservation={reservation} customer={customer} />
          <BookingTimeline reservation={reservation} payment={payment} />
        </div>
      </div>

      <aside className="space-y-5">
        <InfoCard icon={MapPin} title={reservation.source === 'EVENT' ? 'Event / Venue' : 'Venue'}>
          <p className="font-semibold text-foreground">{reservation.location?.name ?? 'Location TBA'}</p>
          <p className="mt-1 text-sm leading-6 text-admin-40">{reservation.location?.address ?? 'Address TBA'}</p>
          {reservation.event?.name && <p className="mt-3 text-sm font-semibold text-neon-pink">{reservation.event.name}</p>}
          {reservation.location?.menuDocumentName ? (
            <p className="mt-3 text-xs text-admin-40">Menu file: <span className="text-admin-70">{reservation.location.menuDocumentName}</span></p>
          ) : null}
        </InfoCard>

        <InfoCard icon={Table2} title="Table">
          <div className="space-y-0">
            <DetailRow label="Table" value={reservation.table?.name ?? reservation.tableCategory} />
            <DetailRow label="Guests" value={`${reservation.guestCount}`} />
            <DetailRow label="Category" value={reservation.tableCategory} />
            <DetailRow label="Min size" value={`${reservation.table?.minGuests ?? '-'}`} />
            <DetailRow label="Max size" value={`${reservation.table?.maxGuests ?? '-'}`} />
          </div>
        </InfoCard>

        <InfoCard icon={ReceiptText} title="Payment Reference">
          <p className="font-mono text-sm font-semibold text-foreground">{payment?.reference ?? reservation.reference}</p>
          <p className="mt-2 text-sm text-admin-40">Method: <span className="text-admin-70">{labelize(paymentMethod)}</span></p>
          <p className="mt-1 text-sm text-admin-40">Status: <span className="text-admin-70">{labelize(paymentStatus)}</span></p>
          <p className="mt-3 rounded-xl border border-admin bg-admin-overlay p-3 text-xs leading-5 text-admin-50">
            Pre-order value: <span className="font-mono text-admin-80">{money(preOrderTotal)}</span>
          </p>
        </InfoCard>
      </aside>
    </div>
  )
}

function FeedbackPanel({ reservation }: { reservation: Reservation }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="mb-4 border-b border-admin pb-4">
        <h2 className="font-heading text-lg font-black text-foreground">Customer Feedback</h2>
        <p className="mt-1 text-sm text-admin-40">Read the customer review for this completed booking.</p>
      </div>
      {reservation.status === 'COMPLETED' ? (
        <FeedbackReadOnly
          targetType="RESERVATION"
          targetIds={[
            reservationFeedbackTargetId(reservation.id),
            ...(reservation.publicAccessToken ? [publicReservationFeedbackTargetId(reservation.publicAccessToken)] : []),
          ]}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-admin bg-admin-overlay p-6 text-sm text-admin-50">
          Feedback becomes available after this reservation is marked completed.
        </div>
      )}
    </section>
  )
}

function PreviousBookingsPanel({
  currentReservation,
  reservations,
  isLoading,
  dateFilter,
  onDateFilterChange,
}: {
  currentReservation: Reservation
  reservations: Reservation[]
  isLoading: boolean
  dateFilter: string
  onDateFilterChange: (date: string) => void
}) {
  const navigate = useNavigate()

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-4 border-b border-admin pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-lg font-black text-foreground">Previous Bookings</h2>
          <p className="mt-1 text-sm text-admin-40">Earlier reservations from this customer before #{currentReservation.reference}.</p>
        </div>
        <div className="relative w-full lg:w-56">
          <CalendarDays className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            type="date"
            value={dateFilter}
            onChange={event => onDateFilterChange(event.target.value)}
            className="border-admin bg-admin-input pl-8"
            aria-label="Filter previous bookings by date"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-admin bg-admin-overlay p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-admin-30" />
          <p className="mt-2 text-sm font-medium text-admin-70">No previous bookings found</p>
          <p className="mt-1 text-xs text-admin-40">Try clearing the date filter or check another customer booking.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-admin">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">Guests</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Deposit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {reservations.map(reservation => (
                <tr key={reservation.id} className="bg-admin-surface hover:bg-admin-overlay/60">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)}
                      className="font-mono text-xs font-semibold text-neon-pink hover:underline"
                    >
                      #{reservation.reference}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-admin-50">{formatDateTime(reservation.startDateTime)}</td>
                  <td className="px-4 py-3 text-admin-60">{reservation.location?.name ?? reservation.event?.name ?? reservation.tableCategory}</td>
                  <td className="px-4 py-3 font-mono text-admin-70">{reservation.guestCount}</td>
                  <td className="px-4 py-3"><Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge></td>
                  <td className="px-4 py-3 text-right font-mono text-admin-70">{money(reservation.depositAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StatusActionRail({
  reservation,
  nextStatuses,
  canUpdate,
  isPending,
  onStatus,
}: {
  reservation: Reservation
  nextStatuses: ReservationStatus[]
  canUpdate: boolean
  isPending: boolean
  onStatus: (status: ReservationStatus) => void
}) {
  return (
    <aside className="rounded-2xl border border-admin bg-admin-overlay p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-pink/20 bg-neon-pink/10 text-neon-pink">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-admin-40">Current status</p>
          <p className="mt-1 font-heading text-lg font-black text-foreground">{statusLabel(reservation.status)}</p>
          <p className="mt-1 text-xs text-admin-40">#{reservation.reference}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {canUpdate ? (
          nextStatuses.map(status => (
            <Button
              key={status}
              disabled={isPending}
              onClick={() => onStatus(status)}
              className={status === 'CANCELLED' || status === 'NO_SHOW' ? 'w-full justify-center bg-admin-surface text-admin-70 hover:bg-admin-overlay-lg' : 'w-full justify-center bg-neon-pink text-white hover:bg-neon-pink/90'}
            >
              Mark {statusLabel(status)}
            </Button>
          ))
        ) : (
          <div className="rounded-xl border border-admin bg-admin-surface p-3 text-sm text-admin-50">
            No status action is available for this booking.
          </div>
        )}
      </div>
    </aside>
  )
}

function BookingTimeline({ reservation, payment }: { reservation: Reservation; payment?: ReservationPayment | null }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground">
        <CalendarClock className="h-4 w-4 text-neon-pink" />
        Booking Timeline
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TimelineItem icon={Clock3} label="Starts" value={formatDateTime(reservation.startDateTime)} />
        <TimelineItem icon={Clock3} label="Ends" value={formatDateTime(reservation.endDateTime)} />
        <TimelineItem icon={CreditCard} label="Deposit paid" value={payment?.createdAt ? formatDateTime(payment.createdAt) : labelize(reservation.paymentStatus ?? payment?.status)} />
        <TimelineItem icon={CalendarClock} label="Cancel before" value={formatDateTime(reservation.cancelBefore)} />
      </div>
    </section>
  )
}

function BookingMoneyPanel({
  reservation,
  payment,
  paymentMethod,
  paymentStatus,
}: {
  reservation: Reservation
  payment?: ReservationPayment | null
  paymentMethod: string
  paymentStatus: string
}) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground">
          <CreditCard className="h-4 w-4 text-neon-pink" />
          Deposit paid
        </h2>
        <Badge className={paymentStatusTone(paymentStatus)}>{labelize(paymentStatus)}</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="Deposit paid" value={money(reservation.depositAmount)} />
        <Metric label="Minimum spend" value={money(reservation.minimumSpend)} />
        <Metric label="Payment method" value={labelize(paymentMethod)} />
        <Metric label="Charged amount" value={money(payment?.amount ?? reservation.depositAmount)} />
      </div>
      <p className="mt-4 rounded-xl border border-admin bg-admin-overlay p-3 text-xs leading-5 text-admin-50">
        Checkout collects the booking fee/deposit only. Minimum spend remains a venue or event rule for service.
      </p>
    </section>
  )
}

function CustomerPanel({
  reservation,
  customer,
}: {
  reservation: Reservation
  customer: { name: string; email: string | null; phone: string | null }
}) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground">
        <UserRound className="h-4 w-4 text-neon-pink" />
        Customer
      </h2>
      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-admin bg-admin-overlay font-heading text-lg font-black text-neon-pink">
          {customer.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{customer.name}</p>
          <InfoLine icon={Mail} value={customer.email ?? 'No email'} />
          <InfoLine icon={Phone} value={customer.phone ?? 'No phone'} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="Guest count" value={`${reservation.guestCount}`} />
        <Metric label="Customer type" value={reservation.user ? 'Logged in' : 'Public guest'} />
      </div>
    </section>
  )
}

function PreOrderPanel({ items, total }: { items: ReturnType<typeof normalizedReservationPreOrderMenu>; total: number }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground">
            <Utensils className="h-4 w-4 text-neon-pink" />
            Venue pre-order
          </h2>
          <p className="mt-1 text-sm text-admin-40">Saved for the venue team, not charged during table checkout.</p>
        </div>
        <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{money(total)}</Badge>
      </div>

      {items.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-admin">
          <table className="w-full text-sm">
            <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {items.map((item, index) => (
                <tr key={`${item.id ?? item.name}-${index}`} className="bg-admin-overlay/40">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    {item.category ? <p className="mt-1 text-xs text-admin-40">{item.category}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-admin-70">{item.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-foreground">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-admin bg-admin-overlay p-6 text-center">
          <Utensils className="mx-auto h-8 w-8 text-admin-30" />
          <p className="mt-2 text-sm font-medium text-admin-70">No venue pre-order saved</p>
          <p className="mt-1 text-xs text-admin-40">Food and drink selections will appear here when attached to the booking.</p>
        </div>
      )}
    </section>
  )
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-black text-foreground">
        <Icon className="h-4 w-4 text-neon-pink" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function InfoLine({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-admin-40">
      <Icon className="h-3.5 w-3.5 shrink-0 text-admin-30" />
      <span className="truncate">{value}</span>
    </p>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin py-2.5 last:border-b-0">
      <span className="text-xs text-admin-40">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function TimelineItem({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-admin-30">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay p-3">
      <p className="text-[11px] text-admin-30">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
