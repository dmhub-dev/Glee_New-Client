import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Badge,
  Button,
  Input,
  Switch,
  Textarea,
  useToast,
} from '@glee/ui'
import {
  CalendarClock,
  Clock,
  ImagePlus,
  Plus,
  Power,
  Save,
  Table2,
  X,
} from 'lucide-react'
import {
  useCreateLocationReservationSlot,
  useCreateLocationReservationTable,
  useLocationReservationSlots,
  useLocationReservationTables,
  useUpdateLocation,
  useUpdateLocationReservationSlot,
  useUpdateLocationReservationTable,
  type DepositType,
  type Location,
  type LocationTable,
  type ReservationSlot,
  type UpsertLocationTablePayload,
  type UpsertReservationSlotPayload,
  type VenueType,
} from '@glee/api'

type CanonicalVenueType = Extract<VenueType, 'CLUB' | 'RESTAURANT' | 'OTHER'>

const VENUE_TYPES: Array<{ label: string; value: CanonicalVenueType }> = [
  { label: 'Club', value: 'CLUB' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT' },
  { label: 'Other', value: 'OTHER' },
]

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

const DEPOSIT_PERCENTAGES = [20, 40, 60, 80, 100]

type TableDraft = UpsertLocationTablePayload & {
  hasCategoryPhoto: boolean
  categoryPhoto?: { file: File; preview: string }
}

const emptyTable: TableDraft = {
  name: '',
  category: '',
  description: '',
  minGuests: 1,
  maxGuests: 4,
  minimumSpend: 0,
  depositType: 'FLAT',
  depositValue: 0,
  isActive: true,
  hasCategoryPhoto: false,
}

const emptySlot: UpsertReservationSlotPayload = {
  label: '',
  startTime: '18:00',
  endTime: '20:00',
  daysOfWeek: [5, 6],
  isActive: true,
}

function money(value: string | number) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function normalizeVenueType(value?: VenueType | null): CanonicalVenueType {
  if (value === 'CLUB') return 'CLUB'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'RESTAURANT'
  return 'OTHER'
}

function tableToDraft(table: LocationTable): TableDraft {
  return {
    name: table.name,
    category: table.category,
    description: table.description ?? '',
    minGuests: table.minGuests,
    maxGuests: table.maxGuests,
    minimumSpend: Number(table.minimumSpend),
    depositType: table.depositType,
    depositValue: Number(table.depositValue),
    isActive: table.isActive,
    hasCategoryPhoto: false,
  }
}

function slotToDraft(slot: ReservationSlot): UpsertReservationSlotPayload {
  return {
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    daysOfWeek: slot.daysOfWeek,
    isActive: slot.isActive,
  }
}

export default function ReservationSetupPanel({ location }: { location: Location }) {
  const { toast } = useToast()
  const updateLocation = useUpdateLocation()
  const { data: tables = [] } = useLocationReservationTables(location.id)
  const { data: slots = [] } = useLocationReservationSlots(location.id)
  const createTable = useCreateLocationReservationTable()
  const updateTable = useUpdateLocationReservationTable()
  const createSlot = useCreateLocationReservationSlot()
  const updateSlot = useUpdateLocationReservationSlot()

  const [bookingEnabled, setBookingEnabled] = useState(Boolean(location.bookingEnabled))
  const [venueType, setVenueType] = useState<CanonicalVenueType>(normalizeVenueType(location.venueType))
  const [bookingRules, setBookingRules] = useState(location.bookingRules ?? '')
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState(location.cancellationCutoffHours ?? 24)
  const [timezone, setTimezone] = useState(location.timezone ?? 'Africa/Nairobi')

  const [tableDraft, setTableDraft] = useState<TableDraft>(emptyTable)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [slotDraft, setSlotDraft] = useState<UpsertReservationSlotPayload>(emptySlot)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)

  const tableStats = useMemo(() => {
    const active = tables.filter(table => table.isActive)
    const categories = new Set(active.map(table => table.category))
    return { activeCount: active.length, categoryCount: categories.size }
  }, [tables])

  async function saveSettings() {
    try {
      await updateLocation.mutateAsync({
        id: location.id,
        dto: {
          bookingEnabled,
          venueType,
          bookingRules,
          cancellationCutoffHours: Number(cancellationCutoffHours),
          timezone,
        },
        pictures: [],
      })
      toast({ title: 'Reservation settings saved' })
    } catch (error) {
      toast({ title: 'Could not save settings', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function saveTable() {
    if (!tableDraft.name.trim() || !tableDraft.category.trim()) {
      toast({ title: 'Table name and category are required', variant: 'destructive' })
      return
    }
    if (Number(tableDraft.maxGuests) < Number(tableDraft.minGuests)) {
      toast({ title: 'Max guests must be greater than or equal to min guests', variant: 'destructive' })
      return
    }
    if (tableDraft.depositType === 'PERCENTAGE' && Number(tableDraft.depositValue) > 100) {
      toast({ title: 'Percentage deposits cannot exceed 100%', variant: 'destructive' })
      return
    }
    try {
      const { hasCategoryPhoto: _hasCategoryPhoto, categoryPhoto: _categoryPhoto, ...tablePayload } = tableDraft
      const payload = {
        ...tablePayload,
        minGuests: Number(tableDraft.minGuests),
        maxGuests: Number(tableDraft.maxGuests),
        minimumSpend: Number(tableDraft.minimumSpend),
        depositValue: Number(tableDraft.depositValue),
      }
      if (editingTableId) {
        await updateTable.mutateAsync({ locationId: location.id, tableId: editingTableId, payload })
      } else {
        await createTable.mutateAsync({ locationId: location.id, payload })
      }
      setTableDraft(emptyTable)
      setEditingTableId(null)
      toast({ title: editingTableId ? 'Table updated' : 'Table added' })
    } catch (error) {
      toast({ title: 'Could not save table', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  function setTableDepositType(depositType: DepositType) {
    setTableDraft(prev => ({
      ...prev,
      depositType,
      depositValue: depositType === 'PERCENTAGE' ? 20 : 0,
    }))
  }

  function setTableCategoryPhoto(file: File) {
    setTableDraft(prev => ({ ...prev, categoryPhoto: { file, preview: URL.createObjectURL(file) } }))
  }

  function handleTableCategoryPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setTableCategoryPhoto(file)
    event.target.value = ''
  }

  async function saveSlot() {
    if (!slotDraft.label.trim() || slotDraft.daysOfWeek.length === 0) {
      toast({ title: 'Slot label and days are required', variant: 'destructive' })
      return
    }
    try {
      if (editingSlotId) {
        await updateSlot.mutateAsync({ locationId: location.id, slotId: editingSlotId, payload: slotDraft })
      } else {
        await createSlot.mutateAsync({ locationId: location.id, payload: slotDraft })
      }
      setSlotDraft(emptySlot)
      setEditingSlotId(null)
      toast({ title: editingSlotId ? 'Slot updated' : 'Slot added' })
    } catch (error) {
      toast({ title: 'Could not save slot', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function toggleTable(table: LocationTable) {
    await updateTable.mutateAsync({ locationId: location.id, tableId: table.id, payload: { isActive: !table.isActive } })
  }

  async function toggleSlot(slot: ReservationSlot) {
    await updateSlot.mutateAsync({ locationId: location.id, slotId: slot.id, payload: { isActive: !slot.isActive } })
  }

  return (
    <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
            <Table2 className="h-5 w-5 text-neon-pink" />
            Reservation Setup
          </h2>
          <p className="mt-1 text-sm text-admin-40">Configure table bookings, minimum spends, deposits, and customer slots.</p>
        </div>
        <Badge className={bookingEnabled ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-admin bg-admin-overlay text-admin-50'}>
          {bookingEnabled ? 'Bookings enabled' : 'Bookings off'}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-admin bg-admin-overlay p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Accept reservations</p>
                <p className="text-xs text-admin-40">Customers can book tables when active slots exist.</p>
              </div>
              <Switch checked={bookingEnabled} onCheckedChange={setBookingEnabled} />
            </div>
            <div className="mt-4 grid gap-3">
              <label className="space-y-1">
                <span className="text-xs text-admin-40">Venue type</span>
                <select value={venueType} onChange={event => setVenueType(event.target.value as CanonicalVenueType)} className="h-10 w-full rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                  {VENUE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-admin-40">Cancellation cutoff hours</span>
                <Input type="number" min={0} value={cancellationCutoffHours} onChange={event => setCancellationCutoffHours(Number(event.target.value))} className="border-admin bg-admin-input" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-admin-40">Timezone</span>
                <Input value={timezone} onChange={event => setTimezone(event.target.value)} className="border-admin bg-admin-input" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-admin-40">Booking rules</span>
                <Textarea value={bookingRules} onChange={event => setBookingRules(event.target.value)} className="min-h-[96px] resize-none border-admin bg-admin-input" />
              </label>
              <Button onClick={saveSettings} disabled={updateLocation.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Active tables" value={tableStats.activeCount.toLocaleString()} />
            <Stat label="Categories" value={tableStats.categoryCount.toLocaleString()} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-admin bg-admin-overlay p-4">
            <PanelHeading icon={Table2} title="Physical Tables" count={tables.length} />
            <div className="mt-4 grid gap-3">
              <DraftLabel label="Table name">
                <Input placeholder="e.g. VIP Booth 1" value={tableDraft.name} onChange={event => setTableDraft(prev => ({ ...prev, name: event.target.value }))} className="border-admin bg-admin-input" />
              </DraftLabel>
              <DraftLabel label="Customer category">
                <Input placeholder="Category shown to customers" value={tableDraft.category} onChange={event => setTableDraft(prev => ({ ...prev, category: event.target.value }))} className="border-admin bg-admin-input" />
              </DraftLabel>
              <div className="grid grid-cols-2 gap-2">
                <DraftLabel label="Minimum guests">
                  <Input type="number" min={1} value={tableDraft.minGuests} onChange={event => setTableDraft(prev => ({ ...prev, minGuests: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                </DraftLabel>
                <DraftLabel label="Maximum guests">
                  <Input type="number" min={1} value={tableDraft.maxGuests} onChange={event => setTableDraft(prev => ({ ...prev, maxGuests: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                </DraftLabel>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DraftLabel label="Minimum spend">
                  <Input type="number" min={0} value={tableDraft.minimumSpend} onChange={event => setTableDraft(prev => ({ ...prev, minimumSpend: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                </DraftLabel>
                <DraftLabel label="Deposit type">
                  <select value={tableDraft.depositType} onChange={event => setTableDepositType(event.target.value as DepositType)} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                    <option value="FLAT">Flat deposit</option>
                    <option value="PERCENTAGE">Percentage deposit</option>
                  </select>
                </DraftLabel>
              </div>
              {tableDraft.depositType === 'FLAT' ? (
                <DraftLabel label="Flat deposit amount">
                  <Input type="number" min={0} value={tableDraft.depositValue} onChange={event => setTableDraft(prev => ({ ...prev, depositValue: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                </DraftLabel>
              ) : (
                <DraftLabel label="Percentage deposit">
                  <select value={tableDraft.depositValue} onChange={event => setTableDraft(prev => ({ ...prev, depositValue: Number(event.target.value) }))} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                    {DEPOSIT_PERCENTAGES.map(value => (
                      <option key={value} value={value}>{value}%</option>
                    ))}
                  </select>
                </DraftLabel>
              )}
              <label className="flex min-h-10 items-center gap-3 rounded-md border border-admin bg-admin-input px-3 text-sm text-admin-40">
                <input
                  type="checkbox"
                  checked={tableDraft.hasCategoryPhoto}
                  onChange={event => setTableDraft(prev => ({
                    ...prev,
                    hasCategoryPhoto: event.target.checked,
                    categoryPhoto: event.target.checked ? prev.categoryPhoto : undefined,
                  }))}
                  className="h-4 w-4 rounded border-admin accent-neon-pink"
                />
                Add table category picture
              </label>
              {tableDraft.hasCategoryPhoto && (
                <TableCategoryPhotoPicker
                  inputId="reservation-table-category-photo"
                  photo={tableDraft.categoryPhoto}
                  onFile={setTableCategoryPhoto}
                  onInputChange={handleTableCategoryPhotoChange}
                  onClear={() => setTableDraft(prev => ({ ...prev, categoryPhoto: undefined }))}
                />
              )}
              <Button onClick={saveTable} disabled={createTable.isPending || updateTable.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
                <Plus className="h-4 w-4" />
                {editingTableId ? 'Update Table' : 'Add Table'}
              </Button>
              {editingTableId && <Button variant="ghost" onClick={() => { setEditingTableId(null); setTableDraft(emptyTable) }}>Cancel edit</Button>}
            </div>

            <div className="mt-5 space-y-2">
              {tables.map(table => (
                <article key={table.id} className="rounded-lg border border-admin bg-admin-surface p-3 transition hover:border-neon-pink/30">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => { setEditingTableId(table.id); setTableDraft(tableToDraft(table)) }} className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{table.name}</p>
                      <p className="mt-1 text-xs text-admin-40">{table.category} · {table.minGuests}-{table.maxGuests} guests</p>
                      <p className="mt-1 text-xs text-admin-40">{money(table.minimumSpend)} min · {table.depositType === 'PERCENTAGE' ? `${table.depositValue}%` : money(table.depositValue)} deposit</p>
                    </button>
                    <button type="button" onClick={() => toggleTable(table)} className={table.isActive ? 'text-emerald-300' : 'text-admin-30'} title={table.isActive ? 'Deactivate table' : 'Reactivate table'}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
              {tables.length === 0 && <p className="rounded-lg border border-admin bg-admin-surface p-4 text-sm text-admin-40">No tables configured yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-admin bg-admin-overlay p-4">
            <PanelHeading icon={CalendarClock} title="Venue Slots" count={slots.length} />
            <div className="mt-4 grid gap-3">
              <Input placeholder="Slot label e.g. Dinner" value={slotDraft.label} onChange={event => setSlotDraft(prev => ({ ...prev, label: event.target.value }))} className="border-admin bg-admin-input" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={slotDraft.startTime} onChange={event => setSlotDraft(prev => ({ ...prev, startTime: event.target.value }))} className="border-admin bg-admin-input" />
                <Input type="time" value={slotDraft.endTime} onChange={event => setSlotDraft(prev => ({ ...prev, endTime: event.target.value }))} className="border-admin bg-admin-input" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map(day => {
                  const active = slotDraft.daysOfWeek.includes(day.value)
                  return (
                    <button key={day.value} type="button" onClick={() => setSlotDraft(prev => ({
                      ...prev,
                      daysOfWeek: active ? prev.daysOfWeek.filter(value => value !== day.value) : [...prev.daysOfWeek, day.value].sort(),
                    }))} className={active ? 'rounded-md bg-neon-pink px-2 py-2 text-xs font-semibold text-white' : 'rounded-md border border-admin px-2 py-2 text-xs text-admin-40 hover:text-foreground'}>
                      {day.label}
                    </button>
                  )
                })}
              </div>
              <Button onClick={saveSlot} disabled={createSlot.isPending || updateSlot.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
                <Plus className="h-4 w-4" />
                {editingSlotId ? 'Update Slot' : 'Add Slot'}
              </Button>
              {editingSlotId && <Button variant="ghost" onClick={() => { setEditingSlotId(null); setSlotDraft(emptySlot) }}>Cancel edit</Button>}
            </div>

            <div className="mt-5 space-y-2">
              {slots.map(slot => (
                <article key={slot.id} className="rounded-lg border border-admin bg-admin-surface p-3 transition hover:border-neon-pink/30">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => { setEditingSlotId(slot.id); setSlotDraft(slotToDraft(slot)) }} className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{slot.label}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-admin-40"><Clock className="h-3 w-3 text-neon-pink" />{slot.startTime} - {slot.endTime}</p>
                      <p className="mt-1 text-xs text-admin-40">{slot.daysOfWeek.map(value => DAYS.find(day => day.value === value)?.label).filter(Boolean).join(', ')}</p>
                    </button>
                    <button type="button" onClick={() => toggleSlot(slot)} className={slot.isActive ? 'text-emerald-300' : 'text-admin-30'} title={slot.isActive ? 'Deactivate slot' : 'Reactivate slot'}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
              {slots.length === 0 && <p className="rounded-lg border border-admin bg-admin-surface p-4 text-sm text-admin-40">No reservation slots configured yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PanelHeading({ icon: Icon, title, count }: { icon: typeof Table2; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-heading text-sm font-black text-foreground"><Icon className="h-4 w-4 text-neon-pink" />{title}</h3>
      <Badge className="border-admin bg-admin-surface text-admin-50">{count}</Badge>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-4">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value}</p>
    </div>
  )
}

function DraftLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-admin-40">{label}</span>
      {children}
    </label>
  )
}

function TableCategoryPhotoPicker({
  inputId,
  photo,
  onFile,
  onInputChange,
  onClear,
}: {
  inputId: string
  photo?: { file: File; preview: string }
  onFile: (file: File) => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-admin-40">Upload table category picture</span>
      <div
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault()
          const file = event.dataTransfer.files?.[0]
          if (file) onFile(file)
        }}
        className={`group relative overflow-hidden rounded-2xl border border-dashed p-4 transition-colors ${
          photo ? 'border-neon-pink/40 bg-neon-pink/8' : 'border-admin-md bg-admin-input hover:border-neon-pink/45 hover:bg-admin-overlay'
        }`}
      >
        {photo ? (
          <div className="flex items-center gap-4">
            <img src={photo.preview} alt="" className="h-20 w-20 rounded-xl object-cover shadow-[0_12px_32px_rgba(0,0,0,0.24)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{photo.file.name}</p>
              <p className="mt-1 text-xs text-admin-40">This preview represents the table category image.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label htmlFor={inputId} className="inline-flex h-8 cursor-pointer items-center rounded-full bg-neon-pink px-3 text-xs font-semibold text-white transition hover:bg-neon-pink/90">
                  Change image
                </label>
                <button type="button" onClick={onClear} className="inline-flex h-8 items-center gap-1 rounded-full border border-admin px-3 text-xs font-semibold text-admin-50 transition hover:border-red-500/35 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center rounded-xl py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-pink/12 text-neon-pink ring-1 ring-neon-pink/20 transition group-hover:scale-105">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="mt-3 text-sm font-semibold text-foreground">Drag an image here or click to upload</span>
            <span className="mt-1 text-xs text-admin-40">JPG, PNG, or WebP for this table category.</span>
          </label>
        )}
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onInputChange}
        />
      </div>
    </div>
  )
}
