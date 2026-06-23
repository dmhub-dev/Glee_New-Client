import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  canOpenBookingChat,
  useAdminReservations,
  useBookingChatThreads,
  type BookingChatThread,
  type Reservation,
} from '@glee/api'
import { Badge, Button, Input, Skeleton } from '@glee/ui'
import { CalendarDays, Mail, MessageCircle, Search, UserRound } from 'lucide-react'
import { BookingChatPanel } from '../../components/chat/BookingChatPanel'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'

type ChatStatusFilter = 'OPEN' | 'RESOLVED' | 'ALL'

type InboxRow = {
  reservation: Reservation
  thread: BookingChatThread | null
  status: Exclude<ChatStatusFilter, 'ALL'>
}

const STATUS_FILTERS: Array<{ label: string; value: ChatStatusFilter }> = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'All', value: 'ALL' },
]

function customerName(reservation: Reservation) {
  return reservation.user?.name || reservation.guestName || reservation.user?.email || reservation.guestEmail || 'Guest'
}

function customerContact(reservation: Reservation) {
  return reservation.user?.email ?? reservation.guestEmail ?? reservation.user?.phone ?? reservation.guestPhone ?? 'No contact'
}

function bookingTitle(reservation: Reservation) {
  return reservation.location?.name ?? reservation.event?.name ?? reservation.table?.name ?? reservation.tableCategory
}

function tableLabel(reservation: Reservation) {
  return reservation.table?.name ?? reservation.tableCategory
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: InboxRow['status']) {
  if (status === 'RESOLVED') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
  return 'border-neon-pink/25 bg-neon-pink/10 text-neon-pink'
}

function searchText(reservation: Reservation) {
  return [
    reservation.reference,
    reservation.location?.name,
    reservation.event?.name,
    reservation.table?.name,
    reservation.tableCategory,
    customerName(reservation),
    reservation.user?.email,
    reservation.guestEmail,
    reservation.user?.phone,
    reservation.guestPhone,
  ].join(' ').toLowerCase()
}

function rowStatus(thread: BookingChatThread | null): InboxRow['status'] {
  return thread?.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
}

