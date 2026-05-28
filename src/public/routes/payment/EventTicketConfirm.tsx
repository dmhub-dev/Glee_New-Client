import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@glee/ui'
import { confirmTicketPurchase, ticketCheckoutContextStorageKey, ticketVerificationStorageKey } from '@glee/api'

type ConfirmStatus = 'loading' | 'success' | 'error'
type CheckoutContext = { mode?: 'guest' | 'customer'; eventId?: string }

export default function EventTicketConfirmPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<ConfirmStatus>('loading')
  const [message, setMessage] = useState('Confirming your payment...')
  const [context, setContext] = useState<CheckoutContext>({})

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      setStatus('error')
      setMessage('Missing Paystack payment reference.')
      return
    }

    const storageKey = ticketVerificationStorageKey(reference)
    const contextKey = ticketCheckoutContextStorageKey(reference)
    const verificationToken = sessionStorage.getItem(storageKey)
    const rawContext = sessionStorage.getItem(contextKey)
    if (rawContext) {
      try {
        setContext(JSON.parse(rawContext) as CheckoutContext)
      } catch {
        setContext({})
      }
    }

    confirmTicketPurchase(verificationToken ? { verificationToken } : { reference })
      .then(() => {
        sessionStorage.removeItem(storageKey)
        sessionStorage.removeItem(contextKey)
        setStatus('success')
        setMessage(rawContext?.includes('"customer"')
          ? 'Your payment has been confirmed. Your ticket is ready in My Tickets and we have sent a copy to your email.'
          : 'Your payment has been confirmed. Check your email for your event ticket and order details.')
      })
      .catch(error => {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Payment confirmation failed.')
      })
  }, [searchParams])

  return (
    <main className="min-h-screen bg-glee-bg text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-8 text-center shadow-2xl">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          status === 'success'
            ? 'bg-green-500/10 text-green-300'
            : status === 'error'
              ? 'bg-red-500/10 text-red-300'
              : 'bg-neon-pink/10 text-neon-pink'
        }`}>
          {status === 'success' ? '✓' : status === 'error' ? '!' : '...'}
        </div>
        <h1 className="mt-5 font-heading text-2xl font-black">
          {status === 'success' ? 'Payment Confirmed' : status === 'error' ? 'Payment Needs Review' : 'Confirming Payment'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {context.mode === 'customer' ? (
            <>
              <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                <Link to={context.eventId ? `/app/events/${context.eventId}` : '/app/events'}>Back to Event</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
                <Link to="/app/tickets">View Ticket</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
              <Link to={context.eventId ? `/events/${context.eventId}` : '/'}>Back to Event</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
