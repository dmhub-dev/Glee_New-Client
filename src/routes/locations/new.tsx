import { useRef, useState } from 'react'
import type { ChangeEvent, ElementType, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Switch,
  Textarea,
  useToast,
  cn,
} from '@glee/ui'
import {
  ArrowLeft,
  Building2,
  Check,
  ImagePlus,
  MapPin,
  ParkingCircle,
  Plus,
  Save,
  Trash2,
  Wind,
  X,
} from 'lucide-react'
import {
  useCreateLocation,
  useCreateLocationReservationSlot,
  useCreateLocationReservationTable,
  type DepositType,
  type UpsertReservationSlotPayload,
  type VenueType,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'

const MAX_PHOTOS = 6

type CanonicalVenueType = Extract<VenueType, 'CLUB' | 'RESTAURANT' | 'OTHER'>

const VENUE_TYPES: Array<{ label: string; value: CanonicalVenueType; hint: string }> = [
  { label: 'Club', value: 'CLUB', hint: 'VIP booths, table sections, and late-night time slots.' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT', hint: 'Dining tables, hotel restaurants, service windows, and minimum spend rules.' },
  { label: 'Other', value: 'OTHER', hint: 'General event locations that may not take reservations.' },
]

const VENUE_TYPE_DETAILS: Record<CanonicalVenueType, { title: string; copy: string; bullets: string[] }> = {
  CLUB: {
    title: 'Club information',
    copy: 'Use this for nightlife venues, clubs with lounge areas, VIP sections, and bottle-service spaces.',
    bullets: ['Default tables lean toward VIP booths and group minimum spends.', 'Use table categories for lounge, balcony, dance-floor, or premium booth sections.', 'Evening and late-night booking slots work best here.'],
  },
  RESTAURANT: {
    title: 'Restaurant/Hotel information',
    copy: 'Use this for restaurants, hotel restaurants, terraces, dining rooms, and hospitality venues.',
    bullets: ['Default tables lean toward dining and premium dining categories.', 'Use table categories for terrace, private dining, window, or lounge seating.', 'Lunch, dinner, brunch, and hotel service windows work best here.'],
  },
  OTHER: {
    title: 'Other location information',
    copy: 'Use this for event spaces that mainly host events and may not need normal table reservations.',
    bullets: ['Reservations are turned off by default for this type.', 'Enable reservations manually if this location has bookable tables.', 'Use the description for special rooms, halls, rooftops, or temporary lounge areas.'],
  },
}

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive('Capacity must be a positive number'),
  isIndoors: z.boolean(),
  isOutdoors: z.boolean(),
  isParkingAvailable: z.boolean(),
  venueType: z.enum(['CLUB', 'RESTAURANT', 'OTHER']),
  bookingEnabled: z.boolean(),
  bookingRules: z.string().optional(),
  cancellationCutoffHours: z.coerce.number().int().min(0),
  timezone: z.string().min(1, 'Timezone is required'),
})

type LocationFormValues = z.infer<typeof locationSchema>

type TableDraft = {
  id: string
  name: string
  category: string
  description: string
  quantity: number
  minGuests: number
  maxGuests: number
  minimumSpend: number
  depositType: DepositType
  depositValue: number
}

