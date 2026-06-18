import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Filter, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '@glee/api'
import type { Event } from '@glee/types'
import PageWrapper from '../../components/layout/PageWrapper'
import EventGrid from '../../components/events/EventGrid'

const PAGE_SIZE = 12
type PublicStatusFilter = Extract<Event['status'], 'active' | 'live' | 'cancelled' | 'sold_out'>

const STATUS_FILTERS: Array<{ value: PublicStatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'live', label: 'Live' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function PublicEventsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<PublicStatusFilter>('active')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const { data: categorySourceEvents = [] } = useEvents({ page: 1, limit: 100, status: statusFilter })
  const { data: events = [], isLoading } = useEvents({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: categoryId,
    status: statusFilter,
  })

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(1)
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

  const canGoNext = events.length >= PAGE_SIZE
  const statusLabel = STATUS_FILTERS.find(status => status.value === statusFilter)?.label ?? 'Active'
  const resultTitle = search
    ? `Results for "${search}"`
    : categoryId
      ? categoryLabels.find(category => category.id === categoryId)?.name ?? 'Filtered Events'
      : `${statusLabel} Events`

  const selectStatus = (status: PublicStatusFilter) => {
    setPage(1)
    setCategoryId(undefined)
    setStatusFilter(status)
    setStatusMenuOpen(false)
  }

  const clearFilters = () => {
    setPage(1)
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
          <section className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 pb-10 pt-6 md:max-w-3xl lg:max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/[0.12] text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-colors hover:border-neon-pink/50 hover:bg-white/[0.18] hover:text-neon-pink"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <img src="/glee-logo-final.svg" alt="Glee" className="h-14" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Explore</p>
                <h1 className="mt-2 max-w-sm font-heading text-3xl font-black leading-tight text-white sm:text-4xl">
                  All Events
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                  Search every public Glee event and narrow results by category or status.
                </p>
              </div>

              <div ref={statusFilterRef} className="relative">
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    value={searchInput}
                    onChange={event => setSearchInput(event.target.value)}
                    placeholder="Search events, artists, venues..."
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
                    onClick={() => {
                      setPage(1)
                      setCategoryId(category.id)
                    }}
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

            <section className="flex flex-1 flex-col gap-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-black text-white">{resultTitle}</h2>
                {page > 1 && <span className="text-xs font-semibold text-white/60">Page {page}</span>}
              </div>
              <EventGrid
                events={listedEvents}
                isLoading={isLoading}
                emptyTitle={search || categoryId || statusFilter !== 'active' ? 'No events match your filters' : 'No active events right now'}
                emptyDescription={search || categoryId || statusFilter !== 'active' ? 'Clear filters to return to active events.' : 'New Glee events will appear here as soon as they go live.'}
                emptyAction={(search || categoryId || statusFilter !== 'active') ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white shadow-neon transition-colors hover:bg-neon-pink/90"
                  >
                    Clear filters
                  </button>
                ) : undefined}
              />
              <div className="mt-auto flex items-center justify-end gap-2 pt-6">
                <button
                  type="button"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage(value => Math.max(1, value - 1))}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/75 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canGoNext || isLoading}
                  onClick={() => setPage(value => value + 1)}
                  className="rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white shadow-neon disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next
                </button>
              </div>
            </section>
          </section>
        </main>
      }
    />
  )
}
