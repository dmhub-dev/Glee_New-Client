import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@glee/ui'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { TimeRange, TransactionStatusFilter, TransactionTypeFilter } from '../types'

export default function TransactionFilters({
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
}: {
  search: string
  setSearch: (v: string) => void
  range: TimeRange
  setRange: (v: TimeRange) => void
  statusFilter: TransactionStatusFilter
  setStatusFilter: (v: TransactionStatusFilter) => void
  typeFilter: TransactionTypeFilter
  setTypeFilter: (v: TransactionTypeFilter) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean | ((prev: boolean) => boolean)) => void
}) {
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto no-print">
      <div className="relative flex-1 sm:flex-none sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm bg-admin-input border-admin rounded-full focus-visible:ring-neon-pink/30 text-foreground placeholder:text-admin-30"
        />
      </div>
      <button
        type="button"
        onClick={() => setFiltersOpen(o => !o)}
        className="h-9 w-9 flex items-center justify-center rounded-full bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#7C3AED] transition-colors shrink-0"
        aria-label="Filters"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>
      {filtersOpen && (
        <>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as TransactionStatusFilter)}>
            <SelectTrigger className="h-9 w-[140px] bg-admin-input border-admin rounded-full text-foreground">
              <SelectValue placeholder="Any Status" />
            </SelectTrigger>
            <SelectContent className="bg-admin-surface border-admin">
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TransactionTypeFilter)}>
            <SelectTrigger className="h-9 w-[140px] bg-admin-input border-admin rounded-full text-foreground">
              <SelectValue placeholder="Any Type" />
            </SelectTrigger>
            <SelectContent className="bg-admin-surface border-admin">
              <SelectItem value="all">Any Type</SelectItem>
              <SelectItem value="ticket">Tickets</SelectItem>
              <SelectItem value="menu_item">Menu Items</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
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
  )
}
