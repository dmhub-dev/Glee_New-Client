import { useRef, useState } from 'react'
import type { ChangeEvent, ElementType, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
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
type SpaceType = 'indoor' | 'outdoor'

const SPACE_TYPES: Array<{ label: string; value: SpaceType; hint: string; icon: ElementType }> = [
  { label: 'Indoor', value: 'indoor', hint: 'Enclosed rooms, dining halls, clubs, private areas, or hotel spaces.', icon: Building2 },
  { label: 'Outdoor', value: 'outdoor', hint: 'Rooftops, gardens, terraces, pool decks, patios, or open-air venues.', icon: Wind },
]

const VENUE_TYPES: Array<{ label: string; value: CanonicalVenueType; hint: string }> = [
  { label: 'Club', value: 'CLUB', hint: 'VIP booths, bottle service, sections, and late-night table slots.' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT', hint: 'Dining tables, hotel restaurants, terraces, and service windows.' },
  { label: 'Other', value: 'OTHER', hint: 'Event spaces, halls, rooftops, studios, and special-purpose venues.' },
]

const DEPOSIT_PERCENTAGES = [20, 40, 60, 80, 100]

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
  capacity: z.preprocess(
    value => value === '' || value === undefined || value === null ? undefined : value,
    z.coerce.number({ required_error: 'Capacity is required' }).int().positive('Capacity must be a positive number'),
  ),
  isIndoors: z.boolean(),
  isOutdoors: z.boolean(),
  isParkingAvailable: z.boolean(),
  venueType: z.preprocess(
    value => value === '' || value === undefined || value === null ? undefined : value,
    z.enum(['CLUB', 'RESTAURANT', 'OTHER'], { required_error: 'Choose a venue category' }),
  ),
  bookingEnabled: z.boolean(),
  bookingRules: z.string().optional(),
  cancellationCutoffHours: z.preprocess(
    value => value === '' || value === undefined || value === null ? undefined : value,
    z.coerce.number().int().min(0).optional(),
  ),
  timezone: z.string().optional(),
}).superRefine((values, ctx) => {
  if (!values.isIndoors && !values.isOutdoors) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['isIndoors'], message: 'Choose whether this venue is indoor or outdoor' })
  }
  if (values.bookingEnabled) {
    if (values.cancellationCutoffHours === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cancellationCutoffHours'], message: 'Cancellation cutoff is required' })
    }
    if (!values.timezone?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['timezone'], message: 'Timezone is required' })
    }
  }
})

type LocationFormValues = z.infer<typeof locationSchema>

type TableDraft = {
  id: string
  name: string
  category: string
  description: string
  quantity: number | ''
  minGuests: number | ''
  maxGuests: number | ''
  minimumSpend: number | ''
  depositType: DepositType
  depositValue: number | ''
  hasCategoryPhoto: boolean
  categoryPhoto?: { file: File; preview: string }
}

