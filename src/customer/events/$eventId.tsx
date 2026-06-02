import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEvent, useEventCheckoutSettings, usePurchaseTicket, useWallet, ticketCheckoutContextStorageKey, ticketVerificationStorageKey } from '@glee/api'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@glee/ui'
import { Calendar, CheckCircle2, Clock, CreditCard, MapPin, Minus, Plus, ShoppingBag, Ticket, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/900x1200/141419/FF2D8F?text=Glee'
type FeeType = 'PERCENTAGE' | 'FIXED'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const dueNow = Math.round((deposit + menuTotal + securityFee) * 100) / 100
  const remaining = Math.round((ticketTotal + menuTotal - deposit) * 100) / 100
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

export default function CustomerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const { data: wallet } = useWallet()
  const { data: checkoutSettings } = useEventCheckoutSettings()
  const purchase = usePurchaseTicket()
  const { toast } = useToast()
  const [selectedTierId, setSelectedTierId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [menuQtys, setMenuQtys] = useState<Record<string, number>>({})
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [purchaseCompleteOpen, setPurchaseCompleteOpen] = useState(false)
  const [walletPaymentType, setWalletPaymentType] = useState<'FULL' | 'INSTALLMENT'>('FULL')
  const [installmentCount, setInstallmentCount] = useState(2)

  const selectedTier = useMemo(() => event?.ticketTiers.find(tier => tier.id === selectedTierId) ?? event?.ticketTiers[0], [event, selectedTierId])
  const selectedMenu = useMemo(() => {
    return (event?.menuItems ?? [])
      .filter(item => (menuQtys[item.id] ?? 0) > 0)
      .map(item => ({ item, quantity: menuQtys[item.id] ?? 0 }))
  }, [event?.menuItems, menuQtys])
  const ticketTotal = (selectedTier?.price ?? 0) * quantity
  const menuTotal = selectedMenu.reduce((sum, row) => sum + row.item.price * row.quantity, 0)
  const total = ticketTotal + menuTotal
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
      event?.startDate,
      installmentCount,
      depositType,
      depositPercent,
      depositAmount,
      securityFeeType,
      securityFeePercent,
      securityFeeAmount,
    ),
    [ticketTotal, menuTotal, event?.startDate, installmentCount, depositType, depositPercent, depositAmount, securityFeeType, securityFeePercent, securityFeeAmount],
  )
  const walletMinimumDue = walletPaymentType === 'INSTALLMENT' && selectedInstallmentPlan ? selectedInstallmentPlan.dueNow : total
  const posterSrc = event?.flyerPortraitUrl ?? event?.flyerSquareUrl ?? PLACEHOLDER
  const isSoldOut = event?.status === 'sold_out' || Boolean(event?.ticketTiers.length && event.ticketTiers.every(tier => tier.quantityRemaining <= 0))
  const selectedTierSoldOut = !selectedTier || selectedTier.quantityRemaining <= 0
  const canPurchase = Boolean(event && selectedTier && !isSoldOut && !selectedTierSoldOut && total > 0)

  async function handlePurchase(useWallet: boolean, paymentType: 'FULL' | 'INSTALLMENT' = 'FULL') {
    if (!event || !selectedTier || !canPurchase) return
    try {
      const result = await purchase.mutateAsync({
        eventId: event.id,
        ticketCategoryId: selectedTier.id,
        noOfTickets: quantity,
        preOrderMenu: selectedMenu.length ? selectedMenu.map(({ item, quantity }) => ({ id: item.id, quantity })) : undefined,
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
      setWalletModalOpen(false)
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
      <CustomerLayout title="Event Details">
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <Skeleton className="h-[620px] rounded-xl" />
          <Skeleton className="h-[560px] rounded-xl" />
        </div>
      </CustomerLayout>
    )
  }

  if (!event) {
    return (
      <CustomerLayout title="Event Not Found">
        <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center text-admin-50">This event is not available.</div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout title={event.title} subtitle={event.categoryName ?? 'Event'}>
      <div className="grid gap-8 lg:grid-cols-[minmax(320px,430px)_1fr]">
        <aside className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin-card">
            <div className="aspect-[4/5] bg-admin-overlay">
              <img
                src={posterSrc}
                alt={event.title}
                className="h-full w-full object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
              />
            </div>
            <div className="space-y-3 border-t border-admin p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{event.categoryName ?? 'Event'}</Badge>
                <Badge className={isSoldOut ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-admin bg-admin-input capitalize text-admin-70'}>
                  {isSoldOut ? 'Sold out' : event.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="flex items-center gap-2 text-sm text-admin-60"><Calendar className="h-4 w-4 text-neon-pink" />{formatDateTime(`${event.startDate}T${event.startTime || '00:00'}:00`)}</p>
              <p className="flex items-center gap-2 text-sm text-admin-60"><Clock className="h-4 w-4 text-neon-pink" />{event.startTime || 'TBA'}{event.endTime ? ` - ${event.endTime}` : ''}</p>
              <p className="flex items-center gap-2 text-sm text-admin-60"><MapPin className="h-4 w-4 text-neon-pink" />{event.location ?? 'Location TBA'}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-xl border border-admin bg-admin-surface p-6 shadow-admin">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-black text-foreground">Book Tickets</h2>
                <p className="mt-1 text-sm text-admin-50">
                  {isSoldOut ? 'This event is sold out. Ticket and menu purchases are closed.' : 'Choose a ticket, add menu items, then proceed with your preferred payment option.'}
                </p>
              </div>
              <div className="rounded-xl border border-admin bg-admin-input px-4 py-3 text-right">
                <p className="text-xs text-admin-40">Order total</p>
                <p className="font-heading text-2xl font-black text-neon-pink">{money(total)}</p>
              </div>
            </div>

            {isSoldOut && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-200">
                Sold out. You can still view the event details, schedule, menu, and location, but purchases are disabled.
              </div>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {event.ticketTiers.map(tier => (
                <button
                  key={tier.id}
                  type="button"
                  disabled={isSoldOut || tier.quantityRemaining <= 0}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={[
                    'rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                    (selectedTier?.id === tier.id && !isSoldOut) ? 'border-neon-pink bg-neon-pink/10' : 'border-admin bg-admin-input hover:border-neon-pink/30',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{tier.name}</p>
                      {(isSoldOut || tier.quantityRemaining <= 0) && <p className="mt-1 text-xs text-red-300">Sold out</p>}
                    </div>
                    <p className="font-mono font-semibold text-neon-pink">{money(tier.price)}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-admin bg-admin-input p-4">
              <div className="flex items-center gap-3">
                <button disabled={isSoldOut} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-admin text-admin-60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-mono text-lg text-foreground">{quantity}</span>
                <button disabled={isSoldOut || selectedTierSoldOut} onClick={() => setQuantity(q => Math.min(selectedTier?.quantityRemaining ?? 1, q + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-admin text-admin-60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-admin-50">Wallet balance: <span className="font-mono text-foreground">{money(walletBalance)}</span></p>
            </div>

            {(event.menuItems ?? []).length > 0 && (
              <div className="mt-5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-black text-foreground"><ShoppingBag className="h-4 w-4 text-neon-pink" />Menu Add-ons</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(event.menuItems ?? []).map(item => (
                    <div key={item.id ?? item.name} className="rounded-xl border border-admin bg-admin-input p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-xs text-admin-50">{item.category}</p>
                        </div>
                        <p className="font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button disabled={isSoldOut} onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-admin text-admin-60 disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center font-mono text-sm text-foreground">{menuQtys[item.id] ?? 0}</span>
                        <button disabled={isSoldOut} onClick={() => setMenuQtys(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-admin text-admin-60 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button disabled={!canPurchase || purchase.isPending} onClick={() => setWalletModalOpen(true)} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50">
                <Wallet className="h-4 w-4" />
                Pay with Glee Wallet
              </Button>
              <Button disabled={!canPurchase || purchase.isPending} onClick={() => handlePurchase(false)} variant="outline" className="gap-2 border-admin bg-admin-input">
                <Ticket className="h-4 w-4" />
                Proceed to Pay
              </Button>
            </div>
          </section>

          <Tabs defaultValue="about" className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin sm:p-5">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-admin-input sm:grid-cols-4">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="mt-5">
              <p className="whitespace-pre-line text-sm leading-7 text-admin-70">{event.description || 'No description has been added for this event yet.'}</p>
            </TabsContent>
            <TabsContent value="schedule" className="mt-5">
              {(event.schedules ?? []).length ? (
                <div className="space-y-4">
                  {(event.schedules ?? []).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(schedule => (
                    <div key={schedule.id} className="grid gap-3 rounded-xl border border-admin bg-admin-input p-4 md:grid-cols-[190px_1fr]">
                      <div className="font-mono text-sm font-semibold text-neon-pink">
                        {formatDateTime(schedule.startDate)}
                        <br />
                        <span className="text-admin-50">to {formatDateTime(schedule.endDate)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{schedule.name}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-admin-60">{schedule.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-admin-50">No schedule has been published for this event yet.</p>
              )}
            </TabsContent>
            <TabsContent value="location" className="mt-5">
              <div className="rounded-xl border border-admin bg-admin-input p-5">
                <p className="flex items-center gap-2 font-semibold text-foreground"><MapPin className="h-4 w-4 text-neon-pink" />{event.location ?? 'Location TBA'}</p>
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
                    <div key={item.id ?? item.name} className="rounded-xl border border-admin bg-admin-input p-4">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="mt-1 text-sm text-admin-50">{item.description || item.category}</p>
                      <p className="mt-2 font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-admin-50">No menu items are attached to this event.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={purchaseCompleteOpen} onOpenChange={setPurchaseCompleteOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#101017] text-white">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center font-heading text-2xl font-black text-white">Ticket Confirmed</DialogTitle>
            <DialogDescription className="text-center text-white/55">
              Your ticket is ready in My Tickets and we have sent the confirmation to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setPurchaseCompleteOpen(false)} className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
              Back to Event
            </Button>
            <Button onClick={() => navigate('/app/tickets')} className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
              View Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-admin bg-admin-surface sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Pay with Glee Wallet</DialogTitle>
            <DialogDescription>
              Review your wallet balance and choose how you want to pay for this ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-admin bg-admin-input p-4">
                <p className="text-xs text-admin-40">Wallet balance</p>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">{money(walletBalance)}</p>
              </div>
              <div className="rounded-xl border border-admin bg-admin-input p-4">
                <p className="text-xs text-admin-40">Ticket total</p>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">{money(ticketTotal)}</p>
              </div>
              <div className="rounded-xl border border-admin bg-admin-input p-4">
                <p className="text-xs text-admin-40">Order total</p>
                <p className="mt-1 font-heading text-2xl font-black text-neon-pink">{money(total)}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setWalletPaymentType('FULL')}
                className={[
                  'rounded-xl border p-4 text-left transition',
                  walletPaymentType === 'FULL' ? 'border-neon-pink bg-neon-pink/10' : 'border-admin bg-admin-input hover:border-neon-pink/30',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-neon-pink" />
                  <p className="font-semibold text-foreground">Pay full amount</p>
                </div>
                <p className="mt-2 text-sm text-admin-50">Deduct {money(total)} from your Glee Wallet and confirm the ticket now.</p>
              </button>

              <button
                type="button"
                disabled={!installmentOptions.length}
                onClick={() => {
                  setWalletPaymentType('INSTALLMENT')
                  setInstallmentCount(installmentOptions.includes(installmentCount) ? installmentCount : installmentOptions[0] ?? 2)
                }}
                className={[
                  'rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                  walletPaymentType === 'INSTALLMENT' ? 'border-neon-pink bg-neon-pink/10' : 'border-admin bg-admin-input hover:border-neon-pink/30',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neon-pink" />
                  <p className="font-semibold text-foreground">Pay with installments</p>
                </div>
                <p className="mt-2 text-sm text-admin-50">
                  Reserve with {formatSettingLabel(depositType, depositPercent, depositAmount)} of the ticket price now{menuTotal > 0 ? ' plus selected menu items' : ''}{(securityFeeType === 'FIXED' ? securityFeeAmount > 0 : securityFeePercent > 0) ? ` and a ${formatSettingLabel(securityFeeType, securityFeePercent, securityFeeAmount)} security fee` : ''}, then clear the balance one week before the event.
                </p>
                {!installmentOptions.length && (
                  <p className="mt-2 text-xs text-admin-40">Installments close one week before the event.</p>
                )}
              </button>
            </div>

            {walletPaymentType === 'INSTALLMENT' && selectedInstallmentPlan && (
              <div className="rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Reservation deposit</p>
                    <p className="mt-1 text-sm text-admin-60">
                      Pay {money(selectedInstallmentPlan.dueNow)} now. Remaining balance: {money(selectedInstallmentPlan.remaining)}.
                    </p>
                    <p className="mt-1 text-xs text-admin-50">
                      Final payment must be completed by {formatDate(selectedInstallmentPlan.finalDueDate)}.
                    </p>
                  </div>
                  <Badge className="w-fit border-neon-pink/30 bg-neon-pink/10 text-neon-pink">
                    {formatSettingLabel(depositType, depositPercent, depositAmount)} reserve
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-admin bg-admin-surface p-3">
                    <p className="text-xs text-admin-40">Deposit</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">{money(selectedInstallmentPlan.deposit)}</p>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-surface p-3">
                    <p className="text-xs text-admin-40">Menu now</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">{money(menuTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-surface p-3">
                    <p className="text-xs text-admin-40">Security fee</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">{money(selectedInstallmentPlan.securityFee)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {installmentOptions.map(option => {
                    const plan = buildInstallmentPlan(
                      ticketTotal,
                      menuTotal,
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
                          installmentCount === option ? 'border-neon-pink bg-admin-surface' : 'border-admin bg-admin-input hover:border-neon-pink/30',
                        ].join(' ')}
                      >
                        <p className="font-semibold text-foreground">{option} remaining payments</p>
                        <p className="mt-1 text-xs text-admin-50">From {money(plan.installments[0]?.amount ?? 0)} per payment</p>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {selectedInstallmentPlan.installments.map(row => (
                    <div key={`${row.label}-${row.dueDate.toISOString()}`} className="flex items-center justify-between gap-3 rounded-lg border border-admin bg-admin-surface px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-neon-pink" />
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                      </div>
                      <p className="text-right text-sm text-admin-60">{money(row.amount)} by {formatDate(row.dueDate)}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 rounded-lg border border-admin bg-admin-surface p-3 text-xs leading-5 text-admin-60">
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
              <Button type="button" variant="outline" onClick={() => setWalletModalOpen(false)} className="border-admin bg-admin-input">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canPurchase || purchase.isPending || walletBalance < walletMinimumDue}
                onClick={() => handlePurchase(true, walletPaymentType)}
                className="bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50"
              >
                {purchase.isPending ? 'Processing...' : walletPaymentType === 'INSTALLMENT' ? 'Confirm Reservation' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
