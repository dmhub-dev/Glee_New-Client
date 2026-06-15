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

  const selectStatus = (status: PublicStatusFilter) => {
    setCategoryId(undefined)
    setStatusFilter(status)
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
              <EventGrid events={listedEvents} isLoading={isLoading} />

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
                <div className="flex items-center gap-4">
                  <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-5 h-5">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.8" fill="white" stroke="none" />
                    </svg>
                  </a>
                  <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X"
                    className="w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                    className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center transition-all hover:scale-110 hover:bg-[#0e65d9] active:scale-95">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                    className="w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:border-white/50 active:scale-95">
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
                    </svg>
                  </a>
                </div>
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
