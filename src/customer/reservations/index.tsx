import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReservationVenues, type VenueType } from '@glee/api'
import { Badge, Button, Input, Skeleton, cn } from '@glee/ui'
import { CalendarCheck, MapPin, Search, SlidersHorizontal, Users } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/900x600/050017/FF2D8F?text=Glee+Reservations'

const TYPES: Array<{ label: string; value?: VenueType }> = [
  { label: 'All' },
  { label: 'Clubs', value: 'CLUB' },
  { label: 'Restaurant/Hotel', value: 'RESTAURANT' },
  { label: 'Other', value: 'OTHER' },
]

function venueTypeLabel(value: VenueType) {
  if (value === 'CLUB') return 'Club'
  if (value === 'RESTAURANT' || value === 'HOTEL_RESTAURANT') return 'Restaurant/Hotel'
  return 'Other'
}

export default function CustomerReservationsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [venueType, setVenueType] = useState<VenueType | undefined>()
  const filters = useMemo(() => ({ search: search.trim() || undefined, venueType }), [search, venueType])
  const { data, isLoading } = useReservationVenues(filters)
  const venues = data?.items ?? []

  return (
    <CustomerLayout title="Reservations" hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-32 pt-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-white/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Table reservations</p>
              <h1 className="mt-3 font-heading text-3xl font-black leading-tight text-white sm:text-5xl">Book your table</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Reserve restaurants, clubs, and hotel venues with wallet deposit. Pick the table type; the venue assigns the exact table.</p>
            </div>
            <Button onClick={() => navigate('/app/reservations/my')} className="h-11 rounded-full bg-neon-pink px-5 text-white hover:bg-neon-pink/90">
              <CalendarCheck className="h-4 w-4" />
              My reservations
            </Button>
          </div>
        </section>

        <section className="rounded-3xl bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search venues, restaurants, clubs..."
              className="h-12 rounded-2xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35 focus-visible:ring-neon-pink/50"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {TYPES.map(type => (
              <button
                key={type.label}
                type="button"
                onClick={() => setVenueType(type.value)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95',
                  venueType === type.value ? 'bg-neon-pink text-white shadow-[0_0_18px_rgba(255,45,143,0.28)]' : 'bg-white/8 text-white/60 hover:bg-white/12 hover:text-white',
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-3xl bg-white/10" />)}
          </div>
        ) : venues.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.08] p-10 text-center shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-white/40">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">No reservation venues found</p>
            <p className="mt-1 text-xs text-white/50">Try another search or venue type.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {venues.map(venue => (
              <article key={venue.id} className="overflow-hidden rounded-3xl bg-white/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-white/[0.1]">
                <button type="button" onClick={() => navigate(`/app/reservations/${venue.id}`)} className="block aspect-[16/10] w-full bg-white/8 text-left">
                  {venue.pictures?.[0] ? (
                    <img
                      src={venue.pictures[0]}
                      alt={venue.name}
                      className="h-full w-full object-cover"
                      onError={event => { event.currentTarget.src = PLACEHOLDER }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <CalendarCheck className="h-10 w-10 text-neon-pink/40" />
                    </div>
                  )}
                </button>
                <div className="p-4">
                  <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{venueTypeLabel(venue.venueType)}</Badge>
                  <h2 className="mt-3 line-clamp-1 font-heading text-xl font-black text-white">{venue.name}</h2>
                  <p className="mt-2 flex min-w-0 items-center gap-2 text-sm text-white/55">
                    <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                    <span className="truncate">{venue.address}</span>
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/55"><Users className="h-4 w-4 text-neon-pink" />Capacity {Number(venue.capacity ?? 0).toLocaleString()}</p>
                  {venue.bookingRules && <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/45">{venue.bookingRules}</p>}
                  <Button onClick={() => navigate(`/app/reservations/${venue.id}`)} className="mt-4 h-11 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                    Reserve Table
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
