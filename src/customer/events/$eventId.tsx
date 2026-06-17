import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEvent, useEventCheckoutSettings, usePurchaseTicket, useWallet, ticketCheckoutContextStorageKey, ticketVerificationStorageKey } from '@glee/api'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@glee/ui'
import { formatDateOnly, formatTimeOnly, splitBackendDateTime } from '@glee/utils'
import { Calendar, CheckCircle2, MapPin, Share2, ShoppingBag, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import EventCheckoutTableBooking from '../../components/events/EventCheckoutTableBooking'
import {
  combinedCheckoutTotal,
  selectedTableBookingPayload,
  tableBookingDeposit,
  type CheckoutTableBookingSelection,
} from '../../components/events/eventCheckoutTableBookingUtils'

const PLACEHOLDER = '/glee-image-fallback.svg'
type FeeType = 'PERCENTAGE' | 'FIXED'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDateTime(value: string) {
  const { date, time } = splitBackendDateTime(value)
  const dateLabel = formatDateOnly(date, { weekday: 'short', day: 'numeric', month: 'short' })
  const timeLabel = formatTimeOnly(time, { hour: '2-digit', minute: '2-digit' })
  return [dateLabel, timeLabel].filter(Boolean).join(', ')
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getFinalPaymentDate(eventStartDate?: string) {
  if (!eventStartDate) return null
  const date = new Date(`${eventStartDate}T23:59:59`)
  date.setDate(date.getDate() - 7)
  return date
}

function calculateFee(ticketTotal: number, type: FeeType, percent: number, amount: number, capAtTicketTotal = false) {
  const value = type === 'FIXED' ? amount : ticketTotal * (percent / 100)
  const capped = capAtTicketTotal ? Math.min(ticketTotal, value) : value
  return Math.round(Math.max(0, capped) * 100) / 100
}

function formatSettingLabel(type: FeeType, percent: number, amount: number) {
  return type === 'FIXED' ? money(amount) : `${percent}%`
}

function buildInstallmentPlan(
  ticketTotal: number,
  menuTotal: number,
  tableDeposit: number,
  eventStartDate: string | undefined,
  count: number,
  depositType: FeeType,
  depositPercent: number,
  depositAmount: number,
  securityFeeType: FeeType,
  securityFeePercent: number,
  securityFeeAmount: number,
) {
  const finalDueDate = getFinalPaymentDate(eventStartDate)
  if (!finalDueDate) return null
  const deposit = calculateFee(ticketTotal, depositType, depositPercent, depositAmount, true)
  const securityFee = calculateFee(ticketTotal, securityFeeType, securityFeePercent, securityFeeAmount)
  const dueNow = Math.round((deposit + menuTotal + tableDeposit + securityFee) * 100) / 100
  const remaining = Math.round((ticketTotal - deposit) * 100) / 100
  const baseAmount = Math.round((remaining / count) * 100) / 100
  const today = new Date()
  const days = Math.max(1, Math.floor((finalDueDate.getTime() - today.getTime()) / 86400000))
  const installments = Array.from({ length: count }, (_, index) => {
    const dueDate = addDays(today, Math.round(((index + 1) * days) / count))
    const amount = index === count - 1 ? Math.round((remaining - baseAmount * (count - 1)) * 100) / 100 : baseAmount
    return { label: `Payment ${index + 1}`, amount, dueDate: dueDate > finalDueDate ? finalDueDate : dueDate }
  })
  return { count, deposit, securityFee, dueNow, remaining, finalDueDate, installments }
}

function WalletBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={enabled ? 'rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200' : 'rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200'}>
      {enabled ? 'Enough' : 'Low'}
    </span>
  )
}

