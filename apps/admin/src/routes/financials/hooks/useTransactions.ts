import { useEffect, useMemo, useState } from 'react'
import type {
  SortDir,
  TimeRange,
  TransactionRow,
  TransactionSortKey,
  TransactionStatusFilter,
  TransactionTypeFilter,
} from '../types'
import { PAGE_SIZE } from '../constants'
import { withinTimeRange } from '../utils'

export function useTransactions(transactions: TransactionRow[]) {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<TimeRange>('this_month')
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<TransactionSortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions
      .filter((t: TransactionRow) => withinTimeRange(t.date, range))
      .filter((t: TransactionRow) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .filter((t: TransactionRow) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t: TransactionRow) =>
        q === '' ||
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.method.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        String(t.amount).includes(q),
      )
  }, [range, search, statusFilter, transactions, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [range, search, statusFilter, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [sortDir, sortKey])

  const sortedTransactions = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const rows = [...filteredTransactions]
    rows.sort((a, b) => {
      if (sortKey === 'amount') return (a.amount - b.amount) * dir
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      const aVal = String(a[sortKey] ?? '').toLowerCase()
      const bVal = String(b[sortKey] ?? '').toLowerCase()
      return aVal.localeCompare(bVal) * dir
    })
    return rows
  }, [filteredTransactions, sortDir, sortKey])

  const totalTransactions = sortedTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const pageEndIndex = Math.min(pageStartIndex + PAGE_SIZE, totalTransactions)
  const pagedTransactions = useMemo(() => {
    return sortedTransactions.slice(pageStartIndex, pageEndIndex)
  }, [pageEndIndex, pageStartIndex, sortedTransactions])

  return {
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
    page,
    setPage,
    totalTransactions,
    totalPages,
    currentPage,
    pageStartIndex,
    pageEndIndex,
    filteredTransactions,
    sortedTransactions,
    pagedTransactions,
  }
}
