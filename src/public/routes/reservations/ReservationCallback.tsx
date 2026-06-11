import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@glee/ui'
import { confirmReservationPayment, reservationCheckoutContextStorageKey, reservationVerificationStorageKey } from '@glee/api'

type CallbackState = 'loading' | 'review' | 'error'
type CheckoutContext = { mode?: 'customer' | 'guest'; reservationId?: string }

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
  const navigate = useNavigate()
  const started = useRef(false)
  const [state, setState] = useState<CallbackState>('loading')
  const [message, setMessage] = useState('Confirming your reservation payment...')
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [customerReservationId, setCustomerReservationId] = useState<string | null>(null)

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
        if (reservation.publicAccessToken) {
          navigate(`/reservation/${reservation.publicAccessToken}`, { replace: true })
          return
        }
        if (context.mode === 'customer' && fallbackReservationId) {
          navigate(`/app/reservations/detail/${fallbackReservationId}`, { replace: true })
          return
        }
        setState('error')
        setMessage(result.message ?? 'Payment was confirmed, but the public reservation link was not returned.')
      })
      .catch(error => {
        setState('error')
        setMessage(error instanceof Error ? error.message : 'Payment confirmation failed.')
      })
  }, [navigate, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050017] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.08] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-black ${state === 'error' ? 'bg-red-500/10 text-red-300' : state === 'review' ? 'bg-amber-400/10 text-amber-300' : 'bg-neon-pink/10 text-neon-pink'}`}>
          {state === 'error' ? '!' : state === 'review' ? '?' : '...'}
        </div>
        <h1 className="mt-5 font-heading text-2xl font-black">{state === 'loading' ? 'Confirming Payment' : state === 'review' ? 'Payment Needs Review' : 'Payment Confirmation Failed'}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
        {state !== 'loading' && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {publicToken ? (
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
