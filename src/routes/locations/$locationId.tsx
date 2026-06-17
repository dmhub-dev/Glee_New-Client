import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button, Badge, Skeleton, Textarea, Input,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
  Switch,
  useToast,
} from '@glee/ui'
import {
  useApproveLocation,
  useDeleteLocation,
  useLocation,
  useRejectLocation,
  useUpdateLocation,
  useUploadLocationMenuDocument,
  type Location,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import ReservationSetupPanel from './ReservationSetupPanel'
import BookingAttendantsPanel from './BookingAttendantsPanel'
import { useAdminUser } from '../../app/providers'
import {
  ArrowLeft, Pencil, Trash2, MapPin, Users, Building2, Wind, ParkingCircle,
  CalendarCheck, FileText, Image, ImagePlus, Save, ShieldCheck, ShieldX, X as XIcon,
} from 'lucide-react'

const MAX_PHOTOS = 6
const PLACEHOLDER = '/glee-image-fallback.svg'
type CanonicalVenueType = 'CLUB' | 'RESTAURANT' | 'OTHER'

const SPACE_TYPES = [
  { label: 'Indoor', value: 'indoor', hint: 'Interior rooms, dining halls, private areas, or hotel spaces.', icon: Building2 },
  { label: 'Outdoor', value: 'outdoor', hint: 'Rooftops, gardens, terraces, pool decks, patios, or open-air venues.', icon: Wind },
] as const

const VENUE_TYPES: Array<{ label: string; value: CanonicalVenueType; hint: string }> = [
  { label: 'Club', value: 'CLUB', hint: 'VIP booths, bottle service, sections, and late-night table slots.' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT', hint: 'Dining tables, hotel restaurants, terraces, and service windows.' },
  { label: 'Other', value: 'OTHER', hint: 'Event spaces, halls, rooftops, studios, and special-purpose venues.' },
]

const locationSchema = z.object({
  name:               z.string().min(1, 'Name is required'),
  address:            z.string().min(1, 'Address is required'),
  description:        z.string().optional(),
  capacity:           z.coerce.number().int().positive(),
  isIndoors:          z.boolean(),
  isOutdoors:         z.boolean(),
  isParkingAvailable: z.boolean(),
  latitude:           z.coerce.number().optional(),
  longitude:          z.coerce.number().optional(),
  venueType:          z.enum(['CLUB', 'RESTAURANT', 'OTHER']),
  bookingEnabled:     z.boolean(),
})
type LocationFormValues = z.infer<typeof locationSchema>

function normalizeVenueType(value?: Location['venueType'] | null): CanonicalVenueType {
  if (value === 'CLUB') return 'CLUB'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'RESTAURANT'
  return 'OTHER'
}

function venueTypeLabel(value?: Location['venueType'] | CanonicalVenueType | null) {
  return VENUE_TYPES.find(type => type.value === normalizeVenueType(value))?.label ?? 'Other'
}

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

function EditLocationPage({
  location,
  onClose,
}: {
  location: Location
  onClose: () => void
}) {
  const { toast }       = useToast()
  const updateMutation  = useUpdateLocation()
  const existingPics = location.pictures ?? []
  const [newPics, setNewPics] = useState<{ file: File; preview: string }[]>([])

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name:               location.name,
      address:            location.address,
      description:        location.description ?? '',
      capacity:           location.capacity,
      isIndoors:          location.isIndoors,
      isOutdoors:         location.isOutdoors,
      isParkingAvailable: location.isParkingAvailable,
      latitude:           location.latitude,
      longitude:          location.longitude,
      venueType:          normalizeVenueType(location.venueType),
      bookingEnabled:     location.bookingEnabled ?? false,
    },
  })

  const values = form.watch()
  const totalPhotos = existingPics.length + newPics.length
  const previewImage = newPics[0]?.preview ?? existingPics[0] ?? null
  const selectedSpace = values.isIndoors ? 'indoor' : values.isOutdoors ? 'outdoor' : undefined

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const toAdd = files.slice(0, MAX_PHOTOS - totalPhotos)
    setNewPics(prev => [...prev, ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
    e.target.value = ''
  }

  async function handleSubmit(values: LocationFormValues) {
    try {
      await updateMutation.mutateAsync({ id: location.id, dto: values, pictures: newPics.map(n => n.file) })
      toast({ title: 'Location updated' })
      onClose()
    } catch {
      toast({ title: 'Failed to update location', variant: 'destructive' })
    }
  }

  return (
    <AdminLayout title="Edit Location" subtitle={location.name}>
      <div className="flex gap-8">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-admin-md bg-admin-input px-4 py-2 text-sm text-admin-50 transition-colors hover:bg-admin-overlay hover:text-admin-80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel editing
            </button>
            <button
              type="button"
              aria-label="Close edit form"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-admin-md bg-admin-input text-admin-40 transition-colors hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-400"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Basic Info</h2>
                  <p className="mt-1 text-xs text-admin-40">Core information shown on event pages and reservation screens.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-admin-50">Venue Name</FormLabel>
                      <FormControl>
                        <Input className="border-admin-md bg-admin-input text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-admin-50">Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} className="border-admin-md bg-admin-input text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs text-admin-50">Address</FormLabel>
                      <FormControl>
                        <Input className="border-admin-md bg-admin-input text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs text-admin-50">About this venue</FormLabel>
                      <FormControl>
                        <Textarea rows={4} className="resize-none border-admin-md bg-admin-input text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-admin bg-admin-surface p-5">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Venue Profile</h2>
                  <p className="mt-1 text-xs text-admin-40">Match the create-location flow: space type, venue category, parking, and reservations.</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-30">1. Choose the space type</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {SPACE_TYPES.map(type => {
                      const selected = selectedSpace === type.value
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            form.setValue('isIndoors', type.value === 'indoor', { shouldDirty: true })
                            form.setValue('isOutdoors', type.value === 'outdoor', { shouldDirty: true })
                          }}
                          className={[
                            'rounded-xl border p-4 text-left transition-colors',
                            selected ? 'border-neon-pink/50 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </span>
                          <span className="mt-1 block text-xs opacity-75">{type.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-30">2. Choose the venue category</p>
                  <FormField control={form.control} name="venueType" render={({ field }) => (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {VENUE_TYPES.map(type => {
                        const selected = field.value === type.value
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={[
                              'rounded-xl border p-4 text-left transition-colors',
                              selected ? 'border-neon-pink/50 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                            ].join(' ')}
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <Building2 className="h-4 w-4" />
                              {type.label}
                            </span>
                            <span className="mt-1 block text-xs opacity-75">{type.hint}</span>
                          </button>
                        )
                      })}
                    </div>
                  )} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField control={form.control} name="isParkingAvailable" render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={[
                        'flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors',
                        field.value ? 'border-neon-pink/45 bg-neon-pink/10 text-foreground' : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80',
                      ].join(' ')}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ParkingCircle className="h-5 w-5 shrink-0 text-neon-pink" />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">Secure, ample parking</span>
                          <span className="mt-1 block text-xs text-admin-40">Show this to guests before booking.</span>
                        </span>
                      </span>
                    </button>
                  )} />
                  <FormField control={form.control} name="bookingEnabled" render={({ field }) => (
                    <div className={[
                      'flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors',
                      field.value ? 'border-neon-pink/45 bg-neon-pink/10' : 'border-admin bg-admin-overlay',
                    ].join(' ')}>
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-pink/12 text-neon-pink">
                          <CalendarCheck className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-foreground">Accept reservations</span>
                          <span className="mt-1 block text-xs text-admin-40">Tables, slots, and deposits.</span>
                        </span>
                      </span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:!bg-neon-pink" />
                    </div>
                  )} />
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Photos</h2>
                    <p className="mt-1 text-xs text-admin-40">Existing photos stay attached. Add up to {MAX_PHOTOS - existingPics.length} more images.</p>
                  </div>
                  <span className="rounded-full border border-admin bg-admin-overlay px-3 py-1 text-xs text-admin-40">{totalPhotos}/{MAX_PHOTOS}</span>
                </div>

                {(existingPics.length > 0 || newPics.length > 0) && (
                  <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                    {existingPics.map(src => (
                      <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-admin bg-admin-overlay">
                        <img src={src} alt="" className="h-full w-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                      </div>
                    ))}
                    {newPics.map((n, i) => (
                      <div key={n.preview} className="group relative aspect-square overflow-hidden rounded-xl border border-neon-pink/30">
                        <img src={n.preview} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setNewPics(p => p.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                          <XIcon className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {totalPhotos < MAX_PHOTOS && (
                  <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-admin py-8 transition-all hover:border-neon-pink/50 hover:bg-neon-pink/5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-overlay">
                      <ImagePlus className="h-4 w-4 text-admin-40" />
                    </span>
                    <span className="text-sm font-medium text-admin-60">Add photos</span>
                    <span className="text-xs text-admin-30">JPEG, PNG or WebP</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </section>

              <div className="sticky bottom-0 flex items-center justify-between border-t border-admin bg-admin-body py-4">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-full border-admin px-5 text-admin-60 hover:bg-admin-input">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="gap-2 rounded-full bg-neon-pink px-6 font-semibold text-white hover:bg-neon-pink/90">
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-20 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-admin-30">Edit Preview</p>
            <div className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
              <div className="relative h-36 bg-admin-overlay">
                {previewImage ? (
                  <img src={previewImage} alt="" className="h-full w-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
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
                  <PreviewStat label="Capacity" value={Number(values.capacity || 0).toLocaleString()} />
                  <PreviewStat label="Reservations" value={values.bookingEnabled ? 'On' : 'Off'} />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <p className="text-[10px] uppercase tracking-wide text-admin-30">{label}</p>
      <p className="mt-1 font-heading text-sm font-black text-foreground">{value}</p>
    </div>
  )
}

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate       = useNavigate()
  const { toast }      = useToast()
  const user = useAdminUser()
  const isAdmin = ['super_admin', 'admin', 'operations_manager'].includes(user.role)
  const isVendorOwner = user.role === 'vendor'
  const isVendorStaff = user.role === 'vendor_staff'
  const [editOpen, setEditOpen]     = useState(false)
  const [heroIdx, setHeroIdx]       = useState(0)
  const [rejectReason, setRejectReason] = useState('')

  const { data: loc, isLoading }    = useLocation(locationId!)
  const deleteMutation              = useDeleteLocation()
  const uploadMenuDocument = useUploadLocationMenuDocument({ vendorScoped: isVendorOwner || isVendorStaff })
  const approveMutation = useApproveLocation()
  const rejectMutation = useRejectLocation()

  if (isLoading) {
    return (
      <AdminLayout title="Location" subtitle="">
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AdminLayout>
    )
  }

  if (!loc) {
    return (
      <AdminLayout title="Location not found" subtitle="">
        <div className="text-center py-20">
          <p className="text-admin-40 text-sm mb-4">This location doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/dashboard/locations')} variant="ghost">← Back to Locations</Button>
        </div>
      </AdminLayout>
    )
  }

  const pictures = loc.pictures ?? []
  const hero = pictures[heroIdx] ?? null
  const canEditLocation = isAdmin || (isVendorOwner && loc.vendorId === user.id)
  const canDeleteLocation = isAdmin
  const canModerateLocation = ['super_admin', 'admin'].includes(user.role)
  const canManageHostesses = (
    ['super_admin', 'admin'].includes(user.role) ||
    (isVendorOwner && loc.vendorId === user.id)
  ) && Boolean(loc.bookingEnabled)

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(loc!.id)
      toast({ title: 'Location deleted' })
      navigate('/dashboard/locations')
    } catch {
      toast({ title: 'Failed to delete location', variant: 'destructive' })
    }
  }

  async function handleMenuDocumentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await uploadMenuDocument.mutateAsync({ id: loc!.id, file })
      toast({ title: 'Menu document uploaded', description: loc!.vendorId ? 'Location has been sent back for approval.' : undefined })
    } catch (error) {
      toast({ title: 'Could not upload menu', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function approve() {
    try {
      await approveMutation.mutateAsync(loc!.id)
      toast({ title: 'Location approved' })
    } catch (error) {
      toast({ title: 'Could not approve location', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function reject() {
    if (!rejectReason.trim()) {
      toast({ title: 'Rejection reason required', variant: 'destructive' })
      return
    }
    try {
      await rejectMutation.mutateAsync({ id: loc!.id, reason: rejectReason.trim() })
      setRejectReason('')
      toast({ title: 'Location rejected' })
    } catch (error) {
      toast({ title: 'Could not reject location', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (editOpen) {
    return <EditLocationPage location={loc} onClose={() => setEditOpen(false)} />
  }

  return (
    <AdminLayout title={loc.name} subtitle={loc.address}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/dashboard/locations')}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-admin-md bg-admin-input px-4 py-2 text-sm font-medium text-admin-50 transition-colors hover:bg-admin-overlay hover:text-admin-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Locations
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {canEditLocation && (
              <Button
                onClick={() => setEditOpen(true)}
                aria-label="Open edit form"
                className="gap-2 rounded-full bg-neon-pink px-5 text-white hover:bg-neon-pink/90"
              >
                <Pencil className="h-4 w-4" />
                Edit Location
              </Button>
            )}
            {canDeleteLocation && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-full border-red-500/25 px-5 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-admin-dialog border border-admin-dialog shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{loc.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the location and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <div className="space-y-4">
            <div className="relative h-[360px] overflow-hidden rounded-2xl border border-admin bg-admin-overlay shadow-admin lg:h-[520px]">
              {hero ? (
                <img
                  src={hero}
                  alt={loc.name}
                  className="h-full w-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-neon-pink/5 to-admin-overlay">
                  <Image className="h-10 w-10 text-admin-20" />
                  <p className="text-xs text-admin-30">No photos yet</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <Badge className="mb-3 border-neon-pink/25 bg-neon-pink/15 text-neon-pink">{venueTypeLabel(loc.venueType)}</Badge>
                <h1 className="font-heading text-2xl font-black text-white md:text-4xl">{loc.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                  <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                  {loc.address}
                </p>
              </div>
            </div>

            {pictures.length > 1 && (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
                {pictures.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setHeroIdx(i)}
                    className={[
                      'aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all',
                      heroIdx === i ? 'border-neon-pink' : 'border-transparent hover:border-admin-md',
                    ].join(' ')}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-200 hover:scale-105" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Venue overview</p>
              <h2 className="mt-3 font-heading text-2xl font-black text-foreground">{loc.name}</h2>
              <p className="mt-3 flex items-start gap-2 text-sm text-admin-40">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                {loc.address}
              </p>
              {loc.description ? (
                <p className="mt-5 text-sm leading-6 text-admin-60">{loc.description}</p>
              ) : (
                <p className="mt-5 rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No description added yet.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailMetric icon={Users} label="Max capacity" value={loc.capacity.toLocaleString()} />
              <DetailMetric icon={CalendarCheck} label="Reservations" value={loc.bookingEnabled ? 'Enabled' : 'Off'} />
              <DetailMetric icon={loc.isOutdoors && !loc.isIndoors ? Wind : Building2} label="Space" value={loc.isIndoors && loc.isOutdoors ? 'Indoor + Outdoor' : loc.isIndoors ? 'Indoor' : loc.isOutdoors ? 'Outdoor' : 'Not set'} />
              <DetailMetric icon={ParkingCircle} label="Parking" value={loc.isParkingAvailable ? 'Available' : 'Not set'} />
            </div>

            <div className="rounded-2xl border border-admin bg-admin-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Venue features</p>
              <div className="mt-4 flex flex-wrap gap-2">
              {loc.isIndoors && (
                <Badge className="text-xs border bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1.5 px-2.5 py-1">
                  <Building2 className="w-3 h-3" /> Indoor
                </Badge>
              )}
              {loc.isOutdoors && (
                <Badge className="text-xs border bg-green-500/10 text-green-400 border-green-500/30 gap-1.5 px-2.5 py-1">
                  <Wind className="w-3 h-3" /> Outdoor
                </Badge>
              )}
              {loc.isParkingAvailable && (
                <Badge className="text-xs border bg-admin-overlay text-admin-50 border-admin gap-1.5 px-2.5 py-1">
                  <ParkingCircle className="w-3 h-3" /> Parking
                </Badge>
              )}
                {!loc.isIndoors && !loc.isOutdoors && !loc.isParkingAvailable && (
                  <span className="text-sm text-admin-40">No features selected yet.</span>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Approval</p>
                <h2 className="mt-2 font-heading text-xl font-black text-foreground">Location review status</h2>
                <p className="mt-2 text-sm leading-6 text-admin-50">
                  Vendor locations become public and usable for event setup only after approval.
                </p>
              </div>
              <Badge className={approvalBadgeClass(loc.approvalStatus)}>{approvalLabel(loc.approvalStatus)}</Badge>
            </div>
            {loc.rejectionReason && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{loc.rejectionReason}</p>
            )}
            {canModerateLocation && loc.vendorId && (
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Input value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Reason if rejecting" className="border-admin bg-admin-input" />
                <Button onClick={approve} disabled={approveMutation.isPending} className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                  Approve
                </Button>
                <Button onClick={reject} disabled={rejectMutation.isPending} variant="outline" className="gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10">
                  <ShieldX className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
                  <FileText className="h-5 w-5 text-neon-pink" />
                  Full menu
                </h2>
                <p className="mt-1 text-sm text-admin-40">PDF or image shown on the public booking page.</p>
              </div>
              {canEditLocation && (
                <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-admin bg-admin-input px-4 text-sm font-semibold text-admin-60 hover:border-neon-pink/40 hover:text-neon-pink">
                  Upload
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleMenuDocumentChange} />
                </label>
              )}
            </div>
            {loc.menuDocumentUrl ? (
              <a href={loc.menuDocumentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex max-w-full break-all text-sm font-semibold text-neon-pink hover:underline">
                {loc.menuDocumentName ?? 'Open menu document'}
              </a>
            ) : (
              <p className="mt-4 rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No menu document uploaded yet.</p>
            )}
          </div>
        </section>

        <ReservationSetupPanel location={loc} />
        {canManageHostesses && <BookingAttendantsPanel location={loc} />}
      </div>
    </AdminLayout>
  )
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wide text-admin-30">{label}</p>
      <p className="mt-1 truncate font-heading text-lg font-black text-foreground">{value}</p>
    </div>
  )
}
