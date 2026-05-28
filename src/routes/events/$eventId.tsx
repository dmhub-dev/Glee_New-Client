import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { useAdminUser } from '../../app/providers'
import { useAdminEvent, useCreateEvent, useUpdateEvent, useCategories, useLocations } from '@glee/api'
import { Button, Input, Textarea, Label, Skeleton, useToast } from '@glee/ui'
import { ArrowLeft, CalendarClock, Check, ChevronsUpDown, Circle, MapPin, Plus, Trash2, Upload, X } from 'lucide-react'
import type { Event } from '@glee/types'
import type { Location } from '@glee/api'

const tierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name required'),
  price: z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Min 0'),
  quantity: z.number({ invalid_type_error: 'Must be a number' }).min(1, 'Min 1'),
  quantityRemaining: z.number(),
  description: z.string().optional(),
})

const waveSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Wave name required'),
  description: z.string().optional(),
  startsAt: z.string().min(1, 'Start date required'),
  endsAt: z.string().min(1, 'End date required'),
  ticketTiers: z.array(tierSchema).min(1, 'At least one ticket tier required'),
}).refine(data => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
  message: 'Wave end must be after start',
  path: ['endsAt'],
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
  ticketTiers: z.array(tierSchema).optional(),
  ticketWaves: z.array(waveSchema).min(1, 'At least one ticket wave required'),
  menuItems: z.array(menuItemSchema).max(5, 'Max 5 menu items'),
  schedules: z.array(scheduleSchema).min(1, 'At least one schedule required'),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

type EventFormValues = z.infer<typeof eventSchema>

function newTier(): NonNullable<EventFormValues['ticketTiers']>[number] {
  return { id: `wave-${Date.now()}`, name: '', price: 0, quantity: 1, quantityRemaining: 1, description: '' }
}

function newWave(index = 0): EventFormValues['ticketWaves'][number] {
  const today = new Date()
  const startsAt = new Date(today)
  startsAt.setDate(today.getDate() + index * 14)
  const endsAt = new Date(startsAt)
  endsAt.setDate(startsAt.getDate() + 14)
  return {
    id: `ticket-wave-${Date.now()}-${index}`,
    name: `Wave ${index + 1}`,
    description: '',
    startsAt: startsAt.toISOString().slice(0, 16),
    endsAt: endsAt.toISOString().slice(0, 16),
    ticketTiers: [newTier()],
  }
}

function newMenuItem(): EventFormValues['menuItems'][number] {
  return { name: '', category: 'other', price: 0, description: '' }
}

function newSchedule(): EventFormValues['schedules'][number] {
  const today = new Date().toISOString().slice(0, 10)
  return { name: 'Event Itinerary', description: '', startDate: today, endDate: today, startTime: '09:00', endTime: '18:00' }
}

function newDaySchedule(dayNumber: number, date?: string): EventFormValues['schedules'][number] {
  const day = date ?? new Date().toISOString().slice(0, 10)
  return { name: `Day ${dayNumber}`, description: '', startDate: day, endDate: day, startTime: '09:00', endTime: '18:00' }
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

function getScheduleEndDate(schedule: EventFormValues['schedules'][number]) {
  return schedule.endTime <= schedule.startTime ? addDays(schedule.startDate, 1) : schedule.startDate
}

function scheduleStartValue(schedule: EventFormValues['schedules'][number]) {
  return new Date(`${schedule.startDate}T${schedule.startTime}:00`).getTime()
}

function scheduleEndValue(schedule: EventFormValues['schedules'][number]) {
  return new Date(`${schedule.endDate}T${schedule.endTime}:00`).getTime()
}

function sortSchedules(schedules: EventFormValues['schedules']) {
  return [...schedules].sort((a, b) => scheduleStartValue(a) - scheduleStartValue(b))
}

function parseTimelineRows(value: string) {
  const rows = value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.+?)\s*(?:-{2,}|—|–)\s*(.+)$/)
      return match ? { time: match[1].trim(), text: match[2].trim() } : { time: '', text: line }
    })

  return rows.length > 0 ? rows : [{ time: '', text: '' }]
}

function formatTimelineRows(rows: Array<{ time: string; text: string }>) {
  return rows
    .filter(row => row.time.trim() || row.text.trim())
    .map(row => row.time.trim() ? `${row.time.trim()} -------- ${row.text.trim()}` : row.text.trim())
    .join('\n')
}

function TimelineEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [rows, setRows] = useState(() => parseTimelineRows(value))
  const lastValueRef = useRef(value)

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value
      setRows(parseTimelineRows(value))
    }
  }, [value])

  function updateRow(index: number, next: Partial<{ time: string; text: string }>) {
    const nextRows = rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...next } : row)
    setRows(nextRows)
    lastValueRef.current = formatTimelineRows(nextRows)
    onChange(formatTimelineRows(nextRows))
  }

  function addRow() {
    setRows([...rows, { time: '', text: '' }])
  }

  function removeRow(index: number) {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
    const safeRows = nextRows.length ? nextRows : [{ time: '', text: '' }]
    setRows(safeRows)
    lastValueRef.current = formatTimelineRows(safeRows)
    onChange(formatTimelineRows(safeRows))
  }

  return (
    <div className="rounded-xl border border-admin-md bg-admin-input p-3">
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[104px_1fr_32px]">
            <Input
              value={row.time}
              onChange={event => updateRow(index, { time: event.target.value })}
              placeholder="2:00pm"
              className="h-9 bg-admin-surface border-admin text-sm font-mono text-neon-pink placeholder:text-admin-30"
            />
            <Input
              value={row.text}
              onChange={event => updateRow(index, { text: event.target.value })}
              placeholder="Guest arrival, welcome drinks, and check-in"
              className="h-9 bg-admin-surface border-admin text-sm placeholder:text-admin-30"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-admin text-admin-30 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              title="Remove timeline row"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-admin pt-3">
        <p className="text-[11px] text-admin-40">Rows are saved as a timeline and shown in this order.</p>
        <button
          type="button"
          onClick={addRow}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-admin bg-admin-overlay px-3 py-1.5 text-xs font-medium text-admin-60 transition-colors hover:border-neon-pink/30 hover:text-neon-pink"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>
    </div>
  )
}

