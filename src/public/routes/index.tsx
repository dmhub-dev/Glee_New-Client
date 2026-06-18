import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Filter, Search, UserCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useEvents, useReservationVenues } from '@glee/api'
import type { Event } from '@glee/types'
import PageWrapper from '../components/layout/PageWrapper'
import FeaturedCarousel from '../components/events/FeaturedCarousel'
import EventGrid from '../components/events/EventGrid'
import { VenueCarouselSection, VenueListSection } from '../../components/reservations/VenueShowcase'

const PAGE_SIZE = 12
type PublicStatusFilter = Extract<Event['status'], 'active' | 'live' | 'cancelled' | 'sold_out'>

const STATUS_FILTERS: Array<{ value: PublicStatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'live', label: 'Live' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<PublicStatusFilter>('active')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const { data: featuredEvents = [], isLoading: isFeaturedLoading } = useEvents({ page: 1, limit: 5, status: 'active' })
  const { data: categorySourceEvents = [] } = useEvents({ page: 1, limit: 100, status: statusFilter })
  const { data: reservationVenuesData, isLoading: isReservationVenuesLoading } = useReservationVenues({ page: 1, limit: 100, search: search || undefined })
  const { data: events = [], isLoading } = useEvents({
    page: 1,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: categoryId,
    status: statusFilter,
  })

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    if (!statusMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!statusFilterRef.current?.contains(event.target as Node)) {
        setStatusMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [statusMenuOpen])

  const listedEvents = useMemo(
    () =>
      events
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [events],
  )

  const trendingEvents = useMemo(
    () =>
      featuredEvents
        .filter(e => e.status === 'active')
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [featuredEvents],
  )

  const categoryLabels = useMemo(() => {
    const eventCategories = new Map<string, string>()
    categorySourceEvents.forEach(event => {
      if (event.categoryId && event.categoryName) {
        eventCategories.set(event.categoryId, event.categoryName)
      }
    })

    return [
      { id: undefined, name: 'All' },
      ...Array.from(eventCategories, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    ]
  }, [categorySourceEvents])

  const reservationVenues = reservationVenuesData?.items ?? []
  const publicVenuePath = (venueId: string) => `/reservations/${venueId}`
  const statusLabel = STATUS_FILTERS.find(status => status.value === statusFilter)?.label ?? 'Active'
  const resultTitle = search
    ? `Results for "${search}"`
    : categoryId
      ? categoryLabels.find(category => category.id === categoryId)?.name ?? 'Filtered Events'
      : `${statusLabel} Events`
  const hasEventFilters = Boolean(search || categoryId || statusFilter !== 'active')

  const selectStatus = (status: PublicStatusFilter) => {
    setCategoryId(undefined)
    setStatusFilter(status)
    setStatusMenuOpen(false)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setCategoryId(undefined)
    setStatusFilter('active')
    setStatusMenuOpen(false)
  }

  return (
    <PageWrapper
      fullWidthContent={
        <main className="min-h-screen bg-[#10101d] pb-16 text-foreground">
          <section className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 pb-10 pt-6 md:max-w-3xl lg:max-w-5xl">
            <div className="flex items-center justify-between gap-4">
              <img src="/glee-logo-final.svg" alt="Glee" className="h-14" />
              <button
                type="button"
                onClick={() => navigate('/signup')}
                aria-label="Open user account"
                className="group flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-2.5 pr-3 text-white shadow-[0_14px_38px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-neon-pink/45 hover:bg-white/[0.12] active:scale-95"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-pink text-white shadow-[0_0_18px_rgba(255,0,122,0.35)]">
                  <UserCircle className="h-5 w-5" />
                </span>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/88 transition-colors group-hover:text-white">
                  Glee App
                </span>
              </button>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-sm font-heading text-2xl font-black leading-tight text-white sm:text-3xl">
                Find your <span className="text-neon-pink">vibe</span> tonight
              </h1>

              <div ref={statusFilterRef} className="relative">
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    value={searchInput}
                    onChange={event => setSearchInput(event.target.value)}
                    placeholder="Search events, clubs, restaurants..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                  />
                  <button
                    type="button"
                    aria-label="Filter events by status"
                    aria-expanded={statusMenuOpen}
                    onClick={() => setStatusMenuOpen(value => !value)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition-colors hover:border-neon-pink/50 hover:bg-white/[0.12] hover:text-neon-pink sm:hidden"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                  <div className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1 sm:flex">
                    {STATUS_FILTERS.map(status => {
                      const active = statusFilter === status.value
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => selectStatus(status.value)}
                          className={[
                            'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                            active
                              ? 'bg-neon-pink text-white shadow-neon'
                              : 'text-white/65 hover:bg-white/[0.08] hover:text-white',
                          ].join(' ')}
                        >
                          {status.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {statusMenuOpen && (
                  <div className="absolute right-0 top-14 z-[80] w-52 overflow-hidden rounded-2xl border border-white/18 bg-[#181827] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)] sm:hidden">
                    <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-white/70">
                      Status
                    </div>
                    {STATUS_FILTERS.map(status => {
                      const active = statusFilter === status.value
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => selectStatus(status.value)}
                          className={[
                            'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors',
                            active ? 'bg-neon-pink text-white shadow-neon' : 'text-white/90 hover:bg-white/10 hover:text-white',
                          ].join(' ')}
                        >
                          <span>{status.label}</span>
                          {active && <Check className="h-4 w-4" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categoryLabels.map(category => (
                  <button
                    key={category.id ?? 'all'}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={[
                      'shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
                      categoryId === category.id
                        ? 'bg-neon-pink text-white shadow-neon'
                        : 'border border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white',
                    ].join(' ')}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {!search && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-black text-white">Trending This Weekend</h2>
                </div>
                <FeaturedCarousel events={trendingEvents.slice(0, 5)} isLoading={isFeaturedLoading} />
              </section>
            )}

            {!search && (
              <VenueCarouselSection
                venues={reservationVenues}
                isLoading={isReservationVenuesLoading}
                seeAllPath="/reservations"
                getVenuePath={publicVenuePath}
              />
            )}

            <section className="flex flex-1 flex-col gap-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-black text-white">{resultTitle}</h2>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => navigate('/events')} className="text-sm font-semibold text-neon-pink hover:text-neon-hover">
                    See All
                  </button>
                </div>
              </div>
              <EventGrid
                events={listedEvents}
                isLoading={isLoading}
                emptyTitle={hasEventFilters ? 'No events match your search' : 'No active events right now'}
                emptyDescription={hasEventFilters ? 'Clear filters to see more events.' : 'New Glee events will appear here as soon as they go live.'}
                emptyAction={hasEventFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white shadow-neon transition-colors hover:bg-neon-pink/90"
                  >
                    Clear filters
                  </button>
                ) : undefined}
              />

              {search && (
                <VenueListSection
                  venues={reservationVenues}
                  isLoading={isReservationVenuesLoading}
                  seeAllPath="/reservations"
                  getVenuePath={publicVenuePath}
                />
              )}

              {!search && (
                <VenueListSection
                  venues={reservationVenues}
                  isLoading={isReservationVenuesLoading}
                  seeAllPath="/reservations"
                  getVenuePath={publicVenuePath}
                />
              )}
            </section>

            <footer className="border-t border-white/10 mt-4 py-12 px-8">
              <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
                <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
                  {[
                    { label: 'Privacy Policy', to: '/privacy-policy' },
                    { label: 'Terms of Use', to: '/terms' },
                    { label: 'Refunds & Returns', to: '/refund-policy' },
                  ].map(({ label, to }) => (
                    <Link key={label} to={to} className="text-sm text-neon-pink/70 hover:text-neon-pink hover:underline underline-offset-4 transition-colors">
                      {label}
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-white/30 tracking-wide">© 2026 Glee Events. All rights reserved.</p>
              </div>
            </footer>
          </section>
        </main>
      }
    />
  )
}
