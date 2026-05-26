// apps/admin/src/routes/settings/LocationsTab.tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Location, useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@glee/api'
import {
  Button, Input, Badge, Textarea,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
  Skeleton,
  useToast,
} from '@glee/ui'
import {
  Pencil, Plus, Trash2, ParkingCircle, Wind, Building2,
  MapPin, Users, FileText, ImagePlus, X as XIcon, Image,
} from 'lucide-react'
import { SlidePanel } from '../../components/ui/SlidePanel'

const MAX_PHOTOS = 6
const PLACEHOLDER = 'https://placehold.co/600x400/141419/FF2D8F?text=Location'

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
    })
    setExistingPics(initial.pictures ?? [])
    setNewPics([])
  }, [initial?.id])

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
                <FormLabel className="text-xs text-admin-50">Venue Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input placeholder="e.g. The Vault Nairobi" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-admin-50">Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input placeholder="Search or enter full address" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <p className="text-[10px] text-admin-30 mt-1">Coordinates auto-filled via Google Maps when integrated.</p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-admin-50">Capacity</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input type="number" min={1} placeholder="Max guests" className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SectionLabel>Description & Perks</SectionLabel>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-admin-50">About this venue</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Textarea
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)

  const { data: locations, isLoading } = useLocations()
  const createMutation                 = useCreateLocation()
  const updateMutation                 = useUpdateLocation()
  const deleteMutation                 = useDeleteLocation()

  async function handleCreate(values: LocationFormValues, newPictures: File[]) {
    try {
      await createMutation.mutateAsync({ dto: values, pictures: newPictures })
      toast({ title: 'Location created' })
      setCreateOpen(false)
    } catch {
      toast({ title: 'Failed to create location', variant: 'destructive' })
      throw new Error('failed')
    }
  }

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-base text-foreground">Locations</h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-neon-pink hover:bg-neon-pink/90 text-white gap-2" size="sm">
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (locations ?? []).length === 0 ? (
        <div className="bg-admin-surface border border-admin rounded-2xl py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-neon-pink/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-5 h-5 text-neon-pink/50" />
          </div>
          <p className="text-sm text-admin-30">No locations yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(locations ?? []).map(loc => (
            <div
              key={loc.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/dashboard/locations/${loc.id}`)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/dashboard/locations/${loc.id}`)}
              className="bg-admin-surface border border-admin rounded-2xl overflow-hidden hover:border-neon-pink/30 hover:shadow-admin transition-all duration-150 group cursor-pointer"
            >
              {/* Cover image */}
              <div className="relative h-40 overflow-hidden bg-admin-overlay">
                {loc.pictures && loc.pictures.length > 0 ? (
                  <img
                    src={loc.pictures[0]}
                    alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neon-pink/5 to-admin-overlay">
                    <Image className="w-8 h-8 text-admin-20" />
                  </div>
                )}
                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditTarget(loc) }}
                    className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neon-pink/80 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
                        <AlertDialogAction
                          onClick={() => handleDelete(loc.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {/* Photo count badge */}
                {loc.pictures && loc.pictures.length > 1 && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5">
                    <Image className="w-3 h-3 text-white/70" />
                    <span className="text-[11px] text-white/80">{loc.pictures.length}</span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-4 space-y-2.5">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground line-clamp-1">{loc.name}</h3>
                  <p className="text-xs text-admin-40 truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />{loc.address}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {loc.isIndoors && (
                      <Badge className="text-[10px] border bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1 px-1.5">
                        <Building2 className="w-2.5 h-2.5" /> Indoor
                      </Badge>
                    )}
                    {loc.isOutdoors && (
                      <Badge className="text-[10px] border bg-green-500/10 text-green-400 border-green-500/30 gap-1 px-1.5">
                        <Wind className="w-2.5 h-2.5" /> Outdoor
                      </Badge>
                    )}
                    {loc.isParkingAvailable && (
                      <Badge className="text-[10px] border bg-admin-overlay text-admin-50 border-admin gap-1 px-1.5">
                        <ParkingCircle className="w-2.5 h-2.5" /> Parking
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-admin-40 shrink-0 ml-2">
                    <Users className="w-3 h-3" />
                    <span className="font-mono">{loc.capacity.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LocationFormPanel
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      {editTarget && (
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
