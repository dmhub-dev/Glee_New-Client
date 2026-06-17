import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminEvents, useDeleteEvent, useCategories, useLocations } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminEventCard from '../../components/events/AdminEventCard'
import { useAdminUser } from '../../app/providers'
import { Skeleton, Input, Progress, Button } from '@glee/ui'
import { Plus, Search, LayoutGrid, List, MapPin, Calendar, Ticket, Pencil, Trash2, Tags, MapPinned } from 'lucide-react'
import { cn } from '@glee/ui'
import { formatDateRange, formatTimeOnly } from '@glee/utils'
import type { Event } from '@glee/types'
import type { Location } from '@glee/api'
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
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'active',           label: 'Active'           },
  { key: 'live',             label: 'Live'             },
  { key: 'ended',            label: 'Ended'            },
  { key: 'draft',            label: 'Draft'            },
  { key: 'postponed',        label: 'Postponed'        },
  { key: 'cancelled',        label: 'Cancelled'        },
  { key: 'rejected',         label: 'Rejected'         },
  { key: 'sold_out',         label: 'Sold Out'         },
]

const STATUS_DOT: Record<StatusTab, string> = {
  active:           'bg-green-400',
  live:             'bg-neon-pink',
  ended:            'bg-admin-40',
  pending_approval: 'bg-sky-400',
  draft:            'bg-amber-400',
  postponed:        'bg-orange-400',
  cancelled:        'bg-red-500',
  rejected:         'bg-red-400',
  sold_out:         'bg-admin-30',
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

function venueTypeLabel(value?: string | null) {
  if (value === 'CLUB') return 'Club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'Restaurant/Hotel'
  return 'Other'
}

function locationApprovalLabel(status?: Location['approvalStatus']) {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function locationApprovalClass(status?: Location['approvalStatus']) {
  if (status === 'APPROVED') return 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300'
  if (status === 'REJECTED') return 'border-red-500/25 bg-red-500/15 text-red-300'
  return 'border-amber-500/25 bg-amber-500/15 text-amber-300'
}

function formatListDate(startDate: string, startTime: string, endDate?: string): string {
  const datePart = formatDateRange(
    startDate,
    endDate,
    { day: 'numeric', month: 'short', year: 'numeric' },
    { day: 'numeric', month: 'short' },
    { day: 'numeric', month: 'short', year: 'numeric' },
  )
  const timePart = formatTimeOnly(startTime)
  return timePart ? `${datePart} · ${timePart}` : datePart
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

function CategoryReferenceGrid({
  categories,
  isLoading,
}: {
  categories: Array<{ id: string; name: string; createdAt: string }>
  isLoading: boolean
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
        <h2 className="font-heading text-base font-bold text-foreground">Approved Event Categories</h2>
        <p className="mt-1 text-sm text-admin-40">Use these categories when creating or editing your events. Vendors cannot create or modify platform categories.</p>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(category => (
            <div key={category.id} className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
              <span className="inline-flex rounded-full border border-neon-pink/20 bg-neon-pink/10 px-2.5 py-1 text-xs font-medium text-neon-pink">
                {category.name}
              </span>
              <p className="mt-3 text-xs text-admin-40">Available for event setup</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function LocationReferenceGrid({
  locations,
  isLoading,
  allowCreate = false,
}: {
  locations: Location[]
  isLoading: boolean
  allowCreate?: boolean
}) {
  const navigate = useNavigate()

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground">Event Locations</h2>
          <p className="mt-1 text-sm text-admin-40">Use platform locations or your approved vendor locations for events. New vendor locations stay pending until Glee approves them.</p>
        </div>
        {allowCreate && (
          <Button onClick={() => navigate('/dashboard/locations/new')} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map(location => (
            <article
              key={location.id}
              data-testid="location-card"
              className="group overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin transition duration-200 hover:-translate-y-0.5 hover:border-neon-pink/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              <div className="relative h-28 overflow-hidden bg-admin-overlay">
                {location.pictures?.[0] ? (
                  <img src={location.pictures[0]} alt={location.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,45,143,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] text-admin-30">
                    <MapPinned className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-neon-pink/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-neon-pink backdrop-blur">
                    {venueTypeLabel(location.venueType)}
                  </span>
                  {location.vendorId && (
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur', locationApprovalClass(location.approvalStatus))}>
                      {locationApprovalLabel(location.approvalStatus)}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'absolute bottom-3 right-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur',
                  location.vendorId ? 'border-neon-pink/25 bg-neon-pink/15 text-neon-pink' : 'border-white/10 bg-black/45 text-white/75',
                )}>
                  {location.vendorId ? 'My Location' : 'Glee'}
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-1 font-heading text-base font-black text-foreground">{location.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-admin-40">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-neon-pink" />
                    <span className="truncate">{location.address}</span>
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate(`/dashboard/locations/${location.id}`)} className="h-9 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                  Open Location
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function EventsListPage() {
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const canCreateEvents = user.role !== 'vendor_staff'
  const canDeleteEvents = user.role !== 'vendor_staff'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const deleteMutation = useDeleteEvent({ vendorScoped: isVendorRole })
  const [activeTab, setActiveTab] = useState<StatusTab>('pending_approval')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: locations, isLoading: locationsLoading } = useLocations({ vendorScoped: isVendorRole })
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
        (e.categoryName ?? '').toLowerCase().includes(search.toLowerCase()) ||
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
      title={isVendorRole ? (
        activeSection === 'events' ? 'My Events' : activeSection === 'categories' ? 'Event Categories' : 'Event Locations'
      ) : activeSection === 'events' ? 'Events' : activeSection === 'categories' ? 'Event Categories' : 'Event Locations'}
      subtitle={isVendorRole ? 'Create events and reference approved categories and locations' : 'Manage event inventory, categories, and locations from one place'}
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

        {activeSection === 'categories' && (isVendorRole ? (
          <CategoryReferenceGrid categories={categories ?? []} isLoading={categoriesLoading} />
        ) : <CategoriesTab />)}
        {activeSection === 'locations' && (isVendorRole ? (
          <LocationReferenceGrid locations={locations ?? []} isLoading={locationsLoading} allowCreate={canCreateEvents} />
        ) : <LocationsTab />)}
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
            {canCreateEvents && (
              <button
                onClick={() => navigate('/dashboard/events/new')}
                className="flex items-center gap-2 bg-neon-pink hover:bg-[#cc2272] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Create Event</span>
                <span className="xs:hidden">New</span>
              </button>
            )}
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
            {activeTab === 'active' && !search && canCreateEvents && (
              <button onClick={() => navigate('/dashboard/events/new')} className="text-sm text-neon-pink hover:underline font-medium">
                Create your first event →
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(event => (
              <AdminEventCard key={event.id} event={event} onDelete={handleDelete} canDelete={canDeleteEvents} />
            ))}
          </div>
        ) : (
          /* ── List mode — reference design style ── */
          <div className="space-y-2">
            {filtered.map(event => {
              const soldPct = ticketsSoldPercent(event)
              const remaining = ticketsRemaining(event)
              const price = lowestPrice(event)
              const categoryLabel = event.categoryName ?? 'Uncategorized'
              const categoryClass = CATEGORY_COLOURS[categoryLabel] ?? CATEGORY_COLOURS.Other
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
                            {categoryLabel}
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
                          {canDeleteEvents && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(event.id) }}
                              className="w-8 h-8 rounded-lg bg-admin-overlay border border-admin hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-admin-50 flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
