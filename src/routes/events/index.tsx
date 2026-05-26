import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminEvents, useDeleteEvent } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { Skeleton, Input, Progress } from '@glee/ui'
import { Plus, Search, LayoutGrid, List, MapPin, Calendar, Ticket, Pencil, Trash2, Tags, MapPinned } from 'lucide-react'
import { cn } from '@glee/ui'
import type { Event } from '@glee/types'
import CategoriesTab from '../settings/CategoriesTab'
import LocationsTab from '../settings/LocationsTab'

type StatusTab = Event['status']
type EventSection = 'events' | 'categories' | 'locations'

const EVENT_SECTIONS: { key: EventSection; label: string; icon: typeof Calendar }[] = [
  { key: 'events',     label: 'Events',     icon: Calendar },
  { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'locations',  label: 'Locations',  icon: MapPinned },
]

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'active',    label: 'Active'    },
  { key: 'draft',     label: 'Draft'     },
  { key: 'postponed', label: 'Postponed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'sold_out',  label: 'Sold Out'  },
]

const STATUS_DOT: Record<StatusTab, string> = {
  active:    'bg-green-400',
  draft:     'bg-amber-400',
  postponed: 'bg-orange-400',
  cancelled: 'bg-red-500',
  sold_out:  'bg-admin-30',
}

const CATEGORY_COLOURS: Record<string, string> = {
  Music:         'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Fashion:       'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Comedy:        'bg-yellow-500/15 text-yellow-500 border-yellow-500/20',
  Sports:        'bg-green-500/15 text-green-400 border-green-500/20',
  Art:           'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Food & Drink':'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Wellness:      'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Other:         'bg-admin-overlay text-admin-50 border-admin',
}

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

