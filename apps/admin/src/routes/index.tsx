import AdminLayout from '../components/layout/AdminLayout'
import { useAdminUser } from '../app/providers'
import { useDashboardStats, useRevenueChart, useRecentBookings, useActivity } from '../lib/queries/stats'
import { useAdminEvents, useDeleteEvent } from '../lib/queries/events'
import { Skeleton, Progress, Calendar } from '@glee/ui'
import { CalendarDays, Ticket, Users, TrendingUp, TrendingDown, CheckCircle, XCircle, Zap, Plus } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import AdminEventCard from '../components/events/AdminEventCard'
import { useNavigate } from 'react-router-dom'
import type { MockBooking, MockActivity } from '../lib/mock/stats'

const DONUT_COLORS = ['#FF2D8F', '#7C3AED', '#1e293b']
const BOOKING_STATUS_CONFIG: Record<MockBooking['status'], { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-green-500/20 text-green-400 border-green-500/20' },
  pending:   { label: 'Pending',   className: 'bg-amber-500/20 text-amber-400 border-amber-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400 border-red-500/20' },
}
const ACTIVITY_ICONS: Record<MockActivity['type'], typeof CheckCircle> = {
  approved_event:    CheckCircle,
  updated_tickets:   Zap,
  confirmed_booking: CheckCircle,
  cancelled_booking: XCircle,
  created_event:     Plus,
}

