import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReservationVenues, type ReservationVenue, type VenueType } from '@glee/api'
import { Badge, Button, Input, Skeleton, cn } from '@glee/ui'
import { ChevronLeft, MapPin, Search, SlidersHorizontal, UserCircle } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'
import PageWrapper from '../../public/components/layout/PageWrapper'

const PLACEHOLDER = 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'

const TYPES: Array<{ label: string; value?: VenueType }> = [
  { label: 'All' },
  { label: 'Clubs', value: 'CLUB' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT' },
]

function venueTypeLabel(value: VenueType) {
  if (value === 'CLUB') return 'Club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'Restaurant/Hotel'
  return 'Other'
}

function venueImage(venue: ReservationVenue) {
  return venue.pictures?.[0] ?? PLACEHOLDER
}

function minimumSpendLabel(venue: ReservationVenue) {
  const spends = venue.reservationTables
    ?.map(table => Number(table.minimumSpend))
    .filter(value => Number.isFinite(value) && value > 0)

  if (!spends?.length) return 'Table booking'
  return `From KSh ${Math.min(...spends).toLocaleString()}`
}

function ReservationCard({
  venue,
  onOpen,
}: {
  venue: ReservationVenue
  onOpen: () => void
}) {
  return (
    <div
      className="group flex overflow-hidden rounded-2xl border border-white/15 bg-white/[0.10] p-3 text-left transition-all duration-300 hover:border-neon-pink/50 hover:bg-white/[0.14] hover:shadow-neon sm:h-[318px] sm:flex-col sm:p-0 lg:h-[300px]"
      onClick={onOpen}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-44 sm:w-full sm:rounded-none lg:h-40">
        <img
          src={venueImage(venue)}
          alt={venue.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={event => { event.currentTarget.src = PLACEHOLDER }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Badge className="absolute left-2 top-2 border-white/10 bg-black/35 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md">
          {venueTypeLabel(venue.venueType)}
        </Badge>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1.5 px-3 py-1 sm:p-3">
        <h2 className="shrink-0 font-heading text-base font-bold leading-tight text-white line-clamp-1 lg:text-sm">
          {venue.name}
        </h2>
        <div className="min-w-0 shrink-0 space-y-1">
          <p className="line-clamp-1 text-xs font-mono font-bold uppercase leading-4 tracking-wide text-neon-pink">
            {minimumSpendLabel(venue)}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {venue.address}
          </p>
        </div>
        <p className="hidden max-h-10 overflow-hidden text-xs leading-5 text-white/80 line-clamp-2 sm:block">
          {venue.bookingRules || venue.description || 'Reserve a table with minimum spend and deposit options.'}
        </p>

        <div className="flex shrink-0 items-center justify-between gap-2 pt-1">
          <span className="font-heading text-sm font-black text-white">Tables</span>
          <Button
            size="sm"
            className="h-8 rounded-full bg-neon-pink px-3 text-xs font-semibold text-white transition-all hover:bg-neon-hover active:scale-95"
            onClick={event => {
              event.stopPropagation()
              onOpen()
            }}
          >
            Reserve
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReservationSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <Skeleton className="h-36 w-full bg-white/10" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-5 w-3/4 bg-white/10" />
            <Skeleton className="h-3 w-1/2 bg-white/10" />
            <Skeleton className="h-3 w-1/3 bg-white/10" />
            <Skeleton className="mt-2 h-10 w-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CustomerReservationsPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState('')
  const [venueType, setVenueType] = useState<VenueType | undefined>()
  const filters = useMemo(() => ({ search: search.trim() || undefined, venueType, limit: 100 }), [search, venueType])
  const { data, isLoading } = useReservationVenues(filters)
  const venues = (data?.items ?? []).filter(venue => venue.venueType === 'CLUB' || venue.venueType === 'RESTAURANT' || venue.venueType === 'HOTEL_RESTAURANT')
  const reservationPath = (venueId: string) => isAuthenticated ? `/app/reservations/${venueId}` : `/reservations/${venueId}`

  const content = (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-10 pt-6 md:max-w-3xl lg:max-w-6xl">
      {!isAuthenticated && (
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
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Table reservations</p>
            <h1 className="mt-2 max-w-sm font-heading text-3xl font-black leading-tight text-white sm:text-4xl">
              All Reservations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Search clubs, restaurants, and hotel venues with table booking enabled.
            </p>
          </div>
          {!isAuthenticated && (
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
          )}
        </div>

        <div className="relative">
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
            <Search className="h-4 w-4 shrink-0" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search venues, restaurants, clubs..."
              className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-white shadow-none outline-none placeholder:text-white/45 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TYPES.map(type => (
            <button
              key={type.label}
              type="button"
              onClick={() => setVenueType(type.value)}
              className={cn(
                'shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
                venueType === type.value
                  ? 'bg-neon-pink text-white shadow-neon'
                  : 'border border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white',
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-1 flex-col gap-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-black text-white">
            {search.trim() ? `Results for "${search.trim()}"` : venueType ? `${venueTypeLabel(venueType)} Venues` : 'Reservation Venues'}
          </h2>
        </div>

        {isLoading ? (
          <ReservationSkeletonGrid />
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] text-white/40">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <p className="text-lg text-white/70">No reservation venues found.</p>
            <p className="mt-1 text-sm text-white/45">Try another search or venue type.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
            {venues.map(venue => (
              <ReservationCard
                key={venue.id}
                venue={venue}
                onOpen={() => navigate(reservationPath(venue.id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  if (isAuthenticated) {
    return (
      <CustomerLayout title="Reservations" hidePageHeader>
        {content}
      </CustomerLayout>
    )
  }

  return (
    <PageWrapper
      fullWidthContent={
        <main className="min-h-screen bg-[#10101d] pb-16 text-foreground">
          <section className="min-h-screen">
            {content}
          </section>
        </main>
      }
    />
  )
}
