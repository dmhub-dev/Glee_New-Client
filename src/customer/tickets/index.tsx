import { useMemo, useState } from 'react'
import type { AdminEventTicket, MyTicketGroup } from '@glee/api'
import { useMyTickets } from '@glee/api'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton } from '@glee/ui'
import { Calendar, MapPin, QrCode, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const PLACEHOLDER = 'https://placehold.co/240x320/F8FAFC/DB2777?text=Glee'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function qrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(value)}`
}

type SelectedTicket = { group: MyTicketGroup; ticket: AdminEventTicket }

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
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Ticket className="mx-auto h-10 w-10 text-rose-500" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No tickets yet</p>
          <p className="mt-1 text-xs text-slate-500">Tickets you buy will appear here with their QR codes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[88px_1.5fr_1fr_120px_110px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <span>Event</span>
            <span>Details</span>
            <span>Location</span>
            <span>Tickets</span>
            <span>Total</span>
            <span></span>
          </div>
          <div className="divide-y divide-slate-200">
            {(groups ?? []).map(group => {
              const event = group.event
              const poster = event.photos?.[1] ?? event.photos?.[0] ?? PLACEHOLDER
              const category = event.category?.name ?? 'Event'
              const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
              const firstTicket = group.tickets[0]

              return (
                <div key={event.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[88px_1.5fr_1fr_120px_110px_110px] lg:items-center">
                  <img
                    src={poster}
                    alt={event.name}
                    className="h-24 w-20 rounded-lg border border-slate-200 object-cover lg:h-20 lg:w-16"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                  />
                  <div className="min-w-0">
                    <Badge className="border-rose-200 bg-rose-50 text-rose-700">{category}</Badge>
                    <h2 className="mt-2 truncate font-heading text-lg font-black text-slate-950">{event.name}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4 text-rose-500" />
                      {formatDate(event.startDate)}
                    </p>
                  </div>
                  <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="truncate">{location}</span>
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{group.noOfTicketsPurchased} purchased</p>
                    <p className="text-xs text-slate-500">{group.tickets.length} order{group.tickets.length === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-slate-950">{money(Number(group.totalPrice ?? 0))}</p>
                  <Button
                    type="button"
                    onClick={() => firstTicket && setSelected({ group, ticket: firstTicket })}
                    disabled={!firstTicket}
                    className="w-fit rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl border-slate-200 bg-white text-slate-950">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-black">{selected.group.event.name}</DialogTitle>
                <DialogDescription className="text-slate-500">Show this QR code first at the entrance for check-in.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="space-y-4">
                    {selectedRefs.map((ref, index) => (
                      <div key={ref} className="rounded-lg border border-slate-200 bg-white p-3">
                        <img src={qrUrl(ref)} alt={`Ticket QR ${index + 1}`} className="mx-auto h-48 w-48" />
                        <p className="mt-2 font-mono text-xs font-bold text-slate-900">{ref}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Ticket</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{selected.ticket.ticketCategory?.name ?? 'Event ticket'}</p>
                    <p className="mt-1 text-sm text-slate-600">{selected.ticket.quantity} ticket{selected.ticket.quantity === 1 ? '' : 's'} · {money(Number(selected.ticket.totalPrice ?? 0))}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Event details</p>
                    <p className="mt-2 text-sm text-slate-700">{selected.group.event.description ?? 'No event description provided.'}</p>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <p><span className="text-slate-400">Date:</span> {formatDate(selected.group.event.startDate)}</p>
                      <p><span className="text-slate-400">Location:</span> {selected.group.event.location?.name ?? selected.group.event.location?.address ?? 'Location TBA'}</p>
                      <p><span className="text-slate-400">Payment:</span> {selected.ticket.payment?.paymentMethod ?? 'Payment'} · {selected.ticket.payment?.isPaid === false ? 'Partial' : 'Paid'}</p>
                    </div>
                  </div>
                  <Button onClick={() => setSelected(null)} className="w-full rounded-full bg-rose-600 text-white hover:bg-rose-700">
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
