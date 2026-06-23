import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminEventTickets, useAdminEvent, useAdminEventTickets, type AdminEventTicket } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  useToast,
} from '@glee/ui'
import { ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Search, Table2, Users } from 'lucide-react'
import { adminTicketTableBooking } from '../../components/events/eventCheckoutTableBookingUtils'
import { FeedbackReadOnly, eventTicketFeedbackTargetIds } from '../../components/feedback'
import EventDetailTabs from './EventDetailTabs'
import {
  attendeeEmail,
  attendeeIsFullyPaid,
  attendeeName,
  attendeePaymentMethod,
  attendeePaymentStatusLabel,
  attendeePhone,
  buildAttendeeExportRows,
  downloadAttendeeExcel,
  downloadAttendeePdf,
  type AttendeeExportFormat,
} from './eventAttendeeExport'

type SortKey = 'name' | 'email' | 'phone' | 'quantity' | 'paymentMethod' | 'paymentStatus' | 'createdAt'
type SortDirection = 'asc' | 'desc'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function paidLabel(ticket: AdminEventTicket) {
  if (attendeeIsFullyPaid(ticket)) return 'Fully paid'
  return `Outstanding ${money(Number(ticket.outstandingAmount ?? 0))}`
}

function sortValue(ticket: AdminEventTicket, key: SortKey) {
  switch (key) {
    case 'name':
      return attendeeName(ticket).toLowerCase()
    case 'email':
      return attendeeEmail(ticket).toLowerCase()
    case 'phone':
      return attendeePhone(ticket).toLowerCase()
    case 'quantity':
      return ticket.quantity
    case 'paymentMethod':
      return attendeePaymentMethod(ticket).toLowerCase()
    case 'paymentStatus':
      return paidLabel(ticket).toLowerCase()
    case 'createdAt':
      return new Date(ticket.createdAt).getTime()
    default:
      return ''
  }
}