function newTableDraft(type: CanonicalVenueType = 'CLUB'): TableDraft {
  const defaults = {
    CLUB: { name: 'VIP Booth', category: 'VIP Booth', min: 2, max: 6, spend: 10000, deposit: 1500 },
    RESTAURANT: { name: 'Dining Table', category: 'Restaurant/Hotel Table', min: 2, max: 4, spend: 5000, deposit: 1000 },
    OTHER: { name: 'Reserved Table', category: 'General', min: 1, max: 4, spend: 0, deposit: 0 },
  }[type]

  return {
    id: `table-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: defaults.name,
    category: defaults.category,
    description: '',
    quantity: 1,
    minGuests: defaults.min,
    maxGuests: defaults.max,
    minimumSpend: defaults.spend,
    depositType: 'FLAT',
    depositValue: defaults.deposit,
  }
}

function newSlotDraft(): UpsertReservationSlotPayload & { id: string } {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: 'Evening',
    startTime: '18:00',
    endTime: '23:00',
    daysOfWeek: [5, 6],
    isActive: true,
  }
}

function normalizeVenueType(value?: VenueType | null): CanonicalVenueType {
  if (value === 'CLUB') return 'CLUB'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'RESTAURANT'
  return 'OTHER'
}

function venueTypeLabel(value: VenueType | CanonicalVenueType) {
  return VENUE_TYPES.find(type => type.value === normalizeVenueType(value))?.label ?? 'Venue'
}

function money(value: number) {
  return `KSh ${Number(value || 0).toLocaleString()}`
}

export default function NewLocationPage() {
  const navigate = useNavigate()
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { toast } = useToast()
  const createLocation = useCreateLocation({ vendorScoped: isVendorRole })
  const createTable = useCreateLocationReservationTable()
  const createSlot = useCreateLocationReservationSlot()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [tables, setTables] = useState<TableDraft[]>([newTableDraft('CLUB')])
  const [slots, setSlots] = useState<Array<UpsertReservationSlotPayload & { id: string }>>([newSlotDraft()])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
      description: '',
      capacity: 120,
      isIndoors: true,
      isOutdoors: false,
      isParkingAvailable: false,
      venueType: 'CLUB',
      bookingEnabled: true,
      bookingRules: 'Reservation deposits secure the table. Guests should arrive on time and meet the minimum spend during service.',
      cancellationCutoffHours: 24,
      timezone: 'Africa/Nairobi',
    },
  })

  const values = watch()
  const isSaving = isSubmitting || createLocation.isPending || createTable.isPending || createSlot.isPending
  const tableQuantity = tables.reduce((sum, table) => sum + Number(table.quantity || 0), 0)
  const activeDays = Array.from(new Set(slots.flatMap(slot => slot.daysOfWeek))).sort()

  function handleVenueTypeChange(value: CanonicalVenueType) {
    setValue('venueType', value, { shouldDirty: true, shouldValidate: true })
    if (value === 'OTHER') setValue('bookingEnabled', false, { shouldDirty: true, shouldValidate: true })
    if (value !== 'OTHER' && !values.bookingEnabled) setValue('bookingEnabled', true, { shouldDirty: true, shouldValidate: true })
    setTables(current => current.length === 1 && !current[0].description ? [newTableDraft(value)] : current)
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    if (!selected.length) return
    setPhotos(current => [...current, ...selected.map(file => ({ file, preview: URL.createObjectURL(file) }))])
    event.target.value = ''
  }

  function updateTable(id: string, patch: Partial<TableDraft>) {
    setTables(current => current.map(table => table.id === id ? { ...table, ...patch } : table))
  }

  function updateSlot(id: string, patch: Partial<UpsertReservationSlotPayload>) {
    setSlots(current => current.map(slot => slot.id === id ? { ...slot, ...patch } : slot))
  }

  function validateReservationSetup() {
    if (!values.bookingEnabled) return true
    if (tables.length === 0 || slots.length === 0) {
      toast({ title: 'Reservation setup required', description: 'Add at least one table and one booking slot.', variant: 'destructive' })
      return false
    }
    const invalidTable = tables.find(table => !table.name.trim() || !table.category.trim() || table.quantity < 1 || table.maxGuests < table.minGuests)
    if (invalidTable) {
      toast({ title: 'Check table inventory', description: 'Each table needs a name, category, quantity, and valid guest range.', variant: 'destructive' })
      return false
    }
    const invalidSlot = slots.find(slot => !slot.label.trim() || slot.daysOfWeek.length === 0)
    if (invalidSlot) {
      toast({ title: 'Check booking slots', description: 'Each slot needs a label and at least one active day.', variant: 'destructive' })
      return false
    }
    return true
  }

  async function onSubmit(formValues: LocationFormValues) {
    if (!validateReservationSetup()) return
    try {
      const created = await createLocation.mutateAsync({
        dto: {
          name: formValues.name,
          address: formValues.address,
          description: formValues.description,
          capacity: formValues.capacity,
          isIndoors: formValues.isIndoors,
          isOutdoors: formValues.isOutdoors,
          isParkingAvailable: formValues.isParkingAvailable,
          latitude: 0,
          longitude: 0,
          venueType: formValues.venueType,
          bookingEnabled: formValues.bookingEnabled,
          bookingRules: formValues.bookingRules,
          cancellationCutoffHours: formValues.cancellationCutoffHours,
          timezone: formValues.timezone,
        },
        pictures: photos.map(photo => photo.file),
      })

      if (formValues.bookingEnabled) {
        for (const table of tables) {
          for (let index = 0; index < table.quantity; index += 1) {
            await createTable.mutateAsync({
              locationId: created.id,
              payload: {
                name: table.quantity > 1 ? `${table.name} ${index + 1}` : table.name,
                category: table.category,
                description: table.description,
                minGuests: Number(table.minGuests),
                maxGuests: Number(table.maxGuests),
                minimumSpend: Number(table.minimumSpend),
                depositType: table.depositType,
                depositValue: Number(table.depositValue),
                isActive: true,
              },
            })
          }
        }
        for (const slot of slots) {
          await createSlot.mutateAsync({
            locationId: created.id,
            payload: {
              label: slot.label,
              startTime: slot.startTime,
              endTime: slot.endTime,
              daysOfWeek: slot.daysOfWeek,
              isActive: true,
            },
          })
        }
      }

      toast({ title: 'Location created', description: formValues.bookingEnabled ? 'Reservation setup was added too.' : 'Event location is ready.' })
      navigate(`/dashboard/locations/${created.id}`)
    } catch (error) {
      toast({ title: 'Could not create location', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <AdminLayout title="Create Location" subtitle="Add venue details, reservation rules, table inventory, and booking slots in one flow.">
      <div className="flex gap-8">
        <div className="min-w-0 flex-1 space-y-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard/events?section=locations')}
            className="flex items-center gap-2 rounded-full border border-admin-md bg-admin-input px-4 py-1.5 text-sm text-admin-40 transition-colors hover:bg-admin-overlay hover:text-admin-70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Locations
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
              <div>
                <h2 className="font-heading text-sm font-bold text-foreground">Basic Info</h2>
                <p className="mt-1 text-xs text-admin-40">Core information shown on event pages and reservation screens.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldError label="Venue Name" htmlFor="location-name" error={errors.name?.message}>
                  <Input id="location-name" {...register('name')} placeholder="e.g. The Vault Nairobi" className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Capacity" htmlFor="location-capacity" error={errors.capacity?.message}>
                  <Input id="location-capacity" type="number" min={1} {...register('capacity')} className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Address" htmlFor="location-address" error={errors.address?.message} className="md:col-span-2">
                  <Input id="location-address" {...register('address')} placeholder="Full venue address" className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="About this venue" htmlFor="location-description" error={errors.description?.message} className="md:col-span-2">
                  <Textarea id="location-description" {...register('description')} rows={4} placeholder="Ambience, access notes, guest experience, and important venue details." className="resize-none border-admin-md bg-admin-input" />
                </FieldError>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
              <div>
                <h2 className="font-heading text-sm font-bold text-foreground">Venue Profile</h2>
                <p className="mt-1 text-xs text-admin-40">Classify the venue and mark the facilities guests care about.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {VENUE_TYPES.map(type => {
                    const selected = values.venueType === type.value
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleVenueTypeChange(type.value)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selected ? 'border-neon-pink/50 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {selected ? <Check className="h-4 w-4 text-neon-pink" /> : <Building2 className="h-4 w-4" />}
                          {type.label}
                        </span>
                        <span className="mt-1 block text-xs opacity-75">{type.hint}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-2">
                  <FeatureToggle icon={Building2} label="Indoor" checked={values.isIndoors} onClick={() => setValue('isIndoors', !values.isIndoors)} />
                  <FeatureToggle icon={Wind} label="Outdoor" checked={values.isOutdoors} onClick={() => setValue('isOutdoors', !values.isOutdoors)} />
                  <FeatureToggle icon={ParkingCircle} label="Parking" checked={values.isParkingAvailable} onClick={() => setValue('isParkingAvailable', !values.isParkingAvailable)} />
                </div>
              </div>
              <div className="rounded-xl border border-admin bg-admin-overlay p-4">
                <p className="font-heading text-sm font-black text-foreground">{VENUE_TYPE_DETAILS[values.venueType].title}</p>
                <p className="mt-1 text-sm leading-6 text-admin-50">{VENUE_TYPE_DETAILS[values.venueType].copy}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {VENUE_TYPE_DETAILS[values.venueType].bullets.map(item => (
                    <div key={item} className="rounded-lg border border-admin bg-admin-surface px-3 py-2 text-xs leading-5 text-admin-50">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Photos</h2>
                  <p className="mt-1 text-xs text-admin-40">Add up to {MAX_PHOTOS} images. The first image becomes the venue cover.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 border-admin text-admin-70 hover:bg-admin-input">
                  <ImagePlus className="h-4 w-4" />
                  Add Photos
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotoChange} />
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {photos.map((photo, index) => (
                  <div key={photo.preview} className="group relative aspect-square overflow-hidden rounded-xl border border-admin bg-admin-overlay">
                    <img src={photo.preview} alt={`Venue ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos(current => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length === 0 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="col-span-3 flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-admin bg-admin-overlay text-admin-40 transition-colors hover:border-neon-pink/40 hover:text-neon-pink md:col-span-6">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-sm">Add venue photos</span>
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Reservation Setup</h2>
                  <p className="mt-1 text-xs text-admin-40">Turn this on for clubs and restaurant/hotel venues that accept table bookings.</p>
                </div>
                <Switch checked={values.bookingEnabled} onCheckedChange={value => setValue('bookingEnabled', value)} className="data-[state=checked]:!bg-neon-pink" />
              </div>
              <div className={cn('grid gap-4 md:grid-cols-2', !values.bookingEnabled && 'opacity-45')}>
                <FieldError label="Cancellation cutoff hours" htmlFor="location-cancellation-cutoff" error={errors.cancellationCutoffHours?.message}>
                  <Input id="location-cancellation-cutoff" type="number" min={0} disabled={!values.bookingEnabled} {...register('cancellationCutoffHours')} className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Timezone" htmlFor="location-timezone" error={errors.timezone?.message}>
                  <Input id="location-timezone" disabled={!values.bookingEnabled} {...register('timezone')} className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Booking rules" htmlFor="location-booking-rules" error={errors.bookingRules?.message} className="md:col-span-2">
                  <Textarea id="location-booking-rules" disabled={!values.bookingEnabled} rows={4} {...register('bookingRules')} className="resize-none border-admin-md bg-admin-input" />
                </FieldError>
              </div>
            </section>

            {values.bookingEnabled && (
              <>
                <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-sm font-bold text-foreground">Table Inventory</h2>
                      <p className="mt-1 text-xs text-admin-40">Use quantity to create multiple physical tables in the same category.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setTables(current => [...current, newTableDraft(values.venueType)])} className="gap-2 border-admin text-admin-70 hover:bg-admin-input">
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {tables.map(table => (
                      <article key={table.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-admin-40">Table category</p>
                          <button type="button" disabled={tables.length === 1} onClick={() => setTables(current => current.filter(item => item.id !== table.id))} className="rounded p-1 text-admin-30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                          <Input value={table.name} onChange={event => updateTable(table.id, { name: event.target.value })} placeholder="Table name" className="border-admin-md bg-admin-input md:col-span-2" />
                          <Input value={table.category} onChange={event => updateTable(table.id, { category: event.target.value })} placeholder="Customer category" className="border-admin-md bg-admin-input" />
                          <Input type="number" min={1} value={table.quantity} onChange={event => updateTable(table.id, { quantity: Number(event.target.value) })} placeholder="Quantity" className="border-admin-md bg-admin-input" />
                          <Input type="number" min={1} value={table.minGuests} onChange={event => updateTable(table.id, { minGuests: Number(event.target.value) })} placeholder="Min guests" className="border-admin-md bg-admin-input" />
                          <Input type="number" min={1} value={table.maxGuests} onChange={event => updateTable(table.id, { maxGuests: Number(event.target.value) })} placeholder="Max guests" className="border-admin-md bg-admin-input" />
                          <Input type="number" min={0} value={table.minimumSpend} onChange={event => updateTable(table.id, { minimumSpend: Number(event.target.value) })} placeholder="Minimum spend" className="border-admin-md bg-admin-input" />
                          <Input type="number" min={0} value={table.depositValue} onChange={event => updateTable(table.id, { depositValue: Number(event.target.value) })} placeholder="Deposit" className="border-admin-md bg-admin-input" />
                          <select value={table.depositType} onChange={event => updateTable(table.id, { depositType: event.target.value as DepositType })} className="h-10 rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground">
                            <option value="FLAT">Flat deposit</option>
                            <option value="PERCENTAGE">Percentage deposit</option>
                          </select>
                          <Input value={table.description} onChange={event => updateTable(table.id, { description: event.target.value })} placeholder="Optional table notes" className="border-admin-md bg-admin-input md:col-span-3" />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-sm font-bold text-foreground">Booking Slots</h2>
                      <p className="mt-1 text-xs text-admin-40">Set the time windows customers can reserve.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setSlots(current => [...current, newSlotDraft()])} className="gap-2 border-admin text-admin-70 hover:bg-admin-input">
                      <Plus className="h-4 w-4" />
                      Add Slot
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {slots.map(slot => (
                      <article key={slot.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-admin-40">Booking window</p>
                          <button type="button" disabled={slots.length === 1} onClick={() => setSlots(current => current.filter(item => item.id !== slot.id))} className="rounded p-1 text-admin-30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_140px_140px]">
                          <Input value={slot.label} onChange={event => updateSlot(slot.id, { label: event.target.value })} placeholder="Slot label e.g. Dinner" className="border-admin-md bg-admin-input" />
                          <Input type="time" value={slot.startTime} onChange={event => updateSlot(slot.id, { startTime: event.target.value })} className="border-admin-md bg-admin-input" />
                          <Input type="time" value={slot.endTime} onChange={event => updateSlot(slot.id, { endTime: event.target.value })} className="border-admin-md bg-admin-input" />
                        </div>
                        <div className="mt-3 grid grid-cols-7 gap-1">
                          {DAYS.map(day => {
                            const active = slot.daysOfWeek.includes(day.value)
                            return (
                              <button key={day.value} type="button" onClick={() => updateSlot(slot.id, {
                                daysOfWeek: active ? slot.daysOfWeek.filter(value => value !== day.value) : [...slot.daysOfWeek, day.value].sort(),
                              })} className={active ? 'rounded-md bg-neon-pink px-2 py-2 text-xs font-semibold text-white' : 'rounded-md border border-admin px-2 py-2 text-xs text-admin-40 hover:text-foreground'}>
                                {day.label}
                              </button>
                            )
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}

            <div className="sticky bottom-0 flex items-center justify-between border-t border-admin bg-admin-body py-4">
              <button type="button" onClick={() => navigate('/dashboard/events?section=locations')} className="text-sm text-admin-30 transition-colors hover:text-admin-60">
                Discard changes
              </button>
              <Button type="submit" disabled={isSaving} className="gap-2 rounded-full bg-neon-pink px-6 font-semibold text-white hover:bg-neon-pink/90">
                <Save className="h-4 w-4" />
                {isSaving ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </div>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-20 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-admin-30">Preview</p>
            <div className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
              <div className="relative h-36 bg-admin-overlay">
                {photos[0] ? (
                  <img src={photos[0].preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-admin-30">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full border border-neon-pink/25 bg-neon-pink/15 px-2.5 py-1 text-xs font-semibold text-neon-pink">
                  {venueTypeLabel(values.venueType)}
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="line-clamp-1 font-heading text-lg font-black text-foreground">{values.name || 'Venue name'}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-admin-40">{values.address || 'Venue address'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Capacity" value={Number(values.capacity || 0).toLocaleString()} />
                  <MiniStat label="Reservations" value={values.bookingEnabled ? 'On' : 'Off'} />
                  <MiniStat label="Tables" value={values.bookingEnabled ? tableQuantity.toLocaleString() : '-'} />
                  <MiniStat label="Slots" value={values.bookingEnabled ? slots.length.toLocaleString() : '-'} />
                </div>
                {values.bookingEnabled && (
                  <div className="rounded-xl border border-admin bg-admin-overlay p-3 text-xs text-admin-40">
                    <p className="font-semibold text-admin-70">Next setup</p>
                    <p className="mt-1">{tables[0]?.category ?? 'Table category'} · {money(tables[0]?.minimumSpend ?? 0)} minimum spend</p>
                    <p className="mt-1">Runs {activeDays.map(day => DAYS.find(item => item.value === day)?.label).filter(Boolean).join(', ') || 'no days selected'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}

function FieldError({ label, htmlFor, error, className, children }: { label: string; htmlFor?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className="text-xs text-admin-50">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function FeatureToggle({ icon: Icon, label, checked, onClick }: { icon: ElementType; label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors',
        checked ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink' : 'border-admin bg-admin-overlay text-admin-50 hover:text-admin-70',
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className={cn('h-2.5 w-2.5 rounded-full', checked ? 'bg-neon-pink' : 'bg-admin-30')} />
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <p className="text-[10px] uppercase tracking-wide text-admin-30">{label}</p>
      <p className="mt-1 font-heading text-sm font-black text-foreground">{value}</p>
    </div>
  )
}
