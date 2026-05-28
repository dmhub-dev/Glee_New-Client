export type Trend = 'up' | 'down'

export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded'
export type TransactionType = 'ticket' | 'menu_item' | 'payout' | 'refund'

export type TimeRange = 'today' | 'this_week' | 'this_month' | 'this_year'

export type TransactionRow = {
  id: string
  date: string
  customer: string
  type: TransactionType
  method: string
  amount: number
  status: TransactionStatus
}

export type TransactionSortKey = 'id' | 'date' | 'customer' | 'type' | 'method' | 'amount' | 'status'
export type SortDir = 'asc' | 'desc'

export type TransactionStatusFilter = 'all' | TransactionStatus
export type TransactionTypeFilter = 'all' | TransactionType

export type MenuBreakdownRow = { name: string; value: number }

export type DailyEarningsRow = { day: string; earnings: number }
export type DailyTicketsSoldRow = { day: string; sold: number }

export type HighestSellingEvent = { id: string; title: string; sold: number }
