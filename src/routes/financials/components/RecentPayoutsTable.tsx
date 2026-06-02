import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@glee/ui'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PAGE_SIZE } from '../constants'
import type { PayoutRow, PayoutSortKey, SortDir, TimeRange } from '../types'
import { formatTransactionDate, withinTimeRange } from '../utils'
import SortableHeader from './SortableHeader'

export default function RecentPayoutsTable({ exportingPdf, payouts }: { exportingPdf: boolean; payouts: PayoutRow[] }) {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<TimeRange>('this_month')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<PayoutSortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = payouts.filter(p => withinTimeRange(p.date, range))
    if (!q) return base
    return base.filter(p => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.recipient.toLowerCase().includes(q) ||
        p.event.toLowerCase().includes(q) ||
        String(p.payoutAmount).includes(q) ||
        String(p.ticketRevenue).includes(q) ||
        String(p.menuRevenue).includes(q)
      )
    })
  }, [payouts, range, search])

  useEffect(() => {
    setPage(1)
  }, [range, search, sortDir, sortKey])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const rows = [...filtered]
    rows.sort((a, b) => {
      if (sortKey === 'payoutAmount' || sortKey === 'ticketRevenue' || sortKey === 'menuRevenue' || sortKey === 'ticketsSold') {
        return ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * dir
      }
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      const aVal = String(a[sortKey] ?? '').toLowerCase()
      const bVal = String(b[sortKey] ?? '').toLowerCase()
      return aVal.localeCompare(bVal) * dir
    })
    return rows
  }, [filtered, sortDir, sortKey])

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, total)
  const paged = useMemo(() => sorted.slice(start, end), [end, start, sorted])

  const rowsForDisplay = exportingPdf ? sorted : paged

  return (
    <div className="bg-admin-surface rounded-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-5 py-4 border-b border-admin">
        <h3 className="font-heading font-bold text-sm text-foreground">Recent Payouts</h3>
        <div className="flex items-center gap-2 w-full sm:w-auto no-print">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30" />
            <Input
              placeholder="Search payouts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm bg-admin-input border-admin rounded-full focus-visible:ring-neon-pink/30 text-foreground placeholder:text-admin-30"
            />
          </div>
          <Select value={range} onValueChange={v => setRange(v as TimeRange)}>
            <SelectTrigger className="h-9 w-[150px] bg-admin-input border-admin rounded-full text-foreground">
              <SelectValue placeholder="This month" />
            </SelectTrigger>
            <SelectContent className="bg-admin-surface border-admin">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This week</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="this_year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={exportingPdf ? 'overflow-x-auto' : 'overflow-x-auto min-h-[260px] overflow-y-auto'}>
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-admin">
              {([
                { key: 'id', label: 'Payout' },
                { key: 'date', label: 'Date' },
                { key: 'recipient', label: 'Recipient' },
                { key: 'event', label: 'Event' },
                { key: 'payoutAmount', label: 'Amount' },
                { key: 'ticketRevenue', label: 'Ticket Rev' },
                { key: 'menuRevenue', label: 'Menu Rev' },
                { key: 'ticketsSold', label: 'Tickets' },
              ] as Array<{ key: PayoutSortKey; label: string }>).map(h => (
                <th key={h.key} className="text-left text-xs text-admin-30 font-medium px-5 py-3 whitespace-nowrap">
                  <SortableHeader
                    label={h.label}
                    active={sortKey === h.key}
                    sortDir={sortDir}
                    onToggle={() => {
                      if (sortKey !== h.key) {
                        setSortKey(h.key)
                        setSortDir('asc')
                        return
                      }
                      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsForDisplay.length ? (
              rowsForDisplay.map(p => (
                <tr key={p.id} className="border-b border-admin last:border-b-0">
                  <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">{p.id}</td>
                  <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{formatTransactionDate(p.date)}</td>
                  <td className="px-5 py-4 text-admin-70 whitespace-nowrap">{p.recipient}</td>
                  <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{p.event}</td>
                  <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">Ksh {p.payoutAmount.toLocaleString()}</td>
                  <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">Ksh {p.ticketRevenue.toLocaleString()}</td>
                  <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">Ksh {p.menuRevenue.toLocaleString()}</td>
                  <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{p.ticketsSold.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-admin-40">
                  No payouts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-admin no-print">
        <p className="text-xs text-admin-40">{total === 0 ? 'Showing 0 of 0' : `Showing ${start + 1}-${end} of ${total}`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-admin-overlay hover:bg-admin-overlay-lg border border-admin text-admin-60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-admin-50 font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-admin-overlay hover:bg-admin-overlay-lg border border-admin text-admin-60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
