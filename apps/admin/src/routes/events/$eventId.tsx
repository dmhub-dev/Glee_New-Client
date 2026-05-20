import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { useAdminEvent, useCreateEvent, useUpdateEvent } from '../../lib/queries/events'
import { Button, Input, Textarea, Label, Switch, Skeleton } from '@glee/ui'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
import type { Event } from '@glee/types'

const CATEGORIES = ['Music', 'Fashion', 'Comedy', 'Sports', 'Art', 'Food & Drink', 'Wellness', 'Other'] as const

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
  category: z.enum(CATEGORIES),
  status: z.enum(['draft', 'live'] as const),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  venueId: z.string().min(1, 'Venue required'),
  location: z.string().min(3, 'Location required'),
  ticketTiers: z.array(tierSchema).min(1, 'At least one tier required'),
})

type EventFormValues = z.infer<typeof eventSchema>

function newTier(): EventFormValues['ticketTiers'][number] {
  return { id: `tier-${Date.now()}`, name: '', price: 0, quantity: 1, quantityRemaining: 1, description: '' }
}

export default function EventFormPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const isNew = !eventId || eventId === 'new'
  const navigate = useNavigate()

  const { data: existingEvent, isLoading } = useAdminEvent(isNew ? '' : eventId!)
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()

  const [portraitPreview, setPortraitPreview] = useState<string | null>(null)
  const [squarePreview, setSquarePreview] = useState<string | null>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const squareInputRef = useRef<HTMLInputElement>(null)

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
      category: 'Music',
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
    if (existingEvent) {
      reset({
        title: existingEvent.title,
        description: existingEvent.description,
        category: (CATEGORIES.includes(existingEvent.venueId as typeof CATEGORIES[number])
          ? existingEvent.venueId
          : 'Music') as typeof CATEGORIES[number],
        status: existingEvent.status === 'live' ? 'live' : 'draft',
        date: existingEvent.date,
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime ?? '',
        venueId: existingEvent.venueId,
        location: existingEvent.location ?? '',
        ticketTiers: existingEvent.ticketTiers.map(t => ({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          quantityRemaining: t.quantityRemaining,
          description: t.description ?? '',
        })),
      })
      if (existingEvent.flyerPortraitUrl) setPortraitPreview(existingEvent.flyerPortraitUrl)
      if (existingEvent.flyerSquareUrl) setSquarePreview(existingEvent.flyerSquareUrl)
    }
  }, [existingEvent, reset])

  function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) {
    const file = e.target.files?.[0]
    if (file) setter(URL.createObjectURL(file))
  }

  async function onSubmit(values: EventFormValues, asDraft = false) {
    const payload: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      vendorId: 'admin-001',
      venueId: values.venueId,
      title: values.title,
      description: values.description,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime || undefined,
      status: asDraft ? 'draft' : (values.status === 'live' ? 'live' : 'draft'),
      location: values.location,
      flyerPortraitUrl: portraitPreview ?? undefined,
      flyerSquareUrl: squarePreview ?? undefined,
      ticketTiers: values.ticketTiers.map(t => ({
        id: t.id,
        name: t.name,
        price: t.price,
        quantity: t.quantity,
        quantityRemaining: isNew ? t.quantity : t.quantityRemaining,
        description: t.description || undefined,
      })),
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
    flyerSquareUrl: squarePreview ?? undefined,
    flyerPortraitUrl: portraitPreview ?? undefined,
    ticketTiers: (formValues.ticketTiers ?? []).map(t => ({
      id: t.id,
      name: t.name || 'Tier',
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
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-1.5 transition-colors"
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
            <section className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Basic Info</h2>
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs text-white/50">Title *</Label>
                <Input id="title" {...register('title')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" placeholder="e.g. Neon Nights Vol. 3" />
                {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs text-white/50">Description *</Label>
                <Textarea id="description" {...register('description')} rows={4} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30 resize-none" placeholder="Tell people what to expect..." />
                {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs text-white/50">Category *</Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon-pink/30"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0f0f15]">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Status</Label>
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
                    <span className="text-sm text-white/60">
                      {formValues.status === 'live' ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Date & time */}
            <section className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Date & Time</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="date" className="text-xs text-white/50">Date *</Label>
                  <Input id="date" type="date" {...register('date')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" />
                  {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startTime" className="text-xs text-white/50">Start Time *</Label>
                  <Input id="startTime" type="time" {...register('startTime')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" />
                  {errors.startTime && <p className="text-xs text-red-400">{errors.startTime.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endTime" className="text-xs text-white/50">End Time</Label>
                  <Input id="endTime" type="time" {...register('endTime')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Location</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="venueId" className="text-xs text-white/50">Venue Name *</Label>
                  <Input id="venueId" {...register('venueId')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" placeholder="e.g. Club Privé" />
                  {errors.venueId && <p className="text-xs text-red-400">{errors.venueId.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location" className="text-xs text-white/50">Address *</Label>
                  <Input id="location" {...register('location')} className="bg-white/5 border-white/10 focus-visible:ring-neon-pink/30" placeholder="e.g. Westlands, Nairobi" />
                  {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
                </div>
              </div>
            </section>

            {/* Media */}
            <section className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Event Flyers</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Portrait flyer */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">Portrait Flyer</Label>
                  <div
                    className="h-40 rounded-xl border border-dashed border-white/10 hover:border-neon-pink/40 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative bg-white/[0.03]"
                    onClick={() => portraitInputRef.current?.click()}
                  >
                    {portraitPreview ? (
                      <img src={portraitPreview} alt="Portrait" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-white/20 mx-auto mb-1" />
                        <p className="text-xs text-white/20">Click to upload</p>
                        <p className="text-[11px] text-white/10">JPEG, PNG, WebP · max 5MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={portraitInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleImageChange(e, setPortraitPreview)} />
                </div>
                {/* Square flyer */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">Square Flyer</Label>
                  <div
                    className="h-40 rounded-xl border border-dashed border-white/10 hover:border-neon-pink/40 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative bg-white/[0.03]"
                    onClick={() => squareInputRef.current?.click()}
                  >
                    {squarePreview ? (
                      <img src={squarePreview} alt="Square" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-white/20 mx-auto mb-1" />
                        <p className="text-xs text-white/20">Click to upload</p>
                        <p className="text-[11px] text-white/10">JPEG, PNG, WebP · max 5MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={squareInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleImageChange(e, setSquarePreview)} />
                </div>
              </div>
            </section>

            {/* Ticket tiers */}
            <section className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Ticket Tiers</h2>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40 font-mono">Tier {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-white/50">Name *</Label>
                        <Input
                          {...register(`ticketTiers.${index}.name`)}
                          placeholder="e.g. Regular"
                          className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.name && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.name?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-white/50">Price (KSh) *</Label>
                        <Input
                          type="number"
                          min={0}
                          {...register(`ticketTiers.${index}.price`, { valueAsNumber: true })}
                          placeholder="0"
                          className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.price && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.price?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-white/50">Quantity *</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`ticketTiers.${index}.quantity`, { valueAsNumber: true })}
                          placeholder="100"
                          className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketTiers?.[index]?.quantity && (
                          <p className="text-xs text-red-400">{errors.ticketTiers[index]?.quantity?.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/50">Description (optional)</Label>
                      <Input
                        {...register(`ticketTiers.${index}.description`)}
                        placeholder="e.g. Includes welcome drink and priority entry"
                        className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-neon-pink/30"
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
                  Add Tier
                </button>
              )}
              {errors.ticketTiers?.message && (
                <p className="text-xs text-red-400">{errors.ticketTiers.message}</p>
              )}
            </section>

            {/* Action bar */}
            <div className="flex items-center justify-between py-4 border-t border-white/5 sticky bottom-0 bg-glee-bg">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Discard changes
              </button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSubmit(v => onSubmit(v, true))}
                  disabled={isSubmitting}
                  className="rounded-full border-white/20 text-white/70 hover:bg-white/5 hover:border-white/40"
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
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Preview</p>
            <p className="text-[11px] text-white/20">How this event appears on the site</p>
            <AdminEventCard event={previewEvent} onDelete={() => {}} />
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
