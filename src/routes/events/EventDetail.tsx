import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  useAdminEvent,
  useAdminEventTickets,
  useUpdateEvent,
  useDeleteEvent,
  useIssueComplimentaryTicket,
  useReviewVendorEvent,
  useStartEvent,
  useEndEvent,
  useTicketAttendants,
  useTicketAttendantStats,
  useCreateTicketAttendant,
  useResetTicketAttendantSession,
  useRevokeTicketAttendant,
  type EventApiPayload,
  type TicketAttendant,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Skeleton,
  Textarea,
  useToast,
} from '@glee/ui'
import { ArrowLeft, Pencil, Trash2, MapPin, Calendar, Clock, Ticket, ChevronDown, DollarSign, Users, Utensils, Gift, UserCheck, CheckCircle2, XCircle, ShieldCheck, UserPlus, Copy, RotateCcw, Ban, Play, Square } from 'lucide-react'
import { cn } from '@glee/ui'
import { formatDateOnly, formatDateRange, formatTimeOnly, splitBackendDateTime } from '@glee/utils'
import type { Event } from '@glee/types'
import EventDetailTabs from './EventDetailTabs'
import EventEarningsPanel from './EventEarningsPanel'
import EventAttendeeUpdatesPanel from './EventAttendeeUpdatesPanel'
import { EventChatPanel } from '../../components/chat/EventChatPanel'
import EventReservationSlotsPanel from './EventReservationSlotsPanel'
import { AutoMediaHero, normalizeMediaImages } from '../../components/media/MediaGallery'

const PLACEHOLDER = '/glee-image-fallback.svg'