function newTableDraft(type: CanonicalVenueType = 'CLUB'): TableDraft {
  return {
    id: `table-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    category: type === 'RESTAURANT' ? 'Restaurant/Hotel Table' : '',
    description: '',
    quantity: '',
    minGuests: '',
    maxGuests: '',
    minimumSpend: '',
    depositType: 'FLAT',
    depositValue: '',
    hasCategoryPhoto: false,
  }
}

function newSlotDraft(): UpsertReservationSlotPayload & { id: string } {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
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

function money(value: string | number) {
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
  const [tables, setTables] = useState<TableDraft[]>([])
  const [slots, setSlots] = useState<Array<UpsertReservationSlotPayload & { id: string }>>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as Resolver<LocationFormValues>,
    defaultValues: {
      name: '',
      address: '',
      description: '',
      capacity: undefined as unknown as number,
      isIndoors: false,
      isOutdoors: false,
      isParkingAvailable: false,
      venueType: undefined as unknown as CanonicalVenueType,
      bookingEnabled: false,
      bookingRules: '',
      cancellationCutoffHours: undefined,
      timezone: '',
    },
  })

  const values = watch()
  const selectedVenueType = values.venueType as CanonicalVenueType | undefined
  const isSaving = isSubmitting || createLocation.isPending || createTable.isPending || createSlot.isPending
  const tableQuantity = tables.reduce((sum, table) => sum + Number(table.quantity || 0), 0)
  const activeDays = Array.from(new Set(slots.flatMap(slot => slot.daysOfWeek))).sort()
  const selectedSpace: SpaceType | undefined = values.isIndoors ? 'indoor' : values.isOutdoors ? 'outdoor' : undefined

  function ensureReservationDrafts(type: CanonicalVenueType = 'CLUB') {
    setTables(current => current.length ? current : [newTableDraft(type)])
    setSlots(current => current.length ? current : [newSlotDraft()])
    setValue('bookingRules', values.bookingRules || 'Reservation deposits secure the table. Guests should arrive on time and meet the minimum spend during service.', { shouldDirty: true, shouldValidate: true })
    setValue('cancellationCutoffHours', values.cancellationCutoffHours ?? 24, { shouldDirty: true, shouldValidate: true })
    setValue('timezone', values.timezone || 'Africa/Nairobi', { shouldDirty: true, shouldValidate: true })
  }

  function handleSpaceTypeChange(value: SpaceType) {
    setValue('isIndoors', value === 'indoor', { shouldDirty: true, shouldValidate: true })
    setValue('isOutdoors', value === 'outdoor', { shouldDirty: true, shouldValidate: true })
  }

  function handleVenueTypeChange(value: CanonicalVenueType) {
    setValue('venueType', value, { shouldDirty: true, shouldValidate: true })
    if (value === 'OTHER') setValue('bookingEnabled', false, { shouldDirty: true, shouldValidate: true })
    if (value !== 'OTHER') {
      setValue('bookingEnabled', true, { shouldDirty: true, shouldValidate: true })
      ensureReservationDrafts(value)
    }
  }

  function handleBookingEnabledChange(value: boolean) {
    setValue('bookingEnabled', value, { shouldDirty: true, shouldValidate: true })
    if (value) ensureReservationDrafts(selectedVenueType ?? 'OTHER')
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

  function updateTableDepositType(id: string, depositType: DepositType) {
    updateTable(id, {
      depositType,
      depositValue: depositType === 'PERCENTAGE' ? 20 : 0,
    })
  }

  function setTableCategoryPhoto(id: string, file: File) {
    updateTable(id, { categoryPhoto: { file, preview: URL.createObjectURL(file) } })
  }

  function handleTableCategoryPhotoChange(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setTableCategoryPhoto(id, file)
    event.target.value = ''
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
    const invalidTable = tables.find(table => (
      !table.name.trim()
      || !table.category.trim()
      || table.quantity === ''
      || table.minGuests === ''
      || table.maxGuests === ''
      || table.minimumSpend === ''
      || table.depositValue === ''
      || Number(table.quantity) < 1
      || Number(table.minGuests) < 1
      || Number(table.maxGuests) < Number(table.minGuests)
    ))
    if (invalidTable) {
      toast({ title: 'Check table inventory', description: 'Each table needs a name, category, quantity, and valid guest range.', variant: 'destructive' })
      return false
    }
    const invalidSlot = slots.find(slot => !slot.label.trim() || !slot.startTime || !slot.endTime || slot.daysOfWeek.length === 0)
    if (invalidSlot) {
      toast({ title: 'Check booking slots', description: 'Each slot needs a label, start time, end time, and at least one active day.', variant: 'destructive' })
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
          cancellationCutoffHours: formValues.cancellationCutoffHours ?? 24,
          timezone: formValues.timezone || 'Africa/Nairobi',
        },
        pictures: photos.map(photo => photo.file),
      })

      if (formValues.bookingEnabled) {
        for (const table of tables) {
          for (let index = 0; index < Number(table.quantity); index += 1) {
            await createTable.mutateAsync({
              locationId: created.id,
              payload: {
                name: Number(table.quantity) > 1 ? `${table.name} ${index + 1}` : table.name,
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
                <FieldError label="Venue Name" htmlFor="location-name" error={errors.name?.message} required>
                  <Input id="location-name" {...register('name')} placeholder="e.g. The Vault Nairobi" className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Capacity" htmlFor="location-capacity" error={errors.capacity?.message} required>
                  <Input id="location-capacity" type="number" min={1} {...register('capacity')} className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Address" htmlFor="location-address" error={errors.address?.message} className="md:col-span-2" required>
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
                <p className="mt-1 text-xs text-admin-40">Start with the physical space, then choose the venue category and guest parking setup.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-30">1. Choose the space type <RequiredMark /></p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {SPACE_TYPES.map(type => {
                      const selected = selectedSpace === type.value
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleSpaceTypeChange(type.value)}
                          className={cn(
                            'rounded-xl border p-4 text-left transition-colors',
                            selected ? 'border-neon-pink/50 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                          )}
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            {selected ? <Check className="h-4 w-4 text-neon-pink" /> : <Icon className="h-4 w-4" />}
                            {type.label}
                          </span>
                          <span className="mt-1 block text-xs opacity-75">{type.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.isIndoors?.message && <p className="mt-2 text-xs text-red-400">{errors.isIndoors.message}</p>}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-30">2. Choose the venue category <RequiredMark /></p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {VENUE_TYPES.map(type => {
                    const selected = selectedVenueType === type.value
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
                  {errors.venueType?.message && <p className="mt-2 text-xs text-red-400">{errors.venueType.message}</p>}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-30">3. Guest parking</p>
                  <button
                    type="button"
                    onClick={() => setValue('isParkingAvailable', !values.isParkingAvailable, { shouldDirty: true, shouldValidate: true })}
                    className={cn(
                      'mt-3 flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors',
                      values.isParkingAvailable ? 'border-neon-pink/45 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <ParkingCircle className={cn('h-5 w-5 shrink-0', values.isParkingAvailable ? 'text-neon-pink' : 'text-admin-40')} />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">Does this venue have secure, ample parking?</span>
                        <span className="mt-1 block text-xs text-admin-40">This helps guests decide transport and arrival plans before booking.</span>
                      </span>
                    </span>
                    <span className={cn('ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', values.isParkingAvailable ? 'border-neon-pink bg-neon-pink text-white' : 'border-admin-md text-admin-30')}>
                      {values.isParkingAvailable && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
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
                  <p className="mt-1 text-xs text-admin-40">
                    {values.venueType === 'OTHER'
                      ? 'Optional table bookings are available for other venues when they have bookable tables or sections.'
                      : 'Reservation setup is enabled automatically for clubs and restaurant/hotel venues.'}
                  </p>
                </div>
                <Switch checked={values.bookingEnabled} onCheckedChange={handleBookingEnabledChange} className="data-[state=checked]:!bg-neon-pink" />
              </div>
              <div className={cn('grid gap-4 md:grid-cols-2', !values.bookingEnabled && 'opacity-45')}>
                <FieldError label="Cancellation cutoff hours" htmlFor="location-cancellation-cutoff" error={errors.cancellationCutoffHours?.message} required={values.bookingEnabled}>
                  <Input id="location-cancellation-cutoff" type="number" min={0} disabled={!values.bookingEnabled} {...register('cancellationCutoffHours')} className="border-admin-md bg-admin-input" />
                </FieldError>
                <FieldError label="Timezone" htmlFor="location-timezone" error={errors.timezone?.message} required={values.bookingEnabled}>
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
                    <Button type="button" variant="outline" onClick={() => setTables(current => [...current, newTableDraft(selectedVenueType ?? 'OTHER')])} className="gap-2 border-admin text-admin-70 hover:bg-admin-input">
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
                          <FieldError label="Internal table name" htmlFor={`${table.id}-name`} className="md:col-span-2" required>
                            <Input id={`${table.id}-name`} value={table.name} onChange={event => updateTable(table.id, { name: event.target.value })} placeholder="e.g. VIP Booth" className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Customer-facing category" htmlFor={`${table.id}-category`} required>
                            <Input id={`${table.id}-category`} value={table.category} onChange={event => updateTable(table.id, { category: event.target.value })} placeholder="e.g. VIP Booth" className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Physical table quantity" htmlFor={`${table.id}-quantity`} required>
                            <Input id={`${table.id}-quantity`} type="number" min={1} value={table.quantity} onChange={event => updateTable(table.id, { quantity: event.target.value === '' ? '' : Number(event.target.value) })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Minimum guests" htmlFor={`${table.id}-min-guests`} required>
                            <Input id={`${table.id}-min-guests`} type="number" min={1} value={table.minGuests} onChange={event => updateTable(table.id, { minGuests: event.target.value === '' ? '' : Number(event.target.value) })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Maximum guests" htmlFor={`${table.id}-max-guests`} required>
                            <Input id={`${table.id}-max-guests`} type="number" min={1} value={table.maxGuests} onChange={event => updateTable(table.id, { maxGuests: event.target.value === '' ? '' : Number(event.target.value) })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Minimum spend" htmlFor={`${table.id}-minimum-spend`} required>
                            <Input id={`${table.id}-minimum-spend`} type="number" min={0} value={table.minimumSpend} onChange={event => updateTable(table.id, { minimumSpend: event.target.value === '' ? '' : Number(event.target.value) })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Deposit type" htmlFor={`${table.id}-deposit-type`} required>
                            <select id={`${table.id}-deposit-type`} value={table.depositType} onChange={event => updateTableDepositType(table.id, event.target.value as DepositType)} className="h-10 w-full rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground">
                              <option value="FLAT">Flat deposit</option>
                              <option value="PERCENTAGE">Percentage deposit</option>
                            </select>
                          </FieldError>
                          {table.depositType === 'FLAT' ? (
                            <FieldError label="Flat deposit amount" htmlFor={`${table.id}-flat-deposit`} required>
                              <Input id={`${table.id}-flat-deposit`} type="number" min={0} value={table.depositValue} onChange={event => updateTable(table.id, { depositValue: event.target.value === '' ? '' : Number(event.target.value) })} className="border-admin-md bg-admin-input" />
                            </FieldError>
                          ) : (
                            <FieldError label="Percentage deposit" htmlFor={`${table.id}-percentage-deposit`} required>
                              <select id={`${table.id}-percentage-deposit`} value={table.depositValue} onChange={event => updateTable(table.id, { depositValue: Number(event.target.value) })} className="h-10 w-full rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground">
                                {DEPOSIT_PERCENTAGES.map(value => (
                                  <option key={value} value={value}>{value}%</option>
                                ))}
                              </select>
                            </FieldError>
                          )}
                          <FieldError label="Table notes" htmlFor={`${table.id}-description`} className="md:col-span-3">
                            <Input id={`${table.id}-description`} value={table.description} onChange={event => updateTable(table.id, { description: event.target.value })} placeholder="Optional table notes shown internally" className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <label className="flex min-h-10 items-center gap-3 rounded-md border border-admin-md bg-admin-input px-3 text-sm text-admin-50 md:col-span-4">
                            <input
                              type="checkbox"
                              checked={table.hasCategoryPhoto}
                              onChange={event => updateTable(table.id, {
                                hasCategoryPhoto: event.target.checked,
                                categoryPhoto: event.target.checked ? table.categoryPhoto : undefined,
                              })}
                              className="h-4 w-4 rounded border-admin accent-neon-pink"
                            />
                            Add table category picture
                          </label>
                          {table.hasCategoryPhoto && (
                            <div className="md:col-span-4">
                              <TableCategoryPhotoPicker
                                inputId={`${table.id}-category-photo`}
                                photo={table.categoryPhoto}
                                onFile={file => setTableCategoryPhoto(table.id, file)}
                                onInputChange={event => handleTableCategoryPhotoChange(table.id, event)}
                                onClear={() => updateTable(table.id, { categoryPhoto: undefined })}
                              />
                            </div>
                          )}
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
                          <FieldError label="Slot label" htmlFor={`${slot.id}-label`} required>
                            <Input id={`${slot.id}-label`} value={slot.label} onChange={event => updateSlot(slot.id, { label: event.target.value })} placeholder="e.g. Dinner" className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="Start time" htmlFor={`${slot.id}-start-time`} required>
                            <Input id={`${slot.id}-start-time`} type="time" value={slot.startTime} onChange={event => updateSlot(slot.id, { startTime: event.target.value })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                          <FieldError label="End time" htmlFor={`${slot.id}-end-time`} required>
                            <Input id={`${slot.id}-end-time`} type="time" value={slot.endTime} onChange={event => updateSlot(slot.id, { endTime: event.target.value })} className="border-admin-md bg-admin-input" />
                          </FieldError>
                        </div>
                        <p className="mt-3 text-xs font-medium text-admin-50">Active days <RequiredMark /></p>
                        <div className="mt-2 grid grid-cols-7 gap-1">
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

function FieldError({ label, htmlFor, error, className, required, children }: { label: string; htmlFor?: string; error?: string; className?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className="text-xs text-admin-50">
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function RequiredMark() {
  return <span className="ml-1 text-neon-pink" aria-label="required">*</span>
}

function TableCategoryPhotoPicker({
  inputId,
  photo,
  onFile,
  onInputChange,
  onClear,
}: {
  inputId: string
  photo?: { file: File; preview: string }
  onFile: (file: File) => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-xs text-admin-50">Upload table category picture</Label>
      <div
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault()
          const file = event.dataTransfer.files?.[0]
          if (file) onFile(file)
        }}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-dashed p-4 transition-colors',
          photo ? 'border-neon-pink/40 bg-neon-pink/8' : 'border-admin-md bg-admin-input hover:border-neon-pink/45 hover:bg-admin-overlay',
        )}
      >
        {photo ? (
          <div className="flex items-center gap-4">
            <img src={photo.preview} alt="" className="h-20 w-20 rounded-xl object-cover shadow-[0_12px_32px_rgba(0,0,0,0.24)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{photo.file.name}</p>
              <p className="mt-1 text-xs text-admin-40">This image will represent the table category once table media is supported.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label htmlFor={inputId} className="inline-flex h-8 cursor-pointer items-center rounded-full bg-neon-pink px-3 text-xs font-semibold text-white transition hover:bg-neon-pink/90">
                  Change image
                </label>
                <button type="button" onClick={onClear} className="inline-flex h-8 items-center rounded-full border border-admin px-3 text-xs font-semibold text-admin-50 transition hover:border-red-500/35 hover:text-red-400">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center rounded-xl py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-pink/12 text-neon-pink ring-1 ring-neon-pink/20 transition group-hover:scale-105">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="mt-3 text-sm font-semibold text-foreground">Drag an image here or click to upload</span>
            <span className="mt-1 text-xs text-admin-40">JPG, PNG, or WebP for this table category.</span>
          </label>
        )}
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onInputChange}
        />
      </div>
    </div>
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
