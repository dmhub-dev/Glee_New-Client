import { Badge } from '@glee/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type {
  SortDir,
  TimeRange,
  TransactionRow,
  TransactionSortKey,
  TransactionStatusFilter,
  TransactionTypeFilter,
} from '../types'
import { formatTransactionDate, formatRangeLabel } from '../utils'
import SortableHeader from './SortableHeader'
import TransactionFilters from './TransactionFilters'

function formatStatusLabel(s: TransactionStatusFilter): string {
  if (s === 'all') return 'Any Status'
  if (s === 'completed') return 'Completed'
  if (s === 'pending') return 'Pending'
  if (s === 'failed') return 'Failed'
  return 'Refunded'
}

function formatTypeLabel(t: TransactionTypeFilter): string {
  if (t === 'all') return 'Any Type'
  if (t === 'ticket') return 'Tickets'
  if (t === 'menu_item') return 'Menu Items'
  if (t === 'payout') return 'Payouts'
  return 'Refunds'
}

export default function TransactionTable({
  exportingPdf,
  search,
  setSearch,
  range,
  setRange,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  filtersOpen,
  setFiltersOpen,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  transactionsForDisplay,
  totalTransactions,
  pageStartIndex,
  pageEndIndex,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}: {
  exportingPdf: boolean
  search: string
  setSearch: (v: string) => void
  range: TimeRange
  setRange: (v: TimeRange) => void
  statusFilter: TransactionStatusFilter
  setStatusFilter: (v: TransactionStatusFilter) => void
  typeFilter: TransactionTypeFilter
  setTypeFilter: (v: TransactionTypeFilter) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  sortKey: TransactionSortKey
  setSortKey: (k: TransactionSortKey) => void
  sortDir: SortDir
  setSortDir: (d: SortDir | ((prev: SortDir) => SortDir)) => void
  transactionsForDisplay: TransactionRow[]
  totalTransactions: number
  pageStartIndex: number
  pageEndIndex: number
  currentPage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
}) {
  return (
    <div className="bg-admin-surface rounded-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-5 py-4 border-b border-admin">
        <h3 className="font-heading font-bold text-sm text-foreground">Recent Transactions</h3>
        <TransactionFilters
          search={search}
          setSearch={setSearch}
          range={range}
          setRange={setRange}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />
        {exportingPdf && (
          <div className="text-xs text-admin-40">
            {formatRangeLabel(range)} · {formatStatusLabel(statusFilter)} · {formatTypeLabel(typeFilter)}
            {search.trim() ? ` · Search: "${search.trim()}"` : ''}
          </div>
        )}
      </div>

      <div className={exportingPdf ? 'overflow-x-auto' : 'overflow-x-auto min-h-[300px] overflow-y-auto'}>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-admin">
              {([
                { key: 'id', label: 'Transaction' },
                { key: 'date', label: 'Date' },
                { key: 'customer', label: 'Customer' },
                { key: 'type', label: 'Type' },
                { key: 'method', label: 'Method' },
                { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' },
              ] as Array<{ key: TransactionSortKey; label: string }>).map(h => {
                const active = sortKey === h.key
                return (
                  <th key={h.key} className="text-left text-xs text-admin-30 font-medium px-5 py-3 whitespace-nowrap">
                    <SortableHeader
                      label={h.label}
                      active={active}
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
                )
              })}
            </tr>
          </thead>
          <tbody>
            {transactionsForDisplay.length ? (
              transactionsForDisplay.map(t => {
                const statusClass =
                  t.status === 'completed'
                    ? 'bg-green-500/20 text-green-600 border-green-500/30'
                    : t.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                      : t.status === 'refunded'
                        ? 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/30'
                        : 'bg-red-500/20 text-red-500 border-red-500/30'

                const typeLabel =
                  t.type === 'ticket'
                    ? 'Tickets'
                    : t.type === 'menu_item'
                      ? 'Menu Items'
                      : t.type === 'payout'
                        ? 'Payouts'
                        : 'Refunds'

                return (
                  <tr key={t.id} className="border-b border-admin last:border-b-0">
                    <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">{t.id}</td>
                    <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{formatTransactionDate(t.date)}</td>
                    <td className="px-5 py-4 text-admin-70 whitespace-nowrap">{t.customer}</td>
                    <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{typeLabel}</td>
                    <td className="px-5 py-4 text-admin-50 whitespace-nowrap">{t.method}</td>
                    <td className="px-5 py-4 font-mono text-admin-70 whitespace-nowrap">Ksh {t.amount.toLocaleString()}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={`rounded-full text-xs px-2 py-0.5 ${statusClass}`}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-admin-40">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-admin no-print">
        <p className="text-xs text-admin-40">
          {totalTransactions === 0 ? 'Showing 0 of 0' : `Showing ${pageStartIndex + 1}-${pageEndIndex} of ${totalTransactions}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevPage}
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
            onClick={onNextPage}
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
