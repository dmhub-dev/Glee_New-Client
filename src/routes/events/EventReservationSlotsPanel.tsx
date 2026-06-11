import { useMemo, useState } from 'react'
import { Badge, Button, Input, Skeleton, Switch, useToast } from '@glee/ui'
import { CalendarClock, Clock, Plus, Power, Table2 } from 'lucide-react'
import {
  useAdminEventReservationSlots,
  useCreateAdminEventReservationSlot,
  useUpdateAdminEventReservationSlot,
  type EventReservationSlot,
  type UpsertEventReservationSlotPayload,
} from '@glee/api'
import type { Event } from '@glee/types'

function toLocalInputValue(value: string | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function localInputToIso(value: string) {
  return new Date(value).toISOString()
}

function slotToDraft(slot: EventReservationSlot): UpsertEventReservationSlotPayload {
  return {
    label: slot.label,
    startDateTime: toLocalInputValue(slot.startDateTime),
    endDateTime: toLocalInputValue(slot.endDateTime),
    isActive: slot.isActive,
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function defaultDraft(event: Event): UpsertEventReservationSlotPayload {
  const start = new Date(`${event.startDate || new Date().toISOString().slice(0, 10)}T${event.startTime || '18:00'}:00`)
  const end = new Date(start)
  end.setHours(end.getHours() + 3)
  return {
    label: 'Table service',
    startDateTime: toLocalInputValue(start),
    endDateTime: toLocalInputValue(end),
    isActive: true,
  }
}

export default function EventReservationSlotsPanel({ event }: { event: Event }) {
  const { toast } = useToast()
  const { data: slots = [], isLoading } = useAdminEventReservationSlots(event.id)
  const createSlot = useCreateAdminEventReservationSlot()
  const updateSlot = useUpdateAdminEventReservationSlot()
  const [draft, setDraft] = useState<UpsertEventReservationSlotPayload>(() => defaultDraft(event))
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)

  const activeCount = useMemo(() => slots.filter(slot => slot.isActive).length, [slots])

  async function saveSlot() {
    if (!draft.label.trim() || !draft.startDateTime || !draft.endDateTime) {
      toast({ title: 'Slot label and times are required', variant: 'destructive' })
      return
    }
    const payload = {
      ...draft,
      startDateTime: localInputToIso(draft.startDateTime),
      endDateTime: localInputToIso(draft.endDateTime),
    }
    try {
      if (editingSlotId) {
        await updateSlot.mutateAsync({ eventId: event.id, slotId: editingSlotId, payload })
      } else {
        await createSlot.mutateAsync({ eventId: event.id, payload })
      }
      setEditingSlotId(null)
      setDraft(defaultDraft(event))
      toast({ title: editingSlotId ? 'Reservation slot updated' : 'Reservation slot added' })
    } catch (error) {
      toast({ title: 'Could not save reservation slot', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function toggleSlot(slot: EventReservationSlot) {
    try {
      await updateSlot.mutateAsync({ eventId: event.id, slotId: slot.id, payload: { isActive: !slot.isActive } })
    } catch (error) {
      toast({ title: 'Could not update slot', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-3 border-b border-admin pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
            <Table2 className="h-5 w-5 text-neon-pink" />
            Event Table Reservations
          </h2>
          <p className="mt-1 text-sm text-admin-40">Create table reservation windows that are specific to this event.</p>
        </div>
        <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{activeCount} active</Badge>
      </div>

      {!event.locationId && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
          This event needs a location before table reservations can be created.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-admin bg-admin-overlay p-4">
          <h3 className="font-heading text-sm font-black text-foreground">{editingSlotId ? 'Edit event slot' : 'New event slot'}</h3>
          <div className="mt-4 grid gap-3">
            <Input value={draft.label} onChange={input => setDraft(prev => ({ ...prev, label: input.target.value }))} placeholder="Slot label" className="border-admin bg-admin-input" />
            <label className="space-y-1">
              <span className="text-xs text-admin-40">Starts</span>
              <Input type="datetime-local" value={draft.startDateTime} onChange={input => setDraft(prev => ({ ...prev, startDateTime: input.target.value }))} className="border-admin bg-admin-input" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-admin-40">Ends</span>
              <Input type="datetime-local" value={draft.endDateTime} onChange={input => setDraft(prev => ({ ...prev, endDateTime: input.target.value }))} className="border-admin bg-admin-input" />
            </label>
            <div className="flex items-center justify-between rounded-lg border border-admin bg-admin-surface px-3 py-2">
              <span className="text-sm text-admin-50">Active for customers</span>
              <Switch checked={draft.isActive ?? true} onCheckedChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
            </div>
            <Button onClick={saveSlot} disabled={!event.locationId || createSlot.isPending || updateSlot.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
              <Plus className="h-4 w-4" />
              {editingSlotId ? 'Update Slot' : 'Add Slot'}
            </Button>
            {editingSlotId && <Button variant="ghost" onClick={() => { setEditingSlotId(null); setDraft(defaultDraft(event)) }}>Cancel edit</Button>}
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-admin bg-admin-overlay p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-admin-30" />
              <p className="mt-3 text-sm font-medium text-admin-70">No event reservation slots</p>
            </div>
          ) : (
            slots.map(slot => (
              <article key={slot.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => { setEditingSlotId(slot.id); setDraft(slotToDraft(slot)) }} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-base font-black text-foreground">{slot.label}</p>
                      <Badge className={slot.isActive ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-admin bg-admin-surface text-admin-40'}>
                        {slot.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-admin-40">
                      <Clock className="h-4 w-4 text-neon-pink" />
                      {formatDateTime(slot.startDateTime)} - {formatDateTime(slot.endDateTime)}
                    </p>
                  </button>
                  <Button variant="ghost" onClick={() => toggleSlot(slot)} className={slot.isActive ? 'text-emerald-300' : 'text-admin-40'}>
                    <Power className="mr-2 h-4 w-4" />
                    {slot.isActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