export default function EventAttendeesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const user = useAdminUser()
  const { toast } = useToast()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: event, isLoading: eventLoading } = useAdminEvent(eventId ?? '', { vendorScoped: isVendorRole })
  const { data, isLoading: ticketsLoading } = useAdminEventTickets(eventId, 1, 1000)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [paidFilter, setPaidFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [exportChoiceOpen, setExportChoiceOpen] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState<AttendeeExportFormat | null>(null)
  const [exporting, setExporting] = useState(false)
  const pageSize = 10

  const tickets = useMemo(() => data?.tickets ?? [], [data?.tickets])
  const exportRows = useMemo(() => buildAttendeeExportRows(tickets), [tickets])
  const methods = useMemo(() => Array.from(new Set(tickets.map(attendeePaymentMethod))).sort(), [tickets])

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tickets
      .filter(ticket => {
        if (!query) return true
        return [
          attendeeName(ticket),
          attendeeEmail(ticket),
          attendeePhone(ticket),
          ticket.ticketCategory?.name,
        ].filter(Boolean).some(value => String(value).toLowerCase().includes(query))
      })
      .filter(ticket => methodFilter === 'all' || attendeePaymentMethod(ticket) === methodFilter)
      .filter(ticket => {
        if (paidFilter === 'all') return true
        return paidFilter === 'paid' ? attendeeIsFullyPaid(ticket) : !attendeeIsFullyPaid(ticket)
      })
      .sort((a, b) => {
        const aValue = sortValue(a, sortKey)
        const bValue = sortValue(b, sortKey)
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        return sortDirection === 'asc' ? result : -result
      })
  }, [tickets, search, methodFilter, paidFilter, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
  const pagedTickets = filteredTickets.slice((page - 1) * pageSize, page * pageSize)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  function resetPage(valueSetter: (value: string) => void, value: string) {
    valueSetter(value)
    setPage(1)
  }

  async function loadTicketsForExport() {
    if (!eventId || !data || data.totalPages <= 1) return tickets
    const remainingPages = Array.from({ length: Math.max(0, data.totalPages - 1) }, (_, index) => index + 2)
    const results = await Promise.all(remainingPages.map(pageNumber => getAdminEventTickets(eventId, pageNumber, 1000)))
    return [...tickets, ...results.flatMap(result => result.tickets)]
  }

  function chooseExportFormat(format: AttendeeExportFormat) {
    if (exportRows.length === 0) {
      toast({ title: 'No attendees to export', description: 'This event does not have any attendee records yet.', variant: 'destructive' })
      return
    }
    setExportChoiceOpen(false)
    setPendingExportFormat(format)
  }

  async function confirmExport() {
    if (!pendingExportFormat) return
    setExporting(true)
    try {
      const eventTitle = event?.title ?? 'Event'
      const exportTickets = await loadTicketsForExport()
      const rows = buildAttendeeExportRows(exportTickets)
      if (pendingExportFormat === 'pdf') {
        await downloadAttendeePdf(eventTitle, rows)
      } else {
        await downloadAttendeeExcel(eventTitle, rows)
      }
      toast({
        title: 'Export started',
        description: `${rows.length.toLocaleString()} attendee record${rows.length === 1 ? '' : 's'} will download as ${pendingExportFormat === 'pdf' ? 'PDF' : 'Excel'}.`,
      })
      setPendingExportFormat(null)
    } catch {
      toast({ title: 'Export failed', description: 'Unable to prepare the attendee export. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const isLoading = eventLoading || ticketsLoading
  const pendingExportLabel = pendingExportFormat === 'pdf' ? 'PDF' : 'Excel'

  return (
    <AdminLayout title="Event Attendees" subtitle={event?.title ?? 'View people who purchased tickets'}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/events/${eventId}`)}
            className="flex w-fit items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 py-1.5 text-sm text-admin-40 transition-colors hover:text-admin-70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to event
          </button>
        </div>

        {eventId && (
          <EventDetailTabs eventId={eventId} activeTab="attendees" userRole={user.role} />
        )}

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-black text-foreground">{event?.title ?? 'Event'}</h2>
              <p className="mt-1 text-sm text-admin-40">{filteredTickets.length.toLocaleString()} attendee record{filteredTickets.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Button
                type="button"
                onClick={() => setExportChoiceOpen(true)}
                disabled={isLoading || exporting || exportRows.length === 0}
                className="w-full gap-2 bg-neon-pink text-white hover:bg-[#cc2272] sm:w-fit"
              >
                <Download className="h-4 w-4" />
                Export attendees
              </Button>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Tickets" value={tickets.reduce((sum, ticket) => sum + ticket.quantity, 0).toLocaleString()} />
                <SummaryCard label="Fully paid" value={tickets.filter(attendeeIsFullyPaid).length.toLocaleString()} />
                <SummaryCard label="Installments" value={tickets.filter(ticket => !attendeeIsFullyPaid(ticket)).length.toLocaleString()} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
              <Input
                value={search}
                onChange={event => resetPage(setSearch, event.target.value)}
                placeholder="Search name, email, phone, or ticket tier..."
                className="border-admin bg-admin-input pl-9"
              />
            </div>
            <select
              value={methodFilter}
              onChange={event => resetPage(setMethodFilter, event.target.value)}
              className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground outline-none"
            >
              <option value="all">All payment methods</option>
              {methods.map(method => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}
            </select>
            <select
              value={paidFilter}
              onChange={event => resetPage(setPaidFilter, event.target.value)}
              className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground outline-none"
            >
              <option value="all">All payment status</option>
              <option value="paid">Fully paid</option>
              <option value="partial">Installment / partial</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-admin">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
                <tr>
                  <SortableTh label="Full name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTh label="Email" sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTh label="Phone" sortKey="phone" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTh label="Tickets" sortKey="quantity" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <th className="px-4 py-3 font-medium">Ticket tier</th>
                  <th className="px-4 py-3 font-medium">Feedback</th>
                  <th className="px-4 py-3 font-medium">Table booking</th>
                  <SortableTh label="Payment method" sortKey="paymentMethod" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTh label="Paid status" sortKey="paymentStatus" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <th className="px-4 py-3 font-medium">Amount paid</th>
                  <SortableTh label="Purchased" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={11} className="px-4 py-3"><Skeleton className="h-8 rounded-lg" /></td>
                    </tr>
                  ))
                ) : pagedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <Users className="mx-auto h-8 w-8 text-admin-30" />
                      <p className="mt-3 text-sm font-medium text-admin-70">No attendees found</p>
                    </td>
                  </tr>
                ) : pagedTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-admin-overlay/60">
                    <td className="px-4 py-3 font-medium text-admin-90">{attendeeName(ticket)}</td>
                    <td className="px-4 py-3 text-admin-50">{attendeeEmail(ticket)}</td>
                    <td className="px-4 py-3 text-admin-50">{attendeePhone(ticket)}</td>
                    <td className="px-4 py-3 font-mono text-neon-pink">{ticket.quantity}</td>
                    <td className="px-4 py-3 text-admin-60">{ticket.ticketCategory?.name ?? 'General'}</td>
                    <td className="px-4 py-3">
                      <FeedbackReadOnly
                        targetType="EVENT_TICKET"
                        targetIds={eventTicketFeedbackTargetIds(ticket.eventId, ticket)}
                        compact
                      />
                    </td>
                    <td className="px-4 py-3">{adminTicketTableBooking(ticket) ? <TableBookingBadge ticket={ticket} /> : '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className="border-admin bg-admin-input text-admin-60">{attendeePaymentMethod(ticket).replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={attendeeIsFullyPaid(ticket) ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}>
                        {attendeePaymentStatusLabel(ticket, 'KSh')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-admin-70">{money(Number(ticket.amountPaid ?? ticket.payment?.totalPrice ?? ticket.totalPrice ?? 0))}</td>
                    <td className="px-4 py-3 text-admin-40">{new Date(ticket.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-admin-40">
              Showing {filteredTickets.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredTickets.length)} of {filteredTickets.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="gap-1 border-admin bg-admin-input">
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="font-mono text-xs text-admin-50">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="gap-1 border-admin bg-admin-input">
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={exportChoiceOpen} onOpenChange={setExportChoiceOpen}>
        <DialogContent className="border-admin bg-admin-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Choose export format</DialogTitle>
            <DialogDescription>
              Download all loaded attendee records for {event?.title ?? 'this event'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseExportFormat('pdf')}
              className="rounded-2xl border border-admin bg-admin-overlay p-4 text-left transition-colors hover:border-neon-pink/40 hover:bg-admin-input"
            >
              <FileText className="h-5 w-5 text-neon-pink" />
              <p className="mt-3 text-sm font-semibold text-foreground">PDF</p>
              <p className="mt-1 text-xs leading-5 text-admin-40">Best for sharing or printing a fixed attendee list.</p>
            </button>
            <button
              type="button"
              onClick={() => chooseExportFormat('excel')}
              className="rounded-2xl border border-admin bg-admin-overlay p-4 text-left transition-colors hover:border-neon-pink/40 hover:bg-admin-input"
            >
              <FileSpreadsheet className="h-5 w-5 text-neon-pink" />
              <p className="mt-3 text-sm font-semibold text-foreground">Excel</p>
              <p className="mt-1 text-xs leading-5 text-admin-40">Best for sorting, filtering, and reconciling attendee records.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingExportFormat)} onOpenChange={open => { if (!open) setPendingExportFormat(null) }}>
        <DialogContent className="border-admin bg-admin-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Confirm export</DialogTitle>
            <DialogDescription>
              Export attendees as {pendingExportLabel}? This fetches every attendee page before downloading, not only the current page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-admin bg-admin-input" onClick={() => setPendingExportFormat(null)} disabled={exporting}>
              Cancel
            </Button>
            <Button type="button" className="gap-2 bg-neon-pink text-white hover:bg-[#cc2272]" onClick={confirmExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? 'Preparing...' : `Download ${pendingExportLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

function TableBookingBadge({ ticket }: { ticket: AdminEventTicket }) {
  const tableBooking = adminTicketTableBooking(ticket)
  if (!tableBooking) return null

  return (
    <div className="inline-flex min-w-[210px] max-w-[260px] flex-col gap-1 rounded-lg border border-admin bg-admin-input px-3 py-2 text-xs text-admin-50">
      <div className="flex items-center gap-2 font-medium text-admin-80">
        <Table2 className="h-3.5 w-3.5 shrink-0 text-neon-pink" />
        <span className="truncate">{tableBooking.tableCategory}</span>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-admin-40">
        <span>{tableBooking.guestCount} guest{tableBooking.guestCount === 1 ? '' : 's'}</span>
        <span>{tableBooking.status.replace('_', ' ')}</span>
      </div>
      <div className="font-mono text-[11px] text-admin-60">
        Deposit {money(Number(tableBooking.depositAmount ?? 0))}
      </div>
      <div className="font-mono text-[11px] text-admin-60">
        Min spend {money(Number(tableBooking.minimumSpend ?? 0))}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-xl font-black text-foreground">{value}</p>
    </div>
  )
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-1.5 transition hover:text-admin-70">
        {label}
        <ArrowUpDown className={activeKey === sortKey ? 'h-3.5 w-3.5 text-neon-pink' : 'h-3.5 w-3.5'} />
        {activeKey === sortKey && <span className="normal-case text-neon-pink">{direction}</span>}
      </button>
    </th>
  )
}