export default function BookingChatsPage() {
  const user = useAdminUser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedReservationId = searchParams.get('reservationId')
  const [statusFilter, setStatusFilter] = useState<ChatStatusFilter>(() => requestedReservationId ? 'ALL' : 'OPEN')
  const [search, setSearch] = useState('')
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(() => requestedReservationId)
  const { data, isLoading } = useAdminReservations({ page: 1, limit: 100 })
  const { data: chatThreads = [], isLoading: isLoadingThreads } = useBookingChatThreads()

  const threadByReservationId = useMemo(() => {
    const map = new Map<string, BookingChatThread>()
    chatThreads.forEach(thread => map.set(thread.reservationId, thread))
    return map
  }, [chatThreads])

  const rows = useMemo<InboxRow[]>(() => {
    return (data?.items ?? [])
      .filter(reservation => canOpenBookingChat(reservation))
      .map(reservation => {
        const thread = threadByReservationId.get(reservation.id) ?? null
        return {
          reservation,
          thread,
          status: rowStatus(thread),
        }
      })
      .sort((a, b) => {
        const aTime = a.thread?.updatedAt ?? a.reservation.startDateTime
        const bTime = b.thread?.updatedAt ?? b.reservation.startDateTime
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
  }, [data?.items, threadByReservationId])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter(row => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
      if (!query) return true
      return searchText(row.reservation).includes(query)
    })
  }, [rows, search, statusFilter])

  const selectedRow = selectedReservationId ? rows.find(row => row.reservation.id === selectedReservationId) ?? null : null
  const fallbackSelectedRow = !selectedReservationId ? filteredRows[0] ?? null : null
  const selected = selectedRow ?? fallbackSelectedRow
  const openCount = rows.filter(row => row.status === 'OPEN').length
  const resolvedCount = rows.filter(row => row.status === 'RESOLVED').length
  const unreadCount = rows.reduce((sum, row) => sum + (row.thread?.unreadForStaff ?? 0), 0)

  useEffect(() => {
    if (requestedReservationId !== selectedReservationId) {
      setSelectedReservationId(requestedReservationId)
    }
  }, [requestedReservationId, selectedReservationId])

  useEffect(() => {
    if (selectedRow) return

    const fallbackRow = filteredRows[0] ?? null
    if (fallbackRow && fallbackRow.reservation.id !== selectedReservationId) {
      setSelectedReservationId(fallbackRow.reservation.id)
      setSearchParams({ reservationId: fallbackRow.reservation.id }, { replace: true })
    }
  }, [filteredRows, selectedReservationId, selectedRow, setSearchParams])

  return (
    <AdminLayout title="Booking Chats" subtitle="Monitor reservation support conversations across venues, events, and table bookings.">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Open chats" value={openCount.toLocaleString()} />
          <SummaryCard label="Unread for staff" value={unreadCount.toLocaleString()} />
          <SummaryCard label="Resolved" value={resolvedCount.toLocaleString()} />
        </div>

        <section className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search reference, venue, event, table, or customer..."
                className="border-admin bg-admin-input pl-8"
              />
            </div>
            <div className="flex rounded-lg border border-admin bg-admin-input p-1">
              {STATUS_FILTERS.map(filter => {
                const active = statusFilter === filter.value
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={[
                      'rounded-md px-3 py-2 text-sm font-semibold transition',
                      active ? 'bg-neon-pink text-white' : 'text-admin-50 hover:bg-admin-overlay hover:text-foreground',
                    ].join(' ')}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {isLoading || isLoadingThreads ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)]">
            <Skeleton className="h-[520px] rounded-2xl" />
            <Skeleton className="h-[520px] rounded-2xl" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No booking chats available" description="Eligible confirmed and paid bookings will appear here once they can receive support messages." />
        ) : filteredRows.length === 0 && !selected ? (
          <EmptyState title="No chats match these filters" description="Adjust the search term or choose another chat status." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)]">
            <section className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
              <div className="border-b border-admin px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{filteredRows.length.toLocaleString()} conversation{filteredRows.length === 1 ? '' : 's'}</p>
                <p className="mt-1 text-xs text-admin-40">Select a booking to review messages and respond as staff.</p>
              </div>
              <div className="max-h-[680px] overflow-y-auto">
                {filteredRows.map(row => {
                  const active = selected?.reservation.id === row.reservation.id
                  const unread = row.thread?.unreadForStaff ?? 0
                  return (
                    <button
                      key={row.reservation.id}
                      type="button"
                      onClick={() => {
                        setSelectedReservationId(row.reservation.id)
                        setSearchParams({ reservationId: row.reservation.id })
                      }}
                      className={[
                        'flex w-full gap-3 border-b border-admin px-4 py-4 text-left transition last:border-b-0',
                        active ? 'bg-neon-pink/10' : 'hover:bg-admin-overlay/55',
                      ].join(' ')}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
                        <MessageCircle className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-heading text-base font-black text-foreground">{bookingTitle(row.reservation)}</span>
                            <span className="mt-1 block font-mono text-xs text-admin-30">#{row.reservation.reference}</span>
                          </span>
                          <Badge className={statusBadgeClass(row.status)}>{row.status === 'RESOLVED' ? 'Resolved' : 'Open'}</Badge>
                        </span>
                        <span className="mt-3 grid gap-2 text-xs text-admin-50 sm:grid-cols-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-admin-30" />
                            <span className="truncate">{customerName(row.reservation)}</span>
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-admin-30" />
                            <span className="truncate">{customerContact(row.reservation)}</span>
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-admin-30" />
                            <span className="truncate">{formatDateTime(row.reservation.startDateTime)}</span>
                          </span>
                          <span className="truncate">{tableLabel(row.reservation)}</span>
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-admin-40">{row.thread ? `Updated ${formatDateTime(row.thread.updatedAt)}` : 'No messages'}</span>
                          <span className={unread > 0 ? 'rounded-full bg-neon-pink px-2 py-0.5 text-xs font-bold text-white' : 'text-xs text-admin-30'}>
                            {unread > 0 ? `${unread > 9 ? '9+' : unread} unread` : 'Read'}
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              {selected && (
                <>
                  <div className="rounded-2xl border border-admin bg-admin-surface p-4 shadow-admin">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-admin-30">#{selected.reservation.reference}</p>
                        <h2 className="mt-1 truncate font-heading text-xl font-black text-foreground">{bookingTitle(selected.reservation)}</h2>
                        <p className="mt-2 text-sm text-admin-50">
                          {customerName(selected.reservation)} / {customerContact(selected.reservation)}
                        </p>
                        <p className="mt-1 text-xs text-admin-40">
                          {tableLabel(selected.reservation)} / {selected.reservation.guestCount} guest{selected.reservation.guestCount === 1 ? '' : 's'} / {formatDateTime(selected.reservation.startDateTime)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 border-admin bg-admin-overlay text-admin-70 hover:text-neon-pink"
                        onClick={() => navigate(`/dashboard/reservations/${selected.reservation.id}`)}
                      >
                        Open Booking
                      </Button>
                    </div>
                  </div>
                  <BookingChatPanel
                    reservation={selected.reservation}
                    viewer="STAFF"
                    viewerName={user.name ?? 'Venue team'}
                    tone="admin"
                  />
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-2xl font-black text-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-surface p-10 text-center shadow-admin">
      <MessageCircle className="mx-auto h-8 w-8 text-admin-30" />
      <p className="mt-3 text-sm font-medium text-admin-70">{title}</p>
      <p className="mt-1 text-xs text-admin-40">{description}</p>
    </div>
  )
}
