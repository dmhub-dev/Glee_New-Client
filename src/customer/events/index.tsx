import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import type { Event } from '@glee/types'
import { useEvents, useReservationVenues } from '@glee/api'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, EmptyState, Input, LoadingPanel, cn } from '@glee/ui'
import { formatDateOnly, formatTimeOnly, parseDateOnly } from '@glee/utils'
import { Bell, CalendarX2, Check, ChevronLeft, ChevronRight, Filter, MapPinned, MapPin, Search } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'
import { VenueCarouselSection, VenueListSection, isClubOrRestaurantVenue } from '../../components/reservations/VenueShowcase'
import { RotatingMediaCover, normalizeMediaImages } from '../../components/media/MediaGallery'

type StatusFilter = Extract<Event['status'], 'active' | 'live'>
type ExploreContentType = 'events' | 'venues'

const PLACEHOLDER = '/glee-image-fallback.svg'
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'live', label: 'Live' },
]

function money(value: number) {
  return `KES ${Math.max(0, value).toLocaleString()}`
}

function lowestPrice(event: Event): number {
  if (event.ticketTiers.length === 0) return 0
  return Math.min(...event.ticketTiers.map(t => t.price))
}

function eventImages(event: Event) {
  return normalizeMediaImages(event.images ?? [event.flyerPortraitUrl, event.flyerSquareUrl], PLACEHOLDER)
}

