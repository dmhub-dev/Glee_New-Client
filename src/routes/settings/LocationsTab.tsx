import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Location, useLocations, useUpdateLocation, useDeleteLocation } from '@glee/api'
import {
  Button, Input, Badge, Textarea,
  Switch,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
  Skeleton,
  useToast,
  cn,
} from '@glee/ui'
import {
  Pencil, Plus, Trash2, ParkingCircle, Wind, Building2, CalendarCheck,
  MapPin, Users, FileText, ImagePlus, X as XIcon, CheckCircle2,
  Clock3, Search, SlidersHorizontal, Eye, Utensils, AlertCircle,
} from 'lucide-react'
import { SlidePanel } from '../../components/ui/SlidePanel'
import { useAdminUser } from '../../app/providers'
import { RotatingMediaCover, normalizeMediaImages } from '../../components/media/MediaGallery'

const MAX_PHOTOS = 6
const PLACEHOLDER = '/glee-image-fallback.svg'
const VENUE_TYPES = [
  { label: 'Club', value: 'CLUB' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT' },
  { label: 'Other', value: 'OTHER' },
] as const

type VenueType = typeof VENUE_TYPES[number]['value']

const locationSchema = z.object({
  name:               z.string().min(1, 'Name is required'),
  address:            z.string().min(1, 'Address is required'),
  description:        z.string().optional(),
  capacity:           z.coerce.number().int().positive('Capacity must be a positive number'),
  isIndoors:          z.boolean(),
  isOutdoors:         z.boolean(),
  isParkingAvailable: z.boolean(),
  latitude:           z.coerce.number().optional(),
  longitude:          z.coerce.number().optional(),
  venueType:          z.enum(['CLUB', 'RESTAURANT', 'OTHER']),
  bookingEnabled:     z.boolean(),
})
type LocationFormValues = z.infer<typeof locationSchema>

function FeatureToggleCard({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 text-left',
        checked
          ? 'bg-neon-pink/10 border-neon-pink/40'
          : 'bg-admin-overlay border-admin hover:border-admin-30',
      ].join(' ')}
    >
      <div className={[
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        checked ? 'bg-neon-pink/20 text-neon-pink' : 'bg-admin-surface text-admin-30',
      ].join(' ')}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={['text-sm font-medium', checked ? 'text-foreground' : 'text-admin-50'].join(' ')}>{label}</p>
        <p className="text-xs text-admin-30 truncate">{description}</p>
      </div>
      <div className={[
        'w-4 h-4 rounded-full border-2 shrink-0',
        checked ? 'bg-neon-pink border-neon-pink' : 'border-admin',
      ].join(' ')} />
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-admin-30">{children}</p>
      <div className="flex-1 h-px bg-admin" />
    </div>
  )
}

function normalizeVenueType(value?: string | null): VenueType {
  if (value === 'CLUB') return 'CLUB'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'RESTAURANT'
  return 'OTHER'
}

function venueTypeLabel(value?: string | null) {
  return VENUE_TYPES.find(type => type.value === normalizeVenueType(value))?.label ?? 'Other'
}

type LocationFilter = 'ALL' | 'CLUBS' | 'RESTAURANTS' | 'NEEDS_APPROVAL' | 'RESERVATIONS_ON' | 'MISSING_MENU'

const LOCATION_FILTERS: Array<{ label: string; value: LocationFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Clubs', value: 'CLUBS' },
  { label: 'Restaurants', value: 'RESTAURANTS' },
  { label: 'Needs approval', value: 'NEEDS_APPROVAL' },
  { label: 'Reservations on', value: 'RESERVATIONS_ON' },
  { label: 'Missing menu', value: 'MISSING_MENU' },
]

function approvalBadgeClass(status?: Location['approvalStatus']) {
  if (status === 'APPROVED') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
  if (status === 'REJECTED') return 'border-red-500/25 bg-red-500/10 text-red-300'
  return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
}

function approvalLabel(status?: Location['approvalStatus']) {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return 'Pending approval'
}

function hasMenu(location: Location) {
  return Boolean(location.menuDocumentUrl)
}

function spaceLabel(location: Location) {
  if (location.isIndoors && location.isOutdoors) return 'Indoor + outdoor'
  if (location.isIndoors) return 'Indoor'
  if (location.isOutdoors) return 'Outdoor'
  return 'Space unset'
}

