import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import type { Event } from '@glee/types'
import { useEvents } from '@glee/api'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Input, cn } from '@glee/ui'
import { Bell, Check, ChevronLeft, ChevronRight, Filter, MapPin, Search } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'

type StatusFilter = 'active' | 'live' | 'sold_out' | 'cancelled'

const PLACEHOLDER = 'https://placehold.co/900x1200/050017/FF007A?text=Glee'
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'live', label: 'Live' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'cancelled', label: 'Cancelled' },
]

function money(value: number) {
  return `KES ${Math.max(0, value).toLocaleString()}`
}

function lowestPrice(event: Event): number {
  if (event.ticketTiers.length === 0) return 0
  return Math.min(...event.ticketTiers.map(t => t.price))
}

function eventImage(event: Event) {
  return event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER
}

function eventDate(event: Event) {
  return new Date(`${event.startDate}T${event.startTime || '00:00'}`)
}

function categoryLabel(event: Event) {
  return event.categoryName ?? 'Event'
}

export default function CustomerEventsPage() {
  return <EventsScreen mode="explore" />
}

export function CustomerHomePage() {
  return <EventsScreen mode="home" />
}

function EventsScreen({ mode }: { mode: 'home' | 'explore' }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const isExplore = mode === 'explore'
  const selectedCategoryId = activeCategory === 'All' ? undefined : activeCategory
  const query = searchQuery.trim()
  const { data: carouselSourceEvents = [], isLoading: isCarouselLoading } = useEvents({ page: 1, limit: 5, status: 'active' })
  const { data: categorySourceEvents = [] } = useEvents({ page: 1, limit: 100, status: activeStatus })
  const { data: events = [], isLoading } = useEvents({
    page: 1,
    limit: isExplore ? 100 : 12,
    search: query || undefined,
    category: selectedCategoryId,
    status: activeStatus,
  })

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!statusFilterRef.current?.contains(event.target as Node)) setStatusMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const categoryFilters = useMemo(() => {
    const categories = new Map<string, string>()
    categorySourceEvents.forEach(event => {
      if (event.categoryId && event.categoryName) {
        categories.set(event.categoryId, event.categoryName)
      }
    })

    return [
      { value: 'All', label: 'All' },
      ...Array.from(categories, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    ]
  }, [categorySourceEvents])

  const filteredEvents = useMemo(() => {
    return events
      .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())
  }, [events])

  const carouselEvents = useMemo(() => {
    return carouselSourceEvents
      .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())
  }, [carouselSourceEvents])

  const activeCategoryLabel = categoryFilters.find(category => category.value === activeCategory)?.label ?? 'Filtered Events'

  const sectionTitle = searchQuery.trim()
    ? `Results for "${searchQuery.trim()}"`
    : activeCategory !== 'All'
      ? activeCategoryLabel
      : isExplore ? 'All Events' : 'Trending This Weekend'

  const initials = (user?.name ?? 'User')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const clearFilters = () => {
    setActiveCategory('All')
    setActiveStatus('active')
    setSearchQuery('')
  }

  return (
    <CustomerLayout title={isExplore ? 'Explore' : 'Home'} hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-28 pt-6 lg:px-8">
        {!isExplore && (
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex flex-col">
              <span className="text-xs text-white/55">Discover</span>
              <div className="flex cursor-pointer items-center font-medium text-white transition-colors hover:text-neon-pink">
                Events everywhere
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" className="relative rounded-full bg-white/5 text-white transition-transform hover:bg-white/10 active:scale-95">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-neon-pink" />
              </Button>
              <Avatar className="h-9 w-9 cursor-pointer border-2 border-white/10" onClick={() => navigate('/app/profile')}>
                <AvatarImage src={user?.avatarUrl ?? undefined} className="object-cover" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-white">
            {isExplore ? 'Explore every ' : 'Find your '}
            <span className="bg-gradient-to-br from-[#FF7A3C] via-[#FF007A] to-[#9B51E0] bg-clip-text text-transparent">
              {isExplore ? 'event' : 'vibe'}
            </span>
            {isExplore ? '' : ' tonight'}
          </h1>
        </div>

        {/* Search + status filter */}
        <div ref={statusFilterRef} className="relative flex flex-col gap-2 sm:flex-row sm:items-center">

          {/* Search input — filter icon inside on mobile, clean on desktop */}
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45 transition-colors group-focus-within:text-neon-pink" />
            <Input
              placeholder="Search events, artists, venues..."
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 pr-12 text-white placeholder:text-white/40 focus-visible:ring-neon-pink/50 sm:pr-4"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {/* Filter icon inside input — mobile only */}
            <Button
              size="icon"
              variant="ghost"
              aria-label="Filter events by status"
              onClick={() => setStatusMenuOpen(open => !open)}
              className={cn(
                'absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg transition-colors sm:hidden',
                statusMenuOpen ? 'text-neon-pink' : 'text-white/45 hover:text-white',
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop: separate pill row */}
          <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:flex">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveCategory('All')
                  setActiveStatus(filter.value)
                }}
                className={cn(
                  'h-9 rounded-lg px-3 text-xs font-semibold transition-all active:scale-95',
                  activeStatus === filter.value
                    ? 'bg-neon-pink text-white shadow-[0_0_12px_rgba(255,0,122,0.3)]'
                    : 'text-white/55 hover:bg-white/10 hover:text-white',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Mobile dropdown */}
          {statusMenuOpen && (
            <div className="absolute right-4 top-[calc(100%+0.5rem)] z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#160C2C] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.42)] sm:hidden">
              {STATUS_FILTERS.map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setActiveCategory('All')
                    setActiveStatus(filter.value)
                    setStatusMenuOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    activeStatus === filter.value ? 'bg-neon-pink text-white' : 'text-white/78 hover:bg-white/10',
                  )}
                >
                  {filter.label}
                  {activeStatus === filter.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <FilterRow values={categoryFilters} active={activeCategory} onChange={setActiveCategory} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{isExplore ? sectionTitle : 'Trending This Weekend'}</h2>
            {!isExplore && <button type="button" onClick={() => navigate('/app/events')} className="text-xs text-neon-pink hover:underline">See All</button>}
          </div>

          {isExplore && isLoading ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
              <p className="text-white/55">Loading events...</p>
            </div>
          ) : isExplore && filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
              <p className="text-white/55">No events found matching your criteria.</p>
              <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : isExplore ? (
            <EventList events={filteredEvents} showCategory={false} />
          ) : isCarouselLoading ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
              <p className="text-white/55">Loading events...</p>
            </div>
          ) : carouselEvents.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
              <p className="text-white/55">No featured events right now.</p>
            </div>
          ) : (
            <AutoCarousel events={carouselEvents.slice(0, 5)} />
          )}
        </div>

        {!isExplore && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{sectionTitle === 'Trending This Weekend' ? 'More Events' : sectionTitle}</h2>
            {isLoading ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
                <p className="text-white/55">Loading events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 py-10 text-center">
                <p className="text-white/55">No events found matching your criteria.</p>
                <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <EventList events={filteredEvents.slice(0, 5)} showCategory={false} />
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}

function FilterRow<T extends string>({ values, active, onChange }: { values: Array<{ value: T; label: string }>; active: T; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {values.map(filter => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={cn(
            'shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-95',
            active === filter.value
              ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,0,122,0.4)]'
              : 'border border-white/5 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

function EventList({ events, showCategory = true }: { events: Event[]; showCategory?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => navigate(`/app/events/${event.id}`)}
          className="group flex w-full cursor-pointer gap-4 rounded-xl border border-white/5 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
        >
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            <img src={event.flyerSquareUrl ?? eventImage(event)} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
          </div>
          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase text-neon-pink">
                  {eventDate(event).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {eventDate(event).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="mt-1 line-clamp-1 text-base font-bold text-white">{event.title}</h3>
              <p className="line-clamp-1 text-xs text-white/55">{event.location ?? 'Location TBA'}</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{money(lowestPrice(event))}</span>
              {showCategory ? (
                <Badge variant="outline" className="h-5 border-white/20 text-[10px] text-white/55">
                  {categoryLabel(event)}
                </Badge>
              ) : (
                <span className="rounded-full bg-neon-pink px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_0_14px_rgba(255,0,122,0.3)]">
                  Buy Tickets
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function AutoCarousel({ events }: { events: Event[] }) {
  const navigate = useNavigate()
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi) return
    const autoplay = setInterval(() => emblaApi.scrollNext(), 4000)
    return () => clearInterval(autoplay)
  }, [emblaApi])

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {events.map(event => (
            <div key={event.id} className="mr-4 min-w-0 flex-[0_0_85%] md:flex-[0_0_48%] xl:flex-[0_0_32%]">
              <button type="button" onClick={() => navigate(`/app/events/${event.id}`)} className="group relative h-[350px] w-full cursor-pointer overflow-hidden rounded-2xl border border-white/5 text-left xl:h-[420px]">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050017] via-transparent to-transparent" />
                <img src={eventImage(event)} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
                <div className="absolute left-3 top-3 z-20">
                  <Badge className="border-0 bg-white/20 text-white backdrop-blur-md hover:bg-white/30">
                    {categoryLabel(event)}
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 z-20 w-full space-y-1 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-neon-pink">
                    {eventDate(event).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <h3 className="text-xl font-bold leading-tight text-white">{event.title}</h3>
                  <div className="mt-1 flex items-center text-xs text-gray-300">
                    <MapPin className="mr-1 h-3 w-3" />
                    {event.location ?? 'Location TBA'}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-white">From {money(lowestPrice(event))}</span>
                    <Button size="sm" className="h-9 rounded-full border border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm transition-transform hover:bg-white/20 active:scale-95">
                      Details
                    </Button>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => emblaApi?.scrollPrev()} className="absolute left-2 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur sm:flex">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => emblaApi?.scrollNext()} className="absolute right-2 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur sm:flex">
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="mt-4 flex items-center justify-center gap-2">
        {events.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={cn('h-2 rounded-full transition-all', idx === selectedIndex ? 'w-6 bg-neon-pink' : 'w-2 bg-white/30 hover:bg-white/50')}
            onClick={() => emblaApi?.scrollTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