const MENU_CATEGORIES: { value: EventFormValues['menuItems'][number]['category']; label: string }[] = [
  { value: 'food',  label: 'Food'  },
  { value: 'drink', label: 'Drink' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: EventFormValues['status']; label: string; description: string; className: string }[] = [
  { value: 'draft',     label: 'Draft',     description: 'Keep hidden while editing', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  { value: 'active',    label: 'Active',    description: 'Visible and sellable',      className: 'border-green-500/30 bg-green-500/10 text-green-400' },
  { value: 'postponed', label: 'Postponed', description: 'Temporarily delayed',       className: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { value: 'cancelled', label: 'Cancelled', description: 'No longer running',         className: 'border-red-500/30 bg-red-500/10 text-red-400' },
  { value: 'sold_out',  label: 'Sold Out',  description: 'Capacity reached',          className: 'border-admin bg-admin-overlay text-admin-50' },
]

function LocationPicker({
  value,
  onChange,
  locations,
}: {
  value: string
  onChange: (value: string) => void
  locations: Location[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = locations.find(location => location.id === value)
  const filtered = locations.filter(location => {
    const haystack = `${location.name} ${location.address}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-admin-md bg-admin-input px-3 text-left text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon-pink/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
          <span className="min-w-0">
            <span className="block truncate">{selected?.name ?? 'Search and select location'}</span>
            {selected?.address && <span className="block truncate text-xs text-admin-40">{selected.address}</span>}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-admin-30" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin-card">
            <div className="border-b border-admin p-2">
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search locations..."
                className="h-9 bg-admin-input border-admin text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-admin-40">No locations found.</p>
              ) : filtered.map(location => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => {
                    onChange(location.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-admin-overlay"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-admin">
                    {location.id === value && <Check className="h-3.5 w-3.5 text-neon-pink" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-admin-90">{location.name}</span>
                    <span className="block truncate text-xs text-admin-40">{location.address}</span>
                    <span className="mt-1 block text-[11px] text-admin-30">Capacity {location.capacity.toLocaleString()}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function EventFormPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const isNew = !eventId || eventId === 'new'
  const navigate = useNavigate()
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'

  const { data: existingEvent, isLoading } = useAdminEvent(isNew ? '' : eventId!, { vendorScoped: isVendorRole })
  const createMutation = useCreateEvent({ vendorScoped: isVendorRole })
  const updateMutation = useUpdateEvent({ vendorScoped: isVendorRole })
  const { data: categoriesData } = useCategories()
  const { data: locationsData } = useLocations({ vendorScoped: isVendorRole })
  const { toast } = useToast()

  const [landscapes, setLandscapes] = useState<{ url: string; file?: File }[]>([])
  const [portraits,  setPortraits]  = useState<{ url: string; file?: File }[]>([])
  const [mediums,    setMediums]    = useState<{ url: string; file?: File }[]>([])
  const [eventDurationMode, setEventDurationMode] = useState<'single' | 'multi'>('single')
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
      ticketWaves: [newWave()],
      menuItems: [],
      schedules: [newSchedule()],
    },
  })

  const { fields: waveFields, append: appendWave, remove: removeWave } = useFieldArray({ control, name: 'ticketWaves' })
  const { fields: menuFields, append: appendMenu, remove: removeMenu } = useFieldArray({ control, name: 'menuItems' })
  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({ control, name: 'schedules' })
  const formValues = watch()

  function addTierToWave(waveIndex: number) {
    const waves = [...(formValues.ticketWaves ?? [])]
    const wave = waves[waveIndex]
    if (!wave) return
    waves[waveIndex] = { ...wave, ticketTiers: [...wave.ticketTiers, newTier()] }
    setValue('ticketWaves', waves, { shouldDirty: true, shouldValidate: true })
  }

  function removeTierFromWave(waveIndex: number, tierIndex: number) {
    const waves = [...(formValues.ticketWaves ?? [])]
    const wave = waves[waveIndex]
    if (!wave || wave.ticketTiers.length <= 1) return
    waves[waveIndex] = { ...wave, ticketTiers: wave.ticketTiers.filter((_, index) => index !== tierIndex) }
    setValue('ticketWaves', waves, { shouldDirty: true, shouldValidate: true })
  }

  function switchDurationMode(mode: 'single' | 'multi') {
    setEventDurationMode(mode)
    const schedules = formValues.schedules?.length ? formValues.schedules : [newSchedule()]
    if (mode === 'single') {
      const first = schedules[0]
      setValue('schedules', [{
        ...first,
        name: 'Event Itinerary',
        endDate: getScheduleEndDate(first),
      }], { shouldDirty: true, shouldValidate: true })
      return
    }

    const first = schedules[0]
    const firstDay = {
      ...first,
      name: 'Day 1',
      endDate: getScheduleEndDate(first),
    }
    setValue('schedules', schedules.length > 1 ? schedules.map((schedule, index) => ({
      ...schedule,
      name: `Day ${index + 1}`,
      endDate: getScheduleEndDate(schedule),
    })) : [firstDay, newDaySchedule(2, addDays(first.startDate, 1))], { shouldDirty: true, shouldValidate: true })
  }

  useEffect(() => {
    const schedules = formValues.schedules ?? []
    const sortedSchedules = sortSchedules(schedules)
    const first = sortedSchedules[0]
    const last = [...sortedSchedules].sort((a, b) => scheduleEndValue(a) - scheduleEndValue(b)).at(-1)
    if (!first || !last) return
    if (first.startDate && first.startDate !== formValues.startDate) setValue('startDate', first.startDate)
    if (first.startTime && first.startTime !== formValues.startTime) setValue('startTime', first.startTime)
    if (last.endDate && last.endDate !== formValues.endDate) setValue('endDate', last.endDate)
    if (last.endTime && last.endTime !== formValues.endTime) setValue('endTime', last.endTime)
  }, [formValues.schedules, formValues.startDate, formValues.startTime, formValues.endDate, formValues.endTime, setValue])

  useEffect(() => {
    ;(formValues.schedules ?? []).forEach((schedule, index) => {
      const expectedName = eventDurationMode === 'single' ? 'Event Itinerary' : `Day ${index + 1}`
      const expectedEndDate = getScheduleEndDate(schedule)
      if (schedule.name !== expectedName) {
        setValue(`schedules.${index}.name`, expectedName, { shouldValidate: true })
      }
      if (schedule.endDate !== expectedEndDate) {
        setValue(`schedules.${index}.endDate`, expectedEndDate, { shouldValidate: true })
      }
    })
  }, [eventDurationMode, formValues.schedules, setValue])

  useEffect(() => {
    if (!existingEvent) return
    const categoryName = categoriesData?.find(c => c.id === existingEvent.categoryId)?.name ?? ''
    setEventDurationMode((existingEvent.schedules?.length ?? 0) > 1 ? 'multi' : 'single')
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
      ticketWaves: existingEvent.ticketWaves?.length
        ? existingEvent.ticketWaves.map(wave => ({
            id: wave.id,
            name: wave.name,
            description: wave.description ?? '',
            startsAt: new Date(wave.startsAt).toISOString().slice(0, 16),
            endsAt: new Date(wave.endsAt).toISOString().slice(0, 16),
            ticketTiers: wave.ticketTiers.map(t => ({
              id:                t.id,
              name:              t.name,
              price:             t.price,
              quantity:          t.quantity,
              quantityRemaining: t.quantityRemaining,
              description:       t.description ?? '',
            })),
          }))
        : [{
            ...newWave(),
            startsAt: `${existingEvent.startDate}T${existingEvent.startTime || '00:00'}`,
            endsAt: `${existingEvent.endDate}T${existingEvent.endTime || existingEvent.startTime || '23:59'}`,
            ticketTiers: existingEvent.ticketTiers.map(t => ({
              id:                t.id,
              name:              t.name,
              price:             t.price,
              quantity:          t.quantity,
              quantityRemaining: t.quantityRemaining,
              description:       t.description ?? '',
            })),
          }],
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
      ticketTiers: values.ticketWaves.flatMap(wave => wave.ticketTiers),
      ticketWaves: values.ticketWaves,
      schedules: sortSchedules(values.schedules.map(schedule => ({
        ...schedule,
        endDate: getScheduleEndDate(schedule),
      }))),
      posterFiles: posterFiles.length > 0 ? posterFiles : undefined,
      menuItems: values.menuItems?.length ? values.menuItems : undefined,
    }

    try {
      if (isNew) {
        await createMutation.mutateAsync(payload)
      } else {
        await updateMutation.mutateAsync({ id: eventId!, data: payload })
      }
      toast({
        title: asDraft ? 'Event saved as draft' : values.status === 'active' ? 'Event published' : 'Event saved',
      })
      navigate('/dashboard/events')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please check the event details and try again.'
      toast({ title: 'Could not save event', description: message, variant: 'destructive' })
    }
  }

  function onInvalid() {
    toast({
      title: 'Event details need attention',
      description: 'Please complete the required fields before publishing.',
      variant: 'destructive',
    })
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

  const previewTicketTiers = (formValues.ticketWaves?.find(wave => wave.ticketTiers.length)?.ticketTiers ?? formValues.ticketTiers ?? []).map(t => ({
    id: t.id,
    name: t.name || 'Ticket tier',
    price: t.price || 0,
    quantity: t.quantity || 1,
    quantityRemaining: t.quantity || 1,
    description: t.description,
  }))

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
    categoryName: formValues.category || undefined,
    schedules: formValues.schedules?.map(s => ({
      name: s.name,
      description: s.description,
      startDate: `${s.startDate}T${s.startTime}:00`,
      endDate: `${s.endDate}T${s.endTime}:00`,
    })),
    flyerSquareUrl:   landscapes[0]?.url ?? undefined,
    flyerPortraitUrl: portraits[0]?.url ?? undefined,
    ticketTiers: previewTicketTiers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const visibleStatusOptions = isNew
    ? STATUS_OPTIONS.filter(option => option.value === 'draft' || option.value === 'active')
    : STATUS_OPTIONS
  const isSaving = isSubmitting || createMutation.isPending || updateMutation.isPending

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

          <form onSubmit={handleSubmit(v => onSubmit(v), onInvalid)} className="space-y-6">

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
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-admin-50">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <div className={`grid grid-cols-1 gap-2 ${isNew ? 'sm:grid-cols-2' : 'sm:grid-cols-5'}`}>
                      {visibleStatusOptions.map(option => {
                        const selected = field.value === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={`rounded-xl border p-3 text-left transition-colors ${
                              selected ? option.className : 'border-admin bg-admin-overlay text-admin-50 hover:border-admin-md hover:text-admin-80'
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              {selected ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              {option.label}
                            </span>
                            <span className="mt-1 block text-[11px] opacity-80">{option.description}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
              </div>
            </section>

            <input type="hidden" {...register('startDate')} />
            <input type="hidden" {...register('startTime')} />
            <input type="hidden" {...register('endDate')} />
            <input type="hidden" {...register('endTime')} />

            {/* Schedule */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="font-heading font-bold text-sm text-foreground">Date, Time & Itinerary</h2>
                  <p className="mt-1 text-xs text-admin-40">Choose whether this is one event day or a multi-day event, then add the timeline for each day.</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-admin bg-admin-overlay p-1 lg:w-80">
                  {[
                    { value: 'single' as const, label: 'Single Day' },
                    { value: 'multi' as const, label: 'Multiple Days' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => switchDurationMode(option.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        eventDurationMode === option.value
                          ? 'bg-neon-pink text-white'
                          : 'text-admin-50 hover:bg-admin-surface hover:text-admin-80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {eventDurationMode === 'single' ? (
                <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-3 text-xs text-admin-40">
                  For overnight events, keep one date and choose an end time earlier than the start time. The system will treat the event as ending the next morning.
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-admin bg-admin-overlay px-4 py-3">
                  <p className="text-xs text-admin-40">Each day gets its own date, start time, end time, and timeline.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const schedules = formValues.schedules ?? []
                      const last = schedules[schedules.length - 1]
                      appendSchedule(newDaySchedule(schedules.length + 1, last ? addDays(last.startDate, 1) : undefined))
                    }}
                    className="flex items-center gap-2 text-sm text-neon-pink/70 hover:text-neon-pink transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Day
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {scheduleFields.map((field, index) => (
                  <div key={field.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block text-xs text-admin-40 font-mono">
                            {eventDurationMode === 'single' ? 'Event Day' : `Day ${index + 1}`}
                          </span>
                          <span className="block text-[11px] text-admin-30">
                            {eventDurationMode === 'single'
                              ? 'One date with a start and end time.'
                              : 'Date and time window for this event day.'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSchedule(index)}
                        disabled={eventDurationMode === 'single' || scheduleFields.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-admin-20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input type="hidden" {...register(`schedules.${index}.name`)} />
                    <input type="hidden" {...register(`schedules.${index}.endDate`)} />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">{eventDurationMode === 'single' ? 'Event Date *' : `Day ${index + 1} Date *`}</Label>
                        <Input type="date" {...register(`schedules.${index}.startDate`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Start Time *</Label>
                        <Input type="time" {...register(`schedules.${index}.startTime`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">End Time *</Label>
                        <Input type="time" {...register(`schedules.${index}.endTime`)} className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30" />
                        {formValues.schedules?.[index] && formValues.schedules[index].endTime <= formValues.schedules[index].startTime && (
                          <p className="text-[11px] text-admin-40">Ends the next day.</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-admin-50">{eventDurationMode === 'single' ? 'Timeline *' : `Day ${index + 1} Timeline *`}</Label>
                      <Controller
                        control={control}
                        name={`schedules.${index}.description`}
                        render={({ field }) => (
                          <TimelineEditor value={field.value} onChange={field.onChange} />
                        )}
                      />
                      {errors.schedules?.[index]?.description && (
                        <p className="text-xs text-red-400">{errors.schedules[index]?.description?.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {errors.schedules?.message && (
                <p className="text-xs text-red-400">{errors.schedules.message}</p>
              )}
              {(errors.startDate || errors.startTime || errors.endDate || errors.endTime) && (
                <p className="text-xs text-red-400">Schedule dates and times are required.</p>
              )}
            </section>

            {/* Location */}
            <section className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Location</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="locationId" className="text-xs text-admin-50">Location *</Label>
                  <Controller
                    control={control}
                    name="locationId"
                    render={({ field }) => (
                      <LocationPicker value={field.value} onChange={field.onChange} locations={locationsData ?? []} />
                    )}
                  />
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
              <div>
                <h2 className="font-heading font-bold text-sm text-foreground">Ticket Waves</h2>
                <p className="mt-1 text-xs text-admin-40">Create timed sales waves, then add the ticket tiers and quantities sold inside each wave.</p>
              </div>
              <div className="space-y-3">
                {waveFields.map((field, waveIndex) => {
                  const wave = formValues.ticketWaves?.[waveIndex]
                  return (
                  <div key={field.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-admin-40 font-mono">Wave {waveIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeWave(waveIndex)}
                        disabled={waveFields.length === 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-admin-20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Wave name *</Label>
                        <Input
                          {...register(`ticketWaves.${waveIndex}.name`)}
                          placeholder="e.g. Wave 1 - Early access"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketWaves?.[waveIndex]?.name && (
                          <p className="text-xs text-red-400">{errors.ticketWaves[waveIndex]?.name?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Description</Label>
                        <Input
                          {...register(`ticketWaves.${waveIndex}.description`)}
                          placeholder="e.g. Launch promo for first buyers"
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Wave starts *</Label>
                        <Input
                          type="datetime-local"
                          {...register(`ticketWaves.${waveIndex}.startsAt`)}
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketWaves?.[waveIndex]?.startsAt && (
                          <p className="text-xs text-red-400">{errors.ticketWaves[waveIndex]?.startsAt?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-admin-50">Wave ends *</Label>
                        <Input
                          type="datetime-local"
                          {...register(`ticketWaves.${waveIndex}.endsAt`)}
                          className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                        />
                        {errors.ticketWaves?.[waveIndex]?.endsAt && (
                          <p className="text-xs text-red-400">{errors.ticketWaves[waveIndex]?.endsAt?.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-admin bg-admin-surface p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-admin-70">Ticket tiers in this wave</p>
                        <button
                          type="button"
                          onClick={() => addTierToWave(waveIndex)}
                          className="flex items-center gap-1 text-xs text-neon-pink/80 hover:text-neon-pink"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add tier
                        </button>
                      </div>
                      {(wave?.ticketTiers ?? []).map((_, tierIndex) => (
                        <div key={`${field.id}-tier-${tierIndex}`} className="grid gap-3 rounded-lg border border-admin bg-admin-overlay p-3 md:grid-cols-[1fr_120px_120px_32px]">
                          <div className="space-y-1">
                            <Label className="text-xs text-admin-50">Tier name *</Label>
                            <Input
                              {...register(`ticketWaves.${waveIndex}.ticketTiers.${tierIndex}.name`)}
                              placeholder="e.g. Early Bird, VIP"
                              className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-admin-50">Price *</Label>
                            <Input
                              type="number"
                              min={0}
                              {...register(`ticketWaves.${waveIndex}.ticketTiers.${tierIndex}.price`, { valueAsNumber: true })}
                              className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-admin-50">Quantity *</Label>
                            <Input
                              type="number"
                              min={1}
                              {...register(`ticketWaves.${waveIndex}.ticketTiers.${tierIndex}.quantity`, { valueAsNumber: true })}
                              className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTierFromWave(waveIndex, tierIndex)}
                            disabled={(wave?.ticketTiers.length ?? 0) <= 1}
                            className="mt-5 flex h-8 w-8 items-center justify-center rounded-md text-admin-30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="md:col-span-4">
                            <Input
                              {...register(`ticketWaves.${waveIndex}.ticketTiers.${tierIndex}.description`)}
                              placeholder="Optional tier details"
                              className="h-8 text-sm bg-admin-input border-admin-md focus-visible:ring-neon-pink/30"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )
                })}
              </div>
              {waveFields.length < 10 && (
                <button
                  type="button"
                  onClick={() => appendWave(newWave(waveFields.length))}
                  className="flex items-center gap-2 text-sm text-neon-pink/70 hover:text-neon-pink transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Wave
                </button>
              )}
              {errors.ticketWaves?.message && (
                <p className="text-xs text-red-400">{errors.ticketWaves.message}</p>
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
                  onClick={handleSubmit(v => onSubmit(v, true), onInvalid)}
                  disabled={isSaving}
                  className="rounded-full border-white/20 text-admin-70 hover:bg-admin-input hover:border-white/40"
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-neon-pink hover:bg-[#cc2272] text-white font-semibold px-6"
                >
                  {isSaving ? 'Saving...' : (formValues.status === 'active' ? 'Publish Event' : 'Save Event')}
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
