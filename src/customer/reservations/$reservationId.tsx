import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCancelReservation, useReservation, type ReservationStatus } from '@glee/api'
import { Badge, Button, Skeleton, Textarea, useToast } from '@glee/ui'
import { Calendar, CheckCircle2, ChevronLeft, Clock, MapPin, QrCode, ReceiptText, ShieldCheck, Users, XCircle } from 'lucide-react'
import { BookingChatPanel } from '../../components/chat/BookingChatPanel'
import { FeedbackCard, canReviewReservationByStatus, publicReservationFeedbackTargetId, reservationFeedbackTargetId } from '../../components/feedback'
import CustomerLayout from '../CustomerLayout'

function money(value: string | number | undefined) {
  return `KSh ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusTone(status?: ReservationStatus) {
  if (status === 'CONFIRMED') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
  if (status === 'SEATED' || status === 'COMPLETED') return 'border-sky-400/30 bg-sky-400/10 text-sky-300'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'border-red-400/30 bg-red-400/10 text-red-300'
  return 'border-amber-400/30 bg-amber-400/10 text-amber-300'
}

function statusLabel(status?: string) {
  return (status ?? 'Reservation').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, match => match.toUpperCase())
}

function canCancel(status?: ReservationStatus, cancelBefore?: string) {
  return status === 'CONFIRMED' && Boolean(cancelBefore) && new Date(cancelBefore as string) > new Date()
}

function qrImageSrc(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(value)}`
}

