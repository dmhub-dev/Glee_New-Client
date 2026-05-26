import { useMemo } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { useAdminEvents } from '@glee/api'
import { Progress, Skeleton } from '@glee/ui'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, DollarSign, Ticket, TrendingUp } from 'lucide-react'
import type { Event } from '@glee/types'

const TOOLTIP_STYLE = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 8,
  fontSize: 12,
  color: '#f6f6f8',
}

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function eventRevenue(event: Event) {
  return event.ticketTiers.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.quantityRemaining) * tier.price, 0)
}

function eventSold(event: Event) {
  return event.ticketTiers.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.quantityRemaining), 0)
}

function eventCapacity(event: Event) {
  return event.ticketTiers.reduce((sum, tier) => sum + tier.quantity, 0)
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Ticket
}) {
  return (
    <div className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neon-pink/10">
          <Icon className="h-5 w-5 text-neon-pink" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-admin-40">{label}</p>
          <p className="font-heading text-2xl font-black text-foreground">{value}</p>
          <p className="mt-1 truncate text-xs text-admin-40">{detail}</p>
        </div>
      </div>
    </div>
  )
}

export default function SalesReportsPage() {
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const eventList = events ?? []

  const totals = useMemo(() => {
    const revenue = eventList.reduce((sum, event) => sum + eventRevenue(event), 0)
    const sold = eventList.reduce((sum, event) => sum + eventSold(event), 0)
    const capacity = eventList.reduce((sum, event) => sum + eventCapacity(event), 0)
    const active = eventList.filter(event => event.status === 'active').length
    return { revenue, sold, capacity, active }
  }, [eventList])

  const chartData = useMemo(() => {
    return [...eventList]
      .sort((a, b) => eventRevenue(b) - eventRevenue(a))
      .slice(0, 8)
      .map(event => ({
        name: event.title.length > 18 ? `${event.title.slice(0, 18)}...` : event.title,
        revenue: eventRevenue(event),
        tickets: eventSold(event),
      }))
  }, [eventList])

  const sellThrough = totals.capacity > 0 ? Math.round((totals.sold / totals.capacity) * 100) : 0

  return (
    <AdminLayout
      title="Sales Reports"
      subtitle={user.role === 'vendor_staff' ? 'Read-only sales snapshot for your vendor events' : 'Sales and ticket performance across accessible events'}
    >
      <div className="space-y-5">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Gross Sales" value={money(totals.revenue)} detail="Estimated from sold ticket categories" icon={DollarSign} />
            <StatCard label="Tickets Sold" value={totals.sold.toLocaleString()} detail={`${totals.capacity.toLocaleString()} total capacity`} icon={Ticket} />
            <StatCard label="Sell-through" value={`${sellThrough}%`} detail="Across accessible ticket inventory" icon={TrendingUp} />
            <StatCard label="Active Events" value={totals.active.toLocaleString()} detail={`${eventList.length.toLocaleString()} total events`} icon={CalendarDays} />
          </div>
        )}

        <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4">
            <h2 className="font-heading text-sm font-bold text-foreground">Revenue By Event</h2>
            <p className="mt-1 text-xs text-admin-40">Top events by estimated ticket revenue.</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="rounded-lg border border-admin bg-admin-overlay p-10 text-center text-sm text-admin-40">No sales data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="revenue" name="Revenue" fill="#FF2D8F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4">
            <h2 className="font-heading text-sm font-bold text-foreground">Event Sell-through</h2>
            <p className="mt-1 text-xs text-admin-40">Ticket progress for each accessible event.</p>
          </div>
          <div className="space-y-3">
            {eventList.map(event => {
              const capacity = eventCapacity(event)
              const sold = eventSold(event)
              const pct = capacity > 0 ? Math.round((sold / capacity) * 100) : 0
              return (
                <div key={event.id} className="rounded-lg border border-admin bg-admin-overlay p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-admin-80">{event.title}</p>
                    <p className="shrink-0 font-mono text-xs text-neon-pink">{pct}%</p>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-admin-input [&>div]:bg-neon-pink" />
                  <p className="mt-2 text-xs text-admin-40">{sold.toLocaleString()} sold of {capacity.toLocaleString()} tickets · {money(eventRevenue(event))}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
