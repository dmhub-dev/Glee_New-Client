import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEvent } from '@glee/api'
import {
  Button, Skeleton, useToast, Separator,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
} from '@glee/ui'
import { formatDateOnly, formatTimeOnly, parseDateOnly } from '@glee/utils'
import { checkoutSchema, type CheckoutFormValues } from '../../lib/schemas/checkout'
import { initiateGuestPurchase, ticketCheckoutContextStorageKey, ticketVerificationStorageKey } from '@glee/api'
import EventCheckoutTableBooking from '../../../components/events/EventCheckoutTableBooking'
import {
  combinedCheckoutTotal,
  selectedTableBookingPayload,
  type CheckoutTableBookingSelection,
} from '../../../components/events/eventCheckoutTableBookingUtils'
import EventReservationPanel from '../../../customer/events/EventReservationPanel'

const PLACEHOLDER = 'https://placehold.co/400x600/0B0B10/FF2D8F?text=Glee'
const PUBLIC_DETAIL_STATUSES = ['active', 'live', 'cancelled', 'sold_out']

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const { toast } = useToast()

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [menuQtys, setMenuQtys] = useState<Record<string, number>>({})
  const [includeAddOns, setIncludeAddOns] = useState(false)
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [tableBooking, setTableBooking] = useState<CheckoutTableBookingSelection | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '' },
  })

  const watchedValues = form.watch()

  useEffect(() => {
    setTableBooking(null)
    setCheckoutOpen(false)
  }, [event?.id])

  const selectedItems = event
    ? event.ticketTiers
        .filter(t => (quantities[t.id] ?? 0) > 0)
        .map(t => ({ tier: t, quantity: quantities[t.id] }))
    : []
  const selectedMenuItems = event?.menuItems
    ? event.menuItems
        .filter(m => (menuQtys[m.id] ?? 0) > 0)
        .map(m => ({ item: m, quantity: menuQtys[m.id] }))
    : []
  const ticketTotal = selectedItems.reduce((sum, { tier, quantity }) => sum + tier.price * quantity, 0)
  const menuTotal = selectedMenuItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0)
  const totalPrice = combinedCheckoutTotal({ ticketTotal, menuTotal, tableBooking })
  const tableBookingPayload = selectedTableBookingPayload(tableBooking)

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

  if (!event || !PUBLIC_DETAIL_STATUSES.includes(event.status)) {
    navigate('/', { replace: true })
    return null
  }

  const handleQtyChange = (tierId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [tierId]: qty }))
  }

  const toggleDesc = (tierId: string) => {
    setExpandedDescs(prev => {
      const next = new Set(prev)
      if (next.has(tierId)) next.delete(tierId)
      else next.add(tierId)
      return next
    })
  }

  const handlePayNow = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    const firstItem = selectedItems[0]
    if (!firstItem) return

    setIsPreparing(true)
    try {
      const intent = await initiateGuestPurchase({
        eventId: event.id,
        ticketCategoryId: firstItem.tier.id,
        noOfTickets: firstItem.quantity,
        guestName: watchedValues.fullName,
        guestEmail: watchedValues.email,
        guestPhone: watchedValues.phone,
        callbackUrl: `${window.location.origin}/payment/event-ticket/confirm`,
        menuItems: selectedMenuItems.length
          ? selectedMenuItems.map(({ item, quantity }) => ({ id: item.id, quantity }))
          : undefined,
        tableBooking: tableBookingPayload,
      })
      if (!intent.authorization_url) {
        throw new Error('Paystack did not return a checkout URL')
      }
      sessionStorage.setItem(
        ticketVerificationStorageKey(intent.reference),
        intent.verificationToken,
      )
      sessionStorage.setItem(
        ticketCheckoutContextStorageKey(intent.reference),
        JSON.stringify({ mode: 'guest', eventId: event.id }),
      )
      setIsProcessing(true)
      window.location.href = intent.authorization_url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not initiate payment'
      toast({ title: 'Payment error', description: message, variant: 'destructive' })
    } finally {
      setIsPreparing(false)
    }
  }

  const eventDate = parseDateOnly(event.startDate)
  const eventDateLong = formatDateOnly(event.startDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const eventDateShort = formatDateOnly(event.startDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const eventStartTime = formatTimeOnly(event.startTime, { hour: '2-digit', minute: '2-digit', hour12: true })
  const eventEndTime = event.endTime ? formatTimeOnly(event.endTime, { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
  const locationLabel = event.location ?? event.venueId ?? 'Location TBA'
  const posterSrc = event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER
  const activeWaveTiers = (() => {
    if (event.ticketWaves?.length) {
      const activeWave = event.ticketWaves.find(w => w.status === 'active')
      if (activeWave) return activeWave.ticketTiers
      const upcomingWave = event.ticketWaves.find(w => w.status === 'upcoming')
      if (upcomingWave) return upcomingWave.ticketTiers
      return []
    }
    return event.ticketTiers ?? []
  })()
  const lowestPrice = activeWaveTiers.length ? Math.min(...activeWaveTiers.map(tier => tier.price)) : 0
  const categoryLabel = event.categoryName ?? 'Event'
  const isPurchasable = event.status === 'active' || event.status === 'live'
  const eventStatusLabel = event.status.replace('_', ' ')

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#10101d] pb-32 text-foreground">

      {/* Floating controls */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center gap-4 bg-gradient-to-b from-black/70 to-transparent px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 sm:w-auto sm:px-4"
        >
          <span className="text-base leading-none">←</span>
          <span className="hidden sm:inline">Back to events</span>
        </button>
        <Link to="/" className="ml-auto">
          <img src="/glee-logo-final.svg" alt="Glee" className="h-14" />
        </Link>
      </div>

      {/* Hero */}
      <section className="relative h-[45vh] min-h-[360px] w-full overflow-hidden sm:h-[52vh] sm:min-h-[430px]">
        <img
          src={posterSrc}
          alt={event.title}
          className="h-full w-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10101d] via-black/28 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md px-5 pb-6 md:max-w-3xl lg:max-w-5xl">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full bg-neon-pink px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-neon">
              {categoryLabel}
            </span>
            <h1 className="mt-3 font-heading text-3xl font-black leading-tight text-white drop-shadow-2xl sm:text-4xl lg:text-5xl">
              {event.title}
            </h1>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-5 flex max-w-md flex-col gap-6 px-5 md:max-w-3xl lg:max-w-5xl">

        {/* Info grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/[0.10] p-4 shadow-[0_12px_38px_rgba(0,0,0,0.24)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col overflow-hidden rounded-xl border border-neon-pink/40 text-center">
                <div className="bg-neon-pink py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                  {formatDateOnly(event.startDate, { month: 'short' })}
                </div>
                <div className="flex flex-1 items-center justify-center text-base font-black text-white">
                  {eventDate.getDate()}
                </div>
              </div>
              <div>
                <p className="font-heading text-sm font-black leading-tight text-white">
                  {eventDateLong}
                </p>
                <p className="mt-1 font-mono text-xs text-white/75">
                  {eventStartTime}
                  {eventEndTime && ` – ${eventEndTime}`}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.10] p-4 shadow-[0_12px_38px_rgba(0,0,0,0.24)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-pink/30 bg-neon-pink/15 text-lg">
                📍
              </div>
              <div>
                <p className="font-heading text-sm font-black leading-tight text-white">{locationLabel}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-1 inline-block text-xs font-semibold text-neon-pink hover:text-neon-hover"
                >
                  Get Directions ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <section className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.10] p-4">
          <h2 className="font-heading text-lg font-black text-white">About Event</h2>
          <p className={`max-w-3xl text-sm leading-7 text-white/92 ${aboutExpanded ? '' : 'line-clamp-3'}`}>
            {event.description}
          </p>
          {event.description.length > 180 && (
            <button
              type="button"
              onClick={() => setAboutExpanded(value => !value)}
              className="text-xs font-semibold text-neon-pink hover:text-neon-hover"
            >
              {aboutExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
          {event.dresscode && (
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              Dress code: <span className="ml-1 font-semibold text-white">{event.dresscode}</span>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-neon-pink">Tickets</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {!isPurchasable && (
            <div className="rounded-2xl border border-white/15 bg-white/[0.10] p-4 text-sm font-semibold text-white/80">
              Ticket purchase unavailable for {eventStatusLabel} events.
            </div>
          )}

          {/* Ticket cards — show only active wave tiers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeWaveTiers.map(tier => {
              const isSoldOut = tier.quantityRemaining === 0
              const qty = quantities[tier.id] ?? 0
              const isExpanded = expandedDescs.has(tier.id)
              const maxQty = Math.min(tier.quantityRemaining, 10)
              const isSelected = qty > 0

              return (
                <div
                  key={tier.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 ${
                    isSoldOut
                      ? 'border-white/10 bg-white/[0.03] opacity-50'
                      : isSelected
                        ? 'border-neon-pink bg-neon-pink/14 shadow-[0_0_28px_rgba(255,45,143,0.20)]'
                        : 'border-white/15 bg-white/[0.10] hover:border-neon-pink/40 hover:bg-white/[0.14]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading text-sm font-black text-white">{tier.name}</span>
                    {isSoldOut ? (
                      <span className="rounded-full bg-red-400/10 px-2 py-0.5 font-mono text-xs text-red-400">
                        Sold out
                      </span>
                    ) : tier.quantityRemaining <= 10 ? (
                      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 font-mono text-xs text-amber-400">
                        {tier.quantityRemaining} left
                      </span>
                    ) : null}
                  </div>

                  {tier.description && (
                    <div>
                      <p className={`text-xs leading-5 text-white/72 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {tier.description}
                      </p>
                      {tier.description.length > 80 && (
                        <button
                          type="button"
                          onClick={() => toggleDesc(tier.id)}
                          className="mt-1 text-xs text-neon-pink hover:underline"
                        >
                          {isExpanded ? 'See less' : 'See more'}
                        </button>
                      )}
                    </div>
                  )}

                  <p className="font-mono text-sm font-bold text-white">
                    KES {tier.price.toLocaleString()}.00
                  </p>

                  <div className="mt-auto flex items-center justify-end gap-3 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      disabled={!isPurchasable || isSoldOut || qty <= 0}
                      onClick={() => handleQtyChange(tier.id, Math.max(0, qty - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-sm text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-mono text-sm font-bold text-white">{qty}</span>
                    <button
                      type="button"
                      disabled={!isPurchasable || isSoldOut || qty >= maxQty}
                      onClick={() => handleQtyChange(tier.id, Math.min(maxQty, qty + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-sm text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add-ons toggle appears only once tickets are selected */}
          {(event.menuItems?.length ?? 0) > 0 && selectedItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIncludeAddOns(v => !v)
                if (includeAddOns) setMenuQtys({})
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                includeAddOns
                  ? 'border-neon-pink bg-neon-pink/10'
                  : 'border-white/15 bg-white/[0.10] hover:border-white/25'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                includeAddOns ? 'border-neon-pink bg-neon-pink' : 'border-white/30'
              }`}>
                {includeAddOns && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  Want to add drinks or food to your order?
                </p>
                <p className="mt-0.5 text-xs text-white/45">
                  Skip the bar queue - pre-order and pay in one go
                </p>
              </div>
            </button>
          )}

          {/* Add-on items — only visible when toggle is on */}
          {(event.menuItems?.length ?? 0) > 0 && includeAddOns && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.menuItems!.map(item => {
                const qty = menuQtys[item.id] ?? 0
                const categoryEmoji = item.category === 'food' ? '🍽️' : item.category === 'drink' ? '🍾' : '✨'
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 flex flex-col gap-2 transition-all duration-200 ${
                      qty > 0
                        ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_20px_rgba(255,45,143,0.15)]'
                        : 'border-white/10 bg-white/5 hover:border-neon-pink/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{categoryEmoji}</span>
                        <span className="font-heading font-bold text-white text-sm">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 capitalize bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <p className="font-mono font-bold text-white text-sm">KES {item.price.toLocaleString()}.00</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={qty <= 0}
                          onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                          className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-sm text-white/70 hover:border-neon-pink hover:text-neon-pink disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        >
                          −
                        </button>
                        <span className="font-mono font-bold text-white w-4 text-center text-sm">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: qty + 1 }))}
                          className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-sm text-white/70 hover:border-neon-pink hover:text-neon-pink disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <EventReservationPanel eventId={event.id} />
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-glee-bg/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 md:max-w-3xl lg:max-w-5xl">
          <div className="min-w-0 pr-2">
            <p className="text-xs text-white/45">{selectedItems.length > 0 ? 'Order total' : 'Starting from'}</p>
            <p className="font-heading text-xl font-black text-white">
              KSh {(selectedItems.length > 0 ? totalPrice : lowestPrice).toLocaleString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="ml-auto hidden rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Continue shopping
          </Button>
          <Button
            disabled={!isPurchasable || selectedItems.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="ml-auto h-11 rounded-full bg-neon-pink px-5 font-semibold text-white shadow-neon transition-all hover:bg-neon-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35 disabled:opacity-100 disabled:shadow-none sm:ml-0 sm:px-7"
          >
            {!isPurchasable ? 'Unavailable' : selectedItems.length === 0 ? 'Select a Ticket' : 'Buy Tickets'}
          </Button>
        </div>
      </div>

      {/* Checkout overlay */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close checkout"
            className="absolute inset-0"
            disabled={isProcessing}
            onClick={() => setCheckoutOpen(false)}
          />
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
                    📍 {locationLabel}
                  </p>
                  <p className="text-xs text-white/45 font-mono mt-0.5">
                    {eventDateShort}
                    {' · '}
                    {eventStartTime}
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
                {selectedMenuItems.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{item.name} × {quantity}</span>
                    <span className="font-mono text-white">KSh {(item.price * quantity).toLocaleString()}</span>
                  </div>
                ))}
                {tableBooking?.enabled && (
                  <div className="flex flex-col gap-0.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Table booking · {tableBooking.tableCategory}</span>
                      <span className="font-mono text-white">KSh {tableBooking.depositAmount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-white/35">
                      {tableBooking.guestCount} guest{tableBooking.guestCount === 1 ? '' : 's'} · Minimum spend KSh {tableBooking.minimumSpend.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <Separator className="bg-white/10" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-mono font-bold text-neon-pink text-lg">KSh {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <EventCheckoutTableBooking eventId={event.id} value={tableBooking} onChange={setTableBooking} />

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
                  : 'Proceed to Pay'}
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
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="group w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-5 h-5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="white" stroke="none" />
              </svg>
            </a>
            {/* X / Twitter — black */}
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X"
              className="group w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Facebook — blue */}
            <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="group w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center transition-all hover:scale-110 hover:bg-[#0e65d9] active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* TikTok — white on black */}
            <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              className="group w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
              </svg>
            </a>
          </div>

          {/* Legal links */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
            {[
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Terms of Use', to: '/terms' },
              { label: 'Refunds & Returns', to: '/refund-policy' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-sm text-neon-pink/70 hover:text-neon-pink hover:underline underline-offset-4 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="text-xs text-white/30 tracking-wide">© 2026 Glee Events. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
