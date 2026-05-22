// apps/admin/src/routes/settings/LocationsTab.tsx
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Location } from '../../lib/api/locations'
import { uploadLocationPictures } from '../../lib/api/locations'
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
  useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
} from '../../lib/queries/locations'
import {
  Pencil, Plus, Trash2, ParkingCircle, Wind, Building2,
  MapPin, Users, FileText, ImagePlus, X as XIcon,
} from 'lucide-react'
import { SlidePanel } from '../../components/ui/SlidePanel'

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
          ? 'bg-neon-pink/10 border-neon-pink/40 text-foreground'
          : 'bg-admin-overlay border-admin text-admin-40 hover:border-admin-30',
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
  onSubmit,
  isPending,
}: {
  mode: 'create' | 'edit'
  initial?: Location
  open: boolean
  onClose: () => void
  onSubmit: (values: LocationFormValues, pictures: File[]) => Promise<void>
  isPending: boolean
}) {
  const [pictures, setPictures]       = useState<File[]>([])
  const [previews, setPreviews]       = useState<string[]>(
    initial?.pictures ?? []
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name:               initial?.name ?? '',
      address:            initial?.address ?? '',
      description:        initial?.description ?? '',
      capacity:           initial?.capacity ?? 0,
      isIndoors:          initial?.isIndoors ?? false,
      isOutdoors:         initial?.isOutdoors ?? false,
      isParkingAvailable: initial?.isParkingAvailable ?? false,
      latitude:           initial?.latitude ?? 0,
      longitude:          initial?.longitude ?? 0,
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPictures(prev => [...prev, ...files])
    files.forEach(f => {
      const url = URL.createObjectURL(f)
      setPreviews(prev => [...prev, url])
    })
    e.target.value = ''
  }

  function removePreview(idx: number) {
    setPreviews(prev => prev.filter((_, i) => i !== idx))
    setPictures(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(values: LocationFormValues) {
    await onSubmit(values, pictures)
    form.reset()
    setPictures([])
    setPreviews([])
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

            {/* Basic Info */}
            <SectionLabel>Basic Info</SectionLabel>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-admin-50">Venue Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30 pointer-events-none" />
                    <Input
                      placeholder="e.g. The Vault Nairobi"
                      className="bg-admin-input border-admin pl-9 text-sm"
                      {...field}
                    />
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
                    <Input
                      placeholder="Search or enter full address"
                      className="bg-admin-input border-admin pl-9 text-sm"
                      {...field}
                    />
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
                    <Input
                      type="number"
                      min={1}
                      placeholder="Max guests"
                      className="bg-admin-input border-admin pl-9 text-sm"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
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

            {/* Features */}
            <SectionLabel>Venue Features</SectionLabel>

            <div className="space-y-2">
              <FormField control={form.control} name="isIndoors" render={({ field }) => (
                <FeatureToggleCard
                  icon={Building2}
                  label="Indoor"
                  description="Air-conditioned interior space"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )} />
              <FormField control={form.control} name="isOutdoors" render={({ field }) => (
                <FeatureToggleCard
                  icon={Wind}
                  label="Outdoor"
                  description="Open-air terrace or garden area"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )} />
              <FormField control={form.control} name="isParkingAvailable" render={({ field }) => (
                <FeatureToggleCard
                  icon={ParkingCircle}
                  label="Parking"
                  description="Dedicated parking for guests"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )} />
            </div>

            {/* Photos */}
            <SectionLabel>Photos</SectionLabel>

            <div className="space-y-3">
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-admin">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePreview(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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
                  <p className="text-xs text-admin-30">JPEG, PNG or WebP · up to 10 MB each</p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

          </div>

          <div className="px-6 py-4 border-t border-admin flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-admin-50">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-neon-pink hover:bg-neon-pink/90 text-white min-w-[110px]"
            >
              {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>
    </SlidePanel>
  )
}

export default function LocationsTab() {
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)

  const { data: locations, isLoading } = useLocations()
  const createMutation                 = useCreateLocation()
  const updateMutation                 = useUpdateLocation()
  const deleteMutation                 = useDeleteLocation()

  async function handleCreate(values: LocationFormValues, pictures: File[]) {
    try {
      const created = await createMutation.mutateAsync(values)
      if (pictures.length) {
        await uploadLocationPictures(created.id, pictures)
      }
      toast({ title: 'Location created' })
    } catch {
      toast({ title: 'Failed to create location', variant: 'destructive' })
    }
  }

  async function handleUpdate(values: LocationFormValues, pictures: File[]) {
    if (!editTarget) return
    try {
      const updated = await updateMutation.mutateAsync({ id: editTarget.id, dto: values })
      if (pictures.length) {
        await uploadLocationPictures(updated.id, pictures)
      }
      toast({ title: 'Location updated' })
      setEditTarget(null)
    } catch {
      toast({ title: 'Failed to update location', variant: 'destructive' })
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
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-neon-pink hover:bg-neon-pink/90 text-white gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      <div className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-admin">
                  {['Name', 'Address', 'Capacity', 'Type', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs text-admin-30 font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(locations ?? []).map(loc => (
                  <tr key={loc.id} className="border-b border-admin hover:bg-admin-overlay transition-colors">
                    <td className="px-5 py-3 text-sm text-admin-80 font-medium">{loc.name}</td>
                    <td className="px-5 py-3 text-xs text-admin-50 max-w-[200px] truncate">{loc.address}</td>
                    <td className="px-5 py-3 text-xs text-admin-60 font-mono">{loc.capacity.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {loc.isIndoors && (
                          <Badge className="text-[10px] border bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
                            <Building2 className="w-2.5 h-2.5" /> Indoor
                          </Badge>
                        )}
                        {loc.isOutdoors && (
                          <Badge className="text-[10px] border bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                            <Wind className="w-2.5 h-2.5" /> Outdoor
                          </Badge>
                        )}
                        {loc.isParkingAvailable && (
                          <Badge className="text-[10px] border bg-admin-overlay text-admin-50 border-admin gap-1">
                            <ParkingCircle className="w-2.5 h-2.5" /> Parking
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setEditTarget(loc)}
                          className="h-7 w-7 p-0 text-admin-40 hover:text-admin-80"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500/50 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
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
                    </td>
                  </tr>
                ))}
                {(locations ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-admin-30">
                      No locations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LocationFormPanel
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      {editTarget && (
        <LocationFormPanel
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
