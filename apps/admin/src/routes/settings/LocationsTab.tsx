// apps/admin/src/routes/settings/LocationsTab.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Location } from '../../lib/api/locations'
import {
  Button, Input, Badge, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
import { Pencil, Plus, Trash2, ParkingCircle, Wind, Building2 } from 'lucide-react'

const locationSchema = z.object({
  name:               z.string().min(1, 'Name is required'),
  address:            z.string().min(1, 'Address is required'),
  capacity:           z.coerce.number().int().positive('Capacity must be a positive number'),
  isIndoors:          z.boolean(),
  isOutdoors:         z.boolean(),
  latitude:           z.coerce.number(),
  longitude:          z.coerce.number(),
  isParkingAvailable: z.boolean(),
})
type LocationFormValues = z.infer<typeof locationSchema>

function LocationFormDialog({
  mode,
  initial,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  mode: 'create' | 'edit'
  initial?: Location
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LocationFormValues) => Promise<void>
  isPending: boolean
}) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name:               initial?.name ?? '',
      address:            initial?.address ?? '',
      capacity:           initial?.capacity ?? 0,
      isIndoors:          initial?.isIndoors ?? false,
      isOutdoors:         initial?.isOutdoors ?? false,
      latitude:           initial?.latitude ?? 0,
      longitude:          initial?.longitude ?? 0,
      isParkingAvailable: initial?.isParkingAvailable ?? false,
    },
  })

  async function handleSubmit(values: LocationFormValues) {
    await onSubmit(values)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Location' : 'Edit Location'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="e.g. Nairobi CBD Venue" className="bg-admin-input border-admin" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input placeholder="Full address" className="bg-admin-input border-admin" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl><Input type="number" min={1} className="bg-admin-input border-admin" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="latitude" render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl><Input type="number" step="any" className="bg-admin-input border-admin" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="longitude" render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl><Input type="number" step="any" className="bg-admin-input border-admin" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="space-y-3">
              <FormField control={form.control} name="isIndoors" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-neon-pink" /></FormControl>
                  <FormLabel className="!mt-0">Indoors</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isOutdoors" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-neon-pink" /></FormControl>
                  <FormLabel className="!mt-0">Outdoors</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isParkingAvailable" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-neon-pink" /></FormControl>
                  <FormLabel className="!mt-0">Parking Available</FormLabel>
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-neon-pink hover:bg-neon-pink/90 text-white">
                {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function LocationsTab() {
  const { toast } = useToast()
  const [createOpen, setCreateOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<Location | null>(null)
  const [editOpen, setEditOpen]       = useState(false)

  const { data: locations, isLoading } = useLocations()
  const createMutation                 = useCreateLocation()
  const updateMutation                 = useUpdateLocation()
  const deleteMutation                 = useDeleteLocation()

  async function handleCreate(values: LocationFormValues) {
    try {
      await createMutation.mutateAsync(values)
      toast({ title: 'Location created' })
    } catch {
      toast({ title: 'Failed to create location', variant: 'destructive' })
    }
  }

  async function handleUpdate(values: LocationFormValues) {
    if (!editTarget) return
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, dto: values })
      toast({ title: 'Location updated' })
      setEditTarget(null)
      setEditOpen(false)
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
        <Button onClick={() => setCreateOpen(true)} className="bg-neon-pink hover:bg-neon-pink/90 text-white gap-2" size="sm">
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      <div className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
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
                          onClick={() => { setEditTarget(loc); setEditOpen(true) }}
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
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{loc.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This permanently removes the location and cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(loc.id)} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {(locations ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-admin-30">No locations yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LocationFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      {editTarget && (
        <LocationFormDialog
          mode="edit"
          initial={editTarget}
          open={editOpen}
          onOpenChange={open => { setEditOpen(open); if (!open) setEditTarget(null) }}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
