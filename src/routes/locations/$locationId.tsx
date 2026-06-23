import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation as useRouterLocation } from 'react-router-dom'
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
  canOpenBookingChat,
  useApproveLocation,
  useAdminReservations,
  useBookingChatThreads,
  useDeleteLocation,
  useLocation,
  useRejectLocation,
  useUpdateLocation,
  useUploadLocationMenuDocument,
  type BookingChatThread,
  type Location,
  type Reservation,
  type ReservationStatus,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import FinancialStatementPanel from '../financials/components/FinancialStatementPanel'
import ReservationSetupPanel from './ReservationSetupPanel'
import BookingAttendantsPanel from './BookingAttendantsPanel'
import { useAdminUser } from '../../app/providers'
import { BookingChatPanel } from '../../components/chat/BookingChatPanel'
import { normalizedReservationPreOrderMenu } from '../../components/reservations/reservationMenuUtils'
import { AutoMediaHero, normalizeMediaImages } from '../../components/media/MediaGallery'
import {
  ArrowLeft, Pencil, Trash2, MapPin, Users, Building2, Wind, ParkingCircle,
  CalendarCheck, FileText, ImagePlus, Save, ShieldCheck, ShieldX, X as XIcon,
  ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Search, Table2,
} from 'lucide-react'
import { cn } from '@glee/ui'

const MAX_PHOTOS = 6
const PLACEHOLDER = '/glee-image-fallback.svg'
type CanonicalVenueType = 'CLUB' | 'RESTAURANT' | 'OTHER'
type LocationDetailTab = 'overview' | 'bookings' | 'setup' | 'hostesses' | 'chats' | 'statements' | 'settings'
type BookingStatusFilter = 'ALL' | ReservationStatus
type BookingSortKey = 'customer' | 'email' | 'phone' | 'guests' | 'table' | 'status' | 'paymentMethod' | 'paymentStatus' | 'deposit' | 'minimumSpend' | 'preOrder' | 'startDateTime'
type SortDirection = 'asc' | 'desc'

const LOCATION_DETAIL_TABS: Array<{ label: string; value: LocationDetailTab }> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Bookings', value: 'bookings' },
  { label: 'Tables & Slots', value: 'setup' },
  { label: 'Hostesses', value: 'hostesses' },
  { label: 'Booking Chats', value: 'chats' },
  { label: 'Statements', value: 'statements' },
  { label: 'Settings', value: 'settings' },
]

function isLocationDetailTab(value: unknown): value is LocationDetailTab {
  return typeof value === 'string' && LOCATION_DETAIL_TABS.some(tab => tab.value === value)
}

