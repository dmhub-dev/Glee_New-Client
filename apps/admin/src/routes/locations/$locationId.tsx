// apps/admin/src/routes/locations/$locationId.tsx
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
  useToast,
} from '@glee/ui'
import { useLocation, useUpdateLocation, useDeleteLocation } from '../../lib/queries/locations'
import type { Location } from '../../lib/api/locations'
import AdminLayout from '../../components/layout/AdminLayout'
import { SlidePanel } from '../../components/ui/SlidePanel'
import {
  ArrowLeft, Pencil, Trash2, MapPin, Users, Building2, Wind, ParkingCircle,
  Image, ImagePlus, X as XIcon, FileText,
} from 'lucide-react'

const MAX_PHOTOS = 6
const PLACEHOLDER = 'https://placehold.co/800x500/141419/FF2D8F?text=Location'

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
})
type LocationFormValues = z.infer<typeof locationSchema>

function FeatureToggleCard({
  icon: Icon, label, description, checked, onCheckedChange,
}: { icon: React.ElementType; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 text-left',
        checked ? 'bg-neon-pink/10 border-neon-pink/40' : 'bg-admin-overlay border-admin hover:border-admin-30',
      ].join(' ')}
    >
      <div className={['w-8 h-8 rounded-lg flex items-center justify-center shrink-0', checked ? 'bg-neon-pink/20 text-neon-pink' : 'bg-admin-surface text-admin-30'].join(' ')}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={['text-sm font-medium', checked ? 'text-foreground' : 'text-admin-50'].join(' ')}>{label}</p>
        <p className="text-xs text-admin-30">{description}</p>
      </div>
      <div className={['w-4 h-4 rounded-full border-2 shrink-0', checked ? 'bg-neon-pink border-neon-pink' : 'border-admin'].join(' ')} />
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

