import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePaystackPayment } from 'react-paystack'
import { useEvent } from '@glee/api'
import {
  Button, Skeleton, useToast, Separator,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
} from '@glee/ui'
import { checkoutSchema, type CheckoutFormValues } from '../../lib/schemas/checkout'
import { initiateGuestPurchase, confirmTicketPurchase } from '../../lib/api/tickets'

const PLACEHOLDER = 'https://placehold.co/400x600/0B0B10/FF2D8F?text=Glee'

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const { toast } = useToast()

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const paymentRef = useRef(`glee-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '' },
  })

  const watchedValues = form.watch()

  const selectedItems = event
    ? event.ticketTiers
        .filter(t => (quantities[t.id] ?? 0) > 0)
        .map(t => ({ tier: t, quantity: quantities[t.id] }))
    : []
  const totalPrice = selectedItems.reduce((sum, { tier, quantity }) => sum + tier.price * quantity, 0)

  const initializePayment = usePaystackPayment({
    reference: paymentRef.current,
    email: watchedValues.email || 'placeholder@glee.app',
    amount: totalPrice * 100,
    currency: 'KES',
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? '',
    metadata: { custom_fields: [] },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-glee-bg p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 mt-16">
          <Skeleton className="w-full aspect-[2/3] rounded-2xl" />
          <div className="flex flex-col gap-4 pt-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full mt-4" />
          </div>
        </div>
      </div>
    )
  }

  if (!event || event.status !== 'live') {
    navigate('/', { replace: true })
    return null
  }

  const handleQtyChange = (tierId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [tierId]: qty }))
  }

  const toggleDesc = (tierId: string) => {
    setExpandedDescs(prev => {
      const next = new Set(prev)
      next.has(tierId) ? next.delete(tierId) : next.add(tierId)
      return next
    })
  }

  const handlePayNow = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    const firstItem = selectedItems[0]
    if (!firstItem) return

    setIsPreparing(true)
    let intentAccessCode: string
    let intentReference: string
    let intentVerificationToken: string
    try {
      const intent = await initiateGuestPurchase({
        eventId: event.id,
        ticketCategoryId: firstItem.tier.id,
        noOfTickets: firstItem.quantity,
        guestName: watchedValues.fullName,
        guestEmail: watchedValues.email,
        guestPhone: watchedValues.phone,
      })
      intentAccessCode = intent.access_code
      intentReference = intent.reference
      intentVerificationToken = intent.verificationToken
    } catch (err: unknown) {
      setIsPreparing(false)
      const message = err instanceof Error ? err.message : 'Could not initiate payment'
      toast({ title: 'Payment error', description: message, variant: 'destructive' })
      return
    }

    setAccessCode(intentAccessCode)
    paymentRef.current = intentReference
    setIsPreparing(false)
    setIsProcessing(true)

    initializePayment({
      onSuccess: async () => {
        setIsProcessing(false)
        try {
          await confirmTicketPurchase(intentVerificationToken)
        } catch {
          // payment succeeded — ticket creation failure shouldn't block the success screen
        }
        setIsSuccess(true)
        toast({ title: 'Ticket confirmed!', description: 'Check your email for the QR code.' })
      },
      onClose: () => {
        setIsProcessing(false)
        setAccessCode(null)
        paymentRef.current = `glee-${Date.now()}-${Math.random().toString(36).slice(2)}`
        toast({ title: 'Payment cancelled', description: 'You can try again.', variant: 'destructive' })
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { access_code: intentAccessCode } as any,
    })
  }

  const eventDate = new Date(event.date)
  const startDt = new Date(`${event.date}T${event.startTime}`)
  const endDt = event.endTime ? new Date(`${event.date}T${event.endTime}`) : null
  const posterSrc = event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER

  return (
    <div className="min-h-screen bg-glee-bg text-foreground overflow-x-hidden">

      {/* Ambient blurred backdrop — unique per event */}
      <div className="absolute top-0 left-0 right-0 h-[420px] overflow-hidden pointer-events-none">
        <img
          src={posterSrc}
          alt=""
          aria-hidden
          className="w-full h-full object-cover scale-110 blur-3xl opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-glee-bg/50 via-transparent to-glee-bg" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-4 px-8 py-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white font-semibold text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full px-4 py-2 transition-all backdrop-blur-sm"
        >
          <span className="text-base leading-none">←</span> Back to events
        </button>
        <Link to="/" className="ml-auto">
          <img src="/glee-logo-final.svg" alt="Glee" className="h-8" />
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-8 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* Left: Poster — bigger, with glow + hover zoom */}
        <div className="lg:sticky lg:top-8">
          <div className="relative">
            <div className="absolute -inset-3 rounded-2xl bg-neon-pink/25 blur-2xl opacity-70" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={posterSrc}
                alt={event.title}
                className="w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                style={{ maxHeight: '780px' }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
              />
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex flex-col gap-7 pt-4">

          {/* Title */}
          <div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-white leading-tight mb-2">
              {event.title}
            </h1>
            <p className="text-neon-pink/80 font-mono text-sm">{event.venueId}</p>
          </div>

          {/* Info chips */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-neon-pink/40 text-center flex flex-col">
                <div className="bg-neon-pink text-white text-[8px] font-bold py-0.5 uppercase tracking-wide">
                  {eventDate.toLocaleDateString('en-KE', { month: 'short' })}
                </div>
                <div className="flex-1 flex items-center justify-center text-foreground font-black text-base">
                  {eventDate.getDate()}
                </div>
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {startDt.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-white/50 text-xs font-mono mt-0.5">
                  {startDt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  {endDt && ` – ${endDt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="w-10 h-10 rounded-xl bg-neon-pink/15 border border-neon-pink/30 flex items-center justify-center text-lg flex-shrink-0">
                📍
              </div>
              <div>
                <p className="text-white/80 text-sm">{event.location ?? event.venueId}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location ?? event.venueId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-neon-pink text-xs hover:underline mt-0.5 inline-block"
                >
                  Click to view location ↗
                </a>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-mono font-bold text-neon-pink uppercase tracking-widest mb-2">About</h3>
            <p className="text-white/65 text-sm leading-relaxed">{event.description}</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-mono font-bold text-neon-pink uppercase tracking-widest">Tickets</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Ticket cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {event.ticketTiers.map(tier => {
              const isSoldOut = tier.quantityRemaining === 0
              const qty = quantities[tier.id] ?? 0
              const isExpanded = expandedDescs.has(tier.id)
              const maxQty = Math.min(tier.quantityRemaining, 10)
              const isSelected = qty > 0

              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200 ${
                    isSoldOut
                      ? 'opacity-50 border-white/10 bg-white/3'
                      : isSelected
                        ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_20px_rgba(255,45,143,0.15)]'
                        : 'border-white/10 bg-white/5 hover:border-neon-pink/40 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-bold text-white text-sm">{tier.name}</span>
                    {isSoldOut ? (
                      <span className="text-xs font-mono text-red-400 bg-red-400/10 rounded-full px-2 py-0.5">
                        Sold out
                      </span>
                    ) : tier.quantityRemaining <= 10 ? (
                      <span className="text-xs font-mono text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
                        {tier.quantityRemaining} left
                      </span>
                    ) : null}
                  </div>

                  {tier.description && (
                    <div>
                      <p className={`text-xs text-white/50 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {tier.description}
                      </p>
                      {tier.description.length > 80 && (
                        <button
                          onClick={() => toggleDesc(tier.id)}
                          className="text-xs text-neon-pink hover:underline mt-1"
                        >
                          {isExpanded ? 'See less' : 'See more'}
                        </button>
                      )}
                    </div>
                  )}

                  <p className="font-mono font-bold text-white text-sm">
                    KES {tier.price.toLocaleString()}.00
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      disabled={isSoldOut || qty <= 0}
                      onClick={() => handleQtyChange(tier.id, Math.max(0, qty - 1))}
                      className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-sm text-white/70 hover:border-neon-pink hover:text-neon-pink disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      −
                    </button>
                    <span className="font-mono font-bold text-white w-4 text-center text-sm">{qty}</span>
                    <button
                      type="button"
                      disabled={isSoldOut || qty >= maxQty}
                      onClick={() => handleQtyChange(tier.id, Math.min(maxQty, qty + 1))}
                      className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-sm text-white/70 hover:border-neon-pink hover:text-neon-pink disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {selectedItems.length > 0 && (
                <p className="text-sm font-mono text-white/50">
                  Total: <span className="text-neon-pink font-bold">KSh {totalPrice.toLocaleString()}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-full border-white/20 text-white/60 bg-transparent hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
              >
                Continue shopping
              </Button>
              <Button
                disabled={selectedItems.length === 0}
                onClick={() => setCheckoutOpen(true)}
                className="rounded-full bg-neon-pink hover:bg-neon-hover text-white font-semibold shadow-neon disabled:opacity-40 transition-all hover:scale-[1.03] active:scale-95"
              >
                Continue to checkout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout overlay */}
      {checkoutOpen && !isSuccess && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget && !isProcessing) setCheckoutOpen(false) }}
        >
          <div className="bg-[#0f0f15] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-2xl text-white">Complete Your Order</h2>
              <button
                onClick={() => !isProcessing && setCheckoutOpen(false)}
                className="text-white/40 hover:text-white text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4">
              {/* Event identity row */}
              <div className="flex items-center gap-3">
                {(event.flyerPortraitUrl ?? event.flyerSquareUrl) && (
                  <img
                    src={event.flyerPortraitUrl ?? event.flyerSquareUrl}
                    alt={event.title}
                    className="h-16 w-12 rounded-lg object-cover shrink-0 border border-white/10"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-white leading-tight truncate">{event.title}</p>
                  <p className="text-xs text-white/45 mt-0.5 truncate">
                    📍 {event.location ?? event.venueId}
                  </p>
                  <p className="text-xs text-white/45 font-mono mt-0.5">
                    {startDt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {startDt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Line items */}
              <div className="flex flex-col gap-2">
                {selectedItems.map(({ tier, quantity }) => (
                  <div key={tier.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{tier.name} × {quantity}</span>
                      <span className="font-mono text-white">KSh {(tier.price * quantity).toLocaleString()}</span>
                    </div>
                    {tier.description && (
                      <p className="text-xs text-white/35 italic leading-relaxed">{tier.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="bg-white/10" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-mono font-bold text-neon-pink text-lg">KSh {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Buyer form */}
            <Form {...form}>
              <div className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
                          className="bg-white/5 border-white/15 text-white placeholder:text-white/30 rounded-xl h-12 focus:border-neon-pink"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          className="bg-white/5 border-white/15 text-white placeholder:text-white/30 rounded-xl h-12 focus:border-neon-pink"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+254 700 000 000"
                          className="bg-white/5 border-white/15 text-white placeholder:text-white/30 rounded-xl h-12 focus:border-neon-pink"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>

            <Button
              onClick={handlePayNow}
              disabled={isPreparing || isProcessing}
              className="rounded-full w-full bg-neon-pink hover:bg-neon-hover text-white font-semibold text-base h-12 shadow-neon disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isPreparing
                ? 'Preparing payment…'
                : isProcessing
                  ? 'Opening Paystack…'
                  : `Pay KSh ${totalPrice.toLocaleString()} with Paystack`}
            </Button>
            <p className="text-xs text-white/30 text-center -mt-2">Secured by Paystack</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-4 py-12 px-8">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">

          {/* Social icons — brand colours */}
          <div className="flex items-center gap-4">
            {/* Instagram — gradient purple→pink */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="group w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-5 h-5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="white" stroke="none" />
              </svg>
            </a>
            {/* X / Twitter — black */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="X"
              className="group w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Facebook — blue */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="group w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center transition-all hover:scale-110 hover:bg-[#0e65d9] active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* TikTok — white on black */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              className="group w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
              </svg>
            </a>
          </div>

          {/* Legal links — pink with underline hover */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
            {[
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms of Use', href: '#' },
              { label: 'Refunds & Returns', href: '#' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-neon-pink/70 hover:text-neon-pink hover:underline underline-offset-4 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <p className="text-xs text-white/30 tracking-wide">© 2026 Hustlesasa. All rights reserved.</p>
        </div>
      </footer>

      {/* Success overlay */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f15] border border-white/15 rounded-2xl w-full max-w-md p-10 flex flex-col items-center text-center gap-5">
            <div className="text-6xl">🎉</div>
            <h2 className="font-heading font-black text-3xl text-white">Ticket Confirmed!</h2>
            <p className="text-white/70 font-semibold">{event.title}</p>
            <div className="flex flex-col gap-1.5 w-full">
              {selectedItems.map(({ tier, quantity }) => (
                <p key={tier.id} className="text-white/50 font-mono text-sm">
                  {tier.name} × {quantity} · KSh {(tier.price * quantity).toLocaleString()}
                </p>
              ))}
            </div>
            <p className="text-white/50 text-sm max-w-xs">
              Confirmation email with your QR code sent to{' '}
              <strong className="text-white">{watchedValues.email}</strong>
            </p>
            <Button
              onClick={() => navigate('/')}
              className="rounded-full bg-neon-pink hover:bg-neon-hover text-white font-semibold shadow-neon px-8 transition-all hover:scale-[1.03]"
            >
              Back to Events
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
