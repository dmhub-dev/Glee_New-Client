import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Skeleton, Textarea, useToast } from '@glee/ui'
import { ArrowLeft, CalendarClock, CreditCard, MapPin, Table2, UserRound } from 'lucide-react'
import { useAdminReservation, useUpdateAdminReservationStatus, type ReservationStatus } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'

const TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  CONFIRMED: ['SEATED', 'NO_SHOW', 'CANCELLED'],
  SEATED: ['COMPLETED', 'CANCELLED'],
}

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

function statusLabel(status: ReservationStatus) {
  return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
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

export default function AdminReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const user = useAdminUser()
  const { toast } = useToast()
  const { data: reservation, isLoading } = useAdminReservation(reservationId ?? '')
  const updateStatus = useUpdateAdminReservationStatus()
  const nextStatuses = useMemo(() => reservation ? TRANSITIONS[reservation.status] ?? [] : [], [reservation])

  async function handleStatus(status: ReservationStatus) {
    if (!reservation) return
    const reason = status === 'CANCELLED' || status === 'NO_SHOW'
      ? window.prompt(status === 'CANCELLED' ? 'Cancellation reason?' : 'No-show note?') ?? undefined
      : undefined
    if ((status === 'CANCELLED' || status === 'NO_SHOW') && reason === undefined) return
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status, reason })
      toast({ title: 'Booking updated', description: `Status changed to ${statusLabel(status)}.` })
    } catch (error) {
      toast({ title: 'Could not update booking', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
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

  return (
    <AdminLayout title="Booking Detail" subtitle={reservation.reference}>
      <div className="space-y-5">
        <button onClick={() => navigate('/dashboard/reservations')} className="inline-flex items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 py-1.5 text-sm text-admin-50 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Bookings
        </button>

        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                <Badge className="border-admin bg-admin-overlay text-admin-50">{reservation.source === 'EVENT' ? 'Event table' : 'Venue table'}</Badge>
              </div>
              <h1 className="font-heading text-2xl font-black text-foreground">{title}</h1>
              <p className="mt-2 text-sm text-admin-40">{formatDateTime(reservation.startDateTime)} - {new Date(reservation.endDateTime).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            {nextStatuses.length > 0 && user.role !== 'customer_support' && (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(status => (
                  <Button key={status} disabled={updateStatus.isPending} onClick={() => handleStatus(status)} className={status === 'CANCELLED' || status === 'NO_SHOW' ? 'bg-admin-overlay text-admin-70 hover:bg-admin-overlay-lg' : 'bg-neon-pink text-white hover:bg-neon-pink/90'}>
                    Mark {statusLabel(status)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <InfoCard icon={UserRound} title="Customer">
            <p className="font-semibold text-foreground">{customer.name}</p>
            <p className="mt-1 text-sm text-admin-40">{customer.email ?? 'No email'}</p>
            <p className="mt-1 text-sm text-admin-40">{customer.phone ?? 'No phone'}</p>
          </InfoCard>
          <InfoCard icon={MapPin} title="Venue">
            <p className="font-semibold text-foreground">{reservation.location?.name ?? 'Location TBA'}</p>
            <p className="mt-1 text-sm text-admin-40">{reservation.location?.address ?? 'Address TBA'}</p>
            {reservation.event?.name && <p className="mt-3 text-sm text-neon-pink">{reservation.event.name}</p>}
          </InfoCard>
          <InfoCard icon={Table2} title="Table">
            <p className="font-semibold text-foreground">{reservation.table?.name ?? reservation.tableCategory}</p>
            <p className="mt-1 text-sm text-admin-40">{reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}</p>
            <p className="mt-1 text-sm text-admin-40">{reservation.tableCategory}</p>
          </InfoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-admin bg-admin-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground"><CreditCard className="h-4 w-4 text-neon-pink" />Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Deposit" value={money(reservation.depositAmount)} />
              <Metric label="Minimum spend" value={money(reservation.minimumSpend)} />
              <Metric label="Method" value={paymentMethod} />
            </div>
            <div className="mt-4 rounded-lg border border-admin bg-admin-overlay p-3 text-sm text-admin-50">
              Payment status: <span className="font-semibold text-foreground">{paymentStatus}</span>
              {(payment?.reference ?? reservation.reference) && <span className="ml-3 text-admin-40">Reference {payment?.reference ?? reservation.reference}</span>}
            </div>
          </section>

          <section className="rounded-xl border border-admin bg-admin-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-black text-foreground"><CalendarClock className="h-4 w-4 text-neon-pink" />Booking Timing</h2>
            <div className="mt-4 space-y-3">
              <Metric label="Start" value={formatDateTime(reservation.startDateTime)} />
              <Metric label="End" value={formatDateTime(reservation.endDateTime)} />
              <Metric label="Cancel before" value={formatDateTime(reservation.cancelBefore)} />
            </div>
          </section>
        </div>

        {reservation.cancellationReason && (
          <section className="rounded-xl border border-admin bg-admin-surface p-5">
            <h2 className="font-heading text-base font-black text-foreground">Operational Note</h2>
            <Textarea readOnly value={reservation.cancellationReason} className="mt-3 min-h-[96px] resize-none border-admin bg-admin-input text-admin-70" />
          </section>
        )}
      </div>
    </AdminLayout>
  )
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-admin bg-admin-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-black text-foreground">
        <Icon className="h-4 w-4 text-neon-pink" />
        {title}
      </h2>
      {children}
    </section>
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
