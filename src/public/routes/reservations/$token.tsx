import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Skeleton } from '@glee/ui'
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, MapPin, ReceiptText, Table2, Users, XCircle } from 'lucide-react'
import { usePublicReservation, type Reservation, type ReservationStatus } from '@glee/api'

function money(value: string | number | undefined | null) {
  return `KSh ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(value?: string | null) {
  return (value ?? 'Pending').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function statusTone(status?: ReservationStatus | string | null) {
  switch (status) {
    case 'CONFIRMED': return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    case 'SEATED':
    case 'COMPLETED': return 'border-sky-400/30 bg-sky-400/10 text-sky-300'
    case 'CANCELLED':
    case 'NO_SHOW': return 'border-red-400/30 bg-red-400/10 text-red-300'
    default: return 'border-amber-400/30 bg-amber-400/10 text-amber-300'
  }
}

function reservationNotice(status?: ReservationStatus | string | null, paymentStatus?: string | null) {
  switch (status) {
    case 'CONFIRMED':
      return {
        className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-50',
        icon: CheckCircle2,
        iconClassName: 'text-emerald-300',
        message: 'Keep this page available when you arrive. The venue team can verify the reservation using the reference and guest details above.',
      }
    case 'SEATED':
    case 'COMPLETED':
      return {
        className: 'border-sky-400/20 bg-sky-400/10 text-sky-50',
        icon: CheckCircle2,
        iconClassName: 'text-sky-300',
        message: 'This reservation has already been checked in or completed. The details remain available for your records.',
      }
    case 'CANCELLED':
      return {
        className: 'border-red-400/20 bg-red-400/10 text-red-50',
        icon: XCircle,
        iconClassName: 'text-red-300',
        message: 'This reservation has been cancelled and is no longer active. Contact the venue if you believe this is incorrect.',
      }
    case 'NO_SHOW':
      return {
        className: 'border-red-400/20 bg-red-400/10 text-red-50',
        icon: XCircle,
        iconClassName: 'text-red-300',
        message: 'This reservation was marked as no-show and is no longer active.',
      }
    case 'PENDING_PAYMENT':
    default:
      return {
        className: 'border-amber-400/20 bg-amber-400/10 text-amber-50',
        icon: AlertTriangle,
        iconClassName: 'text-amber-300',
        message: paymentStatus === 'SUCCESS'
          ? 'Payment was received, but the reservation is still being reviewed. Check this page again before arrival.'
          : 'This reservation is waiting for payment confirmation. Check this page again before arrival.',
      }
  }
}

function maskEmail(value?: string | null) {
  if (!value) return 'Not provided'
  const [name, domain] = value.split('@')
  if (!domain) return value
  return `${name.slice(0, 2)}${name.length > 2 ? '***' : '*'}@${domain}`
}

function maskPhone(value?: string | null) {
  if (!value) return 'Not provided'
  const compact = value.replace(/\s+/g, '')
  if (compact.length <= 6) return value
  return `${compact.slice(0, 4)}***${compact.slice(-3)}`
}

function reservationTitle(reservation: Reservation) {
  if (reservation.source === 'EVENT' && reservation.event?.name) return reservation.event.name
  return reservation.location?.name ?? reservation.tableCategory
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 break-words font-semibold text-white">{value}</p>
    </div>
  )
}

export default function PublicReservationDetailPage() {
  const { token } = useParams<{ token: string }>()
  const { data: reservation, isLoading, isError } = usePublicReservation(token)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#050017] px-4 py-8 text-white">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <Skeleton className="h-72 rounded-3xl bg-white/10" />
          <Skeleton className="h-48 rounded-3xl bg-white/10" />
        </div>
      </main>
    )
  }

  if (isError || !reservation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050017] px-4 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.08] p-8 text-center">
          <h1 className="font-heading text-2xl font-black">Reservation Not Found</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">This reservation link is invalid or has expired.</p>
          <Button asChild className="mt-6 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            <Link to="/events">Browse events</Link>
          </Button>
        </section>
      </main>
    )
  }

  const payment = reservation.payment ?? reservation.payments?.[0] ?? null
  const paymentMethod = reservation.paymentMethod ?? payment?.method ?? 'PAYSTACK'
  const paymentStatus = reservation.paymentStatus ?? payment?.status ?? (reservation.status === 'CONFIRMED' ? 'SUCCESS' : 'PENDING')
  const guestName = reservation.guestName ?? reservation.user?.name ?? 'Guest'
  const guestEmail = reservation.guestEmail ?? reservation.user?.email
  const guestPhone = reservation.guestPhone ?? reservation.user?.phone
  const notice = reservationNotice(reservation.status, paymentStatus)
  const NoticeIcon = notice.icon

  return (
    <main className="min-h-screen bg-[#050017] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-10 brightness-0 invert" />
          </Link>
          <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white">
            <Link to="/events">Events</Link>
          </Button>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Reservation confirmation</p>
                <h1 className="mt-3 font-heading text-3xl font-black leading-tight text-white sm:text-5xl">{reservationTitle(reservation)}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                  <span>{reservation.location?.address ?? reservation.location?.name ?? 'Location TBA'}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{reservation.reference}</Badge>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <DetailTile label="Start" value={formatDateTime(reservation.startDateTime)} />
              <DetailTile label="End" value={formatDateTime(reservation.endDateTime)} />
              <DetailTile label="Guests" value={`${reservation.guestCount} guest${reservation.guestCount === 1 ? '' : 's'}`} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-xl font-black text-white">
              <Table2 className="h-5 w-5 text-neon-pink" />
              Booking Details
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Table category" value={reservation.tableCategory} />
              <DetailTile label="Assigned table" value={reservation.table?.name ?? 'Assigned by venue'} />
              <DetailTile label="Minimum spend" value={money(reservation.minimumSpend)} />
              <DetailTile label="Deposit" value={money(reservation.depositAmount)} />
              <DetailTile label="Venue" value={reservation.location?.name ?? 'Location TBA'} />
              <DetailTile label="Source" value={reservation.source === 'EVENT' ? 'Event reservation' : 'Venue reservation'} />
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5">
              <h2 className="flex items-center gap-2 font-heading text-lg font-black text-white">
                <Users className="h-5 w-5 text-neon-pink" />
                Guest
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-white/45">Name</p>
                  <p className="mt-1 font-semibold text-white">{guestName}</p>
                </div>
                <div>
                  <p className="text-white/45">Email</p>
                  <p className="mt-1 font-mono text-white">{maskEmail(guestEmail)}</p>
                </div>
                <div>
                  <p className="text-white/45">Phone</p>
                  <p className="mt-1 font-mono text-white">{maskPhone(guestPhone)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5">
              <h2 className="flex items-center gap-2 font-heading text-lg font-black text-white">
                <CreditCard className="h-5 w-5 text-neon-pink" />
                Payment
              </h2>
              <div className="mt-4 grid gap-3">
                <DetailTile label="Method" value={statusLabel(paymentMethod)} />
                <DetailTile label="Status" value={statusLabel(paymentStatus)} />
                <DetailTile label="Reference" value={payment?.reference ?? reservation.reference} />
              </div>
            </section>
          </aside>
        </section>

        <section className={`rounded-3xl border p-5 text-sm leading-6 ${notice.className}`}>
          <div className="flex items-start gap-3">
            <NoticeIcon className={`mt-0.5 h-5 w-5 shrink-0 ${notice.iconClassName}`} />
            <p>{notice.message}</p>
          </div>
        </section>

        <footer className="flex flex-wrap items-center gap-3 pb-8 text-xs text-white/35">
          <ReceiptText className="h-4 w-4 text-neon-pink" />
          <span>Reference {reservation.reference}</span>
          <span className="hidden sm:inline">/</span>
          <span><CalendarClock className="mr-1 inline h-3.5 w-3.5 text-neon-pink" />{formatDateTime(reservation.startDateTime)}</span>
        </footer>
      </div>
    </main>
  )
}
