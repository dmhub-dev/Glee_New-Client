import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  reservationCheckoutContextStorageKey,
  reservationVerificationStorageKey,
  useCreateReservation,
  useReservationAvailability,
  useReservationVenue,
  type AvailabilityCategory,
  type ReservationPaymentIntent,
  type ReservationVenue,
} from '@glee/api'
import { Badge, Button, Input, Separator, Skeleton, useToast } from '@glee/ui'
import { ChevronLeft, Clock, ExternalLink, FileText, MapPin, ShieldCheck, Users, X } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'
import {
  reservationDueNow,
  reservationMenuPayload,
  reservationMenuTotal,
  selectedReservationMenuRows,
  type ReservationMenuSelectableItem,
} from '../../components/reservations/reservationMenuUtils'

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
  if (value === 'CLUB') return 'Club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'Restaurant/Hotel'
  return 'Other'
}

function tableDetailsForCategory(venue: ReservationVenue | undefined, categoryName: string) {
  const tables = venue?.reservationTables?.filter(table => table.isActive && table.category === categoryName) ?? []
  return {
    count: tables.length,
    names: tables.map(table => table.name).slice(0, 3).join(', '),
    description: tables.find(table => table.description)?.description,
  }
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
        <Button type="button" variant="outline" onClick={() => window.location.assign('/reservations')} className="rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
          Reservations
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
  const { isAuthenticated, user } = useAuth()
  const [date, setDate] = useState(today())
  const [guestCount, setGuestCount] = useState(2)
  const [slotId, setSlotId] = useState('')
  const [tableCategory, setTableCategory] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({})

  const { data: venue, isLoading } = useReservationVenue(locationId)
  const createReservation = useCreateReservation()
  const slots = useMemo(
    () => venue?.reservationSlots ?? [],
    [venue?.reservationSlots],
  )
  const availableSlots = useMemo(() => {
    const day = selectedDayOfWeek(date)
    return slots.filter(slot => slot.daysOfWeek.length === 0 || slot.daysOfWeek.includes(day))
  }, [date, slots])
  const selectedSlotId = slotId || availableSlots[0]?.id || ''
  const availabilityParams = useMemo(() => ({ date, slotId: selectedSlotId, guestCount }), [date, selectedSlotId, guestCount])
  const availability = useReservationAvailability(locationId, availabilityParams, Boolean(locationId && selectedSlotId && date && guestCount > 0))
  const categories = useMemo(
    () => availability.data?.categories ?? [],
    [availability.data?.categories],
  )
  const selectedCategory = useMemo<AvailabilityCategory | undefined>(
    () => categories.find(category => category.category === tableCategory),
    [categories, tableCategory],
  )
  const selectedSlot = availableSlots.find(slot => slot.id === selectedSlotId)
  const selectedCategoryDetails = selectedCategory ? tableDetailsForCategory(venue, selectedCategory.category) : null
  const menuItems = useMemo<ReservationMenuSelectableItem[]>(
    () => (venue?.menuItems ?? [])
      .filter(item => item.isActive)
      .map(item => {
        const price = Number(item.price ?? 0)
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number.isFinite(price) ? Math.max(0, price) : 0,
          description: item.description,
        }
      }),
    [venue?.menuItems],
  )
  const selectedMenuRows = useMemo(
    () => selectedReservationMenuRows(menuItems, menuQuantities),
    [menuItems, menuQuantities],
  )
  const selectedMenuTotal = reservationMenuTotal(selectedMenuRows)
  const totalDueNow = reservationDueNow({ depositAmount: selectedCategory?.depositAmount, selectedMenuRows })

  function changeMenuQuantity(itemId: string, delta: number) {
    setMenuQuantities(current => ({
      ...current,
      [itemId]: Math.max(0, (current[itemId] ?? 0) + delta),
    }))
  }

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
    setMenuQuantities({})
  }, [locationId])

  useEffect(() => {
    if (!user) return
    setGuestName(current => current || user.name || '')
    setGuestEmail(current => current || user.email || '')
  }, [user])

  async function handleReserve() {
    if (!selectedSlotId || !selectedCategory) {
      toast({ title: 'Select a table', description: 'Choose an available table before checkout.', variant: 'destructive' })
      return
    }
    const guestFieldsMissing = !isAuthenticated && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())
    if (guestFieldsMissing) {
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
        paymentMethod: 'PAYSTACK',
        callbackUrl: `${window.location.origin}/reservation/callback`,
        guestName: !isAuthenticated ? guestName.trim() : undefined,
        guestEmail: !isAuthenticated ? guestEmail.trim() : undefined,
        guestPhone: !isAuthenticated ? guestPhone.trim() : undefined,
        preOrderMenu: selectedMenuRows.length ? reservationMenuPayload(selectedMenuRows) : undefined,
      })
      if (isPaymentIntent(result)) {
        if (!result.authorization_url) throw new Error('Payment provider did not return a checkout URL')
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
          <Button onClick={() => navigate(isAuthenticated ? '/app/reservations' : '/reservations')} className="mt-4 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            Back to reservations
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title={venue.name} hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-32 pt-5 lg:px-8">
        {isAuthenticated && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/app/reservations')}
            className="rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            All reservations
          </Button>
        )}

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

        {venue.menuDocumentUrl && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText className="h-4 w-4 text-neon-pink" />
                  Full menu
                </p>
                <p className="mt-1 text-xs text-white/45">Review the full menu before booking. Food and drinks are saved as a pre-order note and are not charged now.</p>
              </div>
              <a
                href={venue.menuDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-neon-pink/35 px-4 py-2 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/10"
              >
                {venue.menuDocumentName ?? 'Open menu'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </section>
        )}

        <section className="space-y-4 rounded-3xl bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Booking details</p>
              <h2 className="mt-2 font-heading text-2xl font-black text-white">Choose date, time, and table</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-white/65">
                <span>Date</span>
                <Input
                  type="date"
                  value={date}
                  min={today()}
                  onChange={event => {
                    setDate(event.target.value)
                    setTableCategory('')
                  }}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white"
                />
              </label>
              <label className="space-y-2 text-sm text-white/65">
                <span>Guests</span>
                <Input
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={event => {
                    setGuestCount(Math.max(1, Number(event.target.value) || 1))
                    setTableCategory('')
                  }}
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
                        onClick={() => {
                          setSlotId(slot.id)
                          setTableCategory('')
                        }}
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
              <p className="mb-2 text-sm font-semibold text-white">Select table</p>
              <div className="grid gap-3 lg:grid-cols-2">
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
                      {(() => {
                        const tableDetails = tableDetailsForCategory(venue, category.category)
                        return (
                          <>
                            <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-3">
                              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-neon-pink" />{category.minGuests}-{category.maxGuests} guests</span>
                              <span className="font-semibold text-white">Min spend {money(category.minimumSpend)}</span>
                              <span className="font-semibold text-neon-pink">Deposit {money(category.depositAmount)}</span>
                            </div>
                            {(tableDetails.names || tableDetails.description) && (
                              <div className="mt-3 rounded-xl bg-white/[0.06] p-3 text-xs leading-5 text-white/55">
                                {tableDetails.names && <p><span className="text-white/35">Tables:</span> {tableDetails.names}{tableDetails.count > 3 ? ` +${tableDetails.count - 3} more` : ''}</p>}
                                {tableDetails.description && <p className="mt-1 line-clamp-2">{tableDetails.description}</p>}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </button>
                  )
                })}
              </div>
            </div>

            {menuItems.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Food & drink pre-order</p>
                    <p className="mt-1 text-xs text-white/45">Saved for the venue, not charged now</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-neon-pink">{money(selectedMenuTotal)}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {menuItems.map(item => {
                    const quantity = menuQuantities[item.id] ?? 0
                    return (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                            <p className="mt-1 text-xs text-white/40">{item.category} · {money(item.price)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => changeMenuQuantity(item.id, -1)} disabled={quantity === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-neon-pink hover:text-neon-pink disabled:cursor-not-allowed disabled:opacity-30">−</button>
                            <span className="w-6 text-center font-mono text-sm font-bold text-white">{quantity}</span>
                            <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => changeMenuQuantity(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-neon-pink hover:text-neon-pink">+</button>
                          </div>
                        </div>
                        {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/42">{item.description}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050017]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 pr-2">
            <p className="text-xs text-white/45">{selectedCategory ? 'Total due now' : 'Select a table'}</p>
            <p className="font-heading text-xl font-black text-white">
              {selectedCategory ? money(totalDueNow) : money(0)}
            </p>
            {selectedCategory && (
              <p className="truncate text-xs text-white/45">Minimum spend {money(selectedCategory.minimumSpend)}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(isAuthenticated ? '/app/reservations' : '/reservations')}
            className="ml-auto hidden rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Continue browsing
          </Button>
          <Button
            disabled={!selectedCategory || !selectedSlotId || createReservation.isPending}
            onClick={() => isAuthenticated ? handleReserve() : setCheckoutOpen(true)}
            className="ml-auto h-11 rounded-full bg-neon-pink px-5 font-semibold text-white shadow-neon transition-all hover:bg-neon-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35 disabled:opacity-100 disabled:shadow-none sm:ml-0 sm:px-7"
          >
            {createReservation.isPending ? 'Reserving...' : selectedCategory ? 'Book Table' : 'Select a Table'}
          </Button>
        </div>
      </div>

      {checkoutOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close checkout"
            className="absolute inset-0"
            disabled={createReservation.isPending}
            onClick={() => setCheckoutOpen(false)}
          />
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-6 overflow-y-auto rounded-2xl border border-white/15 bg-[#0f0f15] p-6 text-white shadow-[0_26px_90px_rgba(0,0,0,0.5)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Checkout</p>
                <h2 className="mt-1 font-heading text-2xl font-black text-white">Complete Your Reservation</h2>
              </div>
              <button
                type="button"
                onClick={() => !createReservation.isPending && setCheckoutOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close checkout"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Order summary</p>
              <div className="flex items-start gap-3">
                {heroImage && (
                  <img
                    src={heroImage}
                    alt={venue.name}
                    className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                    onError={event => { event.currentTarget.style.display = 'none' }}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight text-white">{venue.name}</p>
                  <p className="mt-1 truncate text-xs text-white/45">{venue.address}</p>
                  <p className="mt-1 font-mono text-xs text-white/45">{date} · {selectedSlot?.label ?? formatSlotTime(selectedSlot)}</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">{selectedCategory.category}</span>
                  <span className="font-mono text-white">{money(selectedCategory.depositAmount)}</span>
                </div>
                <p className="text-xs text-white/40">{guestCount} guest{guestCount === 1 ? '' : 's'} · Minimum spend {money(selectedCategory.minimumSpend)}</p>
                {selectedCategoryDetails?.names && (
                  <p className="text-xs text-white/40">Tables: {selectedCategoryDetails.names}{selectedCategoryDetails.count > 3 ? ` +${selectedCategoryDetails.count - 3} more` : ''}</p>
                )}
              </div>

              {selectedMenuRows.length > 0 && (
                <>
                  <Separator className="bg-white/10" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">Food & drink pre-order</span>
                      <span className="font-mono text-sm text-white">{money(selectedMenuTotal)}</span>
                    </div>
                    <p className="text-xs text-white/40">Saved for the venue, not charged now</p>
                    {selectedMenuRows.map(row => (
                      <div key={row.item.id} className="flex justify-between gap-3 text-xs text-white/50">
                        <span className="truncate">{row.quantity} x {row.item.name}</span>
                        <span className="font-mono">{money(row.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator className="bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Total due now</span>
                <span className="font-mono text-lg font-bold text-neon-pink">{money(totalDueNow)}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm text-white/70">
                <span>Full name</span>
                <Input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="Jane Doe" className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-neon-pink" />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                <span>Email address</span>
                <Input type="email" value={guestEmail} onChange={event => setGuestEmail(event.target.value)} placeholder="jane@example.com" className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-neon-pink" />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                <span>Phone number</span>
                <Input type="tel" value={guestPhone} onChange={event => setGuestPhone(event.target.value)} placeholder="+254 700 000 000" className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-neon-pink" />
              </label>
            </div>

            {venue.bookingRules && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-5 text-white/58">
                <ShieldCheck className="mb-2 h-4 w-4 text-neon-pink" />
                {venue.bookingRules}
              </div>
            )}

            <Button
              disabled={createReservation.isPending}
              onClick={handleReserve}
              className="h-12 w-full rounded-full bg-neon-pink text-base font-semibold text-white shadow-neon transition-all hover:scale-[1.01] hover:bg-neon-hover active:scale-[0.99] disabled:opacity-40"
            >
              {createReservation.isPending ? 'Reserving...' : 'Proceed to Pay'}
            </Button>
          </div>
        </div>
      )}
    </Shell>
  )
}
