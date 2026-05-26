import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminEvent, useAdminEventTickets, useUpdateEvent, useDeleteEvent, type EventApiPayload } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton, Progress } from '@glee/ui'
import { ArrowLeft, Pencil, Trash2, MapPin, Calendar, Clock, Ticket, ChevronDown, DollarSign, Users, Utensils } from 'lucide-react'
import { cn } from '@glee/ui'
import type { Event } from '@glee/types'

const PLACEHOLDER = 'https://placehold.co/800x400/141419/FF2D8F?text=Glee'

const STATUS_CONFIG: Record<Event['status'], { label: string; dot: string; badge: string }> = {
  active:           { label: 'Active',    dot: 'bg-green-400',   badge: 'bg-green-500/15 text-green-400 border-green-500/20'   },
  draft:            { label: 'Draft',     dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'   },
  cancelled:        { label: 'Cancelled', dot: 'bg-red-500',     badge: 'bg-red-500/15 text-red-400 border-red-500/20'         },
  postponed:        { label: 'Postponed', dot: 'bg-orange-400',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20'},
  sold_out:         { label: 'Sold Out',  dot: 'bg-admin-30',    badge: 'bg-admin-overlay text-admin-40 border-admin'          },
}

const STATUS_OPTIONS: { value: Event['status']; label: string }[] = [
  { value: 'active',    label: 'Set Active'        },
  { value: 'draft',     label: 'Move to Draft'     },
  { value: 'postponed', label: 'Mark as Postponed' },
  { value: 'cancelled', label: 'Cancel Event'      },
  { value: 'sold_out',  label: 'Mark Sold Out'     },
]

const TIER_COLORS = ['#FF2D8F', '#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EF4444']

function formatEventDate(startDate: string, endDate: string): string {
  if (endDate === startDate) {
    return new Date(startDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  const start = new Date(startDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
  const end   = new Date(endDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  return `${start} – ${end}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m)
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateTimeRange(startValue: string, endValue: string): string {
  const start = new Date(startValue)
  const end = new Date(endValue)
  const sameDay = start.toDateString() === end.toDateString()
  const startDate = start.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const endDate = end.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const startTime = start.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
  const endTime = end.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return sameDay ? `${startDate} · ${startTime} - ${endTime}` : `${startDate} ${startTime} - ${endDate} ${endTime}`
}

function formatScheduleDay(value: string): string {
  return new Date(value).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatScheduleTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getScheduleGroups(schedules: NonNullable<Event['schedules']>) {
  return [...schedules]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .reduce<Array<{ key: string; label: string; items: NonNullable<Event['schedules']> }>>((groups, schedule) => {
      const key = new Date(schedule.startDate).toISOString().slice(0, 10)
      const existing = groups.find(group => group.key === key)
      if (existing) {
        existing.items.push(schedule)
      } else {
        groups.push({ key, label: formatScheduleDay(schedule.startDate), items: [schedule] })
      }
      return groups
    }, [])
}

function parseTimelineDescription(description: string) {
  return description
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.+?)\s*(?:-{2,}|—|–)\s*(.+)$/)
      return match ? { time: match[1].trim(), text: match[2].trim() } : { time: null, text: line }
    })
}

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useAdminEvent(eventId ?? '')
  const updateMutation = useUpdateEvent()
  const deleteMutation = useDeleteEvent()
  const { data: ticketData, isLoading: ticketsLoading } = useAdminEventTickets(eventId)
  const [statusOpen, setStatusOpen] = useState(false)
  const [attendeesOpen, setAttendeesOpen] = useState(false)

  function handleStatusChange(newStatus: Event['status']) {
    if (!event) return
    setStatusOpen(false)
    const payload: EventApiPayload = {
      title:       event.title,
      description: event.description,
      categoryId:  event.categoryId ?? '',
      status:      newStatus,
      startDate:   event.startDate,
      endDate:     event.endDate,
      startTime:   event.startTime,
      endTime:     event.endTime,
      locationId:  event.locationId ?? event.venueId,
      ticketTiers: event.ticketTiers,
      schedules: (event.schedules ?? []).map(s => {
        const start = new Date(s.startDate)
        const end = new Date(s.endDate)
        return {
          name: s.name,
          description: s.description,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          startTime: start.toTimeString().slice(0, 5),
          endTime: end.toTimeString().slice(0, 5),
        }
      }),
    }
    updateMutation.mutate({ id: event.id, data: payload })
  }

  function handleDelete() {
    if (!event) return
    if (window.confirm('Delete this event? This cannot be undone.')) {
      deleteMutation.mutate(event.id)
      navigate('/dashboard/events')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="Event Details">
        <div className="space-y-4 w-full">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!event) {
    return (
      <AdminLayout title="Event Details">
        <div className="text-center py-20">
          <p className="text-admin-40 text-sm mb-3">Event not found.</p>
          <button onClick={() => navigate('/dashboard/events')} className="text-sm text-neon-pink hover:underline">
            ← Back to events
          </button>
        </div>
      </AdminLayout>
    )
  }

  const status = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft
  const totalTickets = event.ticketTiers.reduce((s, t) => s + t.quantity, 0)
  const soldTickets = event.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0)
  const remaining = totalTickets - soldTickets
  const soldPct = totalTickets === 0 ? 0 : Math.round((soldTickets / totalTickets) * 100)
  const revenue = event.ticketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining) * t.price, 0)
  const lowestPrice = event.ticketTiers.length > 0 ? Math.min(...event.ticketTiers.map(t => t.price)) : 0
  const purchasedTickets = ticketData?.tickets ?? []
  const ticketRevenue = purchasedTickets.reduce((sum, ticket) => {
    const unitPrice = Number(ticket.ticketCategory?.price ?? 0)
    return sum + unitPrice * ticket.quantity
  }, 0)
  const totalPurchaseRevenue = purchasedTickets.reduce((sum, ticket) => sum + Number(ticket.totalPrice ?? ticket.payment?.amount ?? 0), 0)
  const menuRevenue = Math.max(0, totalPurchaseRevenue - ticketRevenue)
  const attendeePreview = purchasedTickets.slice(0, 5)
  const scheduleGroups = getScheduleGroups(event.schedules ?? [])

  return (
    <AdminLayout title="Event Details">
      <div className="space-y-5 w-full">

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <button
            onClick={() => navigate('/dashboard/events')}
            className="flex items-center gap-2 text-sm text-admin-40 hover:text-admin-70 bg-admin-overlay border border-admin rounded-full px-4 py-1.5 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Events
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border', status.badge)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>

            {/* Change status dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-admin-overlay border border-admin text-admin-60 hover:text-foreground hover:bg-admin-overlay-lg transition-colors"
              >
                Change Status
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-admin-surface border border-admin rounded-xl shadow-admin-card overflow-hidden min-w-[180px]">
                    {STATUS_OPTIONS.filter(o => o.value !== event.status).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-admin-60 hover:text-foreground hover:bg-admin-overlay transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigate(`/dashboard/events/${event.id}/edit`)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-admin-overlay border border-admin text-admin-70 hover:bg-neon-pink/10 hover:border-neon-pink/30 hover:text-neon-pink transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>

            <button
              onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-admin-overlay border border-admin text-admin-50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
              title="Delete event"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero image */}
            <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden bg-admin-overlay">
              <img
                src={event.flyerPortraitUrl ?? event.flyerSquareUrl ?? PLACEHOLDER}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full px-2.5 py-1">
                {event.venueId}
              </div>
            </div>

            {/* Title + stats */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-foreground">{event.title}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <span className="flex items-center gap-2 text-sm text-admin-50">
                  <Calendar className="w-4 h-4 text-neon-pink shrink-0" />
                  {formatEventDate(event.startDate, event.endDate)}
                </span>
                <span className="flex items-center gap-2 text-sm text-admin-50">
                  <Clock className="w-4 h-4 text-neon-pink shrink-0" />
                  {formatTime(event.startTime)}{event.endTime && ` – ${formatTime(event.endTime)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-2 text-sm text-admin-50">
                    <MapPin className="w-4 h-4 text-neon-pink shrink-0" />
                    {event.location}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-admin pt-4">
                <div>
                  <p className="text-xs text-admin-40 mb-0.5">Tickets Sold</p>
                  <p className="font-heading font-black text-xl text-foreground">
                    {soldTickets.toLocaleString()}
                    <span className="text-admin-30 text-sm font-normal ml-1">/ {totalTickets.toLocaleString()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-admin-40 mb-0.5">Starts from</p>
                  <p className="font-heading font-black text-xl text-neon-pink">KSh {lowestPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-3">
              <h2 className="font-heading font-bold text-sm text-foreground">About Event</h2>
              <p className="text-sm text-admin-50 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>

            {/* Schedule */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-sm text-foreground">Event Schedule</h2>
                  <p className="mt-1 text-xs text-admin-40">Timeline ordered by start time</p>
                </div>
                <span className="rounded-full border border-admin bg-admin-overlay px-2.5 py-1 text-xs text-admin-40">
                  {event.schedules?.length ?? 0} item{(event.schedules?.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              {scheduleGroups.length === 0 ? (
                <div className="rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">
                  No detailed schedule has been added yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {scheduleGroups.map((group, groupIndex) => (
                    <div key={group.key} className="relative">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-pink text-sm font-black text-white">
                          {groupIndex + 1}
                        </div>
                        <div>
                          <p className="font-heading text-base font-black text-foreground">{group.label}</p>
                          <p className="text-xs text-admin-40">{group.items.length} scheduled moment{group.items.length === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                      <div className="relative ml-5 space-y-0 border-l border-dashed border-admin-md pl-6">
                        {group.items.map((schedule, index) => {
                          const endDate = new Date(schedule.endDate)
                          const crossesDay = new Date(schedule.startDate).toDateString() !== endDate.toDateString()
                          return (
                            <div key={schedule.id ?? `${schedule.name}-${index}`} className="relative pb-5 last:pb-0">
                              <span className="absolute -left-[31px] top-2 flex h-3 w-3 rounded-full border-2 border-admin-body bg-neon-pink" />
                              <div className="rounded-xl border border-admin bg-admin-overlay p-4">
                                <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                                  <div className="font-mono text-sm font-semibold text-neon-pink">
                                    <p>{formatScheduleTime(schedule.startDate)}</p>
                                    <p className="mt-1 text-xs text-admin-40">to {formatScheduleTime(schedule.endDate)}</p>
                                    {crossesDay && (
                                      <p className="mt-2 text-[11px] text-admin-40">
                                        Ends {endDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-base font-semibold text-foreground">{schedule.name}</p>
                                    <ScheduleDescription description={schedule.description} />
                                    <p className="mt-3 text-xs text-admin-30">{formatDateTimeRange(schedule.startDate, schedule.endDate)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ticket tiers */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Ticket Tiers</h2>
              <div className="space-y-3">
                {event.ticketTiers.map((tier, i) => {
                  const tierSold = tier.quantity - tier.quantityRemaining
                  const tierPct = tier.quantity === 0 ? 0 : Math.round((tierSold / tier.quantity) * 100)
                  const color = TIER_COLORS[i % TIER_COLORS.length]
                  return (
                    <div key={tier.id} className="bg-admin-overlay border border-admin rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                          {tier.description && (
                            <span className="text-xs text-admin-30 hidden sm:inline">— {tier.description}</span>
                          )}
                        </div>
                        <span className="font-heading font-black text-base text-neon-pink">KSh {tier.price.toLocaleString()}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-admin-40">{tierSold.toLocaleString()} / {tier.quantity.toLocaleString()} sold</span>
                          <span className="font-mono text-admin-60">{tierPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-admin-body overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${tierPct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attendees */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-sm text-foreground">Attendees</h2>
                  <p className="mt-1 text-xs text-admin-40">People who have purchased tickets for this event</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttendeesOpen(true)}
                  className="rounded-full border border-admin bg-admin-overlay px-3 py-1.5 text-xs font-medium text-admin-60 hover:border-neon-pink/30 hover:text-neon-pink"
                >
                  View full list
                </button>
              </div>
              {ticketsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}
                </div>
              ) : attendeePreview.length === 0 ? (
                <div className="rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">
                  No attendees have purchased tickets yet.
                </div>
              ) : (
                <div className="divide-y divide-admin rounded-xl border border-admin bg-admin-overlay">
                  {attendeePreview.map(ticket => (
                    <div key={ticket.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                      <div>
                        <p className="font-medium text-admin-90">{ticket.user?.name ?? 'Guest attendee'}</p>
                        <p className="text-xs text-admin-40">{ticket.user?.email ?? 'No email'}</p>
                      </div>
                      <p className="text-xs text-admin-50">{ticket.user?.phone ?? 'No phone'}</p>
                      <p className="font-mono text-xs text-neon-pink">{ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: stats + breakdown */}
          <div className="space-y-5">

            {/* Quick stats */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Overview</h2>
              <div className="space-y-0">
                {[
                  { label: 'Total Capacity', value: totalTickets.toLocaleString(), color: 'text-foreground', icon: Ticket },
                  { label: 'Tickets Sold',   value: soldTickets.toLocaleString(),  color: 'text-neon-pink',  icon: null },
                  { label: 'Remaining',      value: remaining.toLocaleString(),    color: 'text-foreground', icon: null },
                  { label: 'Est. Revenue',   value: `KSh ${revenue.toLocaleString()}`, color: 'text-green-400', icon: null },
                ].map((row, i, arr) => (
                  <div key={row.label} className={cn('flex justify-between items-center py-2.5', i < arr.length - 1 && 'border-b border-admin')}>
                    <span className="text-xs text-admin-40">{row.label}</span>
                    <span className={cn('font-mono font-semibold text-sm', row.color)}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-admin-40">Sold out</span>
                  <span className="font-mono font-semibold text-neon-pink">{soldPct}%</span>
                </div>
                <Progress value={soldPct} className="h-2 bg-admin-overlay [&>div]:bg-neon-pink" />
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Revenue</h2>
              <div className="grid gap-3">
                <RevenueCard icon={Ticket} label="Ticket revenue" value={money(ticketRevenue || revenue)} />
                <RevenueCard icon={Utensils} label="Menu add-ons" value={money(menuRevenue)} />
                <RevenueCard icon={DollarSign} label="Total collected" value={money(totalPurchaseRevenue || revenue)} />
              </div>
            </div>

            {/* Attendee summary */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-sm text-foreground">Attendance</h2>
                <Users className="h-4 w-4 text-neon-pink" />
              </div>
              <div className="space-y-0">
                {[
                  { label: 'Purchases', value: purchasedTickets.length.toLocaleString() },
                  { label: 'Ticket quantity', value: purchasedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0).toLocaleString() },
                  { label: 'Checked in', value: purchasedTickets.filter(ticket => Boolean((ticket as { checkedInAt?: string | null }).checkedInAt)).length.toLocaleString() },
                ].map((row, i, arr) => (
                  <div key={row.label} className={cn('flex justify-between items-center py-2.5', i < arr.length - 1 && 'border-b border-admin')}>
                    <span className="text-xs text-admin-40">{row.label}</span>
                    <span className="font-mono font-semibold text-sm text-admin-80">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier breakdown */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-4">
              <h2 className="font-heading font-bold text-sm text-foreground">Tier Breakdown</h2>
              <div className="space-y-3">
                {event.ticketTiers.map((tier, i) => {
                  const color = TIER_COLORS[i % TIER_COLORS.length]
                  const pct = totalTickets === 0 ? 0 : Math.round((tier.quantity / totalTickets) * 100)
                  return (
                    <div key={tier.id} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-admin-60 truncate">{tier.name}</span>
                          <span className="text-admin-40 font-mono shrink-0 ml-2">{pct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-admin-overlay overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-admin-40 shrink-0">KSh {tier.price.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Event metadata */}
            <div className="bg-admin-surface border border-admin rounded-2xl p-5 space-y-3">
              <h2 className="font-heading font-bold text-sm text-foreground">Details</h2>
              <div className="space-y-0">
                {[
                  { label: 'Event ID',     value: event.id.slice(0, 12) + '…' },
                  { label: 'Venue',        value: event.venueId },
                  ...(event.dresscode ? [{ label: 'Dress Code', value: event.dresscode }] : []),
                  { label: 'Created',      value: new Date(event.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Last Updated', value: new Date(event.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map((row, i, arr) => (
                  <div key={row.label} className={cn('flex justify-between items-center py-2', i < arr.length - 1 && 'border-b border-admin')}>
                    <span className="text-xs text-admin-40">{row.label}</span>
                    <span className="text-xs font-mono text-admin-60 truncate ml-4 max-w-[120px] text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={attendeesOpen} onOpenChange={setAttendeesOpen}>
        <DialogContent className="max-h-[86vh] max-w-4xl overflow-y-auto border-admin bg-admin-surface">
          <DialogHeader>
            <DialogTitle className="text-foreground">Event attendees</DialogTitle>
            <DialogDescription>{event.title}</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Tickets</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {purchasedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-admin-40">No attendees yet.</td>
                  </tr>
                ) : purchasedTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-admin-overlay">
                    <td className="px-4 py-3 font-medium text-admin-90">{ticket.user?.name ?? 'Guest attendee'}</td>
                    <td className="px-4 py-3 text-admin-50">{ticket.user?.email ?? '-'}</td>
                    <td className="px-4 py-3 text-admin-50">{ticket.user?.phone ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-neon-pink">{ticket.quantity}</td>
                    <td className="px-4 py-3 font-mono text-admin-70">{money(Number(ticket.totalPrice ?? ticket.payment?.amount ?? 0))}</td>
                    <td className="px-4 py-3 text-admin-40">{new Date(ticket.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

function RevenueCard({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-admin bg-admin-overlay p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-pink/10">
        <Icon className="h-4 w-4 text-neon-pink" />
      </div>
      <div>
        <p className="text-xs text-admin-40">{label}</p>
        <p className="font-heading text-lg font-black text-foreground">{value}</p>
      </div>
    </div>
  )
}

function ScheduleDescription({ description }: { description: string }) {
  const rows = parseTimelineDescription(description)

  if (rows.length <= 1 && !rows[0]?.time) {
    return <p className="mt-2 text-sm leading-relaxed text-admin-50 whitespace-pre-line">{description}</p>
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map((row, index) => (
        row.time ? (
          <div key={`${row.time}-${index}`} className="grid gap-2 rounded-lg border border-admin bg-admin-surface/50 px-3 py-2 sm:grid-cols-[86px_1fr]">
            <span className="font-mono text-xs font-semibold text-neon-pink">{row.time}</span>
            <span className="text-sm leading-relaxed text-admin-70">{row.text}</span>
          </div>
        ) : (
          <p key={`${row.text}-${index}`} className="text-sm leading-relaxed text-admin-50">{row.text}</p>
        )
      ))}
    </div>
  )
}