const STATUS_CONFIG: Record<Event['status'], { label: string; dot: string; badge: string }> = {
  active:           { label: 'Active',           dot: 'bg-green-400',   badge: 'bg-green-500/15 text-green-400 border-green-500/20'   },
  live:             { label: 'Live',             dot: 'bg-neon-pink',   badge: 'bg-neon-pink/15 text-neon-pink border-neon-pink/20'   },
  ended:            { label: 'Ended',            dot: 'bg-admin-40',    badge: 'bg-admin-overlay text-admin-50 border-admin'          },
  pending_approval: { label: 'Pending Approval', dot: 'bg-sky-400',     badge: 'bg-sky-500/15 text-sky-400 border-sky-500/20'         },
  draft:            { label: 'Draft',            dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'   },
  cancelled:        { label: 'Cancelled',        dot: 'bg-red-500',     badge: 'bg-red-500/15 text-red-400 border-red-500/20'         },
  rejected:         { label: 'Rejected',         dot: 'bg-red-400',     badge: 'bg-red-500/15 text-red-300 border-red-500/20'         },
  postponed:        { label: 'Postponed',        dot: 'bg-orange-400',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20'},
  sold_out:         { label: 'Sold Out',         dot: 'bg-admin-30',    badge: 'bg-admin-overlay text-admin-40 border-admin'          },
}

const STATUS_OPTIONS: { value: Event['status']; label: string }[] = [
  { value: 'active',    label: 'Set Active'        },
  { value: 'draft',     label: 'Move to Draft'     },
  { value: 'pending_approval', label: 'Mark Pending Approval' },
  { value: 'postponed', label: 'Mark as Postponed' },
  { value: 'cancelled', label: 'Cancel Event'      },
  { value: 'rejected',  label: 'Reject Event'      },
  { value: 'sold_out',  label: 'Mark Sold Out'     },
]

const TIER_COLORS = ['#FF2D8F', '#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EF4444']
type EventDetailTab = 'details' | 'earnings' | 'complimentary' | 'attendants' | 'updates' | 'chat' | 'reservations'

function formatEventDate(startDate: string, endDate: string): string {
  return formatDateRange(
    startDate,
    endDate,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    { weekday: 'short', day: 'numeric', month: 'short' },
    { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
  )
}

function formatTime(time: string): string {
  return formatTimeOnly(time)
}

function formatDateTimeRange(startValue: string, endValue: string): string {
  const start = splitBackendDateTime(startValue)
  const end = splitBackendDateTime(endValue)
  const startDate = formatDateOnly(start.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const endDate = formatDateOnly(end.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const startTime = formatTimeOnly(start.time)
  const endTime = formatTimeOnly(end.time)
  return start.date === end.date ? `${startDate} · ${startTime} - ${endTime}` : `${startDate} ${startTime} - ${endDate} ${endTime}`
}

function formatScheduleDay(value: string): string {
  return formatDateOnly(splitBackendDateTime(value).date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatScheduleTime(value: string): string {
  return formatTimeOnly(splitBackendDateTime(value).time)
}

function getScheduleGroups(schedules: NonNullable<Event['schedules']>) {
  return [...schedules]
    .sort((a, b) => {
      const aParts = splitBackendDateTime(a.startDate)
      const bParts = splitBackendDateTime(b.startDate)
      return `${aParts.date}T${aParts.time}`.localeCompare(`${bParts.date}T${bParts.time}`)
    })
    .reduce<Array<{ key: string; label: string; items: NonNullable<Event['schedules']> }>>((groups, schedule) => {
      const key = splitBackendDateTime(schedule.startDate).date
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
  const location = useLocation()
  const user = useAdminUser()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const canManageEventLifecycle = !isVendorRole
  const canDeleteEvent = user.role !== 'vendor_staff'
  const { data: event, isLoading } = useAdminEvent(eventId ?? '', { vendorScoped: isVendorRole })
  const updateMutation = useUpdateEvent({ vendorScoped: isVendorRole })
  const deleteMutation = useDeleteEvent({ vendorScoped: isVendorRole })
  const reviewMutation = useReviewVendorEvent()
  const startEventMutation = useStartEvent({ vendorScoped: isVendorRole })
  const endEventMutation = useEndEvent({ vendorScoped: isVendorRole })
  const { toast } = useToast()
  const { data: ticketData } = useAdminEventTickets(eventId)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [rejectEventOpen, setRejectEventOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState<EventDetailTab>(() => {
    const state = location.state as { tab?: EventDetailTab } | null
    return state?.tab === 'earnings' || state?.tab === 'complimentary' || state?.tab === 'attendants' || state?.tab === 'updates' || state?.tab === 'chat' || state?.tab === 'reservations' ? state.tab : 'details'
  })

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
        const start = splitBackendDateTime(s.startDate)
        const end = splitBackendDateTime(s.endDate)
        return {
          name: s.name,
          description: s.description,
          startDate: start.date,
          endDate: end.date || start.date,
          startTime: start.time,
          endTime: end.time || start.time,
        }
      }),
    }
    updateMutation.mutate({ id: event.id, data: payload })
  }

  function handleDelete() {
    if (!event) return
    setDeleteEventOpen(true)
  }

  function confirmDelete() {
    if (!event) return
    deleteMutation.mutate(event.id)
    setDeleteEventOpen(false)
    navigate('/dashboard/events')
  }

  async function handleReview(decision: 'approve' | 'reject') {
    if (!event) return
    if (decision === 'reject') {
      setRejectReason('')
      setRejectEventOpen(true)
      return
    }
    try {
      await reviewMutation.mutateAsync({ id: event.id, decision })
      toast({ title: decision === 'approve' ? 'Event approved' : 'Event rejected' })
    } catch (error) {
      toast({
        title: 'Could not review event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function confirmReject() {
    if (!event) return
    try {
      await reviewMutation.mutateAsync({ id: event.id, decision: 'reject', reason: rejectReason.trim() || undefined })
      setRejectEventOpen(false)
      toast({ title: 'Event rejected' })
    } catch (error) {
      toast({
        title: 'Could not review event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleLifecycle(action: 'start' | 'end') {
    if (!event) return
    try {
      if (action === 'start') {
        await startEventMutation.mutateAsync(event.id)
        toast({ title: 'Event marked live' })
      } else {
        await endEventMutation.mutateAsync(event.id)
        toast({ title: 'Event marked ended' })
      }
    } catch (error) {
      toast({
        title: action === 'start' ? 'Could not start event' : 'Could not end event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
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
  const allTicketTiers = event.ticketWaves?.length ? event.ticketWaves.flatMap(wave => wave.ticketTiers) : event.ticketTiers
  const activeTicketTiers = event.activeTicketWave?.ticketTiers ?? event.ticketTiers
  const totalTickets = allTicketTiers.reduce((s, t) => s + t.quantity, 0)
  const soldTickets = allTicketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining), 0)
  const remaining = totalTickets - soldTickets
  const soldPct = totalTickets === 0 ? 0 : Math.round((soldTickets / totalTickets) * 100)
  const revenue = allTicketTiers.reduce((s, t) => s + (t.quantity - t.quantityRemaining) * t.price, 0)
  const lowestPrice = activeTicketTiers.length > 0 ? Math.min(...activeTicketTiers.map(t => t.price)) : 0
  const purchasedTickets = ticketData?.tickets ?? []
  const ticketRevenue = purchasedTickets.reduce((sum, ticket) => {
    const unitPrice = Number(ticket.ticketCategory?.price ?? 0)
    return sum + unitPrice * ticket.quantity
  }, 0)
  const totalPurchaseRevenue = purchasedTickets.reduce((sum, ticket) => sum + Number(ticket.totalPrice ?? ticket.payment?.amount ?? 0), 0)
  const menuRevenue = Math.max(0, totalPurchaseRevenue - ticketRevenue)
  const scheduleGroups = getScheduleGroups(event.schedules ?? [])
  const eventImages = normalizeMediaImages(event.images ?? [event.flyerPortraitUrl, event.flyerSquareUrl], PLACEHOLDER)

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

            {canManageEventLifecycle && (
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
                    <button type="button" aria-label="Close status menu" className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
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
            )}

            {canManageEventLifecycle && (event.status === 'active' || event.status === 'live') && (
              <button
                onClick={() => handleLifecycle(event.status === 'active' ? 'start' : 'end')}
                disabled={startEventMutation.isPending || endEventMutation.isPending}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors disabled:opacity-50',
                  event.status === 'active'
                    ? 'bg-neon-pink/10 border-neon-pink/30 text-neon-pink hover:bg-neon-pink/15'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/15',
                )}
              >
                {event.status === 'active' ? <Play className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {event.status === 'active' ? 'Start Live' : 'End Event'}
              </button>
            )}

            <button
              onClick={() => navigate(`/dashboard/events/${event.id}/edit`)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-admin-overlay border border-admin text-admin-70 hover:bg-neon-pink/10 hover:border-neon-pink/30 hover:text-neon-pink transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>

            {(user.role === 'admin' || user.role === 'super_admin') && event.status === 'pending_approval' && (
              <>
                {event.vendorId && (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/payouts')}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/15 transition-colors"
                  >
                    Configure Commission
                  </button>
                )}
                <button
                  onClick={() => handleReview('approve')}
                  disabled={reviewMutation.isPending}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => handleReview('reject')}
                  disabled={reviewMutation.isPending}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}

            {canDeleteEvent && (
              <button
                onClick={handleDelete}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-admin-overlay border border-admin text-admin-50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <EventDetailTabs eventId={event.id} activeTab={activeTab} userRole={user.role} onSelectLocalTab={setActiveTab} />

        {/* Two-column layout */}
        {activeTab === 'earnings' ? (
          <EventEarningsPanel event={event} userRole={user.role} />
        ) : activeTab === 'complimentary' ? (
          <ComplimentaryTicketPanel event={event} />
        ) : activeTab === 'attendants' ? (
          <TicketAttendantsPanel event={event} />
        ) : activeTab === 'updates' ? (
          <EventAttendeeUpdatesPanel
            event={event}
            vendorScoped={isVendorRole}
            purchaseCount={purchasedTickets.length}
            ticketQuantity={purchasedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)}
          />
        ) : activeTab === 'chat' ? (
          <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="mb-4 border-b border-admin pb-4">
              <h2 className="font-heading text-lg font-black text-foreground">Event Chat</h2>
              <p className="mt-1 text-sm text-admin-40">Moderate attendee conversations and post event announcements.</p>
            </div>
            <EventChatPanel eventId={event.id} eventTitle={event.title} tone="admin" />
          </section>
        ) : activeTab === 'reservations' ? (
          <EventReservationSlotsPanel event={event} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero image */}
            <AutoMediaHero
              images={eventImages}
              alt={event.title}
              fallback={PLACEHOLDER}
              className="h-56 rounded-2xl sm:h-72"
              overlayClassName="bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            >
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full px-2.5 py-1">
                {event.venueId}
              </div>
            </AutoMediaHero>

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
                          const startParts = splitBackendDateTime(schedule.startDate)
                          const endParts = splitBackendDateTime(schedule.endDate)
                          const crossesDay = startParts.date !== endParts.date
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
                                        Ends {formatDateOnly(endParts.date, { day: 'numeric', month: 'short' })}
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
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-sm text-foreground">Ticket Waves</h2>
                {event.activeTicketWave && (
                  <span className="rounded-full border border-neon-pink/25 bg-neon-pink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-pink">
                    {event.activeTicketWave.name} active
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {(event.ticketWaves?.length ? event.ticketWaves : [{ id: 'legacy', name: 'Current tickets', status: 'active' as const, ticketTiers: event.ticketTiers, sequence: 1, startsAt: event.startDate, endsAt: event.endDate }]).map((wave, waveIndex) => (
                  <div key={wave.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{wave.name}</p>
                        <p className="text-xs text-admin-40">
                          {formatDateOnly(splitBackendDateTime(wave.startsAt).date, { day: 'numeric', month: 'short' })} - {formatDateOnly(splitBackendDateTime(wave.endsAt).date, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-admin bg-admin-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-admin-50">{wave.status}</span>
                    </div>
                    <div className="space-y-3">
                      {wave.ticketTiers.map((tier, tierIndex) => {
                        const tierSold = tier.quantity - tier.quantityRemaining
                        const tierPct = tier.quantity === 0 ? 0 : Math.round((tierSold / tier.quantity) * 100)
                        const color = TIER_COLORS[(waveIndex + tierIndex) % TIER_COLORS.length]
                        return (
                          <div key={tier.id} className="rounded-lg border border-admin bg-admin-surface p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                <span className="truncate text-sm font-semibold text-foreground">{tier.name}</span>
                              </div>
                              <span className="shrink-0 font-heading text-sm font-black text-neon-pink">KSh {tier.price.toLocaleString()}</span>
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
                ))}
              </div>
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
                {allTicketTiers.map((tier, i) => {
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
        )}
      </div>
      <AlertDialog open={deleteEventOpen} onOpenChange={setDeleteEventOpen}>
        <AlertDialogContent className="border-admin bg-admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the event and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rejectEventOpen}
        onOpenChange={open => {
          if (!open && !reviewMutation.isPending) setRejectEventOpen(false)
        }}
      >
        <DialogContent className="border-admin bg-admin-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Reject event?</DialogTitle>
            <DialogDescription>
              Add an optional reason for the vendor before sending the review decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={inputEvent => setRejectReason(inputEvent.target.value)}
            placeholder="Example: Event location needs approval before publishing."
            className="min-h-[120px] resize-none border-admin bg-admin-input"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectEventOpen(false)} disabled={reviewMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmReject} disabled={reviewMutation.isPending} className="bg-red-500 text-white hover:bg-red-600">
              {reviewMutation.isPending ? 'Rejecting...' : 'Reject event'}
            </Button>
          </DialogFooter>
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

function TicketAttendantsPanel({ event }: { event: Event }) {
  const { toast } = useToast()
  const { data: attendants = [], isLoading } = useTicketAttendants(event.id)
  const { data: stats = [] } = useTicketAttendantStats(event.id)
  const createAttendant = useCreateTicketAttendant(event.id)
  const resetSession = useResetTicketAttendantSession(event.id)
  const revokeAttendant = useRevokeTicketAttendant(event.id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [latestInvite, setLatestInvite] = useState<TicketAttendant | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<TicketAttendant | null>(null)

  const checkedInTotal = stats.reduce((sum, row) => sum + row.success, 0)
  const duplicateTotal = stats.reduce((sum, row) => sum + row.duplicate, 0)
  const invalidTotal = stats.reduce((sum, row) => sum + row.invalid, 0)

  async function copyValue(value: string, label: string) {
    await navigator.clipboard?.writeText(value)
    toast({ title: `${label} copied` })
  }

  async function handleCreate(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Missing attendant details', variant: 'destructive' })
      return
    }
    try {
      const attendant = await createAttendant.mutateAsync({ eventId: event.id, name, email })
      setLatestInvite(attendant)
      setName('')
      setEmail('')
      toast({ title: 'Ticket attendant invited' })
    } catch (error) {
      toast({
        title: 'Could not invite attendant',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleReset(attendant: TicketAttendant) {
    try {
      await resetSession.mutateAsync({ eventId: event.id, id: attendant.id })
      toast({ title: 'Session reset' })
    } catch (error) {
      toast({
        title: 'Could not reset session',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleRevoke(attendant: TicketAttendant) {
    try {
      await revokeAttendant.mutateAsync({ eventId: event.id, id: attendant.id })
      setPendingRevoke(null)
      toast({ title: 'Attendant access revoked' })
    } catch (error) {
      toast({
        title: 'Could not revoke attendant',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">Check-in Team</h2>
                <p className="text-xs text-admin-40">Event-only access opens before start time and expires when the event ends.</p>
              </div>
            </div>
            <span className="w-fit rounded-full border border-admin bg-admin-overlay px-3 py-1 text-xs font-medium text-admin-50">
              {event.status === 'live' ? 'Live check-in enabled' : `${event.status.replace('_', ' ')} event`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <AttendantMetric label="Successful check-ins" value={checkedInTotal} tone="pink" />
            <AttendantMetric label="Duplicate scans" value={duplicateTotal} />
            <AttendantMetric label="Invalid scans" value={invalidTotal} />
          </div>
        </div>

        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground">Invited Attendants</h3>
            <span className="rounded-full border border-admin bg-admin-overlay px-2.5 py-1 text-xs text-admin-40">
              {attendants.length} total
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : attendants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-admin bg-admin-overlay p-8 text-center">
              <UserCheck className="mx-auto h-8 w-8 text-admin-30" />
              <p className="mt-3 text-sm font-semibold text-foreground">No attendants yet</p>
              <p className="mt-1 text-sm text-admin-40">Invite gate staff once the event is ready for check-in operations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendants.map(attendant => {
                const rowStats = stats.find(row => row.id === attendant.id)
                return (
                  <div key={attendant.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{attendant.name}</p>
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            attendant.status === 'ACTIVE'
                              ? 'border-green-500/25 bg-green-500/10 text-green-400'
                              : attendant.status === 'REVOKED' || attendant.status === 'EXPIRED'
                                ? 'border-red-500/25 bg-red-500/10 text-red-300'
                                : 'border-admin bg-admin-surface text-admin-50',
                          )}>
                            {attendant.status}
                          </span>
                          {attendant.sessionActive && (
                            <span className="rounded-full border border-neon-pink/25 bg-neon-pink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-pink">
                              active session
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-admin-40">{attendant.email}</p>
                        <p className="mt-2 text-xs text-admin-40">
                          {rowStats?.success ?? attendant.checkedInCount ?? 0} check-ins · {rowStats?.attempts ?? attendant.attemptCount ?? 0} attempts
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="border-admin bg-admin-surface" onClick={() => handleReset(attendant)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15" onClick={() => setPendingRevoke(attendant)}>
                          <Ban className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-5">
        <form onSubmit={handleCreate} className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-neon-pink" />
            <h3 className="font-heading text-sm font-bold text-foreground">Invite Attendant</h3>
          </div>
          <div className="space-y-3">
            <label className="space-y-1.5">
              <Label className="text-xs text-admin-50">Full name</Label>
              <Input value={name} onChange={event => setName(event.target.value)} placeholder="Gate attendant name" className="border-admin bg-admin-input" />
            </label>
            <label className="space-y-1.5">
              <Label className="text-xs text-admin-50">Email</Label>
              <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="attendant@example.com" className="border-admin bg-admin-input" />
            </label>
            <Button type="submit" disabled={createAttendant.isPending} className="w-full bg-neon-pink text-white hover:bg-neon-pink/90">
              {createAttendant.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </form>

        {latestInvite && (
          <div className="rounded-2xl border border-neon-pink/25 bg-neon-pink/10 p-5 shadow-admin">
            <p className="text-xs font-semibold uppercase tracking-wide text-neon-pink">Share manually</p>
            <h3 className="mt-2 font-heading text-base font-bold text-foreground">{latestInvite.name}</h3>
            <p className="mt-1 text-sm text-admin-50">PIN and link are shown once. Send the PIN separately from the email link.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-admin bg-admin-surface p-3">
                <p className="text-xs text-admin-40">PIN</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-mono text-xl font-black tracking-[0.2em] text-foreground">{latestInvite.pin}</p>
                  {latestInvite.pin && (
                    <button type="button" onClick={() => copyValue(latestInvite.pin as string, 'PIN')} className="text-admin-40 hover:text-neon-pink">
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {latestInvite.inviteUrl && (
                <div className="rounded-xl border border-admin bg-admin-surface p-3">
                  <p className="text-xs text-admin-40">Access link</p>
                  <button type="button" onClick={() => copyValue(latestInvite.inviteUrl as string, 'Invite link')} className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-admin bg-admin-overlay px-3 py-2 text-left text-xs text-admin-60 hover:text-neon-pink">
                    <span className="truncate">{latestInvite.inviteUrl}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
      <AlertDialog open={Boolean(pendingRevoke)} onOpenChange={open => { if (!open) setPendingRevoke(null) }}>
        <AlertDialogContent className="border-admin bg-admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke attendant access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke ? `${pendingRevoke.name} will no longer be able to check in tickets for this event.` : 'This attendant will lose check-in access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRevoke && handleRevoke(pendingRevoke)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AttendantMetric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'pink' | 'default' }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-4">
      <p className="text-xs text-admin-40">{label}</p>
      <p className={cn('mt-2 font-heading text-2xl font-black', tone === 'pink' ? 'text-neon-pink' : 'text-foreground')}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function ComplimentaryTicketPanel({ event }: { event: Event }) {
  const { toast } = useToast()
  const issueTicket = useIssueComplimentaryTicket(event.id)
  const [ticketCategoryId, setTicketCategoryId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [note, setNote] = useState('')
  const [checkInNow, setCheckInNow] = useState(false)

  const waveOptions = useMemo(() => event.ticketWaves?.length
    ? event.ticketWaves
    : [{ id: 'current', name: 'Current tickets', status: 'active' as const, ticketTiers: event.ticketTiers, sequence: 1, startsAt: event.startDate, endsAt: event.endDate }],
  [event])

  const selectedTier = waveOptions.flatMap(wave => wave.ticketTiers).find(tier => tier.id === ticketCategoryId)
  const completedUnsold = waveOptions
    .filter(wave => wave.status === 'completed')
    .reduce((sum, wave) => sum + wave.ticketTiers.reduce((tierSum, tier) => tierSum + Math.max(0, tier.quantityRemaining), 0), 0)

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (!ticketCategoryId || !recipientName || !recipientEmail) {
      toast({ title: 'Missing details', description: 'Select a ticket tier and add recipient details.', variant: 'destructive' })
      return
    }

    try {
      await issueTicket.mutateAsync({
        eventId: event.id,
        ticketCategoryId,
        quantity,
        recipientName,
        recipientEmail,
        recipientPhone: recipientPhone || undefined,
        note: note || undefined,
        checkInNow,
      })
      toast({ title: 'Complimentary ticket issued' })
      setRecipientName('')
      setRecipientEmail('')
      setRecipientPhone('')
      setNote('')
      setQuantity(1)
      setCheckInNow(false)
    } catch (error) {
      toast({
        title: 'Could not issue ticket',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">Issue Complimentary Ticket</h2>
            <p className="text-xs text-admin-40">Tickets issued here are deducted from this event's inventory immediately.</p>
          </div>
        </div>

        <label className="space-y-1.5">
          <Label className="text-xs text-admin-50">Ticket tier</Label>
          <select
            value={ticketCategoryId}
            onChange={changeEvent => setTicketCategoryId(changeEvent.target.value)}
            className="h-10 w-full rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground outline-none focus:border-neon-pink/50"
          >
            <option value="">Select ticket tier</option>
            {waveOptions.map(wave => (
              <optgroup key={wave.id} label={`${wave.name} (${wave.status})`}>
                {wave.ticketTiers.map(tier => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} - {money(tier.price)} - {tier.quantityRemaining} available
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5">
            <Label className="text-xs text-admin-50">Quantity</Label>
            <Input
              type="number"
              min={1}
              max={selectedTier?.quantityRemaining ?? undefined}
              value={quantity}
              onChange={changeEvent => setQuantity(Number(changeEvent.target.value) || 1)}
              className="border-admin bg-admin-input"
            />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-admin-50">Recipient name</Label>
            <Input
              value={recipientName}
              onChange={changeEvent => setRecipientName(changeEvent.target.value)}
              placeholder="Guest or gate batch name"
              className="border-admin bg-admin-input"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <Label className="text-xs text-admin-50">Recipient email</Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={changeEvent => setRecipientEmail(changeEvent.target.value)}
              placeholder="guest@example.com"
              className="border-admin bg-admin-input"
            />
          </label>
          <label className="space-y-1.5">
            <Label className="text-xs text-admin-50">Phone</Label>
            <Input
              value={recipientPhone}
              onChange={changeEvent => setRecipientPhone(changeEvent.target.value)}
              placeholder="+254..."
              className="border-admin bg-admin-input"
            />
          </label>
        </div>

        <label className="space-y-1.5">
          <Label className="text-xs text-admin-50">Internal note</Label>
          <Textarea
            value={note}
            onChange={changeEvent => setNote(changeEvent.target.value)}
            placeholder="e.g. Promo giveaway, gate sale, partner allocation"
            className="min-h-24 border-admin bg-admin-input"
          />
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-admin bg-admin-overlay p-3">
          <input
            type="checkbox"
            checked={checkInNow}
            onChange={changeEvent => setCheckInNow(changeEvent.target.checked)}
            className="h-4 w-4 accent-neon-pink"
          />
          <span>
            <span className="block text-sm font-medium text-admin-80">Check in immediately</span>
            <span className="block text-xs text-admin-40">Use this for gate sales where the person is entering now.</span>
          </span>
        </label>

        <Button
          type="submit"
          disabled={issueTicket.isPending || !selectedTier || quantity > (selectedTier?.quantityRemaining ?? 0)}
          className="bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50"
        >
          {issueTicket.isPending ? 'Issuing...' : 'Issue Complimentary Ticket'}
        </Button>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-neon-pink" />
            <h2 className="font-heading text-sm font-bold text-foreground">Selected Tier</h2>
          </div>
          {!selectedTier ? (
            <p className="text-sm text-admin-40">Select a tier to see availability and capacity.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-lg font-bold text-foreground">{selectedTier.name}</p>
              <p className="text-sm text-admin-50">{money(selectedTier.price)}</p>
              <div className="grid grid-cols-2 gap-2">
                <ComplimentaryMetric label="Capacity" value={selectedTier.quantity} />
                <ComplimentaryMetric label="Available" value={selectedTier.quantityRemaining} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-neon-pink" />
            <h2 className="font-heading text-sm font-bold text-foreground">Wave Notes</h2>
          </div>
          <p className="text-sm text-admin-50">
            Expired wave tickets no longer roll forward automatically. Completed waves keep their unsold count for review.
          </p>
          <p className="mt-3 rounded-xl border border-admin bg-admin-overlay p-3 text-xs text-admin-40">
            Unsold tickets in completed waves: <span className="font-semibold text-admin-80">{completedUnsold.toLocaleString()}</span>
          </p>
        </div>
      </aside>
    </div>
  )
}

function ComplimentaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value.toLocaleString()}</p>
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
