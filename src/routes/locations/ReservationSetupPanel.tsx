import { useMemo, useState } from 'react'
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
  Plus,
  Power,
  Save,
  Table2,
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

const emptyTable: UpsertLocationTablePayload = {
  name: '',
  category: '',
  description: '',
  minGuests: 1,
  maxGuests: 4,
  minimumSpend: 0,
  depositType: 'FLAT',
  depositValue: 0,
  isActive: true,
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

function tableToDraft(table: LocationTable): UpsertLocationTablePayload {
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

  const [tableDraft, setTableDraft] = useState<UpsertLocationTablePayload>(emptyTable)
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
      const payload = {
        ...tableDraft,
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
              <Input placeholder="Table name e.g. VIP Booth 1" value={tableDraft.name} onChange={event => setTableDraft(prev => ({ ...prev, name: event.target.value }))} className="border-admin bg-admin-input" />
              <Input placeholder="Category shown to customers" value={tableDraft.category} onChange={event => setTableDraft(prev => ({ ...prev, category: event.target.value }))} className="border-admin bg-admin-input" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={1} value={tableDraft.minGuests} onChange={event => setTableDraft(prev => ({ ...prev, minGuests: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                <Input type="number" min={1} value={tableDraft.maxGuests} onChange={event => setTableDraft(prev => ({ ...prev, maxGuests: Number(event.target.value) }))} className="border-admin bg-admin-input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={0} placeholder="Minimum spend" value={tableDraft.minimumSpend} onChange={event => setTableDraft(prev => ({ ...prev, minimumSpend: Number(event.target.value) }))} className="border-admin bg-admin-input" />
                <Input type="number" min={0} placeholder="Deposit" value={tableDraft.depositValue} onChange={event => setTableDraft(prev => ({ ...prev, depositValue: Number(event.target.value) }))} className="border-admin bg-admin-input" />
              </div>
              <select value={tableDraft.depositType} onChange={event => setTableDraft(prev => ({ ...prev, depositType: event.target.value as DepositType }))} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                <option value="FLAT">Flat deposit</option>
                <option value="PERCENTAGE">Percentage deposit</option>
              </select>
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
