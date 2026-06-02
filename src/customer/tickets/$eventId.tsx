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

function qrRef(ticketId: string, index: number) {
  return `${ticketId}-${index + 1}`
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
      <CustomerLayout title="Ticket Details">
        <Skeleton className="h-[520px] rounded-xl" />
      </CustomerLayout>
    )
  }

  if (!ticketGroup) {
    return (
      <CustomerLayout title="Ticket Not Found">
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Ticket className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">We could not find this ticket purchase.</p>
          <Button onClick={() => navigate('/app/tickets')} className="mt-5 rounded-full bg-rose-600 text-white hover:bg-rose-700">
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
    <CustomerLayout title={event.name} subtitle="Toggle ticket types and show QR codes for check-in.">
      <button
        type="button"
        onClick={() => navigate('/app/tickets')}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Tickets
      </button>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">{category}</Badge>
              <h2 className="mt-3 font-heading text-2xl font-black text-slate-950">{event.name}</h2>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-rose-500" />{formatDate(event.startDate)}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" />{location}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">Purchased</p>
              <p className="mt-1 font-semibold text-slate-950">{ticketGroup.noOfTicketsPurchased} tickets</p>
              <p className="mt-2 font-mono font-bold text-rose-700">{money(Number(ticketGroup.totalPrice ?? 0))}</p>
            </div>
          </div>

          <Tabs value={activeKey} onValueChange={setActiveType} className="mt-5">
            <TabsList className="h-auto flex-wrap justify-start bg-slate-100 p-1">
              {ticketTypes.map(type => (
                <TabsTrigger key={type.key} value={type.key} className="data-[state=active]:bg-white data-[state=active]:text-rose-700">
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {ticketTypes.map(type => (
              <TabsContent key={type.key} value={type.key} className="mt-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {type.tickets.flatMap(ticket =>
                    Array.from({ length: Math.max(1, ticket.quantity ?? 1) }, (_, index) => {
                      const ref = qrRef(ticket.id, index)
                      return (
                        <article key={ref} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                            <img src={qrUrl(ref)} alt={`QR code for ${ref}`} className="mx-auto h-52 w-52" />
                            <p className="mt-3 font-mono text-xs font-bold text-slate-900">{ref}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{type.label}</p>
                              <p className="text-xs text-slate-500">Ticket {index + 1} of {ticket.quantity}</p>
                            </div>
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              {ticket.checkedInAt ? 'Checked in' : 'Ready'}
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
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-heading text-lg font-black text-slate-950">Event Details</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{event.description ?? 'No event description provided.'}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-heading text-lg font-black text-slate-950">Orders</h3>
            <div className="mt-3 space-y-3">
              {(active?.tickets ?? []).map(ticket => (
                <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">{ticket.ticketCategory?.name ?? 'Event ticket'}</p>
                  <p className="mt-1 text-xs text-slate-500">Bought {formatDateTime(ticket.createdAt)}</p>
                  <p className="mt-2 text-sm text-slate-600">{ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'} · {ticket.payment?.paymentMethod ?? 'Payment'} · {ticket.payment?.isPaid === false ? 'Partial' : 'Paid'}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </CustomerLayout>
  )
}