function formatListDate(startDate: string, startTime: string, endDate?: string): string {
  const d = new Date(`${startDate}T${startTime}`)
  const datePart = endDate && endDate !== startDate
    ? new Date(startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) +
      ' – ' +
      new Date(endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  return datePart + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function ticketsSoldPercent(event: Event): number {
  const total = event.ticketTiers.reduce((s, t) => s + t.quantity, 0)
  const sold  = event.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0)
  return total === 0 ? 0 : Math.round((sold / total) * 100)
}

function ticketsRemaining(event: Event): number {
  return event.ticketTiers.reduce((s, t) => s + t.quantityRemaining, 0)
}

function lowestPrice(event: Event): number {
  if (event.ticketTiers.length === 0) return 0
  return Math.min(...event.ticketTiers.map(t => t.price))
}

export default function EventsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: events, isLoading } = useAdminEvents()
  const deleteMutation = useDeleteEvent()
  const [activeTab, setActiveTab] = useState<StatusTab>('active')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const rawSection = searchParams.get('section')
  const activeSection: EventSection = rawSection === 'categories' || rawSection === 'locations' ? rawSection : 'events'

  function handleSectionChange(section: EventSection) {
    setSearchParams(section === 'events' ? {} : { section })
  }

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
    return STATUS_TABS.reduce((acc, tab) => {
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
    <AdminLayout
      title={activeSection === 'events' ? 'Events' : activeSection === 'categories' ? 'Event Categories' : 'Event Locations'}
      subtitle="Manage event inventory, categories, and locations from one place"
    >
      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto border-b border-admin">
          {EVENT_SECTIONS.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => handleSectionChange(section.key)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeSection === section.key
                    ? 'border-neon-pink text-neon-pink'
                    : 'border-transparent text-admin-40 hover:text-admin-70',
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </div>

        {activeSection === 'categories' && <CategoriesTab />}
        {activeSection === 'locations' && <LocationsTab />}
        {activeSection === 'events' && (
          <>

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={ev => setSearch(ev.target.value)}
              className="pl-8 h-9 text-sm bg-admin-input border-admin rounded-full focus-visible:ring-neon-pink/30 text-foreground placeholder:text-admin-30"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-admin-overlay border border-admin rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-neon-pink/20 text-neon-pink' : 'text-admin-30 hover:text-admin-60')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-neon-pink/20 text-neon-pink' : 'text-admin-30 hover:text-admin-60')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => navigate('/dashboard/events/new')}
              className="flex items-center gap-2 bg-neon-pink hover:bg-[#cc2272] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Create Event</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-0 border-b border-admin overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-neon-pink text-neon-pink'
                  : 'border-transparent text-admin-40 hover:text-admin-70'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[tab.key])} />
              {tab.label}
              {countByStatus[tab.key] !== undefined && (
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-mono',
                  activeTab === tab.key ? 'bg-neon-pink/20 text-neon-pink' : 'bg-admin-overlay text-admin-40'
                )}>
                  {countByStatus[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-2'
          }>
            {Array.from({ length: viewMode === 'grid' ? 8 : 5 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-72 rounded-2xl' : 'h-24 rounded-2xl'} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-neon-pink/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-neon-pink/50" />
            </div>
            <p className="text-admin-40 text-sm mb-3">
              {search ? `No events matching "${search}"` : `No ${STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} events`}
            </p>
            {activeTab === 'active' && !search && (
              <button onClick={() => navigate('/dashboard/events/new')} className="text-sm text-neon-pink hover:underline font-medium">
                Create your first event →
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(event => (
              <AdminEventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          /* ── List mode — reference design style ── */
          <div className="space-y-2">
            {filtered.map(event => {
              const soldPct = ticketsSoldPercent(event)
              const remaining = ticketsRemaining(event)
              const price = lowestPrice(event)
              const categoryClass = CATEGORY_COLOURS[event.venueId] ?? CATEGORY_COLOURS.Other
              return (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/events/${event.id}`)}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/dashboard/events/${event.id}`)}
                  className="bg-admin-surface border border-admin rounded-2xl overflow-hidden hover:border-neon-pink/30 hover:shadow-admin transition-all duration-150 group cursor-pointer"
                >
                  <div className="flex items-stretch gap-0">
                    {/* Thumbnail */}
                    <div className="w-28 sm:w-40 shrink-0 relative overflow-hidden">
                      <img
                        src={event.flyerSquareUrl ?? event.flyerPortraitUrl ?? PLACEHOLDER}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        style={{ minHeight: '96px' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                      />
                    </div>

                    {/* Main info */}
                    <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-3 p-4 min-w-0">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Category + title */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', categoryClass)}>
                            {event.venueId}
                          </span>
                        </div>
                        <h3 className="font-heading font-bold text-sm text-foreground line-clamp-1">{event.title}</h3>
                        <p className="text-xs text-admin-40 line-clamp-1 hidden sm:block">{event.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {event.location && (
                            <span className="flex items-center gap-1 text-xs text-admin-40">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">{event.location}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-admin-40">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {formatListDate(event.startDate, event.startTime, event.endDate)}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        {/* Sold % */}
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-admin-40">Sold</span>
                            <span className="font-mono font-semibold text-neon-pink">{soldPct}%</span>
                          </div>
                          <Progress value={soldPct} className="h-1.5 bg-admin-overlay [&>div]:bg-neon-pink" />
                        </div>

                        {/* Tickets left */}
                        <div className="text-center hidden sm:block">
                          <div className="flex items-center gap-1.5 text-admin-30 mb-0.5">
                            <Ticket className="w-3.5 h-3.5" />
                            <span className="text-[10px] uppercase tracking-wide">Left</span>
                          </div>
                          <p className="font-heading font-black text-lg text-foreground leading-none">{remaining.toLocaleString()}</p>
                        </div>

                        {/* Price */}
                        <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2 text-center shrink-0">
                          <p className="text-[10px] text-neon-pink/60 uppercase tracking-wide font-medium leading-none mb-0.5">From</p>
                          <p className="font-heading font-black text-base text-neon-pink leading-none">KSh {price.toLocaleString()}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/dashboard/events/${event.id}/edit`) }}
                            className="w-8 h-8 rounded-lg bg-admin-overlay border border-admin hover:bg-neon-pink/10 hover:border-neon-pink/30 hover:text-neon-pink text-admin-50 flex items-center justify-center transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(event.id) }}
                            className="w-8 h-8 rounded-lg bg-admin-overlay border border-admin hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-admin-50 flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
