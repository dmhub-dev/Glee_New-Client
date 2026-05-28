import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import {
  ApiError,
  type AdminEventTicket,
  useAdminEventTickets,
  useAdminEvents,
  useCheckInTicket,
  useRevertTicketCheckIn,
} from '@glee/api'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
import { CalendarClock, Mail, Search, Ticket, Undo2, UserCheck } from 'lucide-react'
import type { Event } from '@glee/types'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function eventDate(event: Event) {
  return new Date(`${event.startDate}T${event.startTime || '00:00'}`).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ticketBuyer(ticket: AdminEventTicket) {
  return ticket.user?.name || ticket.user?.email || 'Guest customer'
}

function EventBookingsPanel({ event, canCheckIn }: { event: Event; canCheckIn: boolean }) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { data, isLoading } = useAdminEventTickets(event.id)
  const checkIn = useCheckInTicket(event.id)
  const revert = useRevertTicketCheckIn(event.id)
  const tickets = data?.tickets ?? []
  const sold = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
  const revenue = tickets.reduce((sum, ticket) => sum + Number(ticket.totalPrice ?? ticket.payment?.amount ?? 0), 0)

  async function handleCheckIn(ticketId: string, checkedIn: boolean) {
    try {
      if (checkedIn) {
        await revert.mutateAsync(ticketId)
        toast({ title: 'Check-in reverted' })
      } else {
        await checkIn.mutateAsync(ticketId)
        toast({ title: 'Ticket checked in' })
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again.'
      toast({ title: 'Unable to update ticket', description: message, variant: 'destructive' })
    }
  }

  return (
    <section className="rounded-lg border border-admin bg-admin-surface shadow-admin">
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/dashboard/events/${event.id}/attendees`)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/dashboard/events/${event.id}/attendees`)
        }}
        className="flex cursor-pointer flex-col gap-3 border-b border-admin p-4 transition hover:bg-admin-overlay/60 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">{event.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-admin-40">
            <CalendarClock className="h-3.5 w-3.5" />
            {eventDate(event)} · {event.location ?? 'No location'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-admin bg-admin-overlay text-admin-60">{sold.toLocaleString()} tickets</Badge>
          <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{money(revenue)}</Badge>
          <Button size="sm" variant="outline" className="border-admin bg-admin-input text-xs">
            View attendees
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-admin-70">No bookings yet</p>
          <p className="mt-1 text-xs text-admin-40">Purchased tickets for this event will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canCheckIn && <th className="px-4 py-3 text-right font-medium">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {tickets.map(ticket => {
                const checkedIn = Boolean(ticket.checkedInAt)
                return (
                  <tr key={ticket.id} className="hover:bg-admin-overlay/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-admin-90">{ticketBuyer(ticket)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-admin-40">
                        <Mail className="h-3 w-3" />
                        {ticket.user?.email ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-admin-60">{ticket.ticketCategory?.name ?? 'General'}</td>
                    <td className="px-4 py-3 font-mono text-admin-70">{ticket.quantity}</td>
                    <td className="px-4 py-3 font-mono text-neon-pink">{money(Number(ticket.totalPrice ?? 0))}</td>
                    <td className="px-4 py-3">
                      <Badge className={checkedIn ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-admin bg-admin-input text-admin-50'}>
                        {checkedIn ? 'Checked in' : 'Not checked in'}
                      </Badge>
                    </td>
                    {canCheckIn && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={checkIn.isPending || revert.isPending}
                          onClick={() => handleCheckIn(ticket.id, checkedIn)}
                          className={checkedIn ? 'gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10' : 'gap-1.5 text-xs text-green-400 hover:bg-green-500/10'}
                        >
                          {checkedIn ? <Undo2 className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          {checkedIn ? 'Revert' : 'Check in'}
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function BookingsPage() {
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const canCheckIn = isVendorRole
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return (events ?? []).filter(event =>
      search.trim() === '' ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      (event.location ?? '').toLowerCase().includes(search.toLowerCase()),
    )
  }, [events, search])

  return (
    <AdminLayout
      title={user.role === 'vendor_staff' ? 'Event Check-ins' : 'Bookings'}
      subtitle={user.role === 'vendor_staff' ? 'View bookings and check in customers for your vendor events' : 'View bookings and attendee activity across events'}
    >
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search events..."
            className="bg-admin-input border-admin pl-8"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-48 rounded-lg" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-admin bg-admin-surface p-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => <EventBookingsPanel key={event.id} event={event} canCheckIn={canCheckIn} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
