import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@glee/ui'
import { confirmTicketPurchase, ticketVerificationStorageKey } from '@glee/api'

type ConfirmStatus = 'loading' | 'success' | 'error'

export default function EventTicketConfirmPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<ConfirmStatus>('loading')
  const [message, setMessage] = useState('Confirming your payment...')

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      setStatus('error')
      setMessage('Missing Paystack payment reference.')
      return
    }

    const storageKey = ticketVerificationStorageKey(reference)
    const verificationToken = sessionStorage.getItem(storageKey)

    confirmTicketPurchase(verificationToken ? { verificationToken } : { reference })
      .then(() => {
        sessionStorage.removeItem(storageKey)
        setStatus('success')
        setMessage('Your payment has been confirmed. Check your email for your event ticket and order details.')
      })
      .catch(error => {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Payment confirmation failed.')
      })
  }, [searchParams])

  return (
    <main className="min-h-screen bg-glee-bg text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
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
          <Button asChild className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            <Link to="/">Browse Events</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
