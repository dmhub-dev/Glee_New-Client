import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AdminEventTicket } from '@glee/api'
import { useMyTickets } from '@glee/api'
import { Badge, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@glee/ui'
import { ArrowLeft, Calendar, MapPin, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Date TBA'
  return new Date(value).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function qrRef(ticket: AdminEventTicket, index: number) {
  return ticket.ticketRef ?? `${ticket.id}-${index + 1}`
}

function qrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(value)}`
}

function groupByTicketType(tickets: AdminEventTicket[]) {
  const groups = new Map<string, { label: string; tickets: AdminEventTicket[] }>()
  tickets.forEach(ticket => {
    const key = ticket.ticketCategory?.id ?? 'general'
    const label = ticket.ticketCategory?.name ?? 'Event ticket'
    const existing = groups.get(key)
    if (existing) existing.tickets.push(ticket)
    else groups.set(key, { label, tickets: [ticket] })
  })
  return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }))
}

export default function CustomerTicketDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: groups, isLoading } = useMyTickets()
  const ticketGroup = groups?.find(group => group.event.id === eventId)
  const ticketTypes = useMemo(() => groupByTicketType(ticketGroup?.tickets ?? []), [ticketGroup?.tickets])
  const [activeType, setActiveType] = useState('')
  const activeKey = activeType || ticketTypes[0]?.key || ''
  const active = ticketTypes.find(type => type.key === activeKey) ?? ticketTypes[0]

  if (isLoading) {
    return (
      <CustomerLayout title="Ticket Details" hidePageHeader>
        <Skeleton className="h-[520px] rounded-2xl bg-white/10" />
      </CustomerLayout>
    )
  }

  if (!ticketGroup) {
    return (
      <CustomerLayout title="Ticket Not Found" hidePageHeader>
        <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-10 text-center">
          <Ticket className="mx-auto h-9 w-9 text-white/40" />
          <p className="mt-3 text-sm font-semibold text-white">We could not find this ticket purchase.</p>
          <Button onClick={() => navigate('/app/tickets')} className="mt-5 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
            Back to My Tickets
          </Button>
        </div>
      </CustomerLayout>
    )
  }

  const event = ticketGroup.event
  const location = event.location?.name ?? event.location?.address ?? 'Location TBA'
  const category = event.category?.name ?? 'Event'

  return (
    <CustomerLayout title={event.name} subtitle="Toggle ticket types and show QR codes for check-in." hidePageHeader>
      <div className="px-4 pb-24 pt-6">
        <button
          type="button"
          onClick={() => navigate('/app/tickets')}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.14] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Tickets
        </button>

      <div className="grid gap-5">
        <section className="rounded-[28px] border border-white/12 bg-white/[0.08] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{category}</Badge>
              <h1 className="mt-3 font-heading text-3xl font-black leading-none text-white sm:text-4xl">{event.name}</h1>
              <div className="mt-3 grid gap-2 text-sm text-white/65">
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-neon-pink" />{formatDate(event.startDate)}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neon-pink" />{location}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="text-white/45">Purchased</p>
              <p className="mt-1 font-semibold text-white">{ticketGroup.noOfTicketsPurchased} tickets</p>
              <p className="mt-2 font-mono font-bold text-neon-pink">{money(Number(ticketGroup.totalPrice ?? 0))}</p>
            </div>
          </div>

          <Tabs value={activeKey} onValueChange={setActiveType} className="mt-5">
            <TabsList className="h-auto flex-wrap justify-start rounded-full bg-black/25 p-1">
              {ticketTypes.map(type => (
                <TabsTrigger key={type.key} value={type.key} className="rounded-full text-white/65 data-[state=active]:bg-neon-pink data-[state=active]:text-white">
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {ticketTypes.map(type => (
              <TabsContent key={type.key} value={type.key} className="mt-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {type.tickets.flatMap(ticket =>
                    Array.from({ length: Math.max(1, ticket.quantity ?? 1) }, (_, index) => {
                      const ref = qrRef(ticket, index)
                      return (
                        <article key={ref} className="overflow-hidden rounded-2xl bg-white text-black shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
                          <div className="bg-white p-4 text-center">
                            <img src={qrUrl(ref)} alt={`QR code for ${ref}`} className="mx-auto h-52 w-52" />
                            <p className="mt-3 font-mono text-xs font-bold text-slate-900">{ref}</p>
                          </div>
                          <div className="relative flex h-6 items-center bg-white px-3">
                            <div className="absolute -left-2 h-4 w-4 rounded-full bg-[#151523]" />
                            <div className="w-full border-t-2 border-dashed border-slate-200" />
                            <div className="absolute -right-2 h-4 w-4 rounded-full bg-[#151523]" />
                          </div>
                          <div className="flex items-center justify-between gap-3 bg-white px-4 pb-4">
                            <div>
                              <p className="font-semibold text-slate-950">{type.label}</p>
                              <p className="text-xs text-slate-500">Ticket {ticket.ticketNumber ?? index + 1}</p>
                            </div>
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              {ticket.status === 'USED' || ticket.checkedInAt ? 'Checked in' : ticket.status === 'EXPIRED' ? 'Expired' : 'Ready'}
                            </Badge>
                          </div>
                        </article>
                      )
                    }),
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <h3 className="font-heading text-lg font-black text-white">Event Details</h3>
            <p className="mt-3 text-sm leading-6 text-white/62">{event.description ?? 'No event description provided.'}</p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <h3 className="font-heading text-lg font-black text-white">Orders</h3>
            <div className="mt-3 space-y-3">
              {(active?.tickets ?? []).map(ticket => (
                <div key={ticket.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-semibold text-white">{ticket.ticketCategory?.name ?? 'Event ticket'}</p>
                  <p className="mt-1 text-xs text-white/45">Bought {formatDateTime(ticket.createdAt)}</p>
                  <p className="mt-2 text-sm text-white/62">{ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'} - {ticket.payment?.paymentMethod ?? 'Payment'} - {ticket.payment?.isPaid === false ? 'Partial' : 'Paid'}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      </div>
    </CustomerLayout>
  )
}