function StatCard({ label, value, delta, icon: Icon }: { label: string; value: number; delta: number; icon: typeof CalendarDays }) {
  const positive = delta >= 0
  return (
    <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-neon-pink/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-neon-pink" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40 mb-1">{label}</p>
        <p className="font-heading font-black text-2xl text-foreground">{value.toLocaleString()}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-mono ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(delta)}%
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatBookingDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const user = useAdminUser()
  const navigate = useNavigate()
  const { data: stats } = useDashboardStats()
  const { data: revenueData } = useRevenueChart()
  const { data: events, isLoading: eventsLoading } = useAdminEvents()
  const { data: bookings } = useRecentBookings()
  const { data: activity } = useActivity()
  const deleteMutation = useDeleteEvent()

  const liveEvents = events?.filter(e => e.status === 'live') ?? []
  const upcomingSorted = [...liveEvents].sort((a, b) => a.date.localeCompare(b.date))
  const featuredEvent = upcomingSorted[0]
  const miniGridEvents = upcomingSorted.slice(0, 3)

  const totalTickets = events?.reduce((sum, e) =>
    sum + e.ticketTiers.reduce((s, t) => s + t.quantity, 0), 0) ?? 0
  const soldTickets = events?.reduce((sum, e) =>
    sum + e.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0), 0) ?? 0
  const fullyBookedTiers = events?.reduce((sum, e) =>
    sum + e.ticketTiers.filter(t => t.quantityRemaining === 0).length, 0) ?? 0
  const availableTickets = totalTickets - soldTickets

  const donutData = [
    { name: 'Sold Out', value: soldTickets },
    { name: 'Fully Booked', value: fullyBookedTiers * 10 },
    { name: 'Available', value: availableTickets },
  ]

  const categories = events
    ? Array.from(new Set(events.map(e => e.venueId))).map(venue => {
        const count = events.filter(e => e.venueId === venue).length
        return { name: venue, count, pct: Math.round((count / events.length) * 100) }
      }).sort((a, b) => b.count - a.count).slice(0, 4)
    : []

  return (
    <AdminLayout title="Dashboard" subtitle={`Hello ${user.name.split(' ')[0]}, welcome back!`}>
      <div className="space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {stats ? (
            <>
              <StatCard label="Upcoming Events" value={stats.upcomingEvents} delta={stats.upcomingEventsDelta} icon={CalendarDays} />
              <StatCard label="Total Bookings" value={stats.totalBookings} delta={stats.totalBookingsDelta} icon={Ticket} />
              <StatCard label="Tickets Sold" value={stats.ticketsSold} delta={stats.ticketsSoldDelta} icon={Users} />
            </>
          ) : (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          )}
        </div>

        {/* Main grid: left panel + right panel */}
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT PANEL — 2/3 width */}
          <div className="col-span-2 space-y-6">

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-4">

              {/* Ticket Sales donut */}
              <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-sm text-foreground">Ticket Sales</h3>
                  <span className="text-xs text-white/40 bg-white/5 rounded-full px-2 py-0.5">This Week</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(v) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}
                      contentStyle={{ background: '#0f0f15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i] }} />
                      <span className="text-white/50 flex-1">{d.name}</span>
                      <span className="font-mono text-white/70">{d.value.toLocaleString()}</span>
                      <span className="font-mono text-white/30 w-8 text-right">
                        {totalTickets > 0 ? Math.round((d.value / totalTickets) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue bar chart */}
              <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading font-bold text-sm text-foreground">Sales Revenue</h3>
                  <span className="text-xs text-white/40 bg-white/5 rounded-full px-2 py-0.5">Last 8 Months</span>
                </div>
                <p className="font-heading font-black text-xl text-neon-pink mb-4">
                  KSh {(revenueData?.reduce((s, r) => s + r.revenue, 0) ?? 0).toLocaleString()}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={revenueData ?? []} barGap={2} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <RechartsTooltip
                      formatter={(v, name) => [`KSh ${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, String(name ?? '')]}
                      contentStyle={{ background: '#0f0f15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#FF2D8F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Popular venues/categories */}
            <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-sm text-foreground mb-4">Popular Venues</h3>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60 truncate max-w-[60%]">{cat.name}</span>
                      <span className="text-white/40 font-mono">{cat.pct}% · {cat.count} events</span>
                    </div>
                    <Progress value={cat.pct} className="h-1.5 bg-white/5 [&>div]:bg-neon-pink" />
                  </div>
                ))}
              </div>
            </div>

            {/* All events mini-grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm text-foreground">All Events</h3>
                <button onClick={() => navigate('/events')} className="text-xs text-neon-pink/70 hover:text-neon-pink transition-colors">
                  View All →
                </button>
              </div>
              {eventsLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {miniGridEvents.map(event => (
                    <AdminEventCard
                      key={event.id}
                      event={event}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recent bookings table */}
            <div className="bg-[#0f0f15] border border-white/5 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="font-heading font-bold text-sm text-foreground">Recent Bookings</h3>
                <span className="text-xs text-white/30">View All →</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Invoice ID', 'Date', 'Customer', 'Event', 'Qty', 'Amount', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-white/30 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bookings ?? []).map(b => {
                    const cfg = BOOKING_STATUS_CONFIG[b.status]
                    return (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-neon-pink/80">{b.id}</td>
                        <td className="px-5 py-3 text-xs text-white/50">{formatBookingDate(b.date)}</td>
                        <td className="px-5 py-3 text-xs text-white/70">{b.customerName}</td>
                        <td className="px-5 py-3 text-xs text-white/60 max-w-[140px] truncate">{b.event}</td>
                        <td className="px-5 py-3 text-xs text-white/50 font-mono">{b.qty}</td>
                        <td className="px-5 py-3 text-xs font-mono text-white/70">KSh {b.amount.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* RIGHT PANEL — 1/3 width */}
          <div className="space-y-5">

            {/* Featured upcoming event */}
            {featuredEvent && (
              <div className="bg-[#0f0f15] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <h3 className="font-heading font-bold text-xs text-white/50 uppercase tracking-wider">Upcoming Event</h3>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="h-36 rounded-xl overflow-hidden">
                    <img
                      src={featuredEvent.flyerSquareUrl ?? featuredEvent.flyerPortraitUrl ?? 'https://placehold.co/400x400/141419/FF2D8F?text=Glee'}
                      alt={featuredEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-neon-pink/70 font-mono mb-1">{featuredEvent.venueId}</p>
                    <h4 className="font-heading font-bold text-sm text-foreground line-clamp-1">{featuredEvent.title}</h4>
                    <p className="text-xs text-white/40 line-clamp-2 mt-1">{featuredEvent.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/40 font-mono">
                      {new Date(`${featuredEvent.date}T${featuredEvent.startTime}`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <button
                      onClick={() => navigate(`/events/${featuredEvent.id}/edit`)}
                      className="text-xs bg-neon-pink/10 hover:bg-neon-pink text-neon-pink hover:text-white px-3 py-1 rounded-full border border-neon-pink/30 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mini calendar */}
            <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-4">
              <h3 className="font-heading font-bold text-xs text-white/50 uppercase tracking-wider mb-2">Calendar</h3>
              <Calendar
                mode="single"
                selected={new Date()}
                modifiers={{ hasEvent: upcomingSorted.map(e => new Date(e.date)) }}
                modifiersClassNames={{ hasEvent: 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-neon-pink relative' }}
                className="rounded-xl [&_button]:text-white/60 [&_button:hover]:bg-white/5 [&_[aria-selected]]:bg-neon-pink [&_[aria-selected]]:text-white w-full"
              />
            </div>

            {/* Upcoming events list */}
            <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-4">
              <h3 className="font-heading font-bold text-xs text-white/50 uppercase tracking-wider mb-3">Next Events</h3>
              <div className="space-y-3">
                {upcomingSorted.slice(1, 4).map(event => {
                  const d = new Date(`${event.date}T${event.startTime}`)
                  return (
                    <div key={event.id} className="flex gap-3 items-start">
                      <div className="w-10 shrink-0 text-center">
                        <div className="bg-neon-pink rounded-lg px-1 py-0.5">
                          <p className="text-white font-heading font-black text-base leading-none">{d.getDate()}</p>
                          <p className="text-white/70 text-[10px] uppercase">{d.toLocaleString('en-KE', { month: 'short' })}</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 line-clamp-1">{event.title}</p>
                        <p className="text-[11px] text-white/40 truncate">{event.location ?? event.venueId}</p>
                        <p className="text-[11px] text-white/30 font-mono">{event.startTime} – {event.endTime ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-[#0f0f15] border border-white/5 rounded-2xl p-4">
              <h3 className="font-heading font-bold text-xs text-white/50 uppercase tracking-wider mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {(activity ?? []).map(item => {
                  const Icon = ACTIVITY_ICONS[item.type] ?? Zap
                  return (
                    <div key={item.id} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-neon-pink/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-neon-pink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 line-clamp-2">{item.description}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{formatRelativeTime(item.timestamp)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