function EditPanel({
  location,
  onClose,
}: {
  location: Location
  onClose: () => void
}) {
  const { toast }       = useToast()
  const updateMutation  = useUpdateLocation()
  const [existingPics, setExistingPics] = useState<string[]>(location.pictures ?? [])
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
    },
  })

  const totalPhotos = existingPics.length + newPics.length

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
    <SlidePanel open title="Edit Location" onClose={onClose}>
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
                    <Input className="bg-admin-input border-admin pl-9 text-sm" {...field} />
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
                    <Input className="bg-admin-input border-admin pl-9 text-sm" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-admin-50">Capacity</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input type="number" min={1} className="bg-admin-input border-admin pl-9 text-sm" {...field} />
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
                    <Textarea placeholder="Describe the venue, ambiance, and exclusive perks…" className="bg-admin-input border-admin pl-9 text-sm resize-none min-h-[100px]" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SectionLabel>Venue Features</SectionLabel>
            <div className="space-y-2">
              <FormField control={form.control} name="isIndoors" render={({ field }) => (
                <FeatureToggleCard icon={Building2} label="Indoor" description="Air-conditioned interior space" checked={field.value} onCheckedChange={field.onChange} />
              )} />
              <FormField control={form.control} name="isOutdoors" render={({ field }) => (
                <FeatureToggleCard icon={Wind} label="Outdoor" description="Open-air terrace or garden area" checked={field.value} onCheckedChange={field.onChange} />
              )} />
              <FormField control={form.control} name="isParkingAvailable" render={({ field }) => (
                <FeatureToggleCard icon={ParkingCircle} label="Parking" description="Dedicated parking for guests" checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <SectionLabel>Photos {totalPhotos > 0 && `(${totalPhotos}/${MAX_PHOTOS})`}</SectionLabel>

            {(existingPics.length > 0 || newPics.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {existingPics.map(src => (
                  <div key={src} className="relative aspect-square rounded-lg overflow-hidden group border border-admin">
                    <img src={src} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                    <button type="button" onClick={() => setExistingPics(p => p.filter(u => u !== src))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {newPics.map((n, i) => (
                  <div key={n.preview} className="relative aspect-square rounded-lg overflow-hidden group border border-neon-pink/30">
                    <img src={n.preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setNewPics(p => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalPhotos < MAX_PHOTOS && (
              <label className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-admin hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-admin-overlay flex items-center justify-center">
                  <ImagePlus className="w-4 h-4 text-admin-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-admin-60">Add photos</p>
                  <p className="text-xs text-admin-30">JPEG, PNG or WebP · max {MAX_PHOTOS} photos</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <div className="px-6 py-4 border-t border-admin flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-admin-50">Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-neon-pink hover:bg-neon-pink/90 text-white min-w-[110px]">
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>
    </SlidePanel>
  )
}

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate       = useNavigate()
  const { toast }      = useToast()
  const [editOpen, setEditOpen]     = useState(false)
  const [heroIdx, setHeroIdx]       = useState(0)

  const { data: loc, isLoading }    = useLocation(locationId!)
  const deleteMutation              = useDeleteLocation()

  if (isLoading) {
    return (
      <AdminLayout title="Location" subtitle="">
        <div className="space-y-4 max-w-4xl">
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
          <Button onClick={() => navigate('/settings?tab=locations')} variant="ghost">← Back to settings</Button>
        </div>
      </AdminLayout>
    )
  }

  const pictures = loc.pictures ?? []
  const hero = pictures[heroIdx] ?? null

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(loc!.id)
      toast({ title: 'Location deleted' })
      navigate('/settings?tab=locations')
    } catch {
      toast({ title: 'Failed to delete location', variant: 'destructive' })
    }
  }

  return (
    <AdminLayout title={loc.name} subtitle={loc.address}>
      <div className="max-w-4xl space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-admin-40 hover:text-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5 bg-neon-pink hover:bg-neon-pink/90 text-white"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10 gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
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
          </div>
        </div>

        {/* Hero image */}
        <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-admin-overlay">
          {hero ? (
            <img
              src={hero}
              alt={loc.name}
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neon-pink/5 to-admin-overlay">
              <Image className="w-10 h-10 text-admin-20" />
              <p className="text-xs text-admin-30">No photos yet</p>
            </div>
          )}
          {/* Thumbnail strip */}
          {pictures.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {pictures.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setHeroIdx(i)}
                  className={[
                    'w-10 h-10 rounded-lg overflow-hidden border-2 transition-all',
                    heroIdx === i ? 'border-neon-pink scale-110' : 'border-white/30 opacity-60 hover:opacity-100',
                  ].join(' ')}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
            <div>
              <h1 className="font-heading font-black text-xl text-foreground">{loc.name}</h1>
              <p className="text-sm text-admin-40 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />{loc.address}
              </p>
            </div>

            {loc.description && (
              <p className="text-sm text-admin-60 leading-relaxed">{loc.description}</p>
            )}

            {/* Features */}
            <div className="flex flex-wrap gap-2 pt-1">
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
            </div>
          </div>

          <div className="bg-admin-surface border border-admin rounded-2xl p-5 flex flex-col justify-center items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-neon-pink/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-neon-pink" />
            </div>
            <p className="font-heading font-black text-3xl text-foreground">{loc.capacity.toLocaleString()}</p>
            <p className="text-xs text-admin-30 uppercase tracking-wider">Max capacity</p>
          </div>
        </div>

        {/* Photo grid */}
        {pictures.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-admin-50">All photos ({pictures.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {pictures.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setHeroIdx(i)}
                  className={[
                    'aspect-square rounded-xl overflow-hidden border-2 transition-all',
                    heroIdx === i ? 'border-neon-pink' : 'border-transparent hover:border-admin',
                  ].join(' ')}
                >
                  <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {editOpen && <EditPanel location={loc} onClose={() => setEditOpen(false)} />}
    </AdminLayout>
  )
}
