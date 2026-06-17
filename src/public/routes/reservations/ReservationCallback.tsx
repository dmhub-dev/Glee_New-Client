import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@glee/ui'
import { confirmReservationPayment, reservationCheckoutContextStorageKey, reservationVerificationStorageKey } from '@glee/api'
import { AlertTriangle, CheckCircle2, Home, Mail, Search, Ticket } from 'lucide-react'

type CallbackState = 'loading' | 'success' | 'review' | 'error'
type CheckoutContext = {
  mode?: 'customer' | 'guest'
  reservationId?: string
  source?: 'VENUE' | 'EVENT'
  locationId?: string
  eventId?: string
  email?: string | null
}
type SuccessDetails = {
  mode: 'customer' | 'guest'
  email?: string | null
  reservationId?: string | null
  homePath: string
  explorePath: string
}

function safeSessionStorageGet(key: string) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSessionStorageRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Storage is best-effort only. Payment verification can still use the Paystack reference.
  }
}

export default function ReservationCallbackPage() {
  const [searchParams] = useSearchParams()
  const started = useRef(false)
  const [state, setState] = useState<CallbackState>('loading')
  const [message, setMessage] = useState('Confirming your reservation payment...')
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [customerReservationId, setCustomerReservationId] = useState<string | null>(null)
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      setState('error')
      setMessage('Missing Paystack payment reference.')
      return
    }

    const verificationKey = reservationVerificationStorageKey(reference)
    const contextKey = reservationCheckoutContextStorageKey(reference)
    const verificationToken = safeSessionStorageGet(verificationKey)
    const rawContext = safeSessionStorageGet(contextKey)
    let context: CheckoutContext = {}
    if (rawContext) {
      try {
        context = JSON.parse(rawContext) as CheckoutContext
      } catch {
        context = {}
      }
    }

    confirmReservationPayment(verificationToken ? { verificationToken } : { reference })
      .then(result => {
        safeSessionStorageRemove(verificationKey)
        safeSessionStorageRemove(contextKey)
        const reservation = result.data ?? null
        const fallbackReservationId = reservation?.id ?? context.reservationId
        if (!result.success) {
          setPublicToken(reservation?.publicAccessToken ?? null)
          setCustomerReservationId(context.mode === 'customer' && fallbackReservationId ? fallbackReservationId : null)
          setState('review')
          setMessage(result.message ?? 'Payment was received, but your reservation still needs manual review.')
          return
        }
        if (!reservation) {
          setState('error')
          setMessage(result.message ?? 'Payment confirmation did not include reservation details.')
          return
        }
        const mode = context.mode === 'customer' ? 'customer' : 'guest'
        const email = reservation.guestEmail ?? reservation.user?.email ?? context.email ?? null
        setSuccessDetails({
          mode,
          email,
          reservationId: fallbackReservationId ?? null,
          homePath: mode === 'customer' ? '/app' : '/',
          explorePath: mode === 'customer' ? '/app/reservations' : '/reservations',
        })
        setPublicToken(reservation.publicAccessToken ?? null)
        setCustomerReservationId(mode === 'customer' && fallbackReservationId ? fallbackReservationId : null)
        setState('success')
        setMessage(result.message ?? 'Your reservation has been confirmed.')
      })
      .catch(error => {
        setState('error')
        setMessage(error instanceof Error ? error.message : 'Payment confirmation failed.')
      })
  }, [searchParams])

  const successTicketPath = successDetails?.reservationId
    ? `/app/reservations/detail/${successDetails.reservationId}`
    : '/app/tickets?tab=reservations'
  const isSuccess = state === 'success' && successDetails
  const StatusIcon = state === 'success' ? CheckCircle2 : state === 'error' ? AlertTriangle : state === 'review' ? AlertTriangle : null
  const title = state === 'success'
    ? 'Reservation Confirmed'
    : state === 'loading'
      ? 'Confirming Payment'
      : state === 'review'
        ? 'Payment Needs Review'
        : 'Payment Confirmation Failed'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050017] px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.08] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-black ${state === 'success' ? 'bg-emerald-400/10 text-emerald-300' : state === 'error' ? 'bg-red-500/10 text-red-300' : state === 'review' ? 'bg-amber-400/10 text-amber-300' : 'bg-neon-pink/10 text-neon-pink'}`}>
          {StatusIcon ? <StatusIcon className="h-7 w-7" /> : '...'}
        </div>
        <h1 className="mt-5 font-heading text-2xl font-black">{title}</h1>
        {isSuccess ? (
          <div className="mt-4 space-y-3 text-sm leading-6 text-white/60">
            <p>{message}</p>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon-pink">
                <Mail className="h-4 w-4" />
                Email confirmation
              </p>
              <p className="mt-2 text-white/70">
                Confirmation sent to{' '}
                <span className="break-all font-mono font-semibold text-white">{successDetails.email ?? 'your email'}</span>.
              </p>
              {successDetails.mode === 'customer' ? (
                <p className="mt-2 text-white/55">Your booking ticket is in Tickets.</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
        )}
        {state !== 'loading' && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {isSuccess ? (
              <>
                <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                  <Link to={successDetails.homePath}>
                    <Home className="h-4 w-4" />
                    Back Home
                  </Link>
                </Button>
                {successDetails.mode === 'customer' ? (
                  <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
                    <Link to={successTicketPath}>
                      <Ticket className="h-4 w-4" />
                      View Ticket
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
                    <Link to={successDetails.explorePath}>
                      <Search className="h-4 w-4" />
                      Explore Clubs & Restaurants
                    </Link>
                  </Button>
                )}
                {successDetails.mode === 'customer' ? (
                  <Button asChild variant="ghost" className="rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                    <Link to={successDetails.explorePath}>Explore Clubs & Restaurants</Link>
                  </Button>
                ) : null}
              </>
            ) : publicToken ? (
              <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                <Link to={`/reservation/${publicToken}`}>View reservation</Link>
              </Button>
            ) : customerReservationId ? (
              <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                <Link to={`/app/reservations/detail/${customerReservationId}`}>View reservation</Link>
              </Button>
            ) : (
              <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                <Link to="/events">Browse events</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
              <Link to="/">Home</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}
