import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCancelReservation, useReservation, type ReservationStatus } from '@glee/api'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton, Textarea, useToast } from '@glee/ui'
import { ArrowLeft, Calendar, CheckCircle2, MapPin, MessageCircle, QrCode, ReceiptText, ShieldCheck, XCircle } from 'lucide-react'
import { FeedbackCard, canReviewReservationByStatus, publicReservationFeedbackTargetId, reservationFeedbackTargetId } from '../../components/feedback'
import { normalizedReservationPreOrderMenu } from '../../components/reservations/reservationMenuUtils'
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

function DetailTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/20 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold ${accent ? 'font-mono text-neon-pink' : 'text-white'}`}>{value}</p>
    </div>
  )
}

export default function CustomerReservationDetailPage() {
  const { reservationId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: reservation, isLoading } = useReservation(reservationId)
  const cancelReservation = useCancelReservation()
  const [reason, setReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const cancellable = canCancel(reservation?.status, reservation?.cancelBefore)
  const venue = reservation?.location
  const canReview = canReviewReservationByStatus(reservation?.status)
  const qrPayload = reservation
    ? reservation.publicAccessToken
      ? `${window.location.origin}/reservation/${reservation.publicAccessToken}`
      : reservation.reference || reservation.id
    : ''

  async function handleCancel() {
    if (!reservation || !cancellable) return
    try {
      await cancelReservation.mutateAsync({ id: reservation.id, reason: reason.trim() || undefined })
      setCancelOpen(false)
      setReason('')
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

  const preOrderItems = normalizedReservationPreOrderMenu(reservation.preOrderMenu)
  const preOrderTotal = preOrderItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const title = venue?.name ?? reservation.tableCategory
  const address = venue?.address ?? 'Location TBA'
  const tableName = reservation.table?.name ?? 'Assigned by venue'

  return (
    <CustomerLayout title="Reservation" hidePageHeader>
      <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-5 sm:px-4 sm:pt-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/app/tickets?tab=reservations')}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.14] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </button>
          {cancellable ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-full border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-white sm:w-auto"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Booking
            </Button>
          ) : null}
        </div>

        <div className="grid gap-5">
          <section className="rounded-[28px] border border-white/12 bg-white/[0.08] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                <h1 className="mt-3 break-words font-heading text-2xl font-black leading-tight text-white sm:text-4xl">{title}</h1>
                <div className="mt-3 grid gap-2 text-sm text-white/65">
                  <p className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                    <span className="min-w-0 break-words">{formatDateTime(reservation.startDateTime)}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                    <span className="min-w-0 break-words">{address}</span>
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-white/45">Deposit paid</p>
                  <p className="mt-1 font-mono font-bold text-neon-pink">{money(reservation.depositAmount)}</p>
                  <p className="mt-2 text-xs text-white/45">Minimum spend {money(reservation.minimumSpend)}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate(`/app/reservations/detail/${reservation.id}/chat`)}
                  className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Booking Chat
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
              <article className="w-full overflow-hidden rounded-2xl bg-white text-black shadow">
                <div className="bg-white p-4 text-center">
                  <div className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neon-pink">
                    <QrCode className="h-4 w-4" />
                    Booking ticket
                  </div>
                  <img src={qrImageSrc(qrPayload)} alt="Reservation QR code" className="mx-auto h-44 w-44 max-w-full rounded-2xl bg-white object-contain sm:h-52 sm:w-52" />
                  <p className="mt-3 break-all font-mono text-xs font-bold uppercase tracking-wider text-slate-500">{reservation.reference}</p>
                </div>
                <div className="relative flex h-6 items-center bg-white px-3">
                  <div className="absolute -left-2 h-4 w-4 rounded-full bg-[#151523]" />
                  <div className="w-full border-t-2 border-dashed border-slate-200" />
                  <div className="absolute -right-2 h-4 w-4 rounded-full bg-[#151523]" />
                </div>
                <div className="flex items-center justify-between gap-3 bg-white px-4 pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{reservation.tableCategory}</p>
                    <p className="truncate text-xs text-slate-500">{tableName}</p>
                  </div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {reservation.status === 'CANCELLED' ? 'Cancelled' : reservation.status === 'NO_SHOW' ? 'No-show' : 'Ready'}
                  </Badge>
                </div>
              </article>

              <div className="space-y-4">
                <div>
                  <h2 className="font-heading text-xl font-black text-white">Booking details</h2>
                  <p className="mt-1 break-all text-sm text-white/55">Reference {reservation.reference}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailTile label="Start" value={formatDateTime(reservation.startDateTime)} />
                  <DetailTile label="End" value={formatDateTime(reservation.endDateTime)} />
                  <DetailTile label="Guests" value={`${reservation.guestCount} guest${reservation.guestCount === 1 ? '' : 's'}`} />
                  <DetailTile label="Table type" value={reservation.tableCategory} />
                  <DetailTile label="Assigned table" value={tableName} />
                  <DetailTile label="Minimum spend" value={money(reservation.minimumSpend)} />
                  <DetailTile label="Deposit paid" value={money(reservation.depositAmount)} accent />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
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

              {preOrderItems.length ? (
                <section className="rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-heading text-lg font-black text-white">Food & drink pre-order</h3>
                      <p className="mt-1 text-xs text-white/45">Saved for the venue, not charged during table checkout.</p>
                    </div>
                    <div className="font-mono text-sm font-bold text-neon-pink">{money(preOrderTotal)}</div>
                  </div>
                  <div className="mt-4 divide-y divide-white/10">
                    {preOrderItems.map((item, index) => (
                      <div key={`${item.id ?? item.name}-${index}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{item.quantity} x {item.name}</p>
                          {item.category ? <p className="mt-1 text-xs text-white/40">{item.category}</p> : null}
                        </div>
                        <p className="shrink-0 font-mono text-sm font-bold text-white">{money(item.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {reservation.payments?.length ? (
                <section className="rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
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
                </section>
              ) : null}
            </div>

            <aside className="h-fit rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-pink/15 text-neon-pink">
                {reservation.status === 'CANCELLED' ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </div>
              <h2 className="mt-4 font-heading text-2xl font-black text-white">Reservation status</h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Cancellation cutoff: {formatDateTime(reservation.cancelBefore)}.
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-5 text-white/58">
                <ShieldCheck className="mb-2 h-4 w-4 text-neon-pink" />
                The venue team can update seated, completed, no-show, or cancelled status from their dashboard.
              </div>
              <Button variant="ghost" onClick={() => navigate('/app/tickets?tab=reservations')} className="mt-3 w-full rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                Tickets & bookings
              </Button>
            </aside>
          </section>
        </div>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="mx-auto max-w-md rounded-3xl border-white/15 bg-[#151523] text-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-black text-white">Cancel Booking</DialogTitle>
              <DialogDescription className="text-white/60">
                This releases the table back to the venue. Add an optional note for the team.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="min-h-28 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(false)}
                className="rounded-full border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]"
              >
                Keep booking
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                disabled={cancelReservation.isPending}
                className="rounded-full bg-red-500 text-white hover:bg-red-500/90"
              >
                {cancelReservation.isPending ? 'Cancelling...' : 'Confirm cancellation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  )
}