function locationSearchText(location: Location) {
  return [
    location.name,
    location.address,
    location.description,
    venueTypeLabel(location.venueType),
    approvalLabel(location.approvalStatus),
  ].join(' ').toLowerCase()
}

function locationMatchesFilter(location: Location, filter: LocationFilter) {
  const venueType = normalizeVenueType(location.venueType)
  switch (filter) {
    case 'CLUBS':
      return venueType === 'CLUB'
    case 'RESTAURANTS':
      return venueType === 'RESTAURANT'
    case 'NEEDS_APPROVAL':
      return location.approvalStatus !== 'APPROVED'
    case 'RESERVATIONS_ON':
      return Boolean(location.bookingEnabled)
    case 'MISSING_MENU':
      return !hasMenu(location)
    case 'ALL':
    default:
      return true
  }
}

function LocationMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ElementType
  label: string
  value: number
  hint: string
  tone?: 'default' | 'success' | 'warning' | 'pink'
}) {
  const toneClass = {
    default: 'border-admin bg-admin-surface text-admin-40',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    pink: 'border-neon-pink/25 bg-neon-pink/10 text-neon-pink',
  }[tone]

  return (
    <div className="rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-30">{label}</p>
          <p className="mt-2 font-heading text-2xl font-black text-foreground">{value.toLocaleString()}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-admin-40">{hint}</p>
    </div>
  )
}

