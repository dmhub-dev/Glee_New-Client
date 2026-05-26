import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents, useMyTickets, useWallet } from '@glee/api'
import { Badge, Button, Skeleton } from '@glee/ui'
import { CalendarDays, MapPin, Ticket, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

export default function CustomerDashboardPage() {
  const navigate = useNavigate()
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: ticketGroups = [], isLoading: ticketsLoading } = useMyTickets()
  const { data: wallet, isLoading: walletLoading } = useWallet()

  const upcomingEvents = useMemo(
    () => events
      .filter(event => event.status === 'active' || event.status === 'sold_out')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4),
    [events],
  )

  const nextTicket = useMemo(() => {
    return ticketGroups
      .filter(group => group.event.startDate)
      .sort((a, b) => new Date(a.event.startDate ?? '').getTime() - new Date(b.event.startDate ?? '').getTime())[0]
  }, [ticketGroups])

  const totalTickets = ticketGroups.reduce((sum, group) => sum + group.noOfTicketsPurchased, 0)

  return (
    <CustomerLayout title="Dashboard" subtitle="Welcome back {name}. Track your tickets, wallet, and upcoming events.">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-admin-60">Wallet balance</p>
            <Wallet className="h-5 w-5 text-neon-pink" />
          </div>
          {walletLoading ? <Skeleton className="mt-4 h-8 w-36" /> : <p className="mt-4 font-heading text-3xl font-black text-foreground">{money(Number(wallet?.balance ?? 0))}</p>}
          <Button onClick={() => navigate('/app/wallet')} variant="outline" className="mt-5 w-full border-admin bg-admin-input">Manage wallet</Button>
        </section>

        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-admin-60">Tickets owned</p>
            <Ticket className="h-5 w-5 text-neon-pink" />
          </div>
          {ticketsLoading ? <Skeleton className="mt-4 h-8 w-20" /> : <p className="mt-4 font-heading text-3xl font-black text-foreground">{totalTickets}</p>}
          <Button onClick={() => navigate('/app/tickets')} variant="outline" className="mt-5 w-full border-admin bg-admin-input">View tickets</Button>
        </section>

        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-admin-60">Next event</p>
            <CalendarDays className="h-5 w-5 text-neon-pink" />
          </div>
          {ticketsLoading ? (
            <Skeleton className="mt-4 h-12 w-full" />
          ) : nextTicket ? (
            <>
              <p className="mt-4 line-clamp-1 font-heading text-xl font-black text-foreground">{nextTicket.event.name}</p>
              <p className="mt-1 text-sm text-admin-50">{new Date(nextTicket.event.startDate ?? '').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-admin-50">No upcoming ticket yet.</p>
          )}
          <Button onClick={() => navigate('/app/events')} className="mt-5 w-full bg-neon-pink text-white hover:bg-neon-pink/90">Find events</Button>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-black text-foreground">Upcoming Events</h2>
              <p className="mt-1 text-sm text-admin-50">Events you can book now.</p>
            </div>
            <Button onClick={() => navigate('/app/events')} variant="outline" className="border-admin bg-admin-input">View all</Button>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {upcomingEvents.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate(`/app/events/${event.id}`)}
                  className="group overflow-hidden rounded-xl border border-admin bg-admin-input text-left transition hover:border-neon-pink/40"
                >
                  <div className="h-36 overflow-hidden bg-admin-overlay">
                    <img src={event.flyerSquareUrl ?? event.flyerPortraitUrl ?? 'https://placehold.co/600x400/141419/FF2D8F?text=Glee'} alt={event.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <Badge className="border-neon-pink/30 bg-neon-pink/10 text-neon-pink">{event.categoryName ?? 'Event'}</Badge>
                    <h3 className="mt-2 line-clamp-1 font-heading text-lg font-black text-foreground">{event.title}</h3>
                    <p className="mt-2 flex items-center gap-2 text-xs text-admin-50"><MapPin className="h-3.5 w-3.5" />{event.location ?? 'Location TBA'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <h2 className="font-heading text-xl font-black text-foreground">Recent Tickets</h2>
          <div className="mt-4 space-y-3">
            {ticketsLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-lg" />)
            ) : ticketGroups.length ? (
              ticketGroups.slice(0, 4).map(group => (
                <div key={group.event.id} className="rounded-lg border border-admin bg-admin-input p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{group.event.name}</p>
                  <p className="mt-1 text-xs text-admin-50">{group.noOfTicketsPurchased} ticket{group.noOfTicketsPurchased === 1 ? '' : 's'} bought</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-admin bg-admin-input p-6 text-center text-sm text-admin-50">Your ticket history will show here.</p>
            )}
          </div>
        </section>
      </div>
    </CustomerLayout>
  )
}
