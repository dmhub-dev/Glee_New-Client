import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { useAdminEvent, useCreateEvent, useUpdateEvent } from '../../lib/queries/events'
import { useCategories } from '../../lib/queries/categories'
import { Button, Input, Textarea, Label, Switch, Skeleton } from '@glee/ui'
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react'
import type { Event } from '@glee/types'

const tierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name required'),
  price: z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Min 0'),
  quantity: z.number({ invalid_type_error: 'Must be a number' }).min(1, 'Min 1'),
  quantityRemaining: z.number(),
  description: z.string().optional(),
})

const eventSchema = z.object({
  title: z.string().min(3, 'At least 3 characters').max(120),
  description: z.string().min(10, 'At least 10 characters').max(2000),
  category: z.string().min(1, 'Category required'),
  status: z.enum(['draft', 'live'] as const),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  venueId: z.string().min(1, 'Venue required'),
  location: z.string().min(3, 'Location required'),
  ticketTiers: z.array(tierSchema).min(1, 'At least one wave required'),
})

type EventFormValues = z.infer<typeof eventSchema>

function newTier(): EventFormValues['ticketTiers'][number] {
  return { id: `wave-${Date.now()}`, name: '', price: 0, quantity: 1, quantityRemaining: 1, description: '' }
}

export default function EventFormPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const isNew = !eventId || eventId === 'new'
  const navigate = useNavigate()

  const { data: existingEvent, isLoading } = useAdminEvent(isNew ? '' : eventId!)
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()
  const { data: categoriesData } = useCategories()

  const [posters, setPosters] = useState<string[]>([])
  const posterInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      status: 'draft',
      date: '',
      startTime: '',
      endTime: '',
      venueId: '',
      location: '',
      ticketTiers: [newTier()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTiers' })
  const formValues = watch()

  useEffect(() => {
    if (!existingEvent) return
    const categoryName = categoriesData?.find(c => c.id === existingEvent.categoryId)?.name ?? ''
    reset({
      title:       existingEvent.title,
      description: existingEvent.description,
      category:    categoryName,
      status:      existingEvent.status === 'live' ? 'live' : 'draft',
      date:        existingEvent.date,
      startTime:   existingEvent.startTime,
      endTime:     existingEvent.endTime ?? '',
      venueId:     existingEvent.venueId,
      location:    existingEvent.location ?? '',
      ticketTiers: existingEvent.ticketTiers.map(t => ({
        id:                t.id,
        name:              t.name,
        price:             t.price,
        quantity:          t.quantity,
        quantityRemaining: t.quantityRemaining,
        description:       t.description ?? '',
      })),
    })
    const imgs = [existingEvent.flyerSquareUrl, existingEvent.flyerPortraitUrl].filter(Boolean) as string[]
    setPosters(imgs)
  }, [existingEvent, categoriesData, reset])

  function handlePosterAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPosters(prev => prev.length < 6 ? [...prev, URL.createObjectURL(file)] : prev)
    e.target.value = ''
  }

  function handlePosterRemove(index: number) {
    setPosters(prev => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(values: EventFormValues, asDraft = false) {
    const categoryId = categoriesData?.find(c => c.name === values.category)?.id ?? ''
    const payload = {
      ...values,
      categoryId,
      status: (asDraft ? 'draft' : values.status) as 'draft' | 'live',
    }

    if (isNew) {
      await createMutation.mutateAsync(payload)
    } else {
      await updateMutation.mutateAsync({ id: eventId!, data: payload })
    }
    navigate('/events')
  }

  if (!isNew && isLoading) {
    return (
      <AdminLayout title="Edit Event">
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    )
  }

  const previewEvent: Event = {
    id: 'preview',
    vendorId: 'admin-001',
    venueId: formValues.venueId || 'Venue',
    title: formValues.title || 'Event Title',
    description: formValues.description || 'Event description will appear here.',
    date: formValues.date || new Date().toISOString().slice(0, 10),
    startTime: formValues.startTime || '20:00',
    endTime: formValues.endTime || undefined,
    status: formValues.status === 'live' ? 'live' : 'draft',
    location: formValues.location,
    flyerSquareUrl:   posters[0] ?? undefined,
    flyerPortraitUrl: posters[1] ?? undefined,
    ticketTiers: (formValues.ticketTiers ?? []).map(t => ({
      id: t.id,
      name: t.name || 'Wave',
      price: t.price || 0,
      quantity: t.quantity || 1,
      quantityRemaining: t.quantity || 1,
      description: t.description,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return (
    <AdminLayout title={isNew ? 'Create Event' : `Edit Event`}>
      <div className="flex gap-8">

        {/* FORM — left 60% */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Back button */}
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-sm text-admin-40 hover:text-admin-70 bg-admin-input hover:bg-admin-overlay border border-admin-md rounded-full px-4 py-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Events
          </button>

          {!isNew && existingEvent?.status === 'live' && (
            <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-4 py-3 text-sm text-neon-pink">
              This event is live — changes will update immediately.
            </div>
          )}

          <form onSubmit={handleSubmit(v => onSubmit(v))} className="space-y-6">

            {/* Basic info */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Basic Info</h2>
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs text-admin-50">Title *</Label>
                <Input id="title" {...register('title')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" placeholder="e.g. Neon Nights Vol. 3" />
                {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs text-admin-50">Description *</Label>
                <Textarea id="description" {...register('description')} rows={4} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30 resize-none" placeholder="Tell people what to expect..." />
                {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs text-admin-50">Category *</Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="w-full h-9 rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon-pink/30"
                  >
                    <option value="" className="bg-admin-surface">Select category…</option>
                    {(categoriesData ?? []).map(c => (
                      <option key={c.id} value={c.name} className="bg-admin-surface">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-admin-50">Status</Label>
                  <div className="flex items-center gap-3 h-9">
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Switch
                          checked={field.value === 'live'}
                          onCheckedChange={checked => field.onChange(checked ? 'live' : 'draft')}
                          className="data-[state=checked]:bg-neon-pink"
                        />
                      )}
                    />
                    <span className="text-sm text-admin-60">
                      {formValues.status === 'live' ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Date & time */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Date & Time</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="date" className="text-xs text-admin-50">Date *</Label>
                  <Input id="date" type="date" {...register('date')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                  {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startTime" className="text-xs text-admin-50">Start Time *</Label>
                  <Input id="startTime" type="time" {...register('startTime')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                  {errors.startTime && <p className="text-xs text-red-400">{errors.startTime.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endTime" className="text-xs text-admin-50">End Time</Label>
                  <Input id="endTime" type="time" {...register('endTime')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Location</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="venueId" className="text-xs text-admin-50">Venue Name *</Label>
                  <Input id="venueId" {...register('venueId')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" placeholder="e.g. Club Privé" />
                  {errors.venueId && <p className="text-xs text-red-400">{errors.venueId.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location" className="text-xs text-admin-50">Address *</Label>
                  <Input id="location" {...register('location')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" placeholder="e.g. Westlands, Nairobi" />
                  {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
                </div>
              </div>
            </section>

            {/* Media */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading font-bold text-sm text-foreground">Event Posters</h2>
                  <p className="text-[11px] text-admin-30 mt-0.5">Up to 6 posters · JPEG, PNG, WebP · max 5MB each</p>
                </div>
                <span className="text-xs text-admin-30">{posters.length}/6</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {posters.map((url, i) => (
                  <div key={i} className="relative group aspect-[3/4] rounded-xl overflow-hidden bg-admin-overlay border border-admin">
                    <img src={url} alt={`Poster ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handlePosterRemove(i)}
                        className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] text-white/70 text-center">
                      {i === 0 ? '1080 × 1080px' : i === 1 ? '1080 × 1620px' : 'Any ratio'}
                    </div>
                  </div>
                ))}
                {posters.length < 6 && (
                  <div
                    className="aspect-[3/4] rounded-xl border border-dashed border-admin-md hover:border-neon-pink/40 flex flex-col items-center justify-center cursor-pointer transition-colors bg-admin-overlay gap-1.5"
                    onClick={() => posterInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-admin-20" />
                    <p className="text-xs text-admin-20">Add poster</p>
                    <p className="text-[10px] text-admin-20 text-center px-2">
                      {posters.length === 0 ? '1080 × 1080px\n(square)' : posters.length === 1 ? '1080 × 1620px\n(portrait)' : 'Any ratio'}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePosterAdd}
              />
            </section>

            {/* Ticket waves */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Ticket Waves</h2>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-admin-40 font-mono">Wave {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-admin-20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Name *</Label>
                        <Input
                          {...register(`ticketTiers.${index}.name`)}
                          placeholder="e.g. Regular"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.name && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.name?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Price (KSh) *</Label>
                        <Input
                          type="number"
                          min={0}
                          {...register(`ticketTiers.${index}.price`, { valueAsNumber: true })}
                          placeholder="0"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.price && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.price?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Quantity *</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`ticketTiers.${index}.quantity`, { valueAsNumber: true })}
                          placeholder="100"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.quantity && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.quantity?.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-admin-50">Description (optional)</Label>
                      <Input
                        {...register(`ticketTiers.${index}.description`)}
                        placeholder="e.g. Includes welcome drink and priority entry"
                        className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {fields.length < 10 && (
                <button
                  type="button"
                  onClick={() => append(newTier())}
                  className="flex items-center gap-2 text-sm text-neon-pink/70 hover:text-neon-pink transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Wave
                </button>
              )}
              {errors.ticketTiers?.message && (
                <p className="text-xs text-red-400">{errors.ticketTiers.message}</p>
              )}
            </section>

            {/* Action bar */}
            <div className="flex items-center justify-between py-4 border-t border-admin sticky bottom-0 bg-admin-body">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="text-sm text-admin-30 hover:text-admin-60 transition-colors"
              >
                Discard changes
              </button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSubmit(v => onSubmit(v, true))}
                  disabled={isSubmitting}
                  className="rounded-full border-white/20 text-admin-70 hover:bg-admin-input hover:border-white/40"
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-neon-pink hover:bg-[#cc2272] text-white font-semibold px-6"
                >
                  {isSubmitting ? 'Saving...' : (formValues.status === 'live' ? 'Publish Event' : 'Save Event')}
                </Button>
              </div>
            </div>

          </form>
        </div>

        {/* PREVIEW — right 40% */}
        <div className="w-72 shrink-0">
          <div className="sticky top-20 space-y-3">
            <p className="text-xs text-admin-30 uppercase tracking-wider font-medium">Preview</p>
            <p className="text-[11px] text-admin-20">How this event appears on the site</p>
            <AdminEventCard event={previewEvent} onDelete={() => {}} />
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
