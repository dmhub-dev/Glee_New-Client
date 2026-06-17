import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Skeleton } from '@glee/ui'
import { CalendarCheck, MapPin } from 'lucide-react'
import type { ReservationVenue } from '@glee/api'
import { RotatingMediaCover, normalizeMediaImages } from '../media/MediaGallery'

const PLACEHOLDER = '/glee-image-fallback.svg'

export function isClubOrRestaurantVenue(venue: ReservationVenue) {
  return venue.venueType === 'CLUB' || venue.venueType === 'RESTAURANT' || venue.venueType === 'HOTEL_RESTAURANT'
}

function venueTypeLabel(venue: ReservationVenue) {
  if (venue.venueType === 'CLUB') return 'Club'
  return 'Restaurant/Hotel'
}

function venueImages(venue: ReservationVenue) {
  return normalizeMediaImages(venue.pictures, PLACEHOLDER)
}

function VenueCard({
  venue,
  getVenuePath,
  variant = 'grid',
}: {
  venue: ReservationVenue
  getVenuePath: (venueId: string) => string
  variant?: 'carousel' | 'grid'
}) {
  const navigate = useNavigate()
  if (variant === 'carousel') {
    return (
      <button
        type="button"
        onClick={() => navigate(getVenuePath(venue.id))}
        className="group relative h-[350px] w-full overflow-hidden rounded-2xl border border-white/10 text-left shadow-[0_18px_48px_rgba(0,0,0,0.42)] transition hover:border-neon-pink/45"
      >
        <RotatingMediaCover images={venueImages(venue)} alt={venue.name} fallback={PLACEHOLDER} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
        <Badge className="absolute left-3 top-3 border-0 bg-white/20 text-white backdrop-blur-md">
          {venueTypeLabel(venue)}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="max-w-xs font-heading text-xl font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">{venue.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{venue.address}</span>
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-heading text-lg font-black text-white">Tables available</span>
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition group-hover:bg-white/20">
              Reserve
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate(getVenuePath(venue.id))}
      className="group flex overflow-hidden rounded-2xl border border-white/15 bg-white/[0.10] p-3 text-left transition-all duration-300 hover:border-neon-pink/50 hover:bg-white/[0.14] hover:shadow-neon sm:h-[318px] sm:flex-col sm:p-0 lg:h-[300px]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-44 sm:w-full sm:rounded-none lg:h-40">
        <RotatingMediaCover images={venueImages(venue)} alt={venue.name} fallback={PLACEHOLDER} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1.5 px-3 py-1 sm:p-3">
        <h3 className="shrink-0 font-heading text-base font-bold leading-tight text-white line-clamp-1 lg:text-sm">{venue.name}</h3>
        <div className="min-w-0 shrink-0 space-y-1">
          <p className="line-clamp-1 text-xs font-mono font-bold uppercase leading-4 tracking-wide text-neon-pink">{venueTypeLabel(venue)}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {venue.address}
          </p>
        </div>
        {venue.bookingRules ? (
          <p className="hidden max-h-10 overflow-hidden text-xs leading-5 text-white/80 line-clamp-2 sm:block">{venue.bookingRules}</p>
        ) : (
          <p className="hidden max-h-10 overflow-hidden text-xs leading-5 text-white/80 line-clamp-2 sm:block">Reserve a table with a minimum spend and deposit.</p>
        )}
        <div className="flex shrink-0 items-center justify-between gap-2 pt-1">
          <span className="font-heading text-sm font-black text-white">Tables</span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-neon-pink px-3 text-xs font-semibold text-white transition-all group-active:scale-95">
            <CalendarCheck className="h-3.5 w-3.5" />
            Reserve
          </span>
        </div>
      </div>
    </button>
  )
}

export function VenueCarouselSection({
  venues,
  isLoading,
  seeAllPath,
  getVenuePath,
}: {
  venues: ReservationVenue[]
  isLoading: boolean
  seeAllPath: string
  getVenuePath: (venueId: string) => string
}) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const visibleVenues = venues.filter(isClubOrRestaurantVenue).slice(0, 8)

  useEffect(() => {
    if (visibleVenues.length <= 1) return
    const id = window.setInterval(() => {
      setCurrent(index => (index + 1) % visibleVenues.length)
    }, 4500)
    return () => window.clearInterval(id)
  }, [visibleVenues.length])

  useEffect(() => {
    if (current >= visibleVenues.length) setCurrent(0)
  }, [current, visibleVenues.length])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon-pink">Clubs and Restaurant/Hotel</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Popular Hot Spots</h2>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-[350px] w-full rounded-2xl bg-white/10" />
      ) : visibleVenues.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate(seeAllPath)}
          className="flex h-[350px] w-full flex-col justify-end rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,143,0.22),transparent_30%),linear-gradient(135deg,#160827_0%,#090111_100%)] p-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.34)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon-pink">Reservations</p>
          <h3 className="mt-2 max-w-sm font-heading text-2xl font-black leading-tight text-white">No popular hot spots yet</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/62">Clubs and Restaurant/Hotel venues will appear here once they are enabled for standalone reservations.</p>
          <span className="mt-5 inline-flex h-10 w-fit items-center rounded-full bg-neon-pink px-5 text-sm font-bold text-white shadow-neon">
            See reservations
          </span>
        </button>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {visibleVenues.map(venue => (
                <div key={venue.id} className="w-full shrink-0">
                  <VenueCard venue={venue} getVenuePath={getVenuePath} variant="carousel" />
                </div>
              ))}
            </div>
          </div>
          {visibleVenues.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {visibleVenues.map((venue, index) => (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to hot spot ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${index === current ? 'w-6 bg-neon-pink' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function VenueListSection({
  venues,
  isLoading,
  seeAllPath,
  getVenuePath,
  limit = 6,
  showSeeAll = true,
  showHeader = true,
  title = 'Reserve Clubs and Restaurant/Hotel',
}: {
  venues: ReservationVenue[]
  isLoading: boolean
  seeAllPath: string
  getVenuePath: (venueId: string) => string
  limit?: number | null
  showSeeAll?: boolean
  showHeader?: boolean
  title?: string
}) {
  const navigate = useNavigate()
  const filteredVenues = venues.filter(isClubOrRestaurantVenue)
  const visibleVenues = limit === null ? filteredVenues : filteredVenues.slice(0, limit)

  if (!isLoading && visibleVenues.length === 0) return null

  return (
    <section className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {showSeeAll && (
            <button type="button" onClick={() => navigate(seeAllPath)} className="text-xs font-semibold text-neon-pink hover:underline">
              See All
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,230px))] lg:justify-start">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl bg-white/10" />)
          : visibleVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} getVenuePath={getVenuePath} />
          ))}
      </div>
    </section>
  )
}
