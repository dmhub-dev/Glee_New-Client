import type { TimeRange, TransactionStatus, TransactionType } from './types'

export function asNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

export function formatTransactionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function withinTimeRange(dateStr: string, range: TimeRange): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (range === 'today') {
    return d >= today && d <= now
  }

  if (range === 'this_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return d >= from && d <= now
  }

  if (range === 'this_year') {
    const from = new Date(today.getFullYear(), 0, 1)
    return d >= from && d <= now
  }

  const day = today.getDay()
  const diffToMonday = (day + 6) % 7
  const from = new Date(today)
  from.setDate(from.getDate() - diffToMonday)
  return d >= from && d <= now
}

export function normalizePaymentStatus(raw: unknown): TransactionStatus {
  const s = String(raw ?? '').toLowerCase()
  if (!s) return 'completed'
  if (s.includes('refund')) return 'refunded'
  if (s.includes('pending') || s.includes('process')) return 'pending'
  if (s.includes('fail') || s.includes('cancel') || s.includes('declin') || s.includes('error')) return 'failed'
  if (s.includes('paid') || s.includes('success') || s.includes('complete') || s.includes('confirm')) return 'completed'
  return 'completed'
}

export function normalizeTransactionType(raw: unknown): TransactionType {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('menu')) return 'menu_item'
  if (s.includes('payout')) return 'payout'
  if (s.includes('refund')) return 'refund'
  return 'ticket'
}

export function daysForRange(r: TimeRange): number {
  if (r === 'today') return 1
  if (r === 'this_week') return 7
  if (r === 'this_month') return 30
  return 365
}

export function formatDayLabel(dateStr: string, rangeDays: number): string {
  if (rangeDays === 1) return 'Today'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export function formatRangeLabel(r: TimeRange): string {
  if (r === 'today') return 'Today'
  if (r === 'this_week') return 'This week'
  if (r === 'this_month') return 'This month'
  return 'This year'
}
