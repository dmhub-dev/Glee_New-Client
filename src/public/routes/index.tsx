import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Filter, Search, ShieldCheck, Sparkles, Ticket, UserCircle, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '@glee/api'
import type { Event } from '@glee/types'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@glee/ui'
import PageWrapper from '../components/layout/PageWrapper'
import FeaturedCarousel from '../components/events/FeaturedCarousel'
import EventGrid from '../components/events/EventGrid'

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
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<PublicStatusFilter>('active')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [accountPromptOpen, setAccountPromptOpen] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const { data: featuredEvents = [], isLoading: isFeaturedLoading } = useEvents({ page: 1, limit: 5, status: 'active' })
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

  return (
    <PageWrapper
      fullWidthContent={
        <main className="min-h-screen bg-[#10101d] pb-16 text-foreground">
          <section className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 pb-10 pt-6 md:max-w-3xl lg:max-w-5xl">
            <div className="flex items-center justify-between gap-4">
              <img src="/glee-logo-final.svg" alt="Glee" className="h-14" />
              <button
                type="button"
                onClick={() => setAccountPromptOpen(true)}
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
                    placeholder="Search events, artists, venues..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                  />
                  <button
                    type="button"
                    aria-label="Filter events by status"
                    aria-expanded={statusMenuOpen}
                    onClick={() => setStatusMenuOpen(value => !value)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition-colors hover:border-neon-pink/50 hover:text-neon-pink sm:hidden"
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
                              : 'text-white/58 hover:bg-white/8 hover:text-white',
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

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-black text-white">Trending This Weekend</h2>
              </div>
              <FeaturedCarousel events={trendingEvents.slice(0, 5)} isLoading={isFeaturedLoading} />
            </section>

            <section className="flex flex-1 flex-col gap-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-black text-white">{resultTitle}</h2>
                <div className="flex items-center gap-3">
                  {page > 1 && <span className="text-xs font-semibold text-white/60">Page {page}</span>}
                  <button type="button" onClick={() => navigate('/events')} className="text-sm font-semibold text-neon-pink hover:text-neon-hover">
                    See All
                  </button>
                </div>
              </div>
              <EventGrid events={listedEvents} isLoading={isLoading} />
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

            <Dialog open={accountPromptOpen} onOpenChange={setAccountPromptOpen}>
              <DialogContent className="mx-auto max-h-[88vh] max-w-[92vw] overflow-hidden rounded-[2rem] border-white/10 bg-[#060313] p-0 text-white shadow-[0_30px_110px_rgba(0,0,0,0.6)] sm:max-w-md">
                <DialogHeader>
                  <div className="relative overflow-hidden rounded-t-[2rem] border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.04)_42%,rgba(255,0,122,0.12))] p-5">
                    <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-pink/80 to-transparent" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-neon-pink">
                          <Sparkles className="h-3 w-3" />
                          Member Access
                        </div>
                        <DialogTitle className="mt-4 max-w-[18rem] font-heading text-3xl font-black leading-none text-white">
                          Step into the Glee app
                        </DialogTitle>
                        <DialogDescription className="mt-3 text-sm leading-6 text-white/64">
                          Create an account to keep your nights, tickets, and payments together.
                        </DialogDescription>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/25 ring-1 ring-white/10">
                        <img src="/glee-logo-final.svg" alt="Glee" className="h-10 w-10 object-contain" />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10">
                      <MiniStat value="Fast" label="checkout" />
                      <MiniStat value="QR" label="tickets" />
                      <MiniStat value="Pay" label="wallet" />
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 p-5">
                  <div className="grid gap-3">
                    <Benefit icon={Ticket} title="Ticket vault" text="Bought passes, QR codes, and event details stay organized." />
                    <Benefit icon={Wallet} title="Wallet-ready" text="Top up once and pay quickly for eligible events." />
                    <Benefit icon={ShieldCheck} title="Priority flow" text="Save account details so checkout takes fewer steps." />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAccountPromptOpen(false)}
                      className="h-11 flex-1 rounded-full bg-white/5 text-white hover:bg-white/10"
                    >
                      Not Now
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate('/app')}
                      className="h-11 flex-1 rounded-full bg-neon-pink font-bold text-white shadow-[0_0_24px_rgba(255,0,122,0.35)] hover:bg-neon-pink/90"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </section>
        </main>
      }
    />
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-2.5 text-center last:border-r-0">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/42">{label}</p>
    </div>
  )
}

function Benefit({ icon: Icon, title, text }: { icon: typeof Ticket; title: string; text: string }) {
  return (
    <div className="group flex gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.09]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-pink/14 text-neon-pink ring-1 ring-neon-pink/15">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-white/55">{text}</p>
      </div>
    </div>
  )
}
