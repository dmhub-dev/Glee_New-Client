import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { ApiError, type AdminEventTicket, useAdminEvent, useAdminEventTickets, useCheckInTicketByQr } from '@glee/api'
import { Badge, Button, Input, Progress, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@glee/ui'
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, QrCode, Search, Ticket, UserCheck, Users } from 'lucide-react'

type CheckInTab = 'remaining' | 'checked-in'

function eventDate(startDate?: string, startTime?: string) {
  if (!startDate) return 'Date TBA'
  return new Date(`${startDate}T${startTime || '00:00'}`).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buyer(ticket: AdminEventTicket) {
  return ticket.user?.name || ticket.guestName || ticket.user?.email || ticket.guestEmail || 'Guest customer'
}

function paymentStatus(ticket: AdminEventTicket) {
  if (ticket.payment?.isPaid === false || Number(ticket.outstandingAmount ?? 0) > 0) return 'Partial'
  return 'Paid'
}

function ticketUnits(tickets: AdminEventTicket[]) {
  return tickets.map(ticket => ({
    id: ticket.ticketRef ?? ticket.id,
    ref: ticket.ticketRef ?? ticket.id,
    ticket,
    ticketNumber: ticket.ticketNumber ?? 1,
    checkedIn: ticket.status === 'USED' || Boolean(ticket.checkedInAt),
    checkedInAt: ticket.checkedInAt,
    checkedInBy: undefined,
  }))
}

export default function BookingEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const user = useAdminUser()
  const { toast } = useToast()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: event, isLoading: eventLoading } = useAdminEvent(eventId ?? '', { vendorScoped: isVendorRole })
  const { data: ticketData, isLoading: ticketsLoading } = useAdminEventTickets(eventId)
  const checkInQr = useCheckInTicketByQr(eventId)
  const [ticketRef, setTicketRef] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<CheckInTab>('remaining')

  const tickets = useMemo(() => ticketData?.tickets ?? [], [ticketData?.tickets])
  const units = useMemo(() => ticketUnits(tickets), [tickets])
  const checkedInUnits = units.filter(unit => unit.checkedIn)
  const remainingUnits = units.filter(unit => !unit.checkedIn)
  const visibleUnits = (tab === 'checked-in' ? checkedInUnits : remainingUnits).filter(unit => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      unit.ref.toLowerCase().includes(query) ||
      buyer(unit.ticket).toLowerCase().includes(query) ||
      (unit.ticket.user?.email ?? unit.ticket.guestEmail ?? '').toLowerCase().includes(query) ||
      (unit.ticket.ticketCategory?.name ?? '').toLowerCase().includes(query)
    )
  })
  const sold = units.length
  const checkedIn = checkedInUnits.length
  const remaining = remainingUnits.length
  const checkedPct = sold === 0 ? 0 : Math.round((checkedIn / sold) * 100)

  async function handleQrSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const normalized = ticketRef.trim()
    if (!eventId || !normalized) return
    try {
      const result = await checkInQr.mutateAsync({ eventId, ticketRef: normalized })
      toast({
        title: 'Ticket checked in',
        description: `${result.ticketRef} is valid for this event.`,
      })
      setTicketRef('')
      setTab('checked-in')
    } catch (error) {
      const description = error instanceof ApiError ? error.message : 'This QR code could not be validated.'
      toast({ title: 'Invalid check-in', description, variant: 'destructive' })
    }
  }

  if (eventLoading) {
    return (
      <AdminLayout title="Event Check-in">
        <Skeleton className="h-[520px] rounded-xl" />
      </AdminLayout>
    )
  }

  if (!event) {
    return (
      <AdminLayout title="Event Check-in">
        <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center">
          <Ticket className="mx-auto h-8 w-8 text-admin-30" />
          <p className="mt-3 text-sm font-medium text-admin-70">Event not found</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Event Check-in" subtitle="Validate ticket QR codes against this event before allowing entry.">
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate('/dashboard/bookings')}
          className="inline-flex items-center gap-2 rounded-full border border-admin bg-admin-surface px-4 py-2 text-sm font-semibold text-admin-50 hover:text-neon-pink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </button>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{event.categoryName ?? 'Event'}</Badge>
                <Badge className="border-admin bg-admin-overlay text-admin-60">{event.status.replace('_', ' ')}</Badge>
              </div>
              <h1 className="font-heading text-2xl font-black text-foreground">{event.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-admin-50">
                <span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-neon-pink" />{eventDate(event.startDate, event.startTime)}</span>
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-neon-pink" />{event.location ?? 'No location'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-admin bg-admin-overlay p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-admin-40">Entry progress</span>
                <span className="font-mono text-neon-pink">{checkedPct}%</span>
              </div>
              <Progress value={checkedPct} className="h-2 bg-admin-body [&>div]:bg-neon-pink" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric label="Sold" value={sold} icon={Ticket} />
                <Metric label="Checked in" value={checkedIn} icon={UserCheck} />
                <Metric label="Remaining" value={remaining} icon={Users} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={handleQrSubmit} className="space-y-4 rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">QR Validation</h2>
                <p className="text-xs text-admin-40">Scan or paste the ticket QR value. Manual customer lookup cannot check people in.</p>
              </div>
            </div>

            <Input
              value={ticketRef}
              onChange={changeEvent => setTicketRef(changeEvent.target.value)}
              placeholder="Scan QR code"
              className="h-12 border-admin bg-admin-input font-mono"
            />
            <Button type="submit" disabled={checkInQr.isPending || !ticketRef.trim()} className="w-full gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
              <CheckCircle2 className="h-4 w-4" />
              {checkInQr.isPending ? 'Validating...' : 'Validate and check in'}
            </Button>
          </form>

          <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs value={tab} onValueChange={value => setTab(value as CheckInTab)}>
                <TabsList className="bg-admin-overlay">
                  <TabsTrigger value="remaining">Remaining ({remaining})</TabsTrigger>
                  <TabsTrigger value="checked-in">Checked in ({checkedIn})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
                <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search attendee or QR..." className="border-admin bg-admin-input pl-8" />
              </div>
            </div>

            <Tabs value={tab} onValueChange={value => setTab(value as CheckInTab)}>
              <TabsContent value={tab} className="mt-0">
                {ticketsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)}
                  </div>
                ) : visibleUnits.length === 0 ? (
                  <div className="rounded-xl border border-admin bg-admin-overlay p-10 text-center">
                    <p className="text-sm font-semibold text-admin-70">No tickets in this view</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
                        <tr>
                          <th className="px-4 py-3 font-medium">QR Ref</th>
                          <th className="px-4 py-3 font-medium">Attendee</th>
                          <th className="px-4 py-3 font-medium">Ticket type</th>
                          <th className="px-4 py-3 font-medium">Payment</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin">
                        {visibleUnits.map(unit => (
                          <tr key={unit.id} className="hover:bg-admin-overlay/60">
                            <td className="px-4 py-3 font-mono text-xs text-admin-70">{unit.ref}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-admin-90">{buyer(unit.ticket)}</p>
                              <p className="text-xs text-admin-40">{unit.ticket.user?.email ?? unit.ticket.guestEmail ?? '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-admin-60">{unit.ticket.ticketCategory?.name ?? 'Event ticket'} #{unit.ticketNumber}</td>
                            <td className="px-4 py-3">
                              <Badge className={paymentStatus(unit.ticket) === 'Paid' ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-400'}>
                                {paymentStatus(unit.ticket)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={unit.checkedIn ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-admin bg-admin-input text-admin-50'}>
                                {unit.checkedIn ? `Checked in ${unit.checkedInAt ? new Date(unit.checkedInAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}` : unit.ticket.status === 'EXPIRED' ? 'Expired' : 'Waiting'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Ticket }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-surface p-3">
      <Icon className="mx-auto h-4 w-4 text-neon-pink" />
      <p className="mt-2 text-xs text-admin-40">{label}</p>
      <p className="font-heading text-lg font-black text-foreground">{value.toLocaleString()}</p>
    </div>
  )
}
