import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Event } from '@glee/types'
import { useEvents } from '@glee/api'
import { Button, Input, Skeleton, cn } from '@glee/ui'
import { MapPin, Search, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

type CustomerStatusTab = 'active' | 'postponed' | 'sold_out'

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

const STATUS_TABS: Array<{ key: CustomerStatusTab; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'postponed', label: 'Postponed' },
  { key: 'sold_out', label: 'Sold Out' },
]

const STATUS_CONFIG: Record<CustomerStatusTab, { label: string; dot: string; text: string }> = {
  active: { label: 'Active', dot: 'bg-green-400', text: 'text-green-400' },
  postponed: { label: 'Postponed', dot: 'bg-orange-400', text: 'text-orange-400' },
  sold_out: { label: 'Sold Out', dot: 'bg-admin-30', text: 'text-admin-30' },
}

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function lowestPrice(event: Event): number {
  if (event.ticketTiers.length === 0) return 0
  return Math.min(...event.ticketTiers.map(t => t.price))
}

function customerStatus(event: Event): CustomerStatusTab {
  if (event.status === 'sold_out' || event.ticketTiers.every(tier => tier.quantityRemaining <= 0)) return 'sold_out'
  if (event.status === 'postponed') return 'postponed'
  return 'active'
}

function formatEventDate(startDate: string, endDate: string, startTime: string): string {
  const d = new Date(`${startDate}T${startTime || '00:00'}`)
  const datePart = endDate !== startDate
    ? new Date(startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) +
      ' - ' +
      new Date(endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
  return datePart + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function CustomerEventCard({ event }: { event: Event }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const statusKey = customerStatus(event)
  const status = STATUS_CONFIG[statusKey]
  const canBuy = statusKey === 'active'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/app/events/${event.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/app/events/${event.id}`)}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin transition-all duration-200',
        hovered && 'border-neon-pink/40 shadow-neon',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-44 overflow-hidden sm:h-48">
        <img
          src={event.flyerSquareUrl ?? event.flyerPortraitUrl ?? PLACEHOLDER}
          alt={event.title}
          className={cn('h-full w-full object-cover transition-transform duration-300', hovered && 'scale-105')}
          onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="absolute left-2 top-2 max-w-[48%] truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {event.categoryName ?? 'Event'}
        </div>
        <div className={cn('absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium backdrop-blur-sm', status.text)}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', status.dot)} />
          {status.label}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-heading text-sm font-bold text-foreground sm:text-base">{event.title}</h3>
        <p className="font-mono text-xs text-admin-40">{formatEventDate(event.startDate, event.endDate, event.startTime)}</p>
        {event.location && (
          <p className="flex items-center gap-1 text-xs text-admin-30">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <span className="text-xs text-admin-30">From</span>
            <p className="font-mono text-sm font-semibold text-neon-pink">{money(lowestPrice(event))}</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={e => { e.stopPropagation(); navigate(`/app/events/${event.id}`) }}
            className={cn('gap-2 text-white', canBuy ? 'bg-neon-pink hover:bg-neon-pink/90' : 'bg-admin-overlay text-admin-70 hover:bg-admin-overlay-lg')}
          >
            <Ticket className="h-4 w-4" />
            {canBuy ? 'Tickets' : 'View'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerEventsPage() {
  const { data: events = [], isLoading } = useEvents()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CustomerStatusTab>('active')

  const visibleEvents = useMemo(() => {
    return events
      .filter(event => customerStatus(event) === activeTab)
      .filter(event =>
        search.trim() === '' ||
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        (event.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (event.categoryName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [events, search, activeTab])

  const counts = useMemo(() => {
    return STATUS_TABS.reduce<Record<CustomerStatusTab, number>>((acc, tab) => {
      acc[tab.key] = events.filter(event => customerStatus(event) === tab.key).length
      return acc
    }, { active: 0, postponed: 0, sold_out: 0 })
  }, [events])

  return (
    <CustomerLayout title="Events" subtitle="Discover upcoming events, compare ticket tiers, and book your spot.">
      <div className="mb-6 space-y-4 rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-black text-foreground">Browse Events</h2>
            <p className="mt-1 text-sm text-admin-50">{visibleEvents.length} event{visibleEvents.length === 1 ? '' : 's'} in {STATUS_CONFIG[activeTab].label.toLowerCase()}</p>
          </div>
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-40" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search events, categories, locations..."
              className="w-full border-admin bg-admin-input pl-9 text-foreground placeholder:text-admin-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 overflow-x-auto rounded-xl bg-admin-input p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm',
                activeTab === tab.key ? 'bg-neon-pink text-white shadow-neon' : 'text-admin-60 hover:bg-admin-overlay-lg hover:text-admin-90',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[tab.key].dot)} />
              <span className="truncate">{tab.label}</span>
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-admin-overlay text-admin-50')}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-2xl border border-admin bg-admin-surface p-10 text-center text-admin-50 sm:p-12">
          No {STATUS_CONFIG[activeTab].label.toLowerCase()} events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleEvents.map(event => <CustomerEventCard key={event.id} event={event} />)}
        </div>
      )}
    </CustomerLayout>
  )
}
