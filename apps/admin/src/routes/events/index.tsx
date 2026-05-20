import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminEvents, useDeleteEvent } from '../../lib/queries/events'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { Skeleton, Input } from '@glee/ui'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { cn } from '@glee/ui'
import type { Event } from '@glee/types'

type StatusTab = 'live' | 'draft' | 'pending_approval' | 'past'

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'live', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'past', label: 'Past' },
]

function formatListDate(date: string, startTime: string): string {
  const d = new Date(`${date}T${startTime}`)
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function ticketsSoldPercent(event: Event): number {
  const total = event.ticketTiers.reduce((s, t) => s + t.quantity, 0)
  const sold = event.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0)
  return total === 0 ? 0 : Math.round((sold / total) * 100)
}

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

export default function EventsListPage() {
  const navigate = useNavigate()
  const { data: events, isLoading } = useAdminEvents()
  const deleteMutation = useDeleteEvent()
  const [activeTab, setActiveTab] = useState<StatusTab>('live')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    if (!events) return []
    return events
      .filter(e => e.status === activeTab)
      .filter(e =>
        search.trim() === '' ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
        e.venueId.toLowerCase().includes(search.toLowerCase())
      )
  }, [events, activeTab, search])

  const countByStatus = useMemo(() => {
    if (!events) return {} as Record<StatusTab, number>
    return TABS.reduce((acc, tab) => {
      acc[tab.key] = events.filter(e => e.status === tab.key).length
      return acc
    }, {} as Record<StatusTab, number>)
  }, [events])

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this event? This cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <AdminLayout title="Events" subtitle="Manage and publish your events">
      <div className="space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={ev => setSearch(ev.target.value)}
              className="pl-8 h-9 text-sm bg-white/5 border-white/10 rounded-full focus-visible:ring-neon-pink/30"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-neon-pink/20 text-neon-pink' : 'text-white/30 hover:text-white/60')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-neon-pink/20 text-neon-pink' : 'text-white/30 hover:text-white/60')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => navigate('/events/new')}
              className="flex items-center gap-2 bg-neon-pink hover:bg-[#cc2272] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'border-neon-pink text-neon-pink'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab.label}
              {countByStatus[tab.key] !== undefined && (
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  activeTab === tab.key ? 'bg-neon-pink/20 text-neon-pink' : 'bg-white/5 text-white/30'
                )}>
                  {countByStatus[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm mb-3">
              {search ? `No events matching "${search}"` : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} events`}
            </p>
            {activeTab === 'live' && !search && (
              <button
                onClick={() => navigate('/events/new')}
                className="text-sm text-neon-pink hover:underline"
              >
                Create your first event →
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map(event => (
              <AdminEventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(event => (
              <div
                key={event.id}
                className="bg-[#0f0f15] border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-neon-pink/30 transition-colors group"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={event.flyerSquareUrl ?? PLACEHOLDER}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-white/40 font-mono mt-0.5">{formatListDate(event.date, event.startTime)}</p>
                  <p className="text-xs text-white/30 truncate mt-0.5">{event.location ?? event.venueId}</p>
                </div>
                <div className="text-xs text-white/40 font-mono w-16 text-right shrink-0">
                  {ticketsSoldPercent(event)}% sold
                </div>
                <div className="text-sm font-mono font-semibold text-neon-pink w-24 text-right shrink-0">
                  KSh {Math.min(...event.ticketTiers.map(t => t.price)).toLocaleString()}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                    className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-xs text-red-400/70 hover:text-red-400 bg-white/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
