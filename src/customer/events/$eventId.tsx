import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEvent, usePurchaseTicket, useWallet } from '@glee/api'
import { Badge, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@glee/ui'
import { Calendar, Clock, MapPin, Minus, Plus, ShoppingBag, Ticket, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/900x1200/141419/FF2D8F?text=Glee'

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

export default function CustomerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { data: event, isLoading } = useEvent(eventId ?? '')
  const { data: wallet } = useWallet()
  const purchase = usePurchaseTicket()
  const { toast } = useToast()
  const [selectedTierId, setSelectedTierId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [menuQtys, setMenuQtys] = useState<Record<string, number>>({})

  const selectedTier = useMemo(() => event?.ticketTiers.find(tier => tier.id === selectedTierId) ?? event?.ticketTiers[0], [event, selectedTierId])
  const selectedMenu = useMemo(() => {
    return (event?.menuItems ?? [])
      .filter(item => (menuQtys[item.id] ?? 0) > 0)
      .map(item => ({ item, quantity: menuQtys[item.id] ?? 0 }))
  }, [event?.menuItems, menuQtys])
  const ticketTotal = (selectedTier?.price ?? 0) * quantity
  const menuTotal = selectedMenu.reduce((sum, row) => sum + row.item.price * row.quantity, 0)
  const total = ticketTotal + menuTotal
  const walletBalance = Number(wallet?.balance ?? 0)
  const posterSrc = event?.flyerPortraitUrl ?? event?.flyerSquareUrl ?? PLACEHOLDER
  const isSoldOut = event?.status === 'sold_out' || Boolean(event?.ticketTiers.length && event.ticketTiers.every(tier => tier.quantityRemaining <= 0))
  const selectedTierSoldOut = !selectedTier || selectedTier.quantityRemaining <= 0
  const canPurchase = Boolean(event && selectedTier && !isSoldOut && !selectedTierSoldOut && total > 0)

  async function handlePurchase(useWallet: boolean) {
    if (!event || !selectedTier || !canPurchase) return
    try {
      const result = await purchase.mutateAsync({
        eventId: event.id,
        ticketCategoryId: selectedTier.id,
        noOfTickets: quantity,
        preOrderMenu: selectedMenu.length ? selectedMenu.map(({ item, quantity }) => ({ id: item.id, quantity })) : undefined,
        useWallet,
      })
      if (!useWallet && result.authorization_url) {
        window.location.href = result.authorization_url
        return
      }
      toast({ title: 'Ticket purchased', description: 'Your ticket is now in My Tickets.' })
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
                  {isSoldOut ? 'This event is sold out. Ticket and menu purchases are closed.' : 'Choose a ticket, add menu items, then pay with wallet or Paystack.'}
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
              <Button disabled={!canPurchase || purchase.isPending || walletBalance < total} onClick={() => handlePurchase(true)} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50">
                <Wallet className="h-4 w-4" />
                Pay with Wallet
              </Button>
              <Button disabled={!canPurchase || purchase.isPending} onClick={() => handlePurchase(false)} variant="outline" className="gap-2 border-admin bg-admin-input">
                <Ticket className="h-4 w-4" />
                Pay with Paystack
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
    </CustomerLayout>
  )
}
