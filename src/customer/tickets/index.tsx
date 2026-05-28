import { useMemo, useState } from 'react'
import type { AdminEventTicket, MyTicketGroup } from '@glee/api'
import { useMyTickets } from '@glee/api'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton } from '@glee/ui'
import { Calendar, Clock, MapPin, QrCode, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/900x1200/141419/FF2D8F?text=Glee'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value?: string | null) {
  if (!value) return 'Time TBA'
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function qrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(value)}`
}

type SelectedTicket = {
  group: MyTicketGroup
  ticket: AdminEventTicket
}

export default function CustomerTicketsPage() {
  const { data: groups, isLoading } = useMyTickets()
  const [selected, setSelected] = useState<SelectedTicket | null>(null)
  const selectedRefs = useMemo(() => {
    if (!selected) return []
    return Array.from({ length: Math.max(1, selected.ticket.quantity ?? 1) }, (_, index) => `${selected.ticket.id}-${index + 1}`)
  }, [selected])

  return (
    <CustomerLayout title="My Tickets" subtitle="Your event passes, QR codes, and purchase history.">
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-48 rounded-xl" />)}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111118] p-12 text-center shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <Ticket className="mx-auto h-10 w-10 text-neon-pink" />
          <p className="mt-3 text-sm font-semibold text-white">No tickets yet</p>
          <p className="mt-1 text-xs text-white/50">Tickets you buy will appear here with their QR codes.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {(groups ?? []).map(group => {
            const event = group.event
            const poster = event.photos?.[1] ?? event.photos?.[0] ?? PLACEHOLDER
            const category = event.category?.name ?? 'Event'
            const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
            const firstTicket = group.tickets[0]
            const tierNames = Array.from(new Set(group.tickets.map(ticket => ticket.ticketCategory?.name).filter(Boolean)))

            return (
              <section key={event.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#111118] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
                <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
                  <div className="relative h-56 bg-black sm:h-full">
                    <img
                      src={poster}
                      alt={event.name}
                      className="h-full w-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                    />
                    <div className="absolute left-3 top-3">
                      <Badge className="border-neon-pink/30 bg-neon-pink/90 text-white">{category}</Badge>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-xl font-black text-white">{event.name}</h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-white/50">
                          <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                          <span className="truncate">{location}</span>
                        </p>
                      </div>
                      <Badge className="border-white/10 bg-white/5 text-white/70">{group.noOfTicketsPurchased} tickets</Badge>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/35"><Calendar className="h-3.5 w-3.5 text-neon-pink" /> Date</p>
                        <p className="mt-1 text-sm font-semibold text-white">{formatDate(event.startDate)}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/35"><Clock className="h-3.5 w-3.5 text-neon-pink" /> Time</p>
                        <p className="mt-1 text-sm font-semibold text-white">{formatTime(event.startDate)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tierNames.map(name => <Badge key={name} className="border-white/10 bg-white/5 text-white/65">{name}</Badge>)}
                      <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{money(Number(group.totalPrice ?? 0))}</Badge>
                    </div>

                    <div className="mt-5 grid gap-2">
                      {group.tickets.map(ticket => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setSelected({ group, ticket })}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-left transition-colors hover:border-neon-pink/40 hover:bg-neon-pink/5"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white">{ticket.ticketCategory?.name ?? 'Event ticket'}</span>
                            <span className="mt-0.5 block text-xs text-white/40">#{ticket.id.slice(-8)} · {ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'}</span>
                          </span>
                          <span className="flex items-center gap-2 text-xs font-semibold text-neon-pink">
                            <QrCode className="h-4 w-4" />
                            View QR
                          </span>
                        </button>
                      ))}
                    </div>

                    {firstTicket && (
                      <p className="mt-4 text-xs text-white/35">
                        Purchased {new Date(firstTicket.createdAt).toLocaleString('en-KE')}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#101017] text-white">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-black">{selected.group.event.name}</DialogTitle>
                <DialogDescription className="text-white/50">Show this QR code at the entrance for check-in.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <section className="rounded-xl border border-white/10 bg-white p-4 text-center text-black">
                  <div className="space-y-4">
                    {selectedRefs.map((ref, index) => (
                      <div key={ref} className="rounded-lg border border-black/10 p-3">
                        <img src={qrUrl(ref)} alt={`Ticket QR ${index + 1}`} className="mx-auto h-48 w-48" />
                        <p className="mt-2 font-mono text-xs font-bold text-black">{ref}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-wider text-white/35">Ticket</p>
                    <p className="mt-1 text-lg font-bold text-white">{selected.ticket.ticketCategory?.name ?? 'Event ticket'}</p>
                    <p className="mt-1 text-sm text-white/50">{selected.ticket.quantity} ticket{selected.ticket.quantity === 1 ? '' : 's'} · {money(Number(selected.ticket.totalPrice ?? 0))}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-wider text-white/35">Event Details</p>
                    <p className="mt-2 text-sm text-white/70">{selected.group.event.description ?? 'No event description provided.'}</p>
                    <div className="mt-4 grid gap-2 text-sm text-white/60">
                      <p><span className="text-white/35">Date:</span> {formatDate(selected.group.event.startDate)}</p>
                      <p><span className="text-white/35">Time:</span> {formatTime(selected.group.event.startDate)}</p>
                      <p><span className="text-white/35">Location:</span> {selected.group.event.location?.name ?? selected.group.event.location?.address ?? 'Location TBA'}</p>
                      <p><span className="text-white/35">Payment:</span> {selected.ticket.payment?.paymentMethod ?? 'Payment'} · {selected.ticket.payment?.isPaid === false ? 'Partial' : 'Paid'}</p>
                    </div>
                  </div>
                  <Button onClick={() => setSelected(null)} className="w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                    Done
                  </Button>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
