import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@glee/ui'
import { useWallet } from '@glee/api'

type ConfirmStatus = 'loading' | 'success' | 'error'

export default function WalletCallbackPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<ConfirmStatus>('loading')
  const [message, setMessage] = useState('Processing your top-up...')
  const navigate = useNavigate()
  const { refetch: refetchWallet } = useWallet()

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      setStatus('error')
      setMessage('Missing payment reference.')
      return
    }

    // Verify payment by refetching wallet — if balance changed, payment succeeded
    refetchWallet()
      .then(() => {
        setStatus('success')
        setMessage('Your wallet has been credited! You can now use it for ticket purchases.')
      })
      .catch(() => {
        setStatus('error')
        setMessage('Payment verification failed. Please contact support if the amount was deducted.')
      })
  }, [searchParams, refetchWallet])

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
          {status === 'success' ? 'Top-up Confirmed' : status === 'error' ? 'Payment Needs Review' : 'Processing Payment'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => navigate('/app/wallet')} className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            Back to Wallet
          </Button>
          {status !== 'loading' && (
            <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
              <Link to="/app/events">Browse Events</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