const BOOKING_STATUS_FILTERS: Array<{ label: string; value: BookingStatusFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING_PAYMENT' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Seated', value: 'SEATED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'No-show', value: 'NO_SHOW' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

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

function money(value: string | number | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function statusLabel(status: ReservationStatus | string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function statusTone(status: ReservationStatus | string) {
  switch (status) {
    case 'CONFIRMED': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    case 'SEATED': return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
    case 'COMPLETED': return 'border-admin bg-admin-overlay text-admin-60'
    case 'NO_SHOW': return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    case 'CANCELLED': return 'border-red-500/25 bg-red-500/10 text-red-300'
    case 'PENDING_PAYMENT': return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    default: return 'border-admin bg-admin-overlay text-admin-60'
  }
}

function paymentStatusLabel(reservation: Reservation) {
  return reservation.paymentStatus ?? reservation.payment?.status ?? reservation.payments?.[0]?.status ?? 'PENDING'
}

function paymentStatusTone(status: string) {
  switch (status) {
    case 'SUCCESS': return 'border-green-500/30 bg-green-500/10 text-green-400'
    case 'FAILED': return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'REFUNDED': return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    default: return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
  }
}

function customerName(reservation: Reservation) {
  return reservation.user?.name || reservation.guestName || reservation.user?.email || reservation.guestEmail || 'Guest'
}

function customerContact(reservation: Reservation) {
  return reservation.user?.email ?? reservation.guestEmail ?? reservation.user?.phone ?? reservation.guestPhone ?? 'No contact'
}

function customerEmail(reservation: Reservation) {
  return reservation.user?.email ?? reservation.guestEmail ?? '-'
}

function customerPhone(reservation: Reservation) {
  return reservation.user?.phone ?? reservation.guestPhone ?? '-'
}

function paymentMethodLabel(reservation: Reservation) {
  return reservation.paymentMethod ?? reservation.payment?.method ?? reservation.payments?.[0]?.method ?? 'UNKNOWN'
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

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function bookingDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

function bookingSearchText(reservation: Reservation) {
  return [
    reservation.reference,
    reservation.table?.name,
    reservation.tableCategory,
    customerName(reservation),
    customerEmail(reservation),
    customerPhone(reservation),
  ].join(' ').toLowerCase()
}

function bookingChatUnread(reservation: Reservation, chatThreads: BookingChatThread[]) {
  return chatThreads.find(thread => thread.reservationId === reservation.id)?.unreadForStaff ?? 0
}

function bookingPreOrderTotal(reservation: Reservation) {
  return normalizedReservationPreOrderMenu(reservation.preOrderMenu).reduce((sum, item) => sum + item.lineTotal, 0)
}

function bookingSortValue(reservation: Reservation, key: BookingSortKey) {
  switch (key) {
    case 'customer':
      return customerName(reservation).toLowerCase()
    case 'email':
      return customerEmail(reservation).toLowerCase()
    case 'phone':
      return customerPhone(reservation).toLowerCase()
    case 'guests':
      return reservation.guestCount
    case 'table':
      return `${reservation.table?.name ?? ''} ${reservation.tableCategory}`.toLowerCase()
    case 'status':
      return reservation.status.toLowerCase()
    case 'paymentMethod':
      return paymentMethodLabel(reservation).toLowerCase()
    case 'paymentStatus':
      return paymentStatusLabel(reservation).toLowerCase()
    case 'deposit':
      return Number(reservation.depositAmount ?? 0)
    case 'minimumSpend':
      return Number(reservation.minimumSpend ?? 0)
    case 'preOrder':
      return bookingPreOrderTotal(reservation)
    case 'startDateTime':
      return new Date(reservation.startDateTime).getTime()
    default:
      return ''
  }
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
  const routerLocation = useRouterLocation()
  const { toast }      = useToast()
  const user = useAdminUser()
  const isAdmin = ['super_admin', 'admin', 'operations_manager'].includes(user.role)
  const isFinance = user.role === 'finance'
  const isVendorOwner = user.role === 'vendor'
  const isVendorStaff = user.role === 'vendor_staff'
  const routeState = routerLocation.state as { tab?: unknown } | null
  const requestedTab = isLocationDetailTab(routeState?.tab) ? routeState.tab : null
  const [editOpen, setEditOpen]     = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState<LocationDetailTab>(() => requestedTab ?? 'overview')

  const { data: loc, isLoading }    = useLocation(locationId!)
  const deleteMutation              = useDeleteLocation()
  const uploadMenuDocument = useUploadLocationMenuDocument({ vendorScoped: isVendorOwner || isVendorStaff })
  const approveMutation = useApproveLocation()
  const rejectMutation = useRejectLocation()

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab)
  }, [requestedTab])

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
  const canEditLocation = isAdmin || (isVendorOwner && loc.vendorId === user.id)
  const canDeleteLocation = isAdmin
  const canModerateLocation = ['super_admin', 'admin'].includes(user.role)
  const canViewAdminFinancialStatements = isAdmin || isFinance
  const canManageHostesses = (
    ['super_admin', 'admin'].includes(user.role) ||
    (isVendorOwner && loc.vendorId === user.id)
  ) && Boolean(loc.bookingEnabled)
  const canViewHostesses = Boolean(loc.bookingEnabled)

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/dashboard/locations')}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 py-1.5 text-sm font-medium text-admin-40 transition-colors hover:text-admin-70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Locations
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={approvalBadgeClass(loc.approvalStatus)}>{approvalLabel(loc.approvalStatus)}</Badge>
            {canEditLocation && (
              <Button
                onClick={() => setEditOpen(true)}
                aria-label="Open edit form"
                className="gap-2 rounded-full bg-admin-overlay border border-admin px-4 text-admin-70 hover:bg-neon-pink/10 hover:border-neon-pink/30 hover:text-neon-pink"
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

        <div className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{venueTypeLabel(loc.venueType)}</Badge>
                <Badge className={loc.bookingEnabled ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-admin bg-admin-overlay text-admin-50'}>
                  {loc.bookingEnabled ? 'Reservations on' : 'Reservations off'}
                </Badge>
              </div>
              <h2 className="mt-3 truncate font-heading text-2xl font-black text-foreground">{loc.name}</h2>
              <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-admin-40">
                <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                <span className="truncate">{loc.address}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[520px]">
              <InlineStat label="Capacity" value={loc.capacity.toLocaleString()} />
              <InlineStat label="Space" value={loc.isIndoors && loc.isOutdoors ? 'Mixed' : loc.isIndoors ? 'Indoor' : loc.isOutdoors ? 'Outdoor' : 'Unset'} />
              <InlineStat label="Parking" value={loc.isParkingAvailable ? 'Yes' : 'No'} />
              <InlineStat label="Menu" value={loc.menuDocumentUrl ? 'Uploaded' : 'Missing'} />
            </div>
          </div>
        </div>

        <LocationDetailTabs activeTab={activeTab} onSelect={setActiveTab} />

        {activeTab === 'overview' && (
          <LocationOverviewTab
            location={loc}
            pictures={pictures}
          />
        )}

        {activeTab === 'bookings' && <LocationBookingsPanel location={loc} />}

        {activeTab === 'setup' && (
          loc.bookingEnabled ? <ReservationSetupPanel location={loc} /> : (
            <EmptyPanel
              icon={Table2}
              title="Reservations are off"
              description="Enable reservations in Settings before configuring table inventory and slots."
            />
          )
        )}

        {activeTab === 'hostesses' && (
          canViewHostesses ? (
            canManageHostesses ? <BookingAttendantsPanel location={loc} /> : (
              <EmptyPanel
                icon={ShieldCheck}
                title="Hostess management is restricted"
                description="Only admins and the owning vendor can invite or revoke booking hostesses for this location."
              />
            )
          ) : (
            <EmptyPanel icon={Users} title="Hostesses are not available" description="Turn on reservations before inviting location check-in hostesses." />
          )
        )}

        {activeTab === 'chats' && <LocationBookingChatsPanel location={loc} viewerName={user.name ?? 'Venue team'} />}

        {activeTab === 'statements' && (
          <FinancialStatementPanel
            targetType="LOCATION"
            targetId={loc.id}
            scope={canViewAdminFinancialStatements ? 'admin' : 'vendor'}
            canGenerate={canViewAdminFinancialStatements || (isVendorOwner && loc.vendorId === user.id)}
            title="Location Financial Statement"
          />
        )}

        {activeTab === 'settings' && (
          <LocationSettingsTab
            location={loc}
            rejectReason={rejectReason}
            onRejectReasonChange={setRejectReason}
            canModerateLocation={canModerateLocation}
            canEditLocation={canEditLocation}
            approvePending={approveMutation.isPending}
            rejectPending={rejectMutation.isPending}
            onApprove={approve}
            onReject={reject}
            onMenuDocumentChange={handleMenuDocumentChange}
          />
        )}
      </div>
    </AdminLayout>
  )
}

function LocationDetailTabs({
  activeTab,
  onSelect,
}: {
  activeTab: LocationDetailTab
  onSelect: (tab: LocationDetailTab) => void
}) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex w-max min-w-full justify-start">
        <div className="flex shrink-0 rounded-full border border-admin bg-admin-surface p-1">
          {LOCATION_DETAIL_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelect(tab.value)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition',
                activeTab === tab.value ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-neon-pink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LocationOverviewTab({
  location,
  pictures,
}: {
  location: Location
  pictures: string[]
}) {
  const locationImages = normalizeMediaImages(pictures, PLACEHOLDER)

  return (
    <section className="space-y-5">
      <TabPageHeader
        eyebrow="Location profile"
        title="Venue snapshot"
        description="Public-facing venue content and the operational basics staff need before managing bookings."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
      <div className="space-y-5">
        <AutoMediaHero
          images={locationImages}
          alt={location.name}
          fallback={PLACEHOLDER}
          className="h-[320px] rounded-2xl border border-admin shadow-admin lg:h-[460px]"
          overlayClassName="bg-gradient-to-t from-black/75 to-transparent"
        >
          <div className="absolute bottom-5 left-5 right-5">
            <Badge className="mb-3 border-neon-pink/25 bg-neon-pink/15 text-neon-pink">{venueTypeLabel(location.venueType)}</Badge>
            <h1 className="font-heading text-2xl font-black text-white md:text-4xl">{location.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
              <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
              {location.address}
            </p>
          </div>
        </AutoMediaHero>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <h2 className="font-heading text-base font-black text-foreground">About Location</h2>
          {location.description ? (
            <p className="mt-3 text-sm leading-6 text-admin-60">{location.description}</p>
          ) : (
            <p className="mt-3 rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No description added yet.</p>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <DetailMetric icon={Users} label="Max capacity" value={location.capacity.toLocaleString()} />
          <DetailMetric icon={CalendarCheck} label="Reservations" value={location.bookingEnabled ? 'Enabled' : 'Off'} />
          <DetailMetric icon={location.isOutdoors && !location.isIndoors ? Wind : Building2} label="Space" value={location.isIndoors && location.isOutdoors ? 'Indoor + Outdoor' : location.isIndoors ? 'Indoor' : location.isOutdoors ? 'Outdoor' : 'Not set'} />
          <DetailMetric icon={ParkingCircle} label="Parking" value={location.isParkingAvailable ? 'Available' : 'Not set'} />
        </div>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Venue features</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {location.isIndoors && (
              <Badge className="gap-1.5 border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
                <Building2 className="h-3 w-3" /> Indoor
              </Badge>
            )}
            {location.isOutdoors && (
              <Badge className="gap-1.5 border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                <Wind className="h-3 w-3" /> Outdoor
              </Badge>
            )}
            {location.isParkingAvailable && (
              <Badge className="gap-1.5 border border-admin bg-admin-overlay px-2.5 py-1 text-xs text-admin-50">
                <ParkingCircle className="h-3 w-3" /> Parking
              </Badge>
            )}
            {!location.isIndoors && !location.isOutdoors && !location.isParkingAvailable && (
              <span className="text-sm text-admin-40">No features selected yet.</span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Approval</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-admin-50">Current status</span>
            <Badge className={approvalBadgeClass(location.approvalStatus)}>{approvalLabel(location.approvalStatus)}</Badge>
          </div>
          {location.rejectionReason && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{location.rejectionReason}</p>
          )}
        </section>
      </aside>
      </div>
    </section>
  )
}

function LocationSettingsTab({
  location,
  rejectReason,
  onRejectReasonChange,
  canModerateLocation,
  canEditLocation,
  approvePending,
  rejectPending,
  onApprove,
  onReject,
  onMenuDocumentChange,
}: {
  location: Location
  rejectReason: string
  onRejectReasonChange: (value: string) => void
  canModerateLocation: boolean
  canEditLocation: boolean
  approvePending: boolean
  rejectPending: boolean
  onApprove: () => void
  onReject: () => void
  onMenuDocumentChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <section className="space-y-5">
      <TabPageHeader
        eyebrow="Location controls"
        title="Approval and public menu"
        description="Keep vendor approval, rejection notes, and public menu documents in one review surface."
      >
        <InlineStat label="Approval" value={approvalLabel(location.approvalStatus)} />
        <InlineStat label="Reservations" value={location.bookingEnabled ? 'On' : 'Off'} />
        <InlineStat label="Menu" value={location.menuDocumentUrl ? 'Uploaded' : 'Missing'} />
      </TabPageHeader>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Approval</p>
            <h2 className="mt-2 font-heading text-xl font-black text-foreground">Location review status</h2>
            <p className="mt-2 text-sm leading-6 text-admin-50">
              Vendor locations become public and usable for event setup only after approval.
            </p>
          </div>
          <Badge className={approvalBadgeClass(location.approvalStatus)}>{approvalLabel(location.approvalStatus)}</Badge>
        </div>
        {location.rejectionReason && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{location.rejectionReason}</p>
        )}
        {canModerateLocation && location.vendorId && (
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input value={rejectReason} onChange={event => onRejectReasonChange(event.target.value)} placeholder="Reason if rejecting" className="border-admin bg-admin-input" />
            <Button onClick={onApprove} disabled={approvePending} className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
              <ShieldCheck className="h-4 w-4" />
              Approve
            </Button>
            <Button onClick={onReject} disabled={rejectPending} variant="outline" className="gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10">
              <ShieldX className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
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
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={onMenuDocumentChange} />
            </label>
          )}
        </div>
        {location.menuDocumentUrl ? (
          <a href={location.menuDocumentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex max-w-full break-all text-sm font-semibold text-neon-pink hover:underline">
            {location.menuDocumentName ?? 'Open menu document'}
          </a>
        ) : (
          <p className="mt-4 rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No menu document uploaded yet.</p>
        )}
      </div>
      </div>
    </section>
  )
}

function LocationBookingsPanel({ location }: { location: Location }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatusFilter>('ALL')
  const [date, setDate] = useState('')
  const [sortKey, setSortKey] = useState<BookingSortKey>('startDateTime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const { data, isLoading } = useAdminReservations({ locationId: location.id, page: 1, limit: 100 })
  const { data: chatThreads = [] } = useBookingChatThreads()

  const rows = useMemo(() => data?.items ?? [], [data?.items])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows
      .filter(reservation => {
        if (status !== 'ALL' && reservation.status !== status) return false
        if (date && bookingDateKey(reservation.reservationDate || reservation.startDateTime) !== date) return false
        if (!query) return true
        return bookingSearchText(reservation).includes(query)
      })
      .sort((a, b) => {
        const aValue = bookingSortValue(a, sortKey)
        const bValue = bookingSortValue(b, sortKey)
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        return sortDirection === 'asc' ? result : -result
      })
  }, [date, rows, search, sortDirection, sortKey, status])

  const confirmedCount = rows.filter(reservation => reservation.status === 'CONFIRMED' || reservation.status === 'SEATED').length
  const totalGuests = rows.reduce((sum, reservation) => sum + reservation.guestCount, 0)
  const depositTotal = rows.reduce((sum, reservation) => sum + Number(reservation.depositAmount ?? 0), 0)
  const preOrderTotal = rows.reduce((sum, reservation) => sum + bookingPreOrderTotal(reservation), 0)
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function handleSort(nextSortKey: BookingSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(nextSortKey)
      setSortDirection('asc')
    }
  }

  return (
    <section className="space-y-5">
      <TabPageHeader
        eyebrow="Table bookings"
        title="Reservations for this location"
        description="Filter arrivals, review deposits and pre-orders, then open the booking or chat with the customer."
      >
        <InlineStat label="Bookings" value={(data?.total ?? rows.length).toLocaleString()} />
        <InlineStat label="Active" value={confirmedCount.toLocaleString()} />
        <InlineStat label="Deposits" value={money(depositTotal)} />
      </TabPageHeader>

      <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-black text-foreground">{location.name} bookings</h2>
            <p className="mt-1 text-sm text-admin-40">{filteredRows.length.toLocaleString()} booking record{filteredRows.length === 1 ? '' : 's'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <BookingSummaryCard label="Guests" value={totalGuests.toLocaleString()} />
            <BookingSummaryCard label="Deposits" value={money(depositTotal)} />
            <BookingSummaryCard label="Pre-orders" value={money(preOrderTotal)} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
            <Input
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search name, email, phone, reference, or table..."
              className="border-admin bg-admin-input pl-9"
            />
          </div>
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value as BookingStatusFilter)
              setPage(1)
            }}
            className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground outline-none"
          >
            {BOOKING_STATUS_FILTERS.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
          <Input
            type="date"
            value={date}
            onChange={event => {
              setDate(event.target.value)
              setPage(1)
            }}
            className="border-admin bg-admin-input"
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-admin">
          <table className="w-full min-w-[1360px] text-sm">
            <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
              <tr>
                <BookingSortableTh label="Full name" sortKey="customer" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Email" sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Phone" sortKey="phone" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Guests" sortKey="guests" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Table / category" sortKey="table" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Pre-order" sortKey="preOrder" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <th className="px-4 py-3 font-medium">Chat</th>
                <BookingSortableTh label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Payment method" sortKey="paymentMethod" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Paid status" sortKey="paymentStatus" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Deposit paid" sortKey="deposit" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Minimum spend" sortKey="minimumSpend" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <BookingSortableTh label="Booking time" sortKey="startDateTime" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={14} className="px-4 py-3"><Skeleton className="h-8 rounded-lg" /></td>
                  </tr>
                ))
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-admin-30" />
                    <p className="mt-3 text-sm font-medium text-admin-70">No bookings found</p>
                    <p className="mt-1 text-xs text-admin-40">Bookings for this location will appear here once customers reserve tables.</p>
                  </td>
                </tr>
              ) : pagedRows.map(reservation => {
                const unread = bookingChatUnread(reservation, chatThreads)
                const preOrderItems = normalizedReservationPreOrderMenu(reservation.preOrderMenu)
                const preOrderCount = preOrderItems.reduce((sum, item) => sum + item.quantity, 0)
                const reservationPreOrderTotal = preOrderItems.reduce((sum, item) => sum + item.lineTotal, 0)
                const paymentStatus = paymentStatusLabel(reservation)
                return (
                  <tr key={reservation.id} className="hover:bg-admin-overlay/60">
                    <td className="px-4 py-3 font-medium text-admin-90">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)}
                        className="block max-w-[220px] truncate text-left transition hover:text-neon-pink"
                      >
                        {customerName(reservation)}
                      </button>
                      <span className="mt-1 block font-mono text-xs text-admin-30">#{reservation.reference}</span>
                    </td>
                    <td className="px-4 py-3 text-admin-50">{customerEmail(reservation)}</td>
                    <td className="px-4 py-3 text-admin-50">{customerPhone(reservation)}</td>
                    <td className="px-4 py-3 font-mono text-neon-pink">{reservation.guestCount}</td>
                    <td className="px-4 py-3 text-admin-60">
                      <p className="font-medium text-admin-80">{reservation.table?.name ?? reservation.tableCategory}</p>
                      <p className="mt-1 text-xs text-admin-40">{reservation.tableCategory}</p>
                    </td>
                    <td className="px-4 py-3">
                      {preOrderItems.length ? (
                        <Badge className="whitespace-nowrap border-neon-pink/25 bg-neon-pink/10 text-neon-pink">
                          {preOrderCount} item{preOrderCount === 1 ? '' : 's'} · {money(reservationPreOrderTotal)}
                        </Badge>
                      ) : (
                        <span className="text-admin-30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canOpenBookingChat(reservation) ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/booking-chats?reservationId=${reservation.id}`)}
                          className="inline-flex items-center gap-2 rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1.5 text-xs font-semibold text-neon-pink transition hover:border-neon-pink/60 hover:bg-neon-pink/15"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {unread > 0 ? `${unread} unread` : 'Open'}
                        </button>
                      ) : (
                        <span className="text-admin-30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusTone(reservation.status)}>{statusLabel(reservation.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-admin bg-admin-input text-admin-60">{paymentMethodLabel(reservation).replaceAll('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={paymentStatusTone(paymentStatus)}>{statusLabel(paymentStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-admin-70">{money(reservation.depositAmount)}</td>
                    <td className="px-4 py-3 font-mono text-admin-70">{money(reservation.minimumSpend)}</td>
                    <td className="px-4 py-3 text-admin-40">{formatDateTime(reservation.startDateTime)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" size="sm" onClick={() => navigate(`/dashboard/reservations/${reservation.id}`)} className="bg-neon-pink text-white hover:bg-neon-pink/90">
                        Open
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-admin-40">
            Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="gap-1 border-admin bg-admin-input">
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="font-mono text-xs text-admin-50">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="gap-1 border-admin bg-admin-input">
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </section>
  )
}

function BookingSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value}</p>
    </div>
  )
}

function BookingSortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: BookingSortKey
  activeKey: BookingSortKey
  direction: SortDirection
  onSort: (key: BookingSortKey) => void
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-1.5 transition hover:text-admin-70">
        {label}
        <ArrowUpDown className={activeKey === sortKey ? 'h-3.5 w-3.5 text-neon-pink' : 'h-3.5 w-3.5'} />
        {activeKey === sortKey && <span className="normal-case text-neon-pink">{direction}</span>}
      </button>
    </th>
  )
}

function LocationBookingChatsPanel({ location, viewerName }: { location: Location; viewerName: string }) {
  const navigate = useNavigate()
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminReservations({ locationId: location.id, page: 1, limit: 100 })
  const { data: chatThreads = [], isLoading: isLoadingThreads } = useBookingChatThreads()

  const rows = useMemo(() => {
    const threadByReservationId = new Map(chatThreads.map(thread => [thread.reservationId, thread]))
    return (data?.items ?? [])
      .filter(reservation => canOpenBookingChat(reservation))
      .map(reservation => ({
        reservation,
        thread: threadByReservationId.get(reservation.id) ?? null,
      }))
      .sort((a, b) => {
        const aTime = a.thread?.updatedAt ?? a.reservation.startDateTime
        const bTime = b.thread?.updatedAt ?? b.reservation.startDateTime
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
  }, [chatThreads, data?.items])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(row => bookingSearchText(row.reservation).includes(query))
  }, [rows, search])

  useEffect(() => {
    if (selectedReservationId && rows.some(row => row.reservation.id === selectedReservationId)) return
    setSelectedReservationId(filteredRows[0]?.reservation.id ?? null)
  }, [filteredRows, rows, selectedReservationId])

  const selected = selectedReservationId ? rows.find(row => row.reservation.id === selectedReservationId) ?? null : null
  const openCount = rows.filter(row => row.thread?.status !== 'RESOLVED').length
  const unreadCount = rows.reduce((sum, row) => sum + (row.thread?.unreadForStaff ?? 0), 0)

  return (
    <section className="space-y-5">
      <TabPageHeader
        eyebrow="Customer conversations"
        title="Booking chat inbox"
        description="Location-scoped support inbox for confirmed table reservations and service questions."
      >
        <InlineStat label="Open" value={openCount.toLocaleString()} />
        <InlineStat label="Unread" value={unreadCount.toLocaleString()} />
        <InlineStat label="Eligible" value={rows.length.toLocaleString()} />
      </TabPageHeader>

      <div className="rounded-xl border border-admin bg-admin-surface p-3 shadow-admin">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search reference, customer, or table..."
            className="border-admin bg-admin-input pl-8"
          />
        </div>
      </div>

      {isLoading || isLoadingThreads ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyPanel icon={MessageCircle} title="No booking chats yet" description="Confirmed and paid bookings for this location will appear here when chat is available." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.85fr)_minmax(500px,1.15fr)]">
          <section className="overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin">
            <div className="border-b border-admin px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{filteredRows.length.toLocaleString()} conversation{filteredRows.length === 1 ? '' : 's'}</p>
              <p className="mt-1 text-xs text-admin-40">Select a booking to review or reply to customer messages.</p>
            </div>
            <div className="max-h-[680px] overflow-y-auto">
              {filteredRows.map(row => {
                const active = selected?.reservation.id === row.reservation.id
                const unread = row.thread?.unreadForStaff ?? 0
                return (
                  <button
                    key={row.reservation.id}
                    type="button"
                    onClick={() => setSelectedReservationId(row.reservation.id)}
                    className={cn(
                      'flex w-full gap-3 border-b border-admin px-4 py-3.5 text-left transition last:border-b-0',
                      active ? 'bg-neon-pink/10' : 'hover:bg-admin-overlay/55',
                    )}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-heading text-base font-black text-foreground">{customerName(row.reservation)}</span>
                          <span className="mt-1 block font-mono text-xs text-admin-30">#{row.reservation.reference}</span>
                        </span>
                        <Badge className={row.thread?.status === 'RESOLVED' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-neon-pink/25 bg-neon-pink/10 text-neon-pink'}>
                          {row.thread?.status === 'RESOLVED' ? 'Resolved' : 'Open'}
                        </Badge>
                      </span>
                      <span className="mt-3 block truncate text-xs text-admin-50">{row.reservation.table?.name ?? row.reservation.tableCategory} / {formatShortDateTime(row.reservation.startDateTime)}</span>
                      <span className="mt-3 flex items-center justify-between gap-3">
                        <span className="truncate text-xs text-admin-40">{customerContact(row.reservation)}</span>
                        <span className={unread > 0 ? 'rounded-full bg-neon-pink px-2 py-0.5 text-xs font-bold text-white' : 'text-xs text-admin-30'}>
                          {unread > 0 ? `${unread > 9 ? '9+' : unread} unread` : 'Read'}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-admin-30">#{selected.reservation.reference}</p>
                      <h2 className="mt-1 truncate font-heading text-xl font-black text-foreground">{customerName(selected.reservation)}</h2>
                      <p className="mt-2 text-sm text-admin-50">{customerContact(selected.reservation)}</p>
                      <p className="mt-1 text-xs text-admin-40">
                        {selected.reservation.table?.name ?? selected.reservation.tableCategory} / {selected.reservation.guestCount} guest{selected.reservation.guestCount === 1 ? '' : 's'} / {formatShortDateTime(selected.reservation.startDateTime)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-admin bg-admin-overlay text-admin-70 hover:text-neon-pink"
                      onClick={() => navigate(`/dashboard/reservations/${selected.reservation.id}`)}
                    >
                      Open Booking
                    </Button>
                  </div>
                </div>
                <BookingChatPanel
                  reservation={selected.reservation}
                  viewer="STAFF"
                  viewerName={viewerName}
                  tone="admin"
                />
              </>
            ) : (
              <EmptyPanel icon={MessageCircle} title="No chat selected" description="Choose a booking conversation from the list." />
            )}
          </section>
        </div>
      )}
    </section>
  )
}

function TabPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">{eyebrow}</p>
          <h2 className="mt-2 font-heading text-xl font-black text-foreground">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-50">{description}</p>
        </div>
        {children && (
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:min-w-[360px] sm:grid-cols-3">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-admin-30">{label}</p>
      <p className="mt-1 truncate font-heading text-sm font-black text-foreground">{value}</p>
    </div>
  )
}

function EmptyPanel({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-10 text-center shadow-admin">
      <Icon className="mx-auto h-8 w-8 text-admin-30" />
      <p className="mt-3 text-sm font-semibold text-admin-70">{title}</p>
      <p className="mt-1 text-xs text-admin-40">{description}</p>
    </section>
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
