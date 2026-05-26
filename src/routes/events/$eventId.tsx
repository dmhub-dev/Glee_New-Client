import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { useAdminEvent, useCreateEvent, useUpdateEvent, useCategories, useLocations } from '@glee/api'
import { Button, Input, Textarea, Label, Skeleton } from '@glee/ui'
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

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z.enum(['food', 'drink', 'other']),
  price: z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Min 0'),
  description: z.string().optional(),
})

const scheduleSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().min(1, 'Description required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
})

const eventSchema = z.object({
  title: z.string().min(3, 'At least 3 characters').max(120),
  description: z.string().min(10, 'At least 10 characters').max(2000),
  category: z.string().min(1, 'Category required'),
  status: z.enum(['draft', 'active', 'postponed', 'cancelled', 'sold_out'] as const),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  locationId: z.string().min(1, 'Location required'),
  ticketTiers: z.array(tierSchema).min(1, 'At least one wave required'),
  menuItems: z.array(menuItemSchema).max(5, 'Max 5 menu items'),
  schedules: z.array(scheduleSchema).min(1, 'At least one schedule required'),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

type EventFormValues = z.infer<typeof eventSchema>

function newTier(): EventFormValues['ticketTiers'][number] {
  return { id: `wave-${Date.now()}`, name: '', price: 0, quantity: 1, quantityRemaining: 1, description: '' }
}

function newMenuItem(): EventFormValues['menuItems'][number] {
  return { name: '', category: 'other', price: 0, description: '' }
}

function newSchedule(): EventFormValues['schedules'][number] {
  const today = new Date().toISOString().slice(0, 10)
  return { name: '', description: '', startDate: today, endDate: today, startTime: '09:00', endTime: '18:00' }
}

const MENU_CATEGORIES: { value: EventFormValues['menuItems'][number]['category']; label: string }[] = [
  { value: 'food',  label: 'Food'  },
  { value: 'drink', label: 'Drink' },
  { value: 'other', label: 'Other' },
]

export default function EventFormPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const isNew = !eventId || eventId === 'new'
  const navigate = useNavigate()

  const { data: existingEvent, isLoading } = useAdminEvent(isNew ? '' : eventId!)
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()
  const { data: categoriesData } = useCategories()
  const { data: locationsData } = useLocations()

  const [landscapes, setLandscapes] = useState<{ url: string; file?: File }[]>([])
  const [portraits,  setPortraits]  = useState<{ url: string; file?: File }[]>([])
  const [mediums,    setMediums]    = useState<{ url: string; file?: File }[]>([])
  const posterInputRef  = useRef<HTMLInputElement>(null)
  const posterTargetRef = useRef<'landscape' | 'portrait' | 'medium'>('landscape')

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      status: 'draft',
      startDate: '',
      endDate:   '',
      startTime: '',
      endTime: '',
      locationId: '',
      ticketTiers: [newTier()],
      menuItems: [],
      schedules: [newSchedule()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTiers' })
  const { fields: menuFields, append: appendMenu, remove: removeMenu } = useFieldArray({ control, name: 'menuItems' })
  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({ control, name: 'schedules' })
  const formValues = watch()

  useEffect(() => {
    if (!existingEvent) return
    const categoryName = categoriesData?.find(c => c.id === existingEvent.categoryId)?.name ?? ''
    reset({
      title:       existingEvent.title,
      description: existingEvent.description,
      category:    categoryName,
      status:      existingEvent.status,
      startDate:   existingEvent.startDate,
      endDate:     existingEvent.endDate,
      startTime:   existingEvent.startTime,
      endTime:     existingEvent.endTime ?? '',
      locationId:  existingEvent.locationId ?? existingEvent.venueId,
      ticketTiers: existingEvent.ticketTiers.map(t => ({
        id:                t.id,
        name:              t.name,
        price:             t.price,
        quantity:          t.quantity,
        quantityRemaining: t.quantityRemaining,
        description:       t.description ?? '',
      })),
      menuItems: (existingEvent.menuItems ?? []).map(m => ({
        name:        m.name,
        category:    (['food', 'drink', 'other'].includes(m.category) ? m.category : 'other') as 'food' | 'drink' | 'other',
        price:       m.price,
        description: m.description ?? '',
      })),
      schedules: existingEvent.schedules?.length
        ? existingEvent.schedules.map(s => {
            const start = new Date(s.startDate)
            const end = new Date(s.endDate)
            return {
              name: s.name,
              description: s.description,
              startDate: start.toISOString().split('T')[0],
              endDate: end.toISOString().split('T')[0],
              startTime: start.toTimeString().slice(0, 5),
              endTime: end.toTimeString().slice(0, 5),
            }
          })
        : [newSchedule()],
    })
    if (existingEvent.flyerSquareUrl)   setLandscapes([{ url: existingEvent.flyerSquareUrl }])
    if (existingEvent.flyerPortraitUrl) setPortraits([{ url: existingEvent.flyerPortraitUrl }])
  }, [existingEvent, categoriesData, reset])

  const POSTER_SETTERS = {
    landscape: setLandscapes,
    portrait:  setPortraits,
    medium:    setMediums,
  } as const

  function triggerPosterPick(category: 'landscape' | 'portrait' | 'medium') {
    posterTargetRef.current = category
    posterInputRef.current?.click()
  }

  function handlePosterAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    POSTER_SETTERS[posterTargetRef.current](prev => prev.length < 2 ? [...prev, { url, file }] : prev)
    e.target.value = ''
  }

  function handlePosterRemove(category: 'landscape' | 'portrait' | 'medium', index: number) {
    POSTER_SETTERS[category](prev => {
      const item = prev[index]
      if (item?.file) URL.revokeObjectURL(item.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function onSubmit(values: EventFormValues, asDraft = false) {
    const categoryId = categoriesData?.find(c => c.name === values.category)?.id ?? ''
    const posterFiles = [
      ...landscapes.filter(p => p.file).map(p => p.file!),
      ...portraits.filter(p => p.file).map(p => p.file!),
      ...mediums.filter(p => p.file).map(p => p.file!),
    ]
    const payload = {
      title: values.title,
      description: values.description,
      categoryId,
      locationId: values.locationId,
      status: asDraft ? 'draft' : values.status,
      startDate: values.startDate,
      endDate: values.endDate,
      startTime: values.startTime,
      endTime: values.endTime,
      ticketTiers: values.ticketTiers,
      schedules: values.schedules,
      posterFiles: posterFiles.length > 0 ? posterFiles : undefined,
      menuItems: values.menuItems?.length ? values.menuItems : undefined,
    }

    if (isNew) {
      await createMutation.mutateAsync(payload)
    } else {
      await updateMutation.mutateAsync({ id: eventId!, data: payload })
    }
    navigate('/dashboard/events')
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
    venueId: formValues.locationId || 'Venue',
    title: formValues.title || 'Event Title',
    description: formValues.description || 'Event description will appear here.',
    startDate: formValues.startDate || new Date().toISOString().slice(0, 10),
    endDate:   formValues.endDate   || formValues.startDate || new Date().toISOString().slice(0, 10),
    startTime: formValues.startTime || '20:00',
    endTime: formValues.endTime || undefined,
    status: formValues.status === 'active' ? 'active' : 'draft',
    location: locationsData?.find(l => l.id === formValues.locationId)?.name,
    locationId: formValues.locationId,
    schedules: formValues.schedules?.map(s => ({
      name: s.name,
      description: s.description,
      startDate: `${s.startDate}T${s.startTime}:00`,
      endDate: `${s.endDate}T${s.endTime}:00`,
    })),
    flyerSquareUrl:   landscapes[0]?.url ?? undefined,
    flyerPortraitUrl: portraits[0]?.url ?? undefined,
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
            onClick={() => navigate('/dashboard/events')}
            className="flex items-center gap-2 text-sm text-admin-40 hover:text-admin-70 bg-admin-input hover:bg-admin-overlay border border-admin-md rounded-full px-4 py-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Events
          </button>

          {!isNew && existingEvent?.status === 'active' && (
            <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-4 py-3 text-sm text-neon-pink">
              This event is active — changes will update immediately.
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
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <div className="flex rounded-md border border-admin-md overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => field.onChange('draft')}
                          className={`flex-1 px-4 text-sm font-medium transition-colors ${
                            field.value === 'draft'
                              ? 'bg-admin-overlay text-foreground'
                              : 'bg-transparent text-admin-40 hover:text-admin-70'
                          }`}
                        >
                          Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange('active')}
                          className={`flex-1 px-4 text-sm font-medium transition-colors border-l border-admin-md ${
                            field.value === 'active'
                              ? 'bg-neon-pink text-white'
                              : 'bg-transparent text-admin-40 hover:text-admin-70'
                          }`}
                        >
                          Active
                        </button>
                      </div>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* Date & time */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Date & Time</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startDate" className="text-xs text-admin-50">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', {
                      onChange: e => {
                        const val = e.target.value
                        if (val && !formValues.endDate) {
                          setValue('endDate', val)
                        }
                      },
                    })}
                    className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                  />
                  {errors.startDate && <p className="text-xs text-red-400">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startTime" className="text-xs text-admin-50">Start Time *</Label>
                  <Input id="startTime" type="time" {...register('startTime')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                  {errors.startTime && <p className="text-xs text-red-400">{errors.startTime.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate" className="text-xs text-admin-50">End Date *</Label>
                  <Input id="endDate" type="date" {...register('endDate')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                  {errors.endDate && <p className="text-xs text-red-400">{errors.endDate.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endTime" className="text-xs text-admin-50">End Time</Label>
                  <Input id="endTime" type="time" {...register('endTime')} className="bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                </div>
              </div>
            </section>

            {/* Schedule */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-sm text-foreground">Event Schedule</h2>
                <button
                  type="button"
                  onClick={() => appendSchedule(newSchedule())}
                  className="flex items-center gap-2 text-sm text-neon-pink/70 hover:text-neon-pink transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Schedule
                </button>
              </div>
              <div className="space-y-3">
                {scheduleFields.map((field, index) => (
                  <div key={field.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-admin-40 font-mono">Schedule {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSchedule(index)}
                        disabled={scheduleFields.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-admin-20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-admin-50">Name *</Label>
                      <Input
                        {...register(`schedules.${index}.name`)}
                        placeholder="e.g. Summer Music Carnival"
                        className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                      />
                      {errors.schedules?.[index]?.name && (
                        <p className="text-xs text-red-400">{errors.schedules[index]?.name?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-admin-50">Description *</Label>
                      <Textarea
                        {...register(`schedules.${index}.description`)}
                        rows={3}
                        placeholder="9:00am–10:00am guest arrival, 10:00am–12:00pm opening performances..."
                        className="text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30 resize-none"
                      />
                      {errors.schedules?.[index]?.description && (
                        <p className="text-xs text-red-400">{errors.schedules[index]?.description?.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Start Date *</Label>
                        <Input type="date" {...register(`schedules.${index}.startDate`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Start Time *</Label>
                        <Input type="time" {...register(`schedules.${index}.startTime`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">End Date *</Label>
                        <Input type="date" {...register(`schedules.${index}.endDate`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">End Time *</Label>
                        <Input type="time" {...register(`schedules.${index}.endTime`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.schedules?.message && (
                <p className="text-xs text-red-400">{errors.schedules.message}</p>
              )}
            </section>

            {/* Location */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Location</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="locationId" className="text-xs text-admin-50">Location *</Label>
                  <select
                    id="locationId"
                    {...register('locationId')}
                    className="w-full h-9 rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon-pink/30"
                  >
                    <option value="" className="bg-admin-surface">Select location…</option>
                    {(locationsData ?? []).map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-admin-surface">
                        {loc.name} — {loc.address}
                      </option>
                    ))}
                  </select>
                  {errors.locationId && <p className="text-xs text-red-400">{errors.locationId.message}</p>}
                </div>
              </div>
            </section>

            {/* Media */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-sm text-foreground">Event Posters</h2>
                <span className="text-[11px] text-admin-30">JPEG, PNG, WebP · max 5MB · 2 per format</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { key: 'landscape', label: 'Landscape', dim: '1920×1080', list: landscapes },
                    { key: 'portrait',  label: 'Portrait',  dim: '1080×1920', list: portraits  },
                    { key: 'medium',    label: 'Medium',    dim: '1200×900',  list: mediums    },
                  ] as const
                ).map(({ key, label, dim, list }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-admin-50">{label}</span>
                      <span className="text-[10px] text-admin-30">{dim} · {list.length}/2</span>
                    </div>
                    <div className="flex gap-1.5">
                      {list.map(({ url }, i) => (
                        <div key={i} className="relative group h-14 flex-1 rounded-lg overflow-hidden bg-admin-overlay border border-admin">
                          <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handlePosterRemove(key, i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {list.length < 2 && (
                        <div
                          className="h-14 flex-1 rounded-lg border border-dashed border-admin-md hover:border-neon-pink/40 flex flex-col items-center justify-center cursor-pointer transition-colors bg-admin-overlay gap-0.5"
                          onClick={() => triggerPosterPick(key)}
                        >
                          <Upload className="w-3.5 h-3.5 text-admin-20" />
                          <span className="text-[9px] text-admin-20 leading-tight text-center">{dim}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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

            {/* Menu Items */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-sm text-foreground">Menu Items</h2>
                  <p className="text-[11px] text-admin-30 mt-0.5">Optional — sponsor items guests can add to their ticket purchase (max 5)</p>
                </div>
              </div>
              <div className="space-y-3">
                {menuFields.map((field, index) => (
                  <div key={field.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-admin-40 font-mono">Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMenu(index)}
                        className="w-6 h-6 rounded flex items-center justify-center text-admin-20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Name *</Label>
                        <Input
                          {...register(`menuItems.${index}.name`)}
                          placeholder="e.g. Hennessy VS"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.menuItems?.[index]?.name && (
                          <p className="text-xs text-red-400">{errors.menuItems[index]?.name?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Category *</Label>
                        <select
                          {...register(`menuItems.${index}.category`)}
                          className="w-full h-8 rounded-md border border-admin-md bg-admin-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon-pink/30"
                        >
                          {MENU_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value} className="bg-admin-surface">{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Price (KSh) *</Label>
                        <Input
                          type="number"
                          min={0}
                          {...register(`menuItems.${index}.price`, { valueAsNumber: true })}
                          placeholder="0"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.menuItems?.[index]?.price && (
                          <p className="text-xs text-red-400">{errors.menuItems[index]?.price?.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-admin-50">Description (optional)</Label>
                      <Input
                        {...register(`menuItems.${index}.description`)}
                        placeholder="e.g. 700ml bottle, serves 4"
                        className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {menuFields.length < 5 && (
                <button
                  type="button"
                  onClick={() => appendMenu(newMenuItem())}
                  className="flex items-center gap-2 text-sm text-neon-pink/70 hover:text-neon-pink transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Menu Item
                </button>
              )}
              {errors.menuItems?.message && (
                <p className="text-xs text-red-400">{errors.menuItems.message}</p>
              )}
            </section>

            {/* Action bar */}
            <div className="flex items-center justify-between py-4 border-t border-admin sticky bottom-0 bg-admin-body">
              <button
                type="button"
                onClick={() => navigate('/dashboard/events')}
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
                  {isSubmitting ? 'Saving...' : (formValues.status === 'active' ? 'Publish Event' : 'Save Event')}
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
