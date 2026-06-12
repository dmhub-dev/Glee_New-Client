import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
import { CalendarClock, CreditCard, Table2, Users, Wallet } from 'lucide-react'
import {
  reservationCheckoutContextStorageKey,
  reservationVerificationStorageKey,
  useCreateEventReservation,
  useEventReservationAvailability,
  useEventReservationSlots,
  type AvailabilityCategory,
  type ReservationPaymentIntent,
  type ReservationPaymentMethod,
} from '@glee/api'
import { useAuth } from '../../lib/auth/AuthContext'

function money(value: number | string | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function formatSlot(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isPaymentIntent(result: unknown): result is ReservationPaymentIntent {
  return Boolean(result && typeof result === 'object' && 'authorization_url' in result && 'reservation' in result)
}

function safeSessionStorageSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Checkout storage is best-effort. The callback can still verify by reference.
  }
}

export default function EventReservationPanel({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: slots = [], isLoading } = useEventReservationSlots(eventId)
  const createReservation = useCreateEventReservation()
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [guestCount, setGuestCount] = useState(2)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<ReservationPaymentMethod>('PAYSTACK')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  useEffect(() => {
    if (!selectedSlotId && slots.length > 0) setSelectedSlotId(slots[0].id)
  }, [selectedSlotId, slots])

  const availability = useEventReservationAvailability(
    eventId,
    { eventSlotId: selectedSlotId, guestCount },
    Boolean(eventId && selectedSlotId && guestCount > 0),
  )
  const categories = availability.data?.categories ?? []
  const selectedCategory = useMemo<AvailabilityCategory | undefined>(
    () => categories.find(category => category.category === selectedCategoryName),
    [categories, selectedCategoryName],
  )
  const deposit = selectedCategory?.depositAmount ?? 0

  useEffect(() => {
    if (selectedCategoryName && !categories.some(category => category.category === selectedCategoryName)) {
      setSelectedCategoryName('')
    }
  }, [categories, selectedCategoryName])

  useEffect(() => {
    if (!isAuthenticated && paymentMethod === 'WALLET') {
      setPaymentMethod('PAYSTACK')
    }
  }, [isAuthenticated, paymentMethod])

  async function reserveTable() {
    if (!selectedSlotId || !selectedCategory) return
    const guestFieldsMissing = !isAuthenticated && paymentMethod === 'PAYSTACK' && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())
    if (guestFieldsMissing) {
      toast({ title: 'Guest details required', description: 'Add your name, email, and phone number to continue.', variant: 'destructive' })
      return
    }
    try {
      const result = await createReservation.mutateAsync({
        eventId,
        eventSlotId: selectedSlotId,
        tableCategory: selectedCategory.category,
        guestCount,
        paymentMethod,
        callbackUrl: paymentMethod === 'PAYSTACK' ? `${window.location.origin}/reservation/callback` : undefined,
        guestName: !isAuthenticated ? guestName.trim() : undefined,
        guestEmail: !isAuthenticated ? guestEmail.trim() : undefined,
        guestPhone: !isAuthenticated ? guestPhone.trim() : undefined,
      })
      if (isPaymentIntent(result)) {
        if (!result.authorization_url) throw new Error('Payment provider did not return a checkout URL')
        safeSessionStorageSet(reservationVerificationStorageKey(result.reference), result.verificationToken)
        safeSessionStorageSet(
          reservationCheckoutContextStorageKey(result.reference),
          JSON.stringify({ mode: isAuthenticated ? 'customer' : 'guest', source: 'EVENT', eventId, reservationId: result.reservation.id }),
        )
        window.location.href = result.authorization_url
        return
      }
      toast({ title: 'Table reserved', description: `${selectedCategory.category} is confirmed for this event.` })
      navigate(`/app/reservations/detail/${result.id}`)
    } catch (error) {
      toast({ title: 'Reservation failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (isLoading || slots.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-black text-white">
            <Table2 className="h-5 w-5 text-neon-pink" />
            Reserve a Table
          </h2>
          <p className="mt-1 text-xs font-medium text-white/45">Book table service for this event with a deposit.</p>
        </div>
        <Badge className="w-fit rounded-full border-neon-pink/25 bg-neon-pink/10 px-3 py-1 text-neon-pink">{slots.length} slot{slots.length === 1 ? '' : 's'}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {slots.map(slot => (
              <button
                key={slot.id}
                type="button"
                onClick={() => { setSelectedSlotId(slot.id); setSelectedCategoryName('') }}
                className={selectedSlotId === slot.id
                  ? 'rounded-2xl border border-neon-pink bg-neon-pink/10 p-4 text-left text-white'
                  : 'rounded-2xl border border-white/12 bg-black/20 p-4 text-left text-white/70 transition hover:border-white/25'}
              >
                <p className="font-semibold">{slot.label}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-white/50">
                  <CalendarClock className="h-3.5 w-3.5 text-neon-pink" />
                  {formatSlot(slot.startDateTime)}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-neon-pink" />
              <span className="text-sm font-semibold">Guests</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button type="button" onClick={() => setGuestCount(value => Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-neon-pink hover:text-neon-pink">−</button>
              <span className="w-8 text-center font-mono font-bold text-white">{guestCount}</span>
              <button type="button" onClick={() => setGuestCount(value => Math.min(50, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-neon-pink hover:text-neon-pink">+</button>
            </div>
          </div>

          {availability.isLoading ? (
            <Skeleton className="h-32 rounded-2xl bg-white/10" />
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
              No tables are available for this guest count and slot.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map(category => {
                const active = selectedCategoryName === category.category
                return (
                  <button
                    key={category.category}
                    type="button"
                    onClick={() => setSelectedCategoryName(category.category)}
                    className={active
                      ? 'rounded-2xl border border-neon-pink bg-neon-pink/10 p-4 text-left text-white shadow-[0_0_24px_rgba(255,45,143,0.14)]'
                      : 'rounded-2xl border border-white/12 bg-black/20 p-4 text-left text-white/72 transition hover:border-white/25'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading font-bold text-white">{category.category}</p>
                        <p className="mt-1 text-xs text-white/45">{category.availableCount} available · {category.minGuests}-{category.maxGuests} guests</p>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/10 text-white/70">{money(category.depositAmount)}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-white/50">Minimum spend {money(category.minimumSpend)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-white/12 bg-black/25 p-4">
          <p className="text-xs font-semibold uppercase text-white/40">Checkout</p>
          <p className="mt-2 font-heading text-3xl font-black text-white">{money(deposit)}</p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('PAYSTACK')}
              className={paymentMethod === 'PAYSTACK'
                ? 'flex items-center gap-3 rounded-2xl border border-neon-pink bg-neon-pink/10 p-3 text-left text-white'
                : 'flex items-center gap-3 rounded-2xl border border-white/12 bg-black/20 p-3 text-left text-white/65 transition hover:border-white/25'}
            >
              <CreditCard className="h-4 w-4 text-neon-pink" />
              <span className="text-sm font-semibold">Pay directly</span>
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setPaymentMethod('WALLET')}
                className={paymentMethod === 'WALLET'
                  ? 'flex items-center gap-3 rounded-2xl border border-neon-pink bg-neon-pink/10 p-3 text-left text-white'
                  : 'flex items-center gap-3 rounded-2xl border border-white/12 bg-black/20 p-3 text-left text-white/65 transition hover:border-white/25'}
              >
                <Wallet className="h-4 w-4 text-neon-pink" />
                <span className="text-sm font-semibold">Glee wallet</span>
              </button>
            )}
          </div>
          {!authLoading && !isAuthenticated && (
            <div className="mt-4 space-y-3">
              <Input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="Full name" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
              <Input type="email" value={guestEmail} onChange={event => setGuestEmail(event.target.value)} placeholder="Email address" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
              <Input type="tel" value={guestPhone} onChange={event => setGuestPhone(event.target.value)} placeholder="Phone number" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
            </div>
          )}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 text-white/55"><span>Minimum spend</span><strong className="font-mono text-white">{money(selectedCategory?.minimumSpend ?? 0)}</strong></div>
            <div className="flex justify-between gap-3 text-white/55"><span>Guests</span><strong className="font-mono text-white">{guestCount}</strong></div>
          </div>
          <Button
            disabled={!selectedCategory || createReservation.isPending}
            onClick={reserveTable}
            className="mt-4 h-12 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90 disabled:bg-white/15 disabled:text-white/35"
          >
            {createReservation.isPending ? 'Reserving...' : paymentMethod === 'WALLET' ? 'Pay With Wallet' : 'Proceed to Pay'}
          </Button>
        </aside>
      </div>
    </section>
  )
}
