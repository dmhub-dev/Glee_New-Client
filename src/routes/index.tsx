import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  PlusCircle,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AdminLayout from '../components/layout/AdminLayout'
import { useAdminUser } from '../app/providers'
import AdminEventCard from '../components/events/AdminEventCard'
import {
  useAdminEvents,
  useAuditLogs,
  useCategories,
  useDeleteEvent,
  useLocations,
  useUsers,
} from '@glee/api'
import { Badge, Progress, Skeleton, cn } from '@glee/ui'
import type { Event } from '@glee/types'

const CHART_COLORS = ['#FF2D8F', '#7C3AED', '#14B8A6', '#F59E0B', '#EF4444', '#64748B']
const TOOLTIP_STYLE = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 8,
  fontSize: 12,
  color: '#f6f6f8',
}

const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  active: 'Active',
  draft: 'Draft',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  sold_out: 'Sold Out',
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ticketTotals(events: Event[]) {
  return events.reduce(
    (acc, event) => {
      event.ticketTiers.forEach(tier => {
        acc.total += tier.quantity
        acc.remaining += tier.quantityRemaining
        acc.sold += Math.max(0, tier.quantity - tier.quantityRemaining)
      })
      return acc
    },
    { total: 0, sold: 0, remaining: 0 },
  )
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  onClick,
}: {
  label: string
  value: number | string
  detail: string
  icon: typeof Users
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border border-admin bg-admin-surface p-5 text-left shadow-admin transition-colors',
        onClick && 'hover:border-neon-pink/40 hover:bg-admin-overlay',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10">
          <Icon className="h-5 w-5 text-neon-pink" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-admin-40">{label}</p>
          <p className="font-heading text-2xl font-black text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="mt-1 truncate text-xs text-admin-40">{detail}</p>
        </div>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const user = useAdminUser()
  const isSuperAdmin = user.role === 'super_admin'
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const navigate = useNavigate()
  const deleteMutation = useDeleteEvent({ vendorScoped: isVendorRole })

  const { data: events, isLoading: eventsLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const { data: users, isLoading: usersLoading } = useUsers({ enabled: !isVendorRole })
  const { data: locations, isLoading: locationsLoading } = useLocations()
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs({ limit: 8 }, { enabled: isSuperAdmin })

  const eventList = events ?? []
  const userList = users ?? []
  const locationList = locations ?? []
  const categoryList = categories ?? []
  const tickets = ticketTotals(eventList)

  const activeEvents = eventList.filter(event => event.status === 'active')
  const draftEvents = eventList.filter(event => event.status === 'draft')
  const upcomingEvents = activeEvents
    .filter(event => event.startDate && new Date(`${event.startDate}T${event.startTime || '00:00'}`).getTime() >= Date.now())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const statusData = useMemo(() => {
    const statuses: Event['status'][] = ['active', 'draft', 'postponed', 'cancelled', 'sold_out']
    return statuses.map(status => ({
      name: EVENT_STATUS_LABELS[status],
      value: eventList.filter(event => event.status === status).length,
    }))
  }, [eventList])

  const roleData = useMemo(() => {
    const counts = new Map<string, number>()
    userList.forEach(userRecord => {
      counts.set(userRecord.role, (counts.get(userRecord.role) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([role, count]) => ({ role: role.replaceAll('_', ' '), count }))
      .sort((a, b) => b.count - a.count)
  }, [userList])

  const locationUsage = useMemo(() => {
    return locationList
      .map(location => {
        const count = eventList.filter(event => event.locationId === location.id || event.venueId === location.id).length
        const pct = eventList.length > 0 ? Math.round((count / eventList.length) * 100) : 0
        return { id: location.id, name: location.name, count, pct }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [eventList, locationList])

  const monthlyEventData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const month = date.toLocaleString('en-KE', { month: 'short' })
      const count = eventList.filter(event => {
        if (!event.startDate) return false
        const eventDate = new Date(event.startDate)
        return eventDate.getFullYear() === date.getFullYear() && eventDate.getMonth() === date.getMonth()
      }).length
      return { month, events: count }
    })
  }, [eventList])

  const isLoading = eventsLoading || usersLoading || locationsLoading || categoriesLoading
  const sellThrough = tickets.total > 0 ? Math.round((tickets.sold / tickets.total) * 100) : 0

  if (isVendorRole) {
    const grossRevenue = eventList.reduce((sum, event) => (
      sum + event.ticketTiers.reduce((eventSum, tier) => eventSum + Math.max(0, tier.quantity - tier.quantityRemaining) * tier.price, 0)
    ), 0)
    const pendingEvents = eventList.filter(event => event.status === 'draft')
    const liveEvents = eventList.filter(event => event.status === 'active')
    const attentionEvents = eventList.filter(event => event.status === 'postponed' || event.status === 'cancelled')
    const menuItems = eventList.reduce((sum, event) => sum + (event.menuItems?.length ?? 0), 0)
    const pricedTicketCategories = eventList.reduce((sum, event) => sum + event.ticketTiers.length, 0)
    const eventsWithAvailability = eventList.filter(event => event.ticketTiers.some(tier => tier.quantityRemaining > 0))
    const vendorLocations = locationList.filter(location =>
      eventList.some(event => event.locationId === location.id || event.venueId === location.id),
    )

    return (
      <AdminLayout
        title="Vendor Dashboard"
        subtitle={`Welcome ${user.name.split(' ')[0]}, manage your events, ticket sales, and attendees.`}
      >
        <div className="space-y-5">
          <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neon-pink">Vendor workspace</p>
                <h2 className="mt-2 font-heading text-xl font-black text-foreground">Publish events and track sales on Glee</h2>
                <p className="mt-2 max-w-2xl text-sm text-admin-50">
                  This account is for external event partners. Focus on creating events, keeping ticket and menu details current, and monitoring purchases.
                </p>
                <Badge variant="outline" className="mt-3 border-admin text-admin-50">Only your vendor data is visible</Badge>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/events/new')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neon-pink/90"
              >
                <PlusCircle className="h-4 w-4" />
                Create Event
              </button>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {eventsLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)
            ) : (
              <>
                <StatCard label="My Events" value={eventList.length} detail={`${liveEvents.length} live, ${pendingEvents.length} drafts`} icon={CalendarDays} onClick={() => navigate('/dashboard/events')} />
                <StatCard label="Tickets Sold" value={tickets.sold} detail={`${tickets.remaining.toLocaleString()} tickets still available`} icon={Ticket} onClick={() => navigate('/dashboard/events')} />
                <StatCard label="Gross Sales" value={`KSh ${grossRevenue.toLocaleString()}`} detail="Estimated from sold ticket categories" icon={DollarSign} />
                <StatCard label="Needs Attention" value={attentionEvents.length} detail="Postponed or cancelled events" icon={Activity} onClick={() => navigate('/dashboard/events')} />
              </>
            )}
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Event Publishing Queue</h2>
                    <p className="mt-1 text-xs text-admin-40">Drafts are not public until you publish them as active.</p>
                  </div>
                  <button onClick={() => navigate('/dashboard/events')} className="text-xs font-medium text-neon-pink/70 hover:text-neon-pink">
                    Manage events
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FocusRow label="Draft events" value={pendingEvents.length} detail="Complete details and publish" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Live events" value={liveEvents.length} detail="Visible to ticket buyers" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Sold out events" value={eventList.filter(event => event.status === 'sold_out').length} detail="Ticket capacity reached" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Menu-enabled events" value={eventList.filter(event => (event.menuItems?.length ?? 0) > 0).length} detail="Food or drink add-ons available" onClick={() => navigate('/dashboard/events')} />
                </div>
              </section>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Vendor Operations</h2>
                    <p className="mt-1 text-xs text-admin-40">Core work for running events on Glee</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DataTile label="Club profile / locations" value={vendorLocations.length} detail="Locations used by your events" onClick={() => navigate('/dashboard/events?section=locations')} />
                  <DataTile label="Menu items uploaded" value={menuItems} detail="Food and drink items attached to your events" onClick={() => navigate('/dashboard/events')} />
                  <DataTile label="Ticket price groups" value={pricedTicketCategories} detail="Ticket categories and price points configured" onClick={() => navigate('/dashboard/events')} />
                  <DataTile label="Events with availability" value={eventsWithAvailability.length} detail="Events that still have tickets to sell" onClick={() => navigate('/dashboard/events')} />
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">My Upcoming Events</h2>
                    <p className="mt-1 text-xs text-admin-40">Events customers can discover and buy tickets for.</p>
                  </div>
                </div>
                {eventsLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-60 rounded-lg" />)}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="rounded-lg border border-admin bg-admin-surface p-8 text-center">
                    <p className="text-sm font-medium text-admin-70">No live upcoming events yet.</p>
                    <button onClick={() => navigate('/dashboard/events/new')} className="mt-2 text-sm font-medium text-neon-pink hover:underline">
                      Create your first event
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.slice(0, 3).map(event => (
                      <AdminEventCard key={event.id} event={event} onDelete={id => deleteMutation.mutate(id)} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Ticket Sales</h2>
                </div>
                <div className="space-y-4">
                  <ReportMetric label="Sell-through" value={`${sellThrough}%`} detail={`${tickets.sold.toLocaleString()} of ${tickets.total.toLocaleString()} tickets sold`} />
                  <ReportMetric label="Available" value={tickets.remaining.toLocaleString()} detail="Tickets customers can still buy" />
                  <ReportMetric label="Gross ticket sales" value={`KSh ${grossRevenue.toLocaleString()}`} detail="Before platform fees and settlement adjustments" />
                  <ReportMetric label="Own bookings" value={tickets.sold.toLocaleString()} detail="Bookings shown only for your vendor events" />
                  <ReportMetric label="Moderation" value="Glee controlled" detail="Vendors cannot approve their own account or events if review is required" />
                </div>
              </section>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Vendor Checklist</h2>
                </div>
                <div className="space-y-3">
                  <DataTile label="Add event posters" value={eventList.filter(event => event.flyerSquareUrl || event.flyerPortraitUrl).length} detail="Events with public artwork" onClick={() => navigate('/dashboard/events')} />
                  <DataTile label="Configure prices" value={eventList.filter(event => event.ticketTiers.length > 0).length} detail="Events with ticket categories" onClick={() => navigate('/dashboard/events')} />
                  <DataTile label="Table inventory" value={0} detail="Reserved table inventory will live here" onClick={() => navigate('/dashboard/events')} />
                  <DataTile label="Review profile" value={1} detail="Keep business contact details current" onClick={() => navigate('/dashboard/profile')} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!isSuperAdmin) {
    const vendorAccounts = userList.filter(record => record.role === 'vendor' || record.role === 'vendor_staff')
    const inactiveVendors = vendorAccounts.filter(record => record.status !== 'active')
    const customerAccounts = userList.filter(record => record.role === 'user')
    const menuItems = eventList.reduce((sum, event) => sum + (event.menuItems?.length ?? 0), 0)
    const pricedTicketCategories = eventList.reduce((sum, event) => sum + event.ticketTiers.length, 0)
    const disputeSignals = eventList.filter(event => event.status === 'cancelled' || event.status === 'postponed')
    const activeLocations = locationList.filter(location =>
      eventList.some(event => event.locationId === location.id || event.venueId === location.id),
    )

    return (
      <AdminLayout title="Admin Dashboard" subtitle={`Hello ${user.name.split(' ')[0]}, here is your events operations overview.`}>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)
            ) : (
              <>
                <StatCard
                  label="Events To Manage"
                  value={eventList.length}
                  detail={`${activeEvents.length} active, ${draftEvents.length} drafts`}
                  icon={CalendarDays}
                  onClick={() => navigate('/dashboard/events')}
                />
                <StatCard
                  label="Venues / Locations"
                  value={locationList.length}
                  detail={`${activeLocations.length} currently used by events`}
                  icon={MapPin}
                  onClick={() => navigate('/dashboard/events?section=locations')}
                />
                <StatCard
                  label="Ticket Bookings"
                  value={tickets.sold}
                  detail={`${tickets.remaining.toLocaleString()} ticket capacity remaining`}
                  icon={Ticket}
                  onClick={() => navigate('/dashboard/events')}
                />
                <StatCard
                  label="Vendors"
                  value={vendorAccounts.length}
                  detail={`${inactiveVendors.length} needing moderation`}
                  icon={ShieldCheck}
                  onClick={() => navigate('/dashboard/users')}
                />
              </>
            )}
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Operations Queue</h2>
                    <p className="mt-1 text-xs text-admin-40">Admin work centered on events, vendors, pricing, customers, and disputes</p>
                  </div>
                  <Badge variant="outline" className="border-admin text-admin-50">No infrastructure access</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FocusRow label="Draft events" value={draftEvents.length} detail="Review, complete details, and publish" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Vendor moderation" value={inactiveVendors.length} detail="Inactive vendor or staff accounts" onClick={() => navigate('/dashboard/users')} />
                  <FocusRow label="Dispute signals" value={disputeSignals.length} detail="Cancelled or postponed events to resolve" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Customer records" value={customerAccounts.length} detail="View customer data for support" onClick={() => navigate('/dashboard/users')} />
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                  <div className="mb-4">
                    <h2 className="font-heading text-sm font-bold text-foreground">Event Pipeline</h2>
                    <p className="mt-1 text-xs text-admin-40">Statuses admins need to manage</p>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={statusData} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Events" fill="#FF2D8F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>

                <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                  <div className="mb-4">
                    <h2 className="font-heading text-sm font-bold text-foreground">Reporting Snapshot</h2>
                    <p className="mt-1 text-xs text-admin-40">Operational metrics available without finance ownership controls</p>
                  </div>
                  <div className="space-y-4">
                    <ReportMetric label="Sell-through" value={`${sellThrough}%`} detail={`${tickets.sold.toLocaleString()} of ${tickets.total.toLocaleString()} ticket capacity sold`} />
                    <ReportMetric label="Menu items" value={menuItems.toLocaleString()} detail="Food and drink pre-order inventory attached to events" />
                    <ReportMetric label="Pricing records" value={pricedTicketCategories.toLocaleString()} detail="Ticket categories currently configured" />
                    <ReportMetric label="Categories" value={categoryList.length.toLocaleString()} detail="Event categories available for organization" />
                  </div>
                </section>
              </div>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Menu & Pricing Health</h2>
                    <p className="mt-1 text-xs text-admin-40">Events with missing sellable inventory need attention</p>
                  </div>
                  <button onClick={() => navigate('/dashboard/events')} className="text-xs font-medium text-neon-pink/70 hover:text-neon-pink">
                    Manage events
                  </button>
                </div>
                <div className="space-y-3">
                  {eventList.slice(0, 6).map(event => {
                    const hasTickets = event.ticketTiers.length > 0
                    const menuCount = event.menuItems?.length ?? 0
                    const hasMenu = menuCount > 0
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => navigate(`/dashboard/events/${event.id}/edit`)}
                        className="flex w-full items-center justify-between gap-4 rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-admin-80">{event.title}</p>
                          <p className="text-xs text-admin-40">{event.location ?? 'No location selected'}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Badge className={cn('border text-[10px]', hasTickets ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500')}>
                            {event.ticketTiers.length} prices
                          </Badge>
                          <Badge className={cn('border text-[10px]', hasMenu ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-admin bg-admin-input text-admin-40')}>
                            {menuCount} menu
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Venue Utilization</h2>
                </div>
                <div className="space-y-3">
                  {locationsLoading ? (
                    Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 rounded-lg" />)
                  ) : locationUsage.length === 0 ? (
                    <p className="text-sm text-admin-40">No location data yet.</p>
                  ) : locationUsage.map(location => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => navigate(`/dashboard/locations/${location.id}`)}
                      className="w-full rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-admin-70">{location.name}</span>
                        <span className="font-mono text-admin-40">{location.count} events</span>
                      </div>
                      <Progress value={location.pct} className="mt-2 h-1.5 bg-admin-input [&>div]:bg-neon-pink" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Customer & Vendor Data</h2>
                </div>
                <div className="grid gap-3">
                  <DataTile label="Customers" value={customerAccounts.length} detail="Visible for support and dispute resolution" onClick={() => navigate('/dashboard/users')} />
                  <DataTile label="Vendor accounts" value={vendorAccounts.length} detail={`${vendorAccounts.filter(v => v.status === 'active').length} active`} onClick={() => navigate('/dashboard/users')} />
                  <DataTile label="Vendor staff" value={userList.filter(record => record.role === 'vendor_staff').length} detail="Operational users under vendors" onClick={() => navigate('/dashboard/users')} />
                </div>
              </section>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Upcoming Events</h2>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.length === 0 ? (
                    <p className="rounded-lg border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No active upcoming events.</p>
                  ) : upcomingEvents.slice(0, 5).map(event => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => navigate(`/dashboard/events/${event.id}`)}
                      className="w-full rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
                    >
                      <p className="truncate text-sm font-medium text-admin-80">{event.title}</p>
                      <p className="mt-1 text-xs text-admin-40">{event.startDate} · {event.location ?? 'No location'}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
      subtitle={`Hello ${user.name.split(' ')[0]}, here is your ${isSuperAdmin ? 'platform' : 'operations'} overview.`}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)
          ) : (
            <>
              {isSuperAdmin ? (
                <StatCard
                  label="Total Users"
                  value={userList.length}
                  detail={`${userList.filter(u => u.status === 'active').length} active accounts`}
                  icon={Users}
                  onClick={() => navigate('/dashboard/users')}
                />
              ) : (
                <StatCard
                  label="Managed Users"
                  value={userList.filter(record => record.role !== 'super_admin').length}
                  detail={`${userList.filter(u => u.status === 'active' && u.role !== 'super_admin').length} active non-super-admin accounts`}
                  icon={Users}
                  onClick={() => navigate('/dashboard/users')}
                />
              )}
              <StatCard
                label="Events"
                value={eventList.length}
                detail={`${activeEvents.length} active, ${draftEvents.length} drafts`}
                icon={CalendarDays}
                onClick={() => navigate('/dashboard/events')}
              />
              <StatCard
                label="Tickets Sold"
                value={tickets.sold}
                detail={`${tickets.remaining.toLocaleString()} remaining`}
                icon={Ticket}
                onClick={() => navigate('/dashboard/events')}
              />
              <StatCard
                label="Locations"
                value={locationList.length}
                detail={`${categoryList.length} event categories`}
                icon={MapPin}
                onClick={() => navigate('/dashboard/events?section=locations')}
              />
            </>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground">Event Status</h2>
                    <p className="mt-1 text-xs text-admin-40">Distribution across the platform</p>
                  </div>
                  <Badge variant="outline" className="border-admin text-admin-50">{eventList.length} events</Badge>
                </div>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} strokeWidth={0}>
                      {statusData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {statusData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="flex-1 text-admin-50">{item.name}</span>
                      <span className="font-mono text-admin-80">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4">
                  <h2 className="font-heading text-sm font-bold text-foreground">Events By Month</h2>
                  <p className="mt-1 text-xs text-admin-40">Scheduled event volume over the last 6 months</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyEventData} barCategoryGap="34%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="events" name="Events" fill="#FF2D8F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>

            <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Ticket Inventory</h2>
                  <p className="mt-1 text-xs text-admin-40">Current sell-through across all event ticket categories</p>
                </div>
                <span className="font-mono text-sm font-semibold text-neon-pink">{sellThrough}% sold</span>
              </div>
              <Progress value={sellThrough} className="h-2 bg-admin-overlay [&>div]:bg-neon-pink" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InventoryCard label="Total capacity" value={tickets.total} />
                <InventoryCard label="Sold" value={tickets.sold} />
                <InventoryCard label="Available" value={tickets.remaining} />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-sm font-bold text-foreground">Upcoming Active Events</h2>
                  <p className="mt-1 text-xs text-admin-40">Next events visible to customers</p>
                </div>
                <button onClick={() => navigate('/dashboard/events')} className="text-xs font-medium text-neon-pink/70 hover:text-neon-pink">
                  View all
                </button>
              </div>
              {eventsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-60 rounded-lg" />)}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="rounded-lg border border-admin bg-admin-surface p-8 text-center text-sm text-admin-40">
                  No active upcoming events yet.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.slice(0, 3).map(event => (
                    <AdminEventCard key={event.id} event={event} onDelete={id => deleteMutation.mutate(id)} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-neon-pink" />
                <h2 className="font-heading text-sm font-bold text-foreground">Users By Role</h2>
              </div>
              <div className="space-y-3">
                {roleData.length === 0 ? (
                  <p className="text-sm text-admin-40">No users found.</p>
                ) : roleData.slice(0, 8).map(item => {
                  const pct = userList.length > 0 ? Math.round((item.count / userList.length) * 100) : 0
                  return (
                    <div key={item.role} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-admin-70">{item.role}</span>
                        <span className="font-mono text-admin-40">{item.count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-admin-overlay [&>div]:bg-neon-pink" />
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neon-pink" />
                <h2 className="font-heading text-sm font-bold text-foreground">Location Usage</h2>
              </div>
              <div className="space-y-3">
                {locationsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 rounded-lg" />)
                ) : locationUsage.length === 0 ? (
                  <p className="text-sm text-admin-40">No location data yet.</p>
                ) : locationUsage.map(location => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => navigate(`/dashboard/locations/${location.id}`)}
                    className="w-full rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-admin-70">{location.name}</span>
                      <span className="font-mono text-admin-40">{location.count} events</span>
                    </div>
                    <Progress value={location.pct} className="mt-2 h-1.5 bg-admin-input [&>div]:bg-neon-pink" />
                  </button>
                ))}
              </div>
            </section>

            {isSuperAdmin ? (
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-neon-pink" />
                    <h2 className="font-heading text-sm font-bold text-foreground">Recent Audit Activity</h2>
                  </div>
                  <button onClick={() => navigate('/dashboard/audit-logs')} className="text-xs font-medium text-neon-pink/70 hover:text-neon-pink">
                    View
                  </button>
                </div>
                <div className="space-y-3">
                  {auditLoading ? (
                    Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)
                  ) : (auditLogs?.items ?? []).length === 0 ? (
                    <p className="rounded-lg border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No audit logs recorded yet.</p>
                  ) : (auditLogs?.items ?? []).map(log => (
                    <div key={log.id} className="flex gap-3 rounded-lg border border-admin bg-admin-overlay p-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-pink/10">
                        {log.action.includes('delete') ? (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        ) : log.action.includes('update') ? (
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-neon-pink" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-admin-80">{log.action}</p>
                        <p className="truncate text-xs text-admin-40">{log.actor?.email ?? 'System'} - {log.entity}</p>
                        <p className="mt-0.5 text-[11px] text-admin-30">{formatRelativeTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-neon-pink" />
                  <h2 className="font-heading text-sm font-bold text-foreground">Admin Focus</h2>
                </div>
                <div className="space-y-3">
                  <FocusRow label="Draft events" value={draftEvents.length} detail="Review before publishing" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Postponed events" value={eventList.filter(event => event.status === 'postponed').length} detail="Needs schedule follow-up" onClick={() => navigate('/dashboard/events')} />
                  <FocusRow label="Cancelled events" value={eventList.filter(event => event.status === 'cancelled').length} detail="Review customer impact" onClick={() => navigate('/dashboard/events')} />
                </div>
              </section>
            )}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SmallSummary
            icon={CalendarClock}
            label="Draft Events"
            value={draftEvents.length}
            detail="Need review before publishing"
            onClick={() => navigate('/dashboard/events')}
          />
          <SmallSummary
            icon={MapPin}
            label="Configured Locations"
            value={locationList.length}
            detail={`${locationList.filter(location => location.isParkingAvailable).length} with parking`}
            onClick={() => navigate('/dashboard/events?section=locations')}
          />
          <SmallSummary
            icon={Activity}
            label="Event Categories"
            value={categoryList.length}
            detail={categoriesLoading ? 'Loading categories' : 'Used for event organization'}
            onClick={() => navigate('/dashboard/events?section=categories')}
          />
        </section>
      </div>
    </AdminLayout>
  )
}

function InventoryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay p-4">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value.toLocaleString()}</p>
    </div>
  )
}

function FocusRow({
  label,
  value,
  detail,
  onClick,
}: {
  label: string
  value: number
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
    >
      <div>
        <p className="text-sm font-medium text-admin-80">{label}</p>
        <p className="mt-0.5 text-xs text-admin-40">{detail}</p>
      </div>
      <span className="font-heading text-xl font-black text-neon-pink">{value}</span>
    </button>
  )
}

function ReportMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-admin-80">{label}</p>
        <span className="font-heading text-lg font-black text-neon-pink">{value}</span>
      </div>
      <p className="mt-1 text-xs text-admin-40">{detail}</p>
    </div>
  )
}

function DataTile({
  label,
  value,
  detail,
  onClick,
}: {
  label: string
  value: number
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-admin bg-admin-overlay p-3 text-left hover:border-neon-pink/30"
    >
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-admin-40">{detail}</p>
    </button>
  )
}

function SmallSummary({
  icon: Icon,
  label,
  value,
  detail,
  onClick,
}: {
  icon: typeof Activity
  label: string
  value: number
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-admin bg-admin-surface p-5 text-left shadow-admin transition-colors hover:border-neon-pink/40 hover:bg-admin-overlay"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-pink/10">
          <Icon className="h-4 w-4 text-neon-pink" />
        </div>
        <div>
          <p className="text-xs text-admin-40">{label}</p>
          <p className="font-heading text-xl font-black text-foreground">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-admin-40">{detail}</p>
        </div>
      </div>
    </button>
  )
}
