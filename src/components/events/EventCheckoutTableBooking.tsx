import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Skeleton, Switch, cn } from '@glee/ui'
import { CalendarClock, Minus, Plus, ReceiptText, Table2, Users } from 'lucide-react'
import {
  useEventReservationAvailability,
  useEventReservationSlots,
  type AvailabilityCategory,
  type EventReservationSlot,
} from '@glee/api'
import type { CheckoutTableBookingSelection } from './eventCheckoutTableBookingUtils'

export interface EventCheckoutTableBookingProps {
  eventId: string
  value: CheckoutTableBookingSelection | null
  onChange: (value: CheckoutTableBookingSelection | null) => void
}

function money(value: number | string | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function formatSlot(slot: EventReservationSlot) {
  const start = new Date(slot.startDateTime)
  const end = new Date(slot.endDateTime)

  return `${start.toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function selectionKey(selection: CheckoutTableBookingSelection | null) {
  if (!selection) return 'none'
  return [
    selection.enabled,
    selection.eventSlotId,
    selection.tableCategory,
    selection.guestCount,
    selection.depositAmount,
    selection.minimumSpend,
  ].join('|')
}

export default function EventCheckoutTableBooking({ eventId, value, onChange }: EventCheckoutTableBookingProps) {
  const toggleId = useId()
  const { data: slots = [], isLoading: slotsLoading } = useEventReservationSlots(eventId)
  const [enabled, setEnabled] = useState(Boolean(value?.enabled))
  const [selectedSlotId, setSelectedSlotId] = useState(value?.eventSlotId ?? '')
  const [guestCount, setGuestCount] = useState(Math.max(1, value?.guestCount ?? 2))
  const [selectedCategoryName, setSelectedCategoryName] = useState(value?.tableCategory ?? '')
  const currentValueKey = selectionKey(value)
  const lastEmittedKey = useRef(currentValueKey)
  const syncedValueKeyRef = useRef(currentValueKey)
  const skipNextEmitRef = useRef(false)

  const clearEmittedSelection = useCallback(() => {
    const alreadyCleared = !value?.enabled || lastEmittedKey.current === 'none'
    lastEmittedKey.current = 'none'
    syncedValueKeyRef.current = 'none'
    if (!alreadyCleared) onChange(null)
  }, [onChange, value?.enabled])

  useLayoutEffect(() => {
    if (syncedValueKeyRef.current === currentValueKey) return
    syncedValueKeyRef.current = currentValueKey
    setEnabled(Boolean(value?.enabled))
    setSelectedSlotId(value?.eventSlotId ?? '')
    setGuestCount(Math.max(1, value?.guestCount ?? 2))
    setSelectedCategoryName(value?.tableCategory ?? '')
    lastEmittedKey.current = currentValueKey
    skipNextEmitRef.current = true
  }, [currentValueKey, value])

  useEffect(() => {
    if (slots.length === 0) return
    if (!selectedSlotId || !slots.some(slot => slot.id === selectedSlotId)) {
      setSelectedSlotId(slots[0].id)
      setSelectedCategoryName('')
    }
  }, [selectedSlotId, slots])

  const availability = useEventReservationAvailability(
    eventId,
    { eventSlotId: selectedSlotId, guestCount },
    Boolean(enabled && eventId && selectedSlotId && guestCount > 0),
  )

  const categories = useMemo(
    () => availability.data?.categories ?? [],
    [availability.data?.categories],
  )
  const selectableCategories = useMemo(
    () => categories.filter(category => category.availableCount > 0),
    [categories],
  )
  const selectedCategory = useMemo<AvailabilityCategory | undefined>(
    () => selectableCategories.find(category => category.category === selectedCategoryName),
    [selectableCategories, selectedCategoryName],
  )

  useEffect(() => {
    if (!enabled || !selectedSlotId || !selectedCategoryName || availability.isLoading || availability.isFetching) return
    if (!selectableCategories.some(category => category.category === selectedCategoryName)) {
      clearEmittedSelection()
      setSelectedCategoryName('')
    }
  }, [availability.isFetching, availability.isLoading, clearEmittedSelection, enabled, selectableCategories, selectedCategoryName, selectedSlotId])

  useEffect(() => {
    if (skipNextEmitRef.current) {
      skipNextEmitRef.current = false
      return
    }

    let nextSelection: CheckoutTableBookingSelection | null | undefined

    if (!enabled) {
      nextSelection = null
    } else if (!selectedCategoryName) {
      nextSelection = null
    } else if (selectedCategory) {
      nextSelection = {
        enabled: true,
        eventSlotId: selectedSlotId,
        tableCategory: selectedCategory.category,
        guestCount,
        depositAmount: Number(selectedCategory.depositAmount ?? 0),
        minimumSpend: Number(selectedCategory.minimumSpend ?? 0),
      }
    }

    if (nextSelection === undefined) return

    const nextKey = selectionKey(nextSelection)
    if (currentValueKey === nextKey || lastEmittedKey.current === nextKey) return
    lastEmittedKey.current = nextKey
    onChange(nextSelection)
  }, [currentValueKey, enabled, guestCount, onChange, selectedCategory, selectedCategoryName, selectedSlotId])

  function selectSlot(slotId: string) {
    clearEmittedSelection()
    setSelectedSlotId(slotId)
    setSelectedCategoryName('')
  }

  function changeGuestCount(nextGuestCount: number) {
    const clampedGuestCount = Math.min(50, Math.max(1, nextGuestCount))
    if (clampedGuestCount === guestCount) return
    clearEmittedSelection()
    setSelectedCategoryName('')
    setGuestCount(clampedGuestCount)
  }

  function changeEnabled(nextEnabled: boolean) {
    if (!nextEnabled) {
      clearEmittedSelection()
      setSelectedCategoryName('')
    }
    setEnabled(nextEnabled)
  }

  function selectCategory(categoryName: string) {
    if (categoryName === selectedCategoryName) return
    clearEmittedSelection()
    setSelectedCategoryName(categoryName)
  }

  if (slotsLoading) {
    return <Skeleton className="h-48 rounded-3xl bg-white/10" />
  }

  if (slots.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={toggleId} className="flex cursor-pointer items-center gap-2 font-heading text-lg font-black text-white">
            <Table2 className="h-5 w-5 shrink-0 text-neon-pink" />
            <span>Add table booking</span>
          </label>
          <p className="mt-1 text-sm leading-6 text-white/55">
            The booking fee or deposit is due now. Minimum spend is handled during service and is not charged in this checkout.
          </p>
        </div>
        <Switch
          id={toggleId}
          checked={enabled}
          onCheckedChange={changeEnabled}
          className="mt-1 data-[state=checked]:bg-neon-pink"
          aria-label="Add table booking"
        />
      </div>

      {enabled && (
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/45">
              <CalendarClock className="h-3.5 w-3.5 text-neon-pink" />
              Choose a service slot
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map(slot => {
                const active = selectedSlotId === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectSlot(slot.id)}
                    className={cn(
                      'min-h-24 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink/70',
                      active
                        ? 'border-neon-pink bg-neon-pink/10 text-white shadow-[0_0_24px_rgba(255,45,143,0.14)]'
                        : 'border-white/12 bg-black/20 text-white/70 hover:border-white/25 hover:bg-white/[0.06]',
                    )}
                  >
                    <span className="block font-semibold">{slot.label}</span>
                    <span className="mt-2 block text-xs leading-5 text-white/48">{formatSlot(slot)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-neon-pink" />
              <span className="text-sm font-semibold">Guests</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Decrease guest count"
                onClick={() => changeGuestCount(guestCount - 1)}
                className="h-9 w-9 rounded-full border-white/15 bg-white/[0.06] text-white hover:border-neon-pink hover:bg-neon-pink/10 hover:text-neon-pink"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-mono text-lg font-bold text-white">{guestCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Increase guest count"
                onClick={() => changeGuestCount(guestCount + 1)}
                className="h-9 w-9 rounded-full border-white/15 bg-white/[0.06] text-white hover:border-neon-pink hover:bg-neon-pink/10 hover:text-neon-pink"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/45">
              <Table2 className="h-3.5 w-3.5 text-neon-pink" />
              Pick a table category
            </div>
            {availability.isLoading || availability.isFetching ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-36 rounded-2xl bg-white/10" />
                <Skeleton className="h-36 rounded-2xl bg-white/10" />
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/55">
                No tables are available for this slot and guest count.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map(category => {
                  const active = selectedCategoryName === category.category
                  const available = category.availableCount > 0
                  return (
                    <button
                      key={category.category}
                      type="button"
                      aria-pressed={active}
                      disabled={!available}
                      onClick={() => selectCategory(category.category)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink/70 disabled:cursor-not-allowed disabled:opacity-45',
                        active
                          ? 'border-neon-pink bg-neon-pink/10 text-white shadow-[0_0_24px_rgba(255,45,143,0.14)]'
                          : 'border-white/12 bg-black/20 text-white/72 hover:border-white/25 hover:bg-white/[0.06]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-heading font-bold text-white">{category.category}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {category.minGuests}-{category.maxGuests} guests
                          </p>
                        </div>
                        <Badge className="shrink-0 border-neon-pink/25 bg-neon-pink/10 text-neon-pink">
                          {category.availableCount} left
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                          <p className="text-white/42">Deposit</p>
                          <p className="mt-1 font-mono font-bold text-white">{money(category.depositAmount)}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                          <p className="text-white/42">Minimum spend</p>
                          <p className="mt-1 font-mono font-bold text-white">{money(category.minimumSpend)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {value?.enabled && (
        <aside className="mt-5 rounded-2xl border border-neon-pink/20 bg-neon-pink/[0.08] p-4">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-neon-pink" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base font-black text-white">Table booking summary</p>
              <div className="mt-3 grid gap-2 text-sm text-white/62 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40">Category</p>
                  <p className="mt-1 font-semibold text-white">{value.tableCategory}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40">Booking fee due now</p>
                  <p className="mt-1 font-mono font-semibold text-white">{money(value.depositAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40">Minimum spend</p>
                  <p className="mt-1 font-mono font-semibold text-white">{money(value.minimumSpend)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/50">
                {value.guestCount} guest{value.guestCount === 1 ? '' : 's'} included. The minimum spend is a venue rule and is not charged in this checkout.
              </p>
            </div>
          </div>
        </aside>
      )}
    </section>
  )
}