export default function CustomerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const { data: wallet } = useWallet()
  const { data: checkoutSettings } = useEventCheckoutSettings()
  const purchase = usePurchaseTicket()
  const { toast } = useToast()
  const [tierQtys, setTierQtys] = useState<Record<string, number>>({})
  const [menuQtys, setMenuQtys] = useState<Record<string, number>>({})
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [walletConfirmOpen, setWalletConfirmOpen] = useState(false)
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false)
  const [purchaseCompleteOpen, setPurchaseCompleteOpen] = useState(false)
  const [walletPaymentType, setWalletPaymentType] = useState<'FULL' | 'INSTALLMENT'>('FULL')
  const [installmentCount, setInstallmentCount] = useState(2)
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [showMenuAddons, setShowMenuAddons] = useState(false)
  const [tableBooking, setTableBooking] = useState<CheckoutTableBookingSelection | null>(null)

  useEffect(() => {
    setTableBooking(null)
  }, [eventId])

  // Get active wave tiers (fallback to ticketTiers if no waves defined)
  const activeWaveTiers = useMemo(() => {
    if (event?.ticketWaves?.length) {
      const activeWave = event.ticketWaves.find(w => w.status === 'active')
      if (activeWave) return activeWave.ticketTiers
      const upcomingWave = event.ticketWaves.find(w => w.status === 'upcoming')
      if (upcomingWave) return upcomingWave.ticketTiers
      return []
    }
    return event?.ticketTiers ?? []
  }, [event])
  // First tier with qty > 0 drives the purchase transaction
  const selectedTier = useMemo(
    () => activeWaveTiers.find(tier => (tierQtys[tier.id] ?? 0) > 0),
    [activeWaveTiers, tierQtys],
  )
  const quantity = selectedTier ? (tierQtys[selectedTier.id] ?? 1) : 1
  const selectedMenu = useMemo(() => {
    if (!showMenuAddons) return []
    return (event?.menuItems ?? [])
      .filter(item => (menuQtys[item.id] ?? 0) > 0)
      .map(item => ({ item, quantity: menuQtys[item.id] ?? 0 }))
  }, [event?.menuItems, menuQtys, showMenuAddons])
  const ticketTotal = useMemo(
    () => activeWaveTiers.reduce((sum, tier) => sum + tier.price * (tierQtys[tier.id] ?? 0), 0),
    [activeWaveTiers, tierQtys],
  )
  const menuTotal = selectedMenu.reduce((sum, row) => sum + row.item.price * row.quantity, 0)
  const tableDeposit = tableBookingDeposit(tableBooking)
  const total = combinedCheckoutTotal({ ticketTotal, menuTotal, tableBooking })
  const tableBookingPayload = selectedTableBookingPayload(tableBooking)
  const depositType = checkoutSettings?.walletInstallmentDepositType ?? 'PERCENTAGE'
  const depositPercent = checkoutSettings?.walletInstallmentDepositPercent ?? 30
  const depositAmount = checkoutSettings?.walletInstallmentDepositAmount ?? 0
  const securityFeeType = checkoutSettings?.walletInstallmentSecurityFeeType ?? 'PERCENTAGE'
  const securityFeePercent = checkoutSettings?.walletInstallmentSecurityFeePercent ?? 5
  const securityFeeAmount = checkoutSettings?.walletInstallmentSecurityFeeAmount ?? 0
  const walletBalance = Number(wallet?.balance ?? 0)
  const installmentOptions = useMemo(() => {
    const finalDue = getFinalPaymentDate(event?.startDate)
    if (!finalDue) return []
    const daysUntilDue = Math.floor((finalDue.getTime() - Date.now()) / 86400000)
    if (daysUntilDue < 1) return []
    return daysUntilDue >= 30 ? [2, 3] : [2]
  }, [event?.startDate])
  const selectedInstallmentPlan = useMemo(
    () => buildInstallmentPlan(
      ticketTotal,
      menuTotal,
      tableDeposit,
      event?.startDate,
      installmentCount,
      depositType,
      depositPercent,
      depositAmount,
      securityFeeType,
      securityFeePercent,
      securityFeeAmount,
    ),
    [ticketTotal, menuTotal, tableDeposit, event?.startDate, installmentCount, depositType, depositPercent, depositAmount, securityFeeType, securityFeePercent, securityFeeAmount],
  )
  const walletMinimumDue = walletPaymentType === 'INSTALLMENT' && selectedInstallmentPlan ? selectedInstallmentPlan.dueNow : total
  const walletCanPayFull = walletBalance >= total
  const installmentDueNow = selectedInstallmentPlan?.dueNow ?? 0
  const walletCanStartInstallment = installmentOptions.length > 0 && (!selectedInstallmentPlan || walletBalance >= selectedInstallmentPlan.dueNow)
  const posterSrc = event?.flyerPortraitUrl ?? event?.flyerSquareUrl ?? PLACEHOLDER
  const isSoldOut = event?.status === 'sold_out' || Boolean(activeWaveTiers.length && activeWaveTiers.every(tier => tier.quantityRemaining <= 0))
  const selectedTierSoldOut = !selectedTier || selectedTier.quantityRemaining <= 0
  const anyTierSelected = Object.values(tierQtys).some(q => q > 0)
  const canPurchase = Boolean(event && selectedTier && !isSoldOut && !selectedTierSoldOut && anyTierSelected && total > 0)
  const eventDateTime = event ? `${event.startDate}T${event.startTime || '00:00'}:00` : ''
  const eventDate = eventDateTime ? new Date(eventDateTime) : null
  const statusLabel = event ? (isSoldOut ? 'Sold out' : event.status.replace('_', ' ')) : ''
  const description = event?.description || 'No description has been added for this event yet.'
  const descriptionIsLong = description.length > 180
  const visibleDescription = !aboutExpanded && descriptionIsLong ? `${description.slice(0, 180).trim()}...` : description

  async function handlePurchase(useWallet: boolean, paymentType: 'FULL' | 'INSTALLMENT' = 'FULL') {
    if (!event || !selectedTier || !canPurchase) return
    try {
      const result = await purchase.mutateAsync({
        eventId: event.id,
        ticketCategoryId: selectedTier.id,
        noOfTickets: quantity,
        preOrderMenu: selectedMenu.length ? selectedMenu.map(({ item, quantity }) => ({ id: item.id, quantity })) : undefined,
        tableBooking: tableBookingPayload,
        useWallet,
        walletPaymentType: useWallet ? paymentType : undefined,
        installmentCount: paymentType === 'INSTALLMENT' ? installmentCount : undefined,
        callbackUrl: `${window.location.origin}/payment/event-ticket/confirm`,
      })
      if (!useWallet && result.authorization_url) {
        if (result.reference && result.verificationToken) {
          sessionStorage.setItem(
            ticketVerificationStorageKey(result.reference),
            result.verificationToken,
          )
          sessionStorage.setItem(
            ticketCheckoutContextStorageKey(result.reference),
            JSON.stringify({ mode: 'customer', eventId: event.id }),
          )
        }
        window.location.href = result.authorization_url
        return
      }
      setPaymentModalOpen(false)
      setWalletConfirmOpen(false)
      setInstallmentModalOpen(false)
      setPurchaseCompleteOpen(true)
      toast({
        title: paymentType === 'INSTALLMENT' ? 'Ticket reserved' : 'Ticket purchased',
        description: paymentType === 'INSTALLMENT'
          ? 'Your ticket is in My Tickets. We will remind you about your remaining payments.'
          : 'Your ticket is now in My Tickets.',
      })
    } catch (error) {
      toast({ title: 'Purchase failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <CustomerLayout title="Event Details" hidePageHeader>
        <div className="space-y-5">
          <Skeleton className="h-[360px] rounded-[28px] bg-white/10" />
          <Skeleton className="h-[280px] rounded-2xl bg-white/10" />
        </div>
      </CustomerLayout>
    )
  }

  if (!event) {
    return (
      <CustomerLayout title="Event Not Found" hidePageHeader>
        <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-10 text-center text-white/70">This event is not available.</div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout title={event.title} subtitle={event.categoryName ?? 'Event'} hidePageHeader>
      <div className="relative min-h-screen overflow-x-hidden pb-32">
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition active:scale-95"
            aria-label="Back"
          >
            <span className="text-xl leading-none">‹</span>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition active:scale-95"
            aria-label="Share event"
            onClick={() => navigator.share?.({ title: event.title, url: window.location.href }).catch(() => undefined)}
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <section className="relative h-[46vh] min-h-[360px] overflow-hidden">
          <img
            src={posterSrc}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050017] via-[#050017]/35 to-black/20" />
        </section>

        <div className="relative z-10 mx-auto -mt-16 w-full max-w-7xl space-y-5 px-4 lg:px-8">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border-white/15 bg-white/15 px-3 py-1 text-white backdrop-blur-md">{event.categoryName ?? 'Event'}</Badge>
              <Badge className={isSoldOut ? 'rounded-full border-red-400/30 bg-red-500/20 px-3 py-1 text-red-100 backdrop-blur-md' : 'rounded-full border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-emerald-100 backdrop-blur-md'}>
                {statusLabel}
              </Badge>
            </div>
            <h1 className="max-w-5xl font-heading text-3xl font-black leading-tight text-white md:text-5xl xl:text-6xl">{event.title}</h1>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur">
                <Calendar className="mb-2 h-5 w-5 text-neon-pink" />
                <p className="text-sm font-semibold text-white">{eventDate ? formatDate(eventDate) : 'Date TBA'}</p>
                <p className="mt-1 text-xs text-white/55">{event.startTime || 'TBA'}{event.endTime ? ` - ${event.endTime}` : ''}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur">
                <MapPin className="mb-2 h-5 w-5 text-neon-pink" />
                <p className="line-clamp-1 text-sm font-semibold text-white">{event.location ?? 'Location TBA'}</p>
                {event.location ? (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-xs font-semibold text-neon-pink hover:underline">
                    Open in Google Maps
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-white/55">Venue</p>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-black text-white">About Event</h2>
                  <p className="mt-1 text-xs font-medium text-white/45">Quick overview</p>
                </div>
                {descriptionIsLong && (
                  <button
                    type="button"
                    onClick={() => setAboutExpanded(value => !value)}
                    className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white"
                  >
                    {aboutExpanded ? 'Show Less' : 'Read More'}
                  </button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/72">{visibleDescription}</p>
            </section>

            <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-black text-white">Tickets</h2>
                  <p className="mt-1 text-xs font-medium text-white/45">Choose one ticket type</p>
                </div>
                <p className="font-heading text-xl font-black text-neon-pink">{money(total)}</p>
              </div>

              {isSoldOut && (
                <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-medium text-red-100">
                  This event is sold out. Purchases are disabled.
                </div>
              )}

              {/* Ticket tiers — public style, 2-col grid on sm+ */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeWaveTiers.map(tier => {
                  const qty = tierQtys[tier.id] ?? 0
                  const soldOut = tier.quantityRemaining <= 0 || isSoldOut
                  const maxQty = Math.min(tier.quantityRemaining, 10)
                  const isActive = qty > 0 && !soldOut
                  return (
                    <div
                      key={tier.id}
                      role="button"
                      tabIndex={soldOut ? -1 : 0}
                      aria-disabled={soldOut}
                      onClick={() => {
                        if (soldOut) return
                        if (qty === 0) setTierQtys(prev => ({ ...prev, [tier.id]: 1 }))
                      }}
                      onKeyDown={event => {
                        if (soldOut || (event.key !== 'Enter' && event.key !== ' ')) return
                        event.preventDefault()
                        if (qty === 0) setTierQtys(prev => ({ ...prev, [tier.id]: 1 }))
                      }}
                      className={[
                        'flex flex-col gap-2 rounded-2xl border p-5 transition-all duration-200',
                        soldOut
                          ? 'cursor-not-allowed opacity-40 border-white/10 bg-white/[0.04]'
                          : isActive
                            ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_24px_rgba(255,45,143,0.14)] cursor-default'
                            : 'cursor-pointer border-white/15 bg-white/[0.08] hover:border-white/30',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">🎟️</span>
                          <span className="font-heading font-bold text-white truncate">{tier.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 shrink-0">
                          {soldOut ? 'Sold out' : `${tier.quantityRemaining} left`}
                        </span>
                      </div>
                      {tier.description && (
                        <p className="text-xs text-white/50 leading-relaxed">{tier.description}</p>
                      )}
                      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-auto">
                        <p className="font-mono font-bold text-white">{money(tier.price)}</p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={qty <= 0 || soldOut}
                            onClick={() => setTierQtys(prev => ({ ...prev, [tier.id]: Math.max(0, qty - 1) }))}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                          >−</button>
                          <span className="w-5 text-center font-mono font-bold text-white">{qty}</span>
                          <button
                            type="button"
                            disabled={qty >= maxQty || soldOut}
                            onClick={() => setTierQtys(prev => ({ ...prev, [tier.id]: Math.min(maxQty, qty + 1) }))}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Menu add-ons toggle — public style */}
              {(event.menuItems ?? []).length > 0 && anyTierSelected && !isSoldOut && (
                <button
                  type="button"
                  onClick={() => { setShowMenuAddons(v => !v); if (showMenuAddons) setMenuQtys({}) }}
                  className={`mt-4 flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                    showMenuAddons ? 'border-neon-pink bg-neon-pink/10' : 'border-white/15 bg-white/[0.08] hover:border-white/30'
                  }`}
                >
                  <div className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    showMenuAddons ? 'border-neon-pink bg-neon-pink' : 'border-white/30'
                  }`}>
                    {showMenuAddons && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">Want to add drinks or food to your order?</p>
                    <p className="mt-0.5 text-xs text-white/45">Skip the queue — pre-order and pay in one go</p>
                  </div>
                </button>
              )}
            </section>

            <EventCheckoutTableBooking eventId={event.id} value={tableBooking} onChange={setTableBooking} />

            {/* Menu add-on items — public style */}
            {showMenuAddons && (event.menuItems ?? []).length > 0 && (
              <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
                <h3 className="flex items-center gap-2 font-heading text-lg font-black text-white"><ShoppingBag className="h-4 w-4 text-neon-pink" />Menu Add-ons</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(event.menuItems ?? []).map(item => {
                    const qty = menuQtys[item.id] ?? 0
                    const categoryEmoji = item.category === 'food' ? '🍽️' : item.category === 'drink' ? '🍾' : '✨'
                    return (
                      <div
                        key={item.id ?? item.name}
                        className={`flex flex-col gap-2 rounded-2xl border p-4 transition-all duration-200 ${
                          qty > 0 ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_20px_rgba(255,45,143,0.15)]' : 'border-white/10 bg-white/5 hover:border-neon-pink/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{categoryEmoji}</span>
                            <span className="font-heading font-bold text-white text-sm">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-white/40 capitalize bg-white/5 border border-white/10 rounded-full px-2 py-0.5 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/10 pt-2">
                          <p className="font-mono font-bold text-white text-sm">{money(item.price)}</p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={qty <= 0 || isSoldOut}
                              onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                            >−</button>
                            <span className="w-4 text-center font-mono font-bold text-white text-sm">{qty}</span>
                            <button
                              type="button"
                              disabled={isSoldOut}
                              onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: qty + 1 }))}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-25"
                            >+</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <Tabs defaultValue="schedule" className="rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-full bg-black/25 p-1">
                <TabsTrigger value="schedule" className="rounded-full text-white/70 data-[state=active]:bg-neon-pink data-[state=active]:text-white">Schedule</TabsTrigger>
                <TabsTrigger value="location" className="rounded-full text-white/70 data-[state=active]:bg-neon-pink data-[state=active]:text-white">Location</TabsTrigger>
                <TabsTrigger value="menu" className="rounded-full text-white/70 data-[state=active]:bg-neon-pink data-[state=active]:text-white">Menu</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-5">
                {(event.schedules ?? []).length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[...(event.schedules ?? [])].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(schedule => (
                      <div key={schedule.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="font-mono text-sm font-semibold text-neon-pink">
                          {formatDateTime(schedule.startDate)}
                          <br />
                          <span className="text-white/45">to {formatDateTime(schedule.endDate)}</span>
                        </div>
                        <p className="mt-3 font-semibold text-white">{schedule.name}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/60">{schedule.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/55">No schedule has been published for this event yet.</p>
                )}
              </TabsContent>
              <TabsContent value="location" className="mt-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="flex items-center gap-2 font-semibold text-white"><MapPin className="h-4 w-4 text-neon-pink" />{event.location ?? 'Location TBA'}</p>
                  {event.location && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-neon-pink hover:underline">
                      Open in Google Maps
                    </a>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="menu" className="mt-5">
                {(event.menuItems ?? []).length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {(event.menuItems ?? []).map(item => (
                      <div key={item.id ?? item.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="mt-1 text-sm text-white/55">{item.description || item.category}</p>
                        <p className="mt-2 font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/55">No menu items are attached to this event.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050017]/88 px-4 py-3 shadow-[0_-18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Order total</p>
                <p className="font-heading text-xl font-black text-white">{money(total)}</p>
              </div>
              <Button
                disabled={!canPurchase || purchase.isPending}
                onClick={() => setPaymentModalOpen(true)}
                className="h-12 rounded-full bg-neon-pink px-6 text-white hover:bg-neon-pink/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35 disabled:opacity-100 disabled:shadow-none"
              >
                <Ticket className="mr-2 h-4 w-4" />
                {canPurchase ? 'Pay Now' : isSoldOut ? 'Sold Out' : 'Select a Ticket'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={purchaseCompleteOpen} onOpenChange={setPurchaseCompleteOpen}>
        <DialogContent className="max-w-md border-white/15 bg-[#151523] text-white">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center font-heading text-2xl font-black text-foreground">Ticket Confirmed</DialogTitle>
            <DialogDescription className="text-center text-white/60">
              Your ticket is ready in My Tickets and we have sent the confirmation to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setPurchaseCompleteOpen(false)} className="rounded-full border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]">
              Back to Event
            </Button>
            <Button onClick={() => navigate('/app/tickets')} className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
              View Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="mx-auto max-h-[90vh] max-w-sm overflow-y-auto rounded-3xl border-white/15 bg-[#050017] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Choose Payment</DialogTitle>
            <DialogDescription className="text-white/60">
              Pick how you want to pay for this order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs text-white/40">Wallet balance</p>
                <p className="mt-1 font-heading text-xl font-black text-white">{money(walletBalance)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs text-white/40">Order total</p>
                <p className="mt-1 font-heading text-xl font-black text-neon-pink">{money(total)}</p>
              </div>
            </div>

            {tableBooking?.enabled && (
              <div className="rounded-2xl border border-neon-pink/20 bg-neon-pink/[0.08] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/70">Table booking · {tableBooking.tableCategory}</span>
                  <span className="font-mono font-semibold text-white">{money(tableDeposit)} due now</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  {tableBooking.guestCount} guest{tableBooking.guestCount === 1 ? '' : 's'} · Minimum spend {money(tableBooking.minimumSpend)}
                </p>
              </div>
            )}

            {!walletCanPayFull && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                Wallet balance is not enough for full payment. You can pay directly or choose installments.
              </div>
            )}

            <button
              type="button"
              disabled={!canPurchase || !walletCanPayFull}
              onClick={() => {
                setPaymentModalOpen(false)
                setWalletConfirmOpen(true)
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left transition hover:border-neon-pink/40 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Pay with Wallet</p>
                  <p className="mt-1 text-sm text-white/55">{walletCanPayFull ? `Deduct ${money(total)} from wallet.` : `Need ${money(total - walletBalance)} more.`}</p>
                </div>
                <WalletBadge enabled={walletCanPayFull} />
              </div>
            </button>

            <button
              type="button"
              disabled={!canPurchase || !installmentOptions.length}
              onClick={() => {
                setWalletPaymentType('INSTALLMENT')
                setInstallmentCount(installmentOptions.includes(installmentCount) ? installmentCount : installmentOptions[0] ?? 2)
                setPaymentModalOpen(false)
                setInstallmentModalOpen(true)
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left transition hover:border-neon-pink/40 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <p className="font-semibold text-white">Pay in Installments</p>
              <p className="mt-1 text-sm text-white/55">
                {installmentOptions.length ? `Reserve now from ${money(installmentDueNow)} due today.` : 'Installments are closed for this event.'}
              </p>
            </button>

            <button
              type="button"
              disabled={!canPurchase || purchase.isPending}
              onClick={() => handlePurchase(false)}
              className="w-full rounded-2xl border border-neon-pink/30 bg-neon-pink p-4 text-left text-white transition hover:bg-neon-pink/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-semibold">Pay Directly</p>
              <p className="mt-1 text-sm text-white/75">Use card, M-Pesa, or checkout payment page.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={walletConfirmOpen} onOpenChange={setWalletConfirmOpen}>
        <DialogContent className="mx-auto max-w-sm rounded-3xl border-white/15 bg-[#050017] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Wallet Payment</DialogTitle>
            <DialogDescription className="text-white/60">
              Confirm before your wallet is charged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Wallet balance</span>
                <span className="font-mono font-semibold text-white">{money(walletBalance)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/55">Order total</span>
                <span className="font-mono font-semibold text-neon-pink">{money(total)}</span>
              </div>
              {tableBooking?.enabled && (
                <div className="mt-3 rounded-xl border border-neon-pink/20 bg-neon-pink/[0.08] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/70">Table booking · {tableBooking.tableCategory}</span>
                    <span className="font-mono font-semibold text-white">{money(tableDeposit)} due now</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/45">
                    {tableBooking.guestCount} guest{tableBooking.guestCount === 1 ? '' : 's'} · Minimum spend {money(tableBooking.minimumSpend)}
                  </p>
                </div>
              )}
              <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between text-sm">
                <span className="text-white/55">Wallet after payment</span>
                <span className="font-mono font-semibold text-white">{money(walletBalance - total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setWalletConfirmOpen(false)} className="rounded-full border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]">
                Cancel
              </Button>
              <Button disabled={!canPurchase || purchase.isPending || !walletCanPayFull} onClick={() => handlePurchase(true, 'FULL')} className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                {purchase.isPending ? 'Processing...' : 'Confirm Pay'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={installmentModalOpen} onOpenChange={setInstallmentModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/15 bg-[#151523] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Pay in Installments</DialogTitle>
            <DialogDescription className="text-white/60">
              Reserve your ticket now, then complete the remaining payments before the event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs text-white/40">Wallet balance</p>
                <p className="mt-1 font-heading text-2xl font-black text-white">{money(walletBalance)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs text-white/40">Ticket total</p>
                <p className="mt-1 font-heading text-2xl font-black text-white">{money(ticketTotal)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs text-white/40">Order total</p>
                <p className="mt-1 font-heading text-2xl font-black text-neon-pink">{money(total)}</p>
              </div>
            </div>

            {tableBooking?.enabled && (
              <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/[0.08] p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/70">Table booking · {tableBooking.tableCategory}</span>
                  <span className="font-mono font-semibold text-white">{money(tableDeposit)} due now</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  {tableBooking.guestCount} guest{tableBooking.guestCount === 1 ? '' : 's'} · Minimum spend {money(tableBooking.minimumSpend)}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neon-pink" />
                <p className="font-semibold text-white">Installment reservation</p>
              </div>
              <p className="mt-2 text-sm text-white/60">
                Reserve with {formatSettingLabel(depositType, depositPercent, depositAmount)} of ticket price now{menuTotal > 0 ? ' plus selected menu items' : ''}{tableDeposit > 0 ? ' plus table booking deposit' : ''}{(securityFeeType === 'FIXED' ? securityFeeAmount > 0 : securityFeePercent > 0) ? ` and a ${formatSettingLabel(securityFeeType, securityFeePercent, securityFeeAmount)} security fee` : ''}.
              </p>
            </div>

            {walletPaymentType === 'INSTALLMENT' && selectedInstallmentPlan && (
              <div className="rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">Reservation deposit</p>
                    <p className="mt-1 text-sm text-white/60">
                      Pay {money(selectedInstallmentPlan.dueNow)} now. Remaining balance: {money(selectedInstallmentPlan.remaining)}.
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Final payment must be completed by {formatDate(selectedInstallmentPlan.finalDueDate)}.
                    </p>
                  </div>
                  <Badge className="w-fit border-neon-pink/30 bg-neon-pink/10 text-neon-pink">
                    {formatSettingLabel(depositType, depositPercent, depositAmount)} reserve
                  </Badge>
                </div>

                <div className={tableDeposit > 0 ? 'mt-4 grid gap-2 sm:grid-cols-4' : 'mt-4 grid gap-2 sm:grid-cols-3'}>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/40">Deposit</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-white">{money(selectedInstallmentPlan.deposit)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/40">Menu now</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-white">{money(menuTotal)}</p>
                  </div>
                  {tableDeposit > 0 && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="text-xs text-white/40">Table booking</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-white">{money(tableDeposit)}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/40">Security fee</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-white">{money(selectedInstallmentPlan.securityFee)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {installmentOptions.map(option => {
                    const plan = buildInstallmentPlan(
                      ticketTotal,
                      menuTotal,
                      tableDeposit,
                      event?.startDate,
                      option,
                      depositType,
                      depositPercent,
                      depositAmount,
                      securityFeeType,
                      securityFeePercent,
                      securityFeeAmount,
                    )
                    if (!plan) return null
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setInstallmentCount(option)}
                        className={[
                          'rounded-lg border p-3 text-left transition',
                          installmentCount === option ? 'border-neon-pink bg-white/[0.08]' : 'border-white/10 bg-black/20 hover:border-neon-pink/30',
                        ].join(' ')}
                      >
                        <p className="font-semibold text-white">{option} remaining payments</p>
                        <p className="mt-1 text-xs text-white/50">From {money(plan.installments[0]?.amount ?? 0)} per payment</p>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {selectedInstallmentPlan.installments.map(row => (
                    <div key={`${row.label}-${row.dueDate.toISOString()}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-neon-pink" />
                        <p className="text-sm font-medium text-white">{row.label}</p>
                      </div>
                      <p className="text-right text-sm text-white/60">{money(row.amount)} by {formatDate(row.dueDate)}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60">
                  We will keep in touch with reminders for the selected payment plan. Your confirmation email will include the deposit, installment dates, and the rule to clear the balance one week before the event.
                </p>
              </div>
            )}

            {walletBalance < walletMinimumDue && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                Your wallet needs at least {money(walletMinimumDue)} for this option. Top up your wallet or choose another payment method.
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setInstallmentModalOpen(false)} className="border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canPurchase || purchase.isPending || !walletCanStartInstallment}
                onClick={() => handlePurchase(true, 'INSTALLMENT')}
                className="bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50"
              >
                {purchase.isPending ? 'Processing...' : 'Confirm Reservation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
