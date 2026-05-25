import { useState, useMemo } from 'react'
import type { Event } from '@glee/types'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminEvents } from '../../lib/queries/events'
import { CalendarGrid } from './components/CalendarGrid'
import { CalendarDetailPanel } from './components/CalendarDetailPanel'
import { Skeleton } from '@glee/ui'
import { Calendar, CalendarCheck, CalendarClock, CalendarX } from 'lucide-react'

interface SummaryCardProps {
  label: string
  count: number
  icon: typeof Calendar
}

function SummaryCard({ label, count, icon: Icon }: SummaryCardProps) {
  return (
    <div className="bg-admin-surface border border-admin rounded-2xl p-5 flex items-center gap-4 shadow-admin">
      <div className="w-11 h-11 rounded-xl bg-neon-pink/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-neon-pink" />
      </div>
      <div>
        <p className="font-heading font-black text-2xl text-foreground">{count}</p>
        <p className="text-xs text-admin-40 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { data: events = [], isLoading } = useAdminEvents()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Group events by startDate YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    for (const event of events) {
      if (!event.startDate) continue
      const key = event.startDate // already YYYY-MM-DD from mapper
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(event)
    }
    return map
  }, [events])

  // Summary counts
  const totalCount     = events.length
  const liveCount      = events.filter(e => e.status === 'live').length
  const pendingCount   = events.filter(e => e.status === 'pending_approval').length
  const pastCount      = events.filter(e => e.status === 'past').length

  return (
    <AdminLayout title="Calendar" subtitle="Event schedule overview">
      <div className="flex flex-col gap-6">
        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="All Events"       count={totalCount}   icon={Calendar}      />
            <SummaryCard label="Live"             count={liveCount}    icon={CalendarCheck} />
            <SummaryCard label="Pending Approval" count={pendingCount} icon={CalendarClock} />
            <SummaryCard label="Past"             count={pastCount}    icon={CalendarX}     />
          </div>
        )}

        {/* Calendar grid */}
        {isLoading ? (
          <Skeleton className="h-[600px] rounded-2xl" />
        ) : (
          <CalendarGrid
            eventsByDate={eventsByDate}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </div>

      {/* Detail panel */}
      <CalendarDetailPanel
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </AdminLayout>
  )
}