export default function CustomerReservationDetailPage() {
  const { reservationId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { data: reservation, isLoading } = useReservation(reservationId)
  const cancelReservation = useCancelReservation()
  const [reason, setReason] = useState('')
  const cancellable = canCancel(reservation?.status, reservation?.cancelBefore)
  const venue = reservation?.location
  const canReview = canReviewReservationByStatus(reservation?.status)
  const qrPayload = reservation
    ? reservation.publicAccessToken
      ? `${window.location.origin}/reservation/${reservation.publicAccessToken}`
      : reservation.reference || reservation.id
    : ''

  useEffect(() => {
    if (!reservation) return

    if (location.hash === '#chat') {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })

      return () => window.cancelAnimationFrame(frame)
    }
  }, [location.hash, reservation])

  async function handleCancel() {
    if (!reservation || !cancellable) return
    try {
      await cancelReservation.mutateAsync({ id: reservation.id, reason: reason.trim() || undefined })
      toast({ title: 'Reservation cancelled', description: 'The venue can now release this table.' })
    } catch (error) {
      toast({ title: 'Cancellation failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <CustomerLayout title="Reservation" hidePageHeader>
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 lg:px-8">
          <Skeleton className="h-96 rounded-3xl bg-white/10" />
        </div>
      </CustomerLayout>
    )
  }

  if (!reservation) {
    return (
      <CustomerLayout title="Reservation" hidePageHeader>
        <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
          <p className="text-sm font-semibold text-white">Reservation not found</p>
          <Button onClick={() => navigate('/app/tickets?tab=reservations')} className="mt-4 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            Tickets & bookings
          </Button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout title="Reservation" hidePageHeader>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-32 pt-5 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/app/tickets?tab=reservations')}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 text-sm font-semibold text-white/80 transition hover:border-neon-pink/45 hover:bg-white/[0.12] hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to bookings
        </button>

        <section className="overflow-hidden rounded-3xl bg-white/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Reservation pass</p>
                <h1 className="mt-3 font-heading text-3xl font-black leading-tight text-white sm:text-5xl">{venue?.name ?? reservation.tableCategory}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                  <span className="truncate">{venue?.address ?? 'Location TBA'}</span>
                </p>
              </div>
              <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4">
                <Calendar className="mb-2 h-5 w-5 text-neon-pink" />
                <p className="text-xs text-white/45">Start</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDateTime(reservation.startDateTime)}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <Clock className="mb-2 h-5 w-5 text-neon-pink" />
                <p className="text-xs text-white/45">End</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDateTime(reservation.endDateTime)}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <Users className="mb-2 h-5 w-5 text-neon-pink" />
                <p className="text-xs text-white/45">Guests</p>
                <p className="mt-1 text-sm font-semibold text-white">{reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4 rounded-3xl bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <div>
              <h2 className="font-heading text-xl font-black text-white">Booking details</h2>
              <p className="mt-1 text-sm text-white/55">Reference {reservation.reference}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-white/45">Table type</p>
                <p className="mt-1 font-semibold text-white">{reservation.tableCategory}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-white/45">Assigned table</p>
                <p className="mt-1 font-semibold text-white">{reservation.table?.name ?? 'Assigned by venue'}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-white/45">Minimum spend</p>
                <p className="mt-1 font-mono font-bold text-white">{money(reservation.minimumSpend)}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-white/45">Deposit paid</p>
                <p className="mt-1 font-mono font-bold text-neon-pink">{money(reservation.depositAmount)}</p>
              </div>
            </div>
            <div id="chat">
              <BookingChatPanel
                reservation={reservation}
                viewer="CUSTOMER"
                viewerName={reservation.user?.name ?? reservation.guestName ?? 'Customer'}
                tone="customer"
              />
            </div>
            {canReview ? (
              <FeedbackCard
                targetType="RESERVATION"
                targetId={reservationFeedbackTargetId(reservation.id)}
                targetIds={[
                  reservationFeedbackTargetId(reservation.id),
                  ...(reservation.publicAccessToken ? [publicReservationFeedbackTargetId(reservation.publicAccessToken)] : []),
                ]}
                title="How was this booking?"
                description="Rate the table booking experience. Your comment is optional."
              />
            ) : null}
            {reservation.payments?.length ? (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-heading text-lg font-black text-white"><ReceiptText className="h-4 w-4 text-neon-pink" />Payments</h3>
                <div className="space-y-2">
                  {reservation.payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-white">{payment.method}</p>
                        <p className="text-xs text-white/45">{payment.reference ?? 'No reference'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">{money(payment.amount)}</p>
                        <p className="text-xs text-white/45">{statusLabel(payment.status)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-3xl bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <div className="rounded-3xl bg-white p-4 text-center text-slate-950 shadow-[0_18px_45px_rgba(0,0,0,0.32)]">
              <div className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neon-pink">
                <QrCode className="h-4 w-4" />
                Booking Pass
              </div>
              <img src={qrImageSrc(qrPayload)} alt="Reservation QR code" className="mx-auto h-56 w-56 rounded-2xl bg-white object-contain" />
              <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-500">{reservation.reference}</p>
            </div>

            <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-pink/15 text-neon-pink">
              {reservation.status === 'CANCELLED' ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <h2 className="mt-4 font-heading text-2xl font-black text-white">{cancellable ? 'Plans changed?' : 'Reservation status'}</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {cancellable ? `You can cancel before ${formatDateTime(reservation.cancelBefore)}.` : `Cancellation cutoff: ${formatDateTime(reservation.cancelBefore)}.`}
            </p>
            {cancellable ? (
              <div className="mt-4 space-y-3">
                <Textarea
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="Reason for cancellation"
                  className="min-h-24 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
                <Button onClick={handleCancel} disabled={cancelReservation.isPending} className="w-full rounded-full bg-red-500 text-white hover:bg-red-500/90">
                  {cancelReservation.isPending ? 'Cancelling...' : 'Cancel Reservation'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-5 text-white/58">
                <ShieldCheck className="mb-2 h-4 w-4 text-neon-pink" />
                The venue team can update seated, completed, no-show, or cancelled status from their dashboard.
              </div>
            )}
            <Button variant="ghost" onClick={() => navigate('/app/tickets?tab=reservations')} className="mt-3 w-full rounded-full text-white/70 hover:bg-white/10 hover:text-white">
              Tickets & bookings
            </Button>
          </aside>
        </section>
      </div>
    </CustomerLayout>
  )
}
