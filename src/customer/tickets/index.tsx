import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyTickets } from '@glee/api'
import { Badge, Button, Input, Skeleton } from '@glee/ui'
import { Calendar, MapPin, QrCode, Search, Ticket, Utensils } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/900x600/141419/FF2D8F?text=Glee'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerTicketsPage() {
  const { data: groups, isLoading } = useMyTickets()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const totalTickets = (groups ?? []).reduce((sum, group) => sum + group.noOfTicketsPurchased, 0)
  const upcoming = (groups ?? []).filter(group => group.event.startDate && new Date(group.event.startDate) >= new Date()).length
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groups ?? []
    return (groups ?? []).filter(group => {
      const event = group.event
      const category = event.category?.name ?? ''
      const location = event.location?.name ?? event.location?.address ?? ''
      return [event.name, category, location]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query))
    })
  }, [groups, searchQuery])

  return (
    <CustomerLayout title="Tickets" subtitle="Your event passes, QR codes, and purchase history." hidePageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-32 pt-6 lg:px-8">
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Ticket wallet</p>
            <h1 className="mt-2 font-heading text-3xl font-black leading-none text-white">My Tickets</h1>
            <p className="mt-2 text-sm leading-6 text-white/58">Your tickets and table bookings in one place.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:max-w-2xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neon-pink/15 text-neon-pink">
                <Ticket className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-black text-white">{totalTickets}</p>
              <p className="text-xs text-white/45">Total Tickets</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <Utensils className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-black text-white">{upcoming}</p>
              <p className="text-xs text-white/45">Upcoming</p>
            </div>
          </div>

          <div className="grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1 lg:max-w-2xl">
            <button type="button" className="rounded-full bg-neon-pink py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(255,0,122,0.35)]">Tickets</button>
            <button type="button" className="rounded-full py-2 text-sm font-semibold text-white/55">Tables</button>
          </div>

          <div className="group relative lg:max-w-3xl">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/55 transition-colors group-focus-within:text-neon-pink" />
            <Input
              placeholder="Search bought tickets..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="h-12 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40 focus-visible:ring-neon-pink/50"
            />
          </div>
        </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl bg-white/10" />)}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
          <Ticket className="mx-auto h-10 w-10 text-neon-pink" />
          <p className="mt-3 text-sm font-semibold text-white">No tickets yet</p>
          <p className="mt-1 text-xs text-white/50">Tickets you buy will appear here with QR codes.</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-10 text-center shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
          <Search className="mx-auto h-9 w-9 text-white/35" />
          <p className="mt-3 text-sm font-semibold text-white">No matching tickets</p>
          <p className="mt-1 text-xs text-white/50">Try event name, category, or location.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Upcoming</h2>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map(group => {
              const event = group.event
              const poster = event.photos?.[1] ?? event.photos?.[0] ?? PLACEHOLDER
              const category = event.category?.name ?? 'Event'
              const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
              const firstTicket = group.tickets[0]
              const isPast = event.startDate ? new Date(event.startDate) < new Date() : false

              return (
                <article key={event.id} className={`overflow-hidden rounded-2xl bg-white text-black shadow-[0_18px_60px_rgba(0,0,0,0.28)] ${isPast ? 'opacity-65' : ''}`}>
                  <div className="relative h-40">
                    <img
                      src={poster}
                      alt={event.name}
                      className="h-full w-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
                    <Badge className="absolute right-3 top-3 border-0 bg-neon-pink px-3 text-white">{group.noOfTicketsPurchased}x Ticket</Badge>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{category}</p>
                      <h2 className="mt-1 line-clamp-2 font-heading text-2xl font-black leading-none">{event.name}</h2>
                    </div>
                  </div>

                  <div className="relative flex h-6 items-center bg-white px-3">
                    <div className="absolute -left-2 h-4 w-4 rounded-full bg-[#10101d]" />
                    <div className="w-full border-t-2 border-dashed border-slate-200" />
                    <div className="absolute -right-2 h-4 w-4 rounded-full bg-[#10101d]" />
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-white p-4 pt-2">
                    <div className="min-w-0 space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-neon-pink" />
                        {formatDate(event.startDate)}
                      </p>
                      <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                        <span className="truncate">{location}</span>
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{group.tickets.length} order{group.tickets.length === 1 ? '' : 's'}</span>
                        <span className="rounded-md bg-neon-pink/10 px-2 py-1 text-xs font-bold text-neon-pink">{money(Number(group.totalPrice ?? 0))}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => navigate(`/app/tickets/${event.id}`)}
                      disabled={!firstTicket}
                      className="h-16 w-16 shrink-0 rounded-2xl bg-slate-100 p-0 text-slate-900 hover:bg-slate-200 disabled:opacity-40"
                      aria-label={`View QR for ${event.name}`}
                    >
                      <QrCode className="h-8 w-8" />
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </CustomerLayout>
  )
}