function eventDate(event: Event) {
  const date = parseDateOnly(event.startDate)
  const [hour = 0, minute = 0] = (event.startTime || '00:00').split(':').map(Number)
  date.setHours(hour, minute, 0, 0)
  return date
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const isExplore = mode === 'explore'
  const contentType: ExploreContentType = isExplore && searchParams.get('type') === 'venues' ? 'venues' : 'events'
  const isVenueExplore = isExplore && contentType === 'venues'
  const selectedCategoryId = activeCategory === 'All' ? undefined : activeCategory
  const query = searchQuery.trim()
  const { data: carouselSourceEvents = [], isLoading: isCarouselLoading } = useEvents({ page: 1, limit: 5, status: 'active' })
  const { data: categorySourceEvents = [] } = useEvents({ page: 1, limit: 100, status: activeStatus })
  const { data: reservationVenuesData, isLoading: isReservationVenuesLoading } = useReservationVenues({ page: 1, limit: 100, search: query || undefined })
  const { data: events = [], isLoading } = useEvents({
    page: 1,
    limit: isExplore ? 100 : 12,
    search: query || undefined,
    category: selectedCategoryId,
    status: activeStatus,
  })

  useEffect(() => {
    if (!statusMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (statusMenuRef.current?.contains(target) || statusFilterButtonRef.current?.contains(target)) return
      setStatusMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [statusMenuOpen])

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
  const reservationVenues = reservationVenuesData?.items ?? []
  const visibleReservationVenues = reservationVenues.filter(isClubOrRestaurantVenue)
  const customerVenuePath = (venueId: string) => `/app/reservations/${venueId}`

  const activeCategoryLabel = categoryFilters.find(category => category.value === activeCategory)?.label ?? 'Filtered Events'

  const sectionTitle = isVenueExplore
    ? searchQuery.trim()
      ? `Hot spot results for "${searchQuery.trim()}"`
      : 'Clubs & Restaurant/Hotel'
    : searchQuery.trim()
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

  const setContentType = (type: ExploreContentType) => {
    const next = new URLSearchParams(searchParams)
    next.set('type', type)
    setSearchParams(next)
    setActiveCategory('All')
    setStatusMenuOpen(false)
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
          <h1 className="text-2xl font-bold text-white" aria-label={isVenueExplore ? 'Explore clubs and restaurants' : undefined}>
            {isVenueExplore ? (
              <>
                Explore <span className="bg-gradient-to-br from-[#FF7A3C] via-[#FF007A] to-[#9B51E0] bg-clip-text text-transparent">clubs and restaurants</span>
              </>
            ) : (
              <>
                {isExplore ? 'Explore every ' : 'Find your '}
                <span className="bg-gradient-to-br from-[#FF7A3C] via-[#FF007A] to-[#9B51E0] bg-clip-text text-transparent">
                  {isExplore ? 'event' : 'vibe'}
                </span>
                {isExplore ? '' : ' tonight'}
              </>
            )}
          </h1>
        </div>

        {isExplore && (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: 'events' as const, label: 'Events' },
              { key: 'venues' as const, label: 'Clubs & Restaurants' },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setContentType(item.key)}
                className={cn(
                  'shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition-all active:scale-95',
                  contentType === item.key
                    ? 'border-neon-pink bg-neon-pink text-white shadow-[0_0_18px_rgba(255,0,122,0.34)]'
                    : 'border-white/10 bg-white/5 text-white/62 hover:border-white/20 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Search + status filter */}
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">

          {/* Search input with status filter trigger */}
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45 transition-colors group-focus-within:text-neon-pink" />
            <Input
              placeholder="Search events, clubs, restaurants..."
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 pr-12 text-white placeholder:text-white/40 focus-visible:ring-neon-pink/50"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {!isVenueExplore && (
              <Button
                ref={statusFilterButtonRef}
                size="icon"
                variant="ghost"
                aria-label="Filter events by status"
                aria-expanded={statusMenuOpen}
                onClick={() => setStatusMenuOpen(open => !open)}
                className={cn(
                  'absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg border transition-all duration-200 active:scale-95',
                  statusMenuOpen
                    ? 'border-neon-pink/55 bg-neon-pink/16 text-neon-pink shadow-[0_0_18px_rgba(255,0,122,0.28)]'
                    : 'border-transparent text-white/45 hover:border-white/10 hover:bg-white/10 hover:text-white',
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>

          {statusMenuOpen && !isVenueExplore && (
            <div
              ref={statusMenuRef}
              className="absolute right-4 top-[calc(100%+0.5rem)] z-20 w-56 overflow-hidden rounded-2xl border border-white/20 bg-[#171426]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl"
            >
              <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
                Status
              </div>
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
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all duration-200',
                    activeStatus === filter.value
                      ? 'bg-neon-pink text-white shadow-[0_0_18px_rgba(255,0,122,0.34)]'
                      : 'text-white/90 hover:bg-white/[0.08] hover:text-white',
                  )}
                >
                  {filter.label}
                  {activeStatus === filter.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isVenueExplore && <FilterRow values={categoryFilters} active={activeCategory} onChange={setActiveCategory} />}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {isExplore || query ? sectionTitle : 'Trending This Weekend'}
            </h2>
            {!isExplore && !query && (
              <button type="button" onClick={() => navigate('/app/events?type=events')} className="text-xs text-neon-pink hover:underline">See All</button>
            )}
          </div>

          {/* Searching on home page — show results, skip carousel */}
          {!isExplore && query ? (
            isLoading ? (
              <LoadingPanel label="Searching events" variant="customer" />
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarX2 className="h-6 w-6" />}
                title={`No events match your search`}
                description={`Clear search to browse active events.`}
                action={
                  <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
                variant="customer"
              />
            ) : (
              <EventList events={filteredEvents} showCategory={false} />
            )
          ) : isVenueExplore && isReservationVenuesLoading ? (
            <LoadingPanel label="Loading clubs and restaurants" variant="customer" />
          ) : isVenueExplore && visibleReservationVenues.length === 0 ? (
            <EmptyState
              icon={<MapPinned className="h-6 w-6" />}
              title="No clubs or restaurants match your search"
              description="Clear search to browse available table spots."
              action={
                <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
              variant="customer"
            />
          ) : isVenueExplore ? (
            <VenueListSection
              venues={reservationVenues}
              isLoading={isReservationVenuesLoading}
              seeAllPath="/app/events?type=venues"
              getVenuePath={customerVenuePath}
              limit={null}
              showSeeAll={false}
              showHeader={false}
            />
          ) : isExplore && isLoading ? (
            <LoadingPanel label="Loading events" variant="customer" />
          ) : isExplore && filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title="No events match your filters"
              description="Clear filters to return to active events."
              action={
                <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
              variant="customer"
            />
          ) : isExplore ? (
            <EventList events={filteredEvents} showCategory={false} />
          ) : isCarouselLoading ? (
            <LoadingPanel label="Loading events" variant="customer" />
          ) : carouselEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title="No featured events right now"
              description="New Glee events will appear here as soon as they go live."
              variant="customer"
            />
          ) : (
            <AutoCarousel events={carouselEvents.slice(0, 5)} />
          )}
        </div>

        {!isExplore && !query && (
          <VenueCarouselSection
            venues={reservationVenues}
            isLoading={isReservationVenuesLoading}
            seeAllPath="/app/events?type=venues"
            getVenuePath={customerVenuePath}
          />
        )}

        {!isExplore && query && (
          <VenueListSection
            venues={reservationVenues}
            isLoading={isReservationVenuesLoading}
            seeAllPath="/app/events?type=venues"
            getVenuePath={customerVenuePath}
          />
        )}

        {!isExplore && !query && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{sectionTitle === 'Trending This Weekend' ? 'More Events' : sectionTitle}</h2>
            {isLoading ? (
              <LoadingPanel label="Loading events" variant="customer" />
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarX2 className="h-6 w-6" />}
                title="No events match your filters"
                description="Clear filters to return to active events."
                action={
                  <Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
                variant="customer"
              />
            ) : (
              <EventList events={filteredEvents.slice(0, 5)} showCategory={false} />
            )}
          </div>
        )}

        {!isExplore && !query && (
          <VenueListSection
            venues={reservationVenues}
            isLoading={isReservationVenuesLoading}
            seeAllPath="/app/events?type=venues"
            getVenuePath={customerVenuePath}
          />
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
            <RotatingMediaCover images={eventImages(event)} alt={event.title} fallback={PLACEHOLDER} imageClassName="group-hover:scale-110" />
          </div>
          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase text-neon-pink">
                  {formatDateOnly(event.startDate, { month: 'short', day: 'numeric' }, 'en-US')} • {formatTimeOnly(event.startTime || '00:00', { hour: '2-digit', minute: '2-digit' })}
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
                <RotatingMediaCover images={eventImages(event)} alt={event.title} fallback={PLACEHOLDER} />
                <div className="absolute left-3 top-3 z-20">
                  <Badge className="border-0 bg-white/20 text-white backdrop-blur-md hover:bg-white/30">
                    {categoryLabel(event)}
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 z-20 w-full space-y-1 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-neon-pink">
                    {formatDateOnly(event.startDate, { weekday: 'short', month: 'short', day: 'numeric' }, 'en-US')}
                  </p>
                  <h3 className="text-xl font-bold leading-tight text-white">{event.title}</h3>
                  <div className="mt-1 flex items-center text-xs text-gray-300">
                    <MapPin className="mr-1 h-3 w-3" />
                    {event.location ?? 'Location TBA'}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-white">From {money(lowestPrice(event))}</span>
                    <span className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-transform group-hover:bg-white/20 group-active:scale-95">
                      Details
                    </span>
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
