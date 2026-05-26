import { useMyTickets } from '@glee/api'
import { Badge, Skeleton } from '@glee/ui'
import { Calendar, Ticket } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

export default function CustomerTicketsPage() {
  const { data: groups, isLoading } = useMyTickets()

  return (
    <CustomerLayout title="My Tickets" subtitle="Your event purchases and ticket history.">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Ticket className="mx-auto h-9 w-9 text-white/30" />
          <p className="mt-3 text-sm font-medium text-white/70">No tickets yet</p>
          <p className="mt-1 text-xs text-white/40">Tickets you buy will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(groups ?? []).map(group => (
            <section key={group.event.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-black text-white">{group.event.name}</h2>
                  <p className="mt-1 flex items-center gap-2 text-xs text-white/40">
                    <Calendar className="h-3.5 w-3.5 text-neon-pink" />
                    {group.event.startDate ? new Date(group.event.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/5 text-white/70">{group.noOfTicketsPurchased} tickets</Badge>
                  <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{money(Number(group.totalPrice ?? 0))}</Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.tickets.map(ticket => (
                  <div key={ticket.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="font-mono text-xs text-white/40">#{ticket.id.slice(-8)}</p>
                    <p className="mt-1 text-sm text-white">{ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-xs text-white/40">{new Date(ticket.createdAt).toLocaleString('en-KE')}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </CustomerLayout>
  )
}