function LocationCommandCard({
  location,
  canManageLocations,
  onEdit,
  onDelete,
}: {
  location: Location
  canManageLocations: boolean
  onEdit: (location: Location) => void
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const mediaImages = normalizeMediaImages(location.pictures, PLACEHOLDER)
  const reservationLabel = location.bookingEnabled ? 'Reservations on' : 'Reservations off'
  const menuLabel = hasMenu(location) ? 'Menu uploaded' : 'Menu missing'

  return (
    <article
      data-testid="location-command-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/dashboard/locations/${location.id}`)}
      onKeyDown={event => event.key === 'Enter' && navigate(`/dashboard/locations/${location.id}`)}
      className="group overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-pink/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
    >
      <div className="relative h-44 overflow-hidden bg-admin-overlay">
        <RotatingMediaCover images={mediaImages} alt={location.name} fallback={PLACEHOLDER} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge className="border-neon-pink/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-neon-pink backdrop-blur">
            {venueTypeLabel(location.venueType)}
          </Badge>
          <Badge className={cn('px-2.5 py-1 text-[10px] font-semibold backdrop-blur', approvalBadgeClass(location.approvalStatus))}>
            {approvalLabel(location.approvalStatus)}
          </Badge>
        </div>
        {canManageLocations && (
          <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onEdit(location) }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur transition hover:bg-neon-pink/80"
              title="Edit location"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  onClick={event => event.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur transition hover:bg-red-500/80"
                  title="Delete location"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-admin-dialog border border-admin-dialog shadow-2xl" onClick={event => event.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{location.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the location and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(location.id)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <div className="absolute inset-x-4 bottom-3 min-w-0">
          <h3 className="truncate font-heading text-lg font-black text-white">{location.name}</h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-white/70">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neon-pink" />
            <span className="truncate">{location.address}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-admin bg-admin-overlay px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-admin-30">Capacity</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{location.capacity.toLocaleString()} guests</p>
          </div>
          <div className="rounded-xl border border-admin bg-admin-overlay px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-admin-30">Space</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{spaceLabel(location)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold',
            location.bookingEnabled ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-admin bg-admin-overlay text-admin-50',
          )}>
            <CalendarCheck className="mr-1 h-3 w-3" />
            {reservationLabel}
          </Badge>
          <Badge className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold',
            hasMenu(location) ? 'border-sky-500/25 bg-sky-500/10 text-sky-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
          )}>
            <FileText className="mr-1 h-3 w-3" />
            {menuLabel}
          </Badge>
          {location.isParkingAvailable && (
            <Badge className="rounded-full border-admin bg-admin-overlay px-2.5 py-1 text-[10px] font-semibold text-admin-50">
              <ParkingCircle className="mr-1 h-3 w-3" />
              Parking
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={event => { event.stopPropagation(); navigate(`/dashboard/locations/${location.id}`) }}
            className="h-9 gap-1 rounded-full border border-admin bg-admin-overlay px-2 text-xs text-admin-70 hover:border-neon-pink/35 hover:bg-neon-pink/10 hover:text-neon-pink"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={event => { event.stopPropagation(); navigate(`/dashboard/locations/${location.id}`, { state: { tab: 'bookings' } }) }}
            className="h-9 gap-1 rounded-full border border-admin bg-admin-overlay px-2 text-xs text-admin-70 hover:border-neon-pink/35 hover:bg-neon-pink/10 hover:text-neon-pink"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Bookings
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={event => { event.stopPropagation(); navigate('/dashboard/menu-pricing') }}
            className="h-9 gap-1 rounded-full border border-admin bg-admin-overlay px-2 text-xs text-admin-70 hover:border-neon-pink/35 hover:bg-neon-pink/10 hover:text-neon-pink"
          >
            <Utensils className="h-3.5 w-3.5" />
            Menu
          </Button>
        </div>
      </div>
    </article>
  )
}

function LocationFormPanel({
  mode,
  initial,
  open,
  onClose,
  isPending,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  initial?: Location
  open: boolean
  onClose: () => void
  isPending: boolean
  onSubmit: (values: LocationFormValues, newPictures: File[], removedExisting: string[]) => Promise<void>
}) {
  const [existingPics, setExistingPics] = useState<string[]>(initial?.pictures ?? [])
  const [newPics,      setNewPics]      = useState<{ file: File; preview: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name:               initial?.name ?? '',
      address:            initial?.address ?? '',
      description:        initial?.description ?? '',
      capacity:           initial?.capacity ?? 1,
      isIndoors:          initial?.isIndoors ?? false,
      isOutdoors:         initial?.isOutdoors ?? false,
      isParkingAvailable: initial?.isParkingAvailable ?? false,
      latitude:           initial?.latitude ?? 0,
      longitude:          initial?.longitude ?? 0,
      venueType:          normalizeVenueType(initial?.venueType),
      bookingEnabled:     initial?.bookingEnabled ?? false,
    },
  })

  // Re-sync when initial changes (new editTarget selected)
  useEffect(() => {
    if (!initial) return
    form.reset({
      name:               initial.name,
      address:            initial.address,
      description:        initial.description ?? '',
      capacity:           initial.capacity,
      isIndoors:          initial.isIndoors,
      isOutdoors:         initial.isOutdoors,
      isParkingAvailable: initial.isParkingAvailable,
      latitude:           initial.latitude,
      longitude:          initial.longitude,
      venueType:          normalizeVenueType(initial.venueType),
      bookingEnabled:     initial.bookingEnabled ?? false,
    })
    setExistingPics(initial.pictures ?? [])
    setNewPics([])
  }, [form, initial])

  const totalPhotos = existingPics.length + newPics.length

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = MAX_PHOTOS - totalPhotos
    const toAdd = files.slice(0, remaining)
    setNewPics(prev => [
      ...prev,
      ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) })),
    ])
    e.target.value = ''
  }

  function removeExisting(url: string) {
    setExistingPics(prev => prev.filter(u => u !== url))
  }

  function removeNew(idx: number) {
    setNewPics(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleSubmit(values: LocationFormValues) {
    const removedExisting = (initial?.pictures ?? []).filter(u => !existingPics.includes(u))
    await onSubmit(values, newPics.map(n => n.file), removedExisting)
    form.reset()
    setNewPics([])
    setExistingPics([])
    onClose()
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add Location' : 'Edit Location'}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <SectionLabel>Basic Info</SectionLabel>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="location-name" className="text-xs text-admin-50">Venue Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input id="location-name" placeholder="e.g. The Vault Nairobi" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="location-address" className="text-xs text-admin-50">Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input id="location-address" placeholder="Search or enter full address" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <p className="text-[10px] text-admin-30 mt-1">Coordinates auto-filled via Google Maps when integrated.</p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="location-capacity" className="text-xs text-admin-50">Capacity</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input id="location-capacity" type="number" min={1} placeholder="Max guests" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SectionLabel>Description & Perks</SectionLabel>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="location-description" className="text-xs text-admin-50">About this venue</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Textarea
                      id="location-description"
                      placeholder="Describe the venue, ambiance, and exclusive perks guests should know about…"
                      className="bg-admin-input border-admin pl-9 text-sm resize-none min-h-[100px]"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SectionLabel>Venue Features</SectionLabel>

            <div className="space-y-2">
              <FormField control={form.control} name="isIndoors" render={({ field }) => (
                <FeatureToggleCard icon={Building2} label="Indoor" description="Air-conditioned interior space"
                  checked={field.value} onCheckedChange={field.onChange} />
              )} />
              <FormField control={form.control} name="isOutdoors" render={({ field }) => (
                <FeatureToggleCard icon={Wind} label="Outdoor" description="Open-air terrace or garden area"
                  checked={field.value} onCheckedChange={field.onChange} />
              )} />
              <FormField control={form.control} name="isParkingAvailable" render={({ field }) => (
                <FeatureToggleCard icon={ParkingCircle} label="Parking" description="Dedicated parking for guests"
                  checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <SectionLabel>Reservations</SectionLabel>

            <FormField control={form.control} name="venueType" render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="location-venue-type" className="text-xs text-admin-50">Venue Type</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <select
                      id="location-venue-type"
                      value={field.value}
                      onChange={event => field.onChange(event.target.value as VenueType)}
                      className="h-10 w-full rounded-md border border-admin bg-admin-input pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-neon-pink/50"
                    >
                      {VENUE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bookingEnabled" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className={[
                    'flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
                    field.value ? 'border-neon-pink/40 bg-neon-pink/10' : 'border-admin bg-admin-overlay',
                  ].join(' ')}>
                    <div className="flex items-center gap-3">
                      <div className={[
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        field.value ? 'bg-neon-pink/20 text-neon-pink' : 'bg-admin-surface text-admin-30',
                      ].join(' ')}>
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <FormLabel id="location-booking-enabled-label" htmlFor="location-booking-enabled" className="text-sm font-medium text-foreground">Accept reservations</FormLabel>
                        <p className="text-xs text-admin-30">Tables, slots, deposits</p>
                      </div>
                    </div>
                    <Switch
                      id="location-booking-enabled"
                      aria-labelledby="location-booking-enabled-label"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:!bg-neon-pink"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SectionLabel>Photos {totalPhotos > 0 && `(${totalPhotos}/${MAX_PHOTOS})`}</SectionLabel>

            {(existingPics.length > 0 || newPics.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {existingPics.map((src) => (
                  <div key={src} className="relative aspect-square rounded-lg overflow-hidden group border border-admin">
                    <img src={src} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                    <button
                      type="button"
                      onClick={() => removeExisting(src)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {newPics.map((n, i) => (
                  <div key={n.preview} className="relative aspect-square rounded-lg overflow-hidden group border border-neon-pink/30">
                    <img src={n.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalPhotos < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-admin hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-admin-overlay flex items-center justify-center">
                  <ImagePlus className="w-4 h-4 text-admin-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-admin-60">Add photos</p>
                  <p className="text-xs text-admin-30">JPEG, PNG or WebP · max {MAX_PHOTOS} photos</p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

          </div>

          <div className="px-6 py-4 border-t border-admin flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-admin-50">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-neon-pink hover:bg-neon-pink/90 text-white min-w-[110px]">
              {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>
    </SlidePanel>
  )
}

export default function LocationsTab() {
  const navigate    = useNavigate()
  const { toast }   = useToast()
  const user = useAdminUser()
  const canManageLocations = user.role !== 'vendor_staff' && user.role !== 'finance'
  const [editTarget, setEditTarget] = useState<Location | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<LocationFilter>('ALL')

  const { data: locations, isLoading } = useLocations()
  const updateMutation                 = useUpdateLocation()
  const deleteMutation                 = useDeleteLocation()
  const allLocations = useMemo(() => locations ?? [], [locations])

  const locationMetrics = useMemo(() => ({
    total: allLocations.length,
    approved: allLocations.filter(location => location.approvalStatus === 'APPROVED').length,
    pending: allLocations.filter(location => !location.approvalStatus || location.approvalStatus === 'PENDING').length,
    reservationsOn: allLocations.filter(location => location.bookingEnabled).length,
    missingMenu: allLocations.filter(location => !hasMenu(location)).length,
  }), [allLocations])

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return allLocations.filter(location => {
      const matchesSearch = !query || locationSearchText(location).includes(query)
      return matchesSearch && locationMatchesFilter(location, activeFilter)
    })
  }, [allLocations, activeFilter, search])

  async function handleUpdate(values: LocationFormValues, newPictures: File[]) {
    if (!editTarget) return
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, dto: values, pictures: newPictures })
      toast({ title: 'Location updated' })
      setEditTarget(null)
    } catch {
      toast({ title: 'Failed to update location', variant: 'destructive' })
      throw new Error('failed')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'Location deleted' })
    } catch {
      toast({ title: 'Failed to delete location', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neon-pink/25 bg-neon-pink/10 px-3 py-1 text-xs font-semibold text-neon-pink">
              <Building2 className="h-3.5 w-3.5" />
              Location Command Center
            </div>
            <h2 className="font-heading text-2xl font-black text-foreground">Manage venue locations</h2>
            <p className="mt-2 max-w-2xl text-sm text-admin-40">
              Track approval, reservation readiness, menus, and booking operations for each club or restaurant.
            </p>
          </div>
          {canManageLocations && (
            <Button
              onClick={() => navigate('/dashboard/locations/new')}
              className="h-10 w-full gap-2 rounded-full bg-neon-pink px-5 text-white hover:bg-neon-pink/90 sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New location
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <LocationMetricCard icon={Building2} label="Total locations" value={locationMetrics.total} hint="All vendor and admin venues" />
        <LocationMetricCard icon={CheckCircle2} label="Approved" value={locationMetrics.approved} hint="Visible for bookings" tone="success" />
        <LocationMetricCard icon={Clock3} label="Pending approval" value={locationMetrics.pending} hint="Need admin review" tone="warning" />
        <LocationMetricCard icon={CalendarCheck} label="Reservations on" value={locationMetrics.reservationsOn} hint="Accepting table bookings" tone="pink" />
        <LocationMetricCard icon={FileText} label="Missing menu" value={locationMetrics.missingMenu} hint="Needs PDF or image menu" tone="warning" />
      </div>

      <div className="rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search locations, addresses, approval status"
              className="h-10 rounded-full border-admin bg-admin-input pl-10 text-sm"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-admin bg-admin-overlay px-3 py-2 text-xs font-semibold text-admin-40">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </div>
            {LOCATION_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition',
                  activeFilter === filter.value
                    ? 'border-neon-pink bg-neon-pink text-white'
                    : 'border-admin bg-admin-overlay text-admin-50 hover:border-neon-pink/30 hover:text-neon-pink',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[390px] rounded-2xl" />
          ))}
        </div>
      ) : allLocations.length === 0 ? (
        <div className="rounded-2xl border border-admin bg-admin-surface px-6 py-20 text-center shadow-admin">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-pink/10">
            <MapPin className="h-6 w-6 text-neon-pink/60" />
          </div>
          <h3 className="font-heading text-lg font-black text-foreground">No locations yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-admin-40">
            Add the first club or restaurant so the venue can be approved, receive bookings, and attach a menu.
          </p>
          {canManageLocations && (
            <Button
              onClick={() => navigate('/dashboard/locations/new')}
              className="mt-5 gap-2 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90"
            >
              <Plus className="h-4 w-4" />
              New location
            </Button>
          )}
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="rounded-2xl border border-admin bg-admin-surface px-6 py-16 text-center shadow-admin">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertCircle className="h-6 w-6 text-amber-300" />
          </div>
          <h3 className="font-heading text-lg font-black text-foreground">No matching locations</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-admin-40">
            Adjust the search or switch filters to see more venues.
          </p>
          <Button
            type="button"
            onClick={() => { setSearch(''); setActiveFilter('ALL') }}
            className="mt-5 rounded-full border border-admin bg-admin-overlay text-admin-70 hover:border-neon-pink/30 hover:text-neon-pink"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredLocations.map(location => (
            <LocationCommandCard
              key={location.id}
              location={location}
              canManageLocations={canManageLocations}
              onEdit={setEditTarget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {canManageLocations && editTarget && (
        <LocationFormPanel
          key={editTarget.id}
          mode="edit"
          initial={editTarget}
          open={true}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
