import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  reservationCheckoutContextStorageKey,
  reservationVerificationStorageKey,
  useCreateReservation,
  useReservationAvailability,
  useReservationVenue,
  type ReservationPaymentIntent,
  type ReservationPaymentMethod,
} from '@glee/api'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
import { Calendar, Clock, CreditCard, MapPin, ShieldCheck, Users, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'

function money(value: string | number | undefined) {
  return `KSh ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

function today() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSlotTime(slot?: { startTime: string; endTime: string }) {
  if (!slot) return 'Select a time'
  return `${slot.startTime} - ${slot.endTime}`
}

function selectedDayOfWeek(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function venueTypeLabel(value?: string) {
  return (value ?? 'Venue').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, match => match.toUpperCase())
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

function PublicReservationShell({ children }: { title: string; hidePageHeader?: boolean; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050017] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <button type="button" onClick={() => window.location.assign('/')} className="inline-flex items-center">
          <img src="/glee-logo-final.svg" alt="Glee" className="h-9 brightness-0 invert" />
        </button>
        <Button type="button" variant="outline" onClick={() => window.location.assign('/events')} className="rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white">
          Events
        </Button>
      </header>
      {children}
    </main>
  )
}

export default function CustomerReservationVenuePage() {
  const { locationId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [date, setDate] = useState(today())
  const [guestCount, setGuestCount] = useState(2)
  const [slotId, setSlotId] = useState('')
  const [tableCategory, setTableCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<ReservationPaymentMethod>('PAYSTACK')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const { data: venue, isLoading } = useReservationVenue(locationId)
  const createReservation = useCreateReservation()
  const slots = venue?.reservationSlots ?? []
  const availableSlots = useMemo(() => {
    const day = selectedDayOfWeek(date)
    return slots.filter(slot => slot.daysOfWeek.length === 0 || slot.daysOfWeek.includes(day))
  }, [date, slots])
  const selectedSlotId = slotId || availableSlots[0]?.id || ''
  const availabilityParams = useMemo(() => ({ date, slotId: selectedSlotId, guestCount }), [date, selectedSlotId, guestCount])
  const availability = useReservationAvailability(locationId, availabilityParams, Boolean(locationId && selectedSlotId && date && guestCount > 0))
  const categories = availability.data?.categories ?? []
  const selectedCategory = useMemo(
    () => categories.find(category => category.category === tableCategory) ?? categories[0],
    [categories, tableCategory],
  )
  const selectedSlot = availableSlots.find(slot => slot.id === selectedSlotId)

  useEffect(() => {
    if (slotId && !availableSlots.some(slot => slot.id === slotId)) {
      setSlotId('')
      setTableCategory('')
    }
  }, [availableSlots, slotId])

  useEffect(() => {
    if (tableCategory && !categories.some(category => category.category === tableCategory)) {
      setTableCategory('')
    }
  }, [categories, tableCategory])

  useEffect(() => {
    if (!isAuthenticated && paymentMethod === 'WALLET') {
      setPaymentMethod('PAYSTACK')
    }
  }, [isAuthenticated, paymentMethod])

  async function handleReserve() {
    if (!selectedSlotId || !selectedCategory) return
    const paystackGuestFieldsMissing = !isAuthenticated && paymentMethod === 'PAYSTACK' && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())
    if (paystackGuestFieldsMissing) {
      toast({ title: 'Guest details required', description: 'Add your name, email, and phone number to continue.', variant: 'destructive' })
      return
    }
    try {
      const result = await createReservation.mutateAsync({
        locationId,
        slotId: selectedSlotId,
        date,
        guestCount,
        tableCategory: selectedCategory.category,
        paymentMethod,
        callbackUrl: paymentMethod === 'PAYSTACK' ? `${window.location.origin}/reservation/callback` : undefined,
        guestName: !isAuthenticated ? guestName.trim() : undefined,
        guestEmail: !isAuthenticated ? guestEmail.trim() : undefined,
        guestPhone: !isAuthenticated ? guestPhone.trim() : undefined,
      })
      if (isPaymentIntent(result)) {
        if (!result.authorization_url) throw new Error('Paystack did not return a checkout URL')
        safeSessionStorageSet(reservationVerificationStorageKey(result.reference), result.verificationToken)
        safeSessionStorageSet(
          reservationCheckoutContextStorageKey(result.reference),
          JSON.stringify({ mode: isAuthenticated ? 'customer' : 'guest', source: 'VENUE', locationId, reservationId: result.reservation.id }),
        )
        window.location.href = result.authorization_url
        return
      }
      toast({ title: 'Reservation confirmed', description: `${selectedCategory.category} is reserved.` })
      navigate(`/app/reservations/detail/${result.id}`)
    } catch (error) {
      toast({
        title: 'Reservation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const Shell = isAuthenticated ? CustomerLayout : PublicReservationShell
  const heroImage = venue?.pictures?.[0]

  if (isLoading) {
    return (
      <Shell title="Reservation" hidePageHeader>
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 lg:px-8">
          <Skeleton className="h-[28rem] rounded-3xl bg-white/10" />
        </div>
      </Shell>
    )
  }

  if (!venue) {
    return (
      <Shell title="Reservation" hidePageHeader>
        <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
          <p className="text-sm font-semibold text-white">Venue not found</p>
          <Button onClick={() => navigate(isAuthenticated ? '/app/reservations' : '/events')} className="mt-4 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            Back to reservations
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title={venue.name} hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-32 pt-5 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-white/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="relative aspect-[16/9] max-h-[28rem] bg-white/8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,143,0.22),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(135deg,#09011d_0%,#14072f_48%,#050017_100%)]" aria-hidden="true" />
            {heroImage && (
              <img
                src={heroImage}
                alt={venue.name}
                className="relative h-full w-full object-cover"
                onError={event => { event.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050017] via-[#050017]/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <Badge className="border-neon-pink/30 bg-neon-pink/15 text-neon-pink">{venueTypeLabel(venue.venueType)}</Badge>
              <h1 className="mt-3 max-w-4xl font-heading text-3xl font-black leading-tight text-white sm:text-5xl">{venue.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                <span className="truncate">{venue.address}</span>
              </p>
            </div>
          </div>
          {venue.description && <p className="px-5 pb-5 pt-1 text-sm leading-6 text-white/58 sm:px-6">{venue.description}</p>}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 rounded-3xl bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Booking details</p>
              <h2 className="mt-2 font-heading text-2xl font-black text-white">Choose date, time, and table</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-white/65">
                <span>Date</span>
                <Input type="date" value={date} min={today()} onChange={event => setDate(event.target.value)} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/65">
                <span>Guests</span>
                <Input
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={event => setGuestCount(Math.max(1, Number(event.target.value) || 1))}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Time slot</p>
              {slots.length === 0 ? (
                <div className="rounded-2xl bg-black/20 p-5 text-sm text-white/50">This venue has not opened reservation slots yet.</div>
              ) : availableSlots.length === 0 ? (
                <div className="rounded-2xl bg-black/20 p-5 text-sm text-white/50">No reservation slots run on this date. Pick another date to see available times.</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableSlots.map(slot => {
                    const active = selectedSlotId === slot.id
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSlotId(slot.id)}
                        className={`rounded-2xl border p-4 text-left transition ${active ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_22px_rgba(255,45,143,0.14)]' : 'border-white/10 bg-black/20 hover:border-neon-pink/35'}`}
                      >
                        <p className="font-semibold text-white">{slot.label}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-white/50"><Clock className="h-3.5 w-3.5" />{formatSlotTime(slot)}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Table type</p>
              <div className="grid gap-2">
                {availability.isLoading ? (
                  <Skeleton className="h-28 rounded-2xl bg-white/10" />
                ) : availability.isError ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-sm text-white/50">This slot is not available for the selected date. Try another date or time.</div>
                ) : categories.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-sm text-white/50">No tables are available for this date, time, and guest count.</div>
                ) : categories.map(category => {
                  const active = selectedCategory?.category === category.category
                  return (
                    <button
                      key={category.category}
                      type="button"
                      onClick={() => setTableCategory(category.category)}
                      className={`rounded-2xl border p-4 text-left transition ${active ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_22px_rgba(255,45,143,0.14)]' : 'border-white/10 bg-black/20 hover:border-neon-pink/35'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-heading text-lg font-black text-white">{category.category}</p>
                        <Badge className="border-transparent bg-white/10 text-white/70">{category.availableCount} left</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-3">
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-neon-pink" />{category.minGuests}-{category.maxGuests} guests</span>
                        <span>Min spend {money(category.minimumSpend)}</span>
                        <span className="font-semibold text-neon-pink">Deposit {money(category.depositAmount)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-neon-pink">Deposit summary</p>
            <h2 className="mt-3 font-heading text-2xl font-black text-white">Reserve your table</h2>
            <div className="mt-5 space-y-3 text-sm text-white/65">
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-neon-pink" />{date}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-neon-pink" />{selectedSlot?.label ?? 'Select time'}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-neon-pink" />{guestCount} guest{guestCount === 1 ? '' : 's'}</p>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('PAYSTACK')}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${paymentMethod === 'PAYSTACK' ? 'border-neon-pink bg-neon-pink/10 text-white' : 'border-white/10 bg-black/20 text-white/65 hover:border-white/25'}`}
              >
                <CreditCard className="h-4 w-4 text-neon-pink" />
                <span className="text-sm font-semibold">Paystack card or mobile money</span>
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${paymentMethod === 'WALLET' ? 'border-neon-pink bg-neon-pink/10 text-white' : 'border-white/10 bg-black/20 text-white/65 hover:border-white/25'}`}
                >
                  <Wallet className="h-4 w-4 text-neon-pink" />
                  <span className="text-sm font-semibold">Glee wallet</span>
                </button>
              )}
            </div>
            {!authLoading && !isAuthenticated && (
              <div className="mt-5 space-y-3">
                <Input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="Full name" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
                <Input type="email" value={guestEmail} onChange={event => setGuestEmail(event.target.value)} placeholder="Email address" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
                <Input type="tel" value={guestPhone} onChange={event => setGuestPhone(event.target.value)} placeholder="Phone number" className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35" />
              </div>
            )}
            <div className="mt-5 rounded-2xl bg-black/20 p-4">
              <p className="text-xs text-white/45">Table type</p>
              <p className="mt-1 font-semibold text-white">{selectedCategory?.category ?? 'Select table'}</p>
              <p className="mt-4 text-xs text-white/45">Minimum spend</p>
              <p className="mt-1 font-mono text-lg font-black text-white">{money(selectedCategory?.minimumSpend)}</p>
              <p className="mt-4 text-xs text-white/45">Deposit due now</p>
              <p className="mt-1 font-heading text-3xl font-black text-neon-pink">{money(selectedCategory?.depositAmount)}</p>
            </div>
            {venue.bookingRules && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-5 text-white/58">
                <ShieldCheck className="mb-2 h-4 w-4 text-neon-pink" />
                {venue.bookingRules}
              </div>
            )}
            <Button
              disabled={!selectedCategory || !selectedSlotId || createReservation.isPending}
              onClick={handleReserve}
              className="mt-4 h-12 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90 disabled:bg-white/15 disabled:text-white/35 disabled:opacity-100"
            >
              {paymentMethod === 'WALLET' ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {createReservation.isPending ? 'Reserving...' : paymentMethod === 'WALLET' ? 'Pay Deposit With Wallet' : 'Continue to Paystack'}
            </Button>
          </aside>
        </section>
      </div>
    </Shell>
  )
}
