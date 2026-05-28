import { useEffect, useMemo, useState } from 'react'
import { useDashboardOverview, useDashboardRecentSales, useDashboardRevenueSeries } from '../../../lib/queries/stats'
import type {
  DailyEarningsRow,
  DailyTicketsSoldRow,
  HighestSellingEvent,
  MenuBreakdownRow,
  TimeRange,
  TransactionRow,
  Trend,
} from '../types'
import { asNumber, daysForRange, formatDayLabel, normalizePaymentStatus, normalizeTransactionType } from '../utils'

export function useFinancialMetrics() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(6)
  const { data: recentSalesRaw, isLoading: recentSalesLoading } = useDashboardRecentSales(200)

  const [earningsRange, setEarningsRange] = useState<TimeRange>('this_week')
  const [ticketsSoldRange, setTicketsSoldRange] = useState<TimeRange>('this_week')

  const earningsDays = daysForRange(earningsRange)
  const ticketsTrendDays = daysForRange(ticketsSoldRange)

  const { data: earningsSeriesRaw, isLoading: earningsSeriesLoading } = useDashboardRevenueSeries(earningsDays)
  const { data: trendSeriesRaw } = useDashboardRevenueSeries(14)

  useEffect(() => {
    console.log('[financials] /dashboard/revenue response', { earningsRange, days: earningsDays, earningsSeriesRaw })
  }, [earningsDays, earningsRange, earningsSeriesRaw])

  useEffect(() => {
    console.log('[financials] /dashboard/overview response', overview)
  }, [overview])

  const overviewStats = useMemo(() => {
    const o: any = overview ?? {}
    return (o.stats ?? o) as Record<string, unknown>
  }, [overview])

  const overviewPayments = useMemo(() => {
    const o: any = overview ?? {}
    return (o.payments ?? {}) as Record<string, unknown>
  }, [overview])

  const transactions = useMemo((): TransactionRow[] => {
    const rows = (Array.isArray(recentSalesRaw) ? recentSalesRaw : []) as any[]
    return rows.map((sale: any, idx: number): TransactionRow => {
      const payment = sale?.payment ?? sale?.transaction ?? {}
      const user = sale?.user ?? sale?.customer ?? {}
      const status = normalizePaymentStatus(payment?.status ?? sale?.status)
      const type = normalizeTransactionType(sale?.type ?? sale?.itemType ?? sale?.item_type ?? payment?.type)

      const nameRaw = typeof user?.name === 'string' ? user.name.trim() : ''
      const first = typeof user?.firstName === 'string' ? user.firstName.trim() : ''
      const last = typeof user?.lastName === 'string' ? user.lastName.trim() : ''
      const fullName = `${first} ${last}`.trim()
      const emailRaw = typeof user?.email === 'string' ? user.email.trim() : ''
      const customer = nameRaw || fullName || emailRaw || 'Customer'

      return {
        id: String(sale?.id ?? payment?.reference ?? payment?.id ?? `SALE-${idx + 1}`),
        date: String(sale?.createdAt ?? sale?.created_at ?? payment?.createdAt ?? payment?.created_at ?? new Date().toISOString()),
        customer,
        type,
        method: String(payment?.method ?? payment?.provider ?? payment?.channel ?? sale?.paymentMethod ?? sale?.payment_method ?? '—'),
        amount: asNumber(payment?.amount ?? sale?.amount ?? sale?.totalAmount ?? sale?.total_amount),
        status,
      }
    })
  }, [recentSalesRaw])

  const ticketEarnings = useMemo(() => {
    const direct = asNumber(
      (overviewStats as any).totalTicketEarnings ??
        (overviewStats as any).ticketEarnings ??
        (overviewStats as any).ticketRevenue ??
        (overviewStats as any).total_ticket_earnings ??
        (overviewStats as any).ticket_earnings ??
        (overviewStats as any).ticket_revenue,
    )
    if (direct > 0) return direct
    return transactions
      .filter((t: TransactionRow) => t.type === 'ticket' && t.status === 'completed')
      .reduce((s: number, t: TransactionRow) => s + (t.amount ?? 0), 0)
  }, [overviewStats, transactions])

  const menuItemsEarnings = useMemo(() => {
    const direct = asNumber(
      (overviewStats as any).totalMenuItemsEarnings ??
        (overviewStats as any).menuItemsEarnings ??
        (overviewStats as any).menuItemsRevenue ??
        (overviewStats as any).total_menu_items_earnings ??
        (overviewStats as any).menu_items_earnings ??
        (overviewStats as any).menu_items_revenue,
    )
    if (direct > 0) return direct
    const total = asNumber(
      (overviewStats as any).totalEarning ??
        (overviewStats as any).total_earning ??
        (overviewStats as any).earning ??
        (overviewStats as any).totalEarnings ??
        (overviewStats as any).total_earnings ??
        (overviewPayments as any).totalRevenue ??
        (overviewPayments as any).total_revenue,
    )
    const derived = total > 0 ? Math.max(0, total - ticketEarnings) : 0
    return derived
  }, [overviewPayments, overviewStats, ticketEarnings])

  const totals = useMemo(() => {
    const earnings = asNumber(
      (overviewStats as any).totalEarning ??
        (overviewStats as any).total_earning ??
        (overviewStats as any).earning ??
        (overviewStats as any).totalEarnings ??
        (overviewStats as any).total_earnings ??
        (overviewPayments as any).totalRevenue ??
        (overviewPayments as any).total_revenue,
    )
    return { earnings, profit: 0 }
  }, [overviewPayments, overviewStats])

  const ticketsSold = useMemo(() => {
    const direct = asNumber(
      (overviewStats as any).ticketsSold ??
        (overviewStats as any).tickets_sold ??
        (overviewStats as any).ticketsSoldCount ??
        (overviewStats as any).tickets_sold_count,
    )
    if (direct > 0) return direct
    const rows = (Array.isArray(recentSalesRaw) ? recentSalesRaw : []) as any[]
    return rows.reduce(
      (s: number, sale: any) => s + asNumber(sale?.qty ?? sale?.quantity ?? sale?.ticketQuantity ?? sale?.ticket_quantity ?? 1),
      0,
    )
  }, [overviewStats, recentSalesRaw])

  const averageTicketPrice = useMemo(() => {
    if (ticketsSold <= 0) return 0
    return ticketEarnings / ticketsSold
  }, [ticketEarnings, ticketsSold])

  const highestSellingEvent = useMemo((): HighestSellingEvent | null => {
    const topEvents: any[] = Array.isArray((overview as any)?.topEvents) ? ((overview as any).topEvents as any[]) : []
    const first = topEvents[0]
    if (!first) return null
    const sold = asNumber(first?.ticketsSold ?? first?.tickets_sold ?? first?.sold ?? first?.count)
    return { id: String(first?.id ?? 'top'), title: String(first?.title ?? '—'), sold }
  }, [overview])

  const trends = useMemo(() => {
    const rows = (trendSeriesRaw ?? []).filter(r => !!(r as any)?.date) as any[]
    if (rows.length < 2) return { earningsTrend: null as number | null }

    const prev = rows[rows.length - 2]
    const curr = rows[rows.length - 1]

    const prevEarnings = asNumber(prev?.revenue)
    const currEarnings = asNumber(curr?.revenue)
    const earningsPct = prevEarnings > 0 ? ((currEarnings - prevEarnings) / prevEarnings) * 100 : null
    return { earningsTrend: earningsPct }
  }, [trendSeriesRaw])

  const earningsTrendDir: Trend = trends.earningsTrend !== null && trends.earningsTrend < 0 ? 'down' : 'up'

  const dailyEarnings = useMemo((): DailyEarningsRow[] => {
    if (earningsRange === 'this_year') {
      const series = (earningsSeriesRaw ?? []) as any[]
      const buckets = new Map<string, number>()
      for (const row of series) {
        const d = new Date(String(row?.date ?? ''))
        if (Number.isNaN(d.getTime())) continue
        const label = d.toLocaleString('en-US', { month: 'short' })
        buckets.set(label, (buckets.get(label) ?? 0) + asNumber(row?.revenue))
      }
      const months = Array.from({ length: 12 }, (_, i) =>
        new Date(new Date().getFullYear(), i, 1).toLocaleString('en-US', { month: 'short' }),
      )
      return months.map(m => ({ day: m, earnings: Math.round(buckets.get(m) ?? 0) }))
    }

    const days = earningsDays
    const series = (earningsSeriesRaw ?? []) as any[]
    const byDay = new Map<string, number>()
    for (const row of series) {
      const key = String(row?.date ?? '')
      if (!key) continue
      byDay.set(key.slice(0, 10), asNumber(row?.revenue))
    }

    const today = new Date()
    return Array.from({ length: days }, (_, idx) => {
      const i = days - 1 - idx
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const earnings = Math.round(byDay.get(key) ?? 0)
      return { day: formatDayLabel(key, days), earnings }
    })
  }, [earningsDays, earningsRange, earningsSeriesRaw])

  const dailyTicketsSoldTrend = useMemo((): DailyTicketsSoldRow[] => {
    const rows = (Array.isArray(recentSalesRaw) ? recentSalesRaw : []) as any[]

    if (ticketsSoldRange === 'this_year') {
      const buckets = new Map<string, number>()
      for (const sale of rows) {
        const d = new Date(String(sale?.createdAt ?? sale?.created_at ?? sale?.payment?.createdAt ?? sale?.payment?.created_at ?? ''))
        if (Number.isNaN(d.getTime())) continue
        const label = d.toLocaleString('en-US', { month: 'short' })
        const qty = asNumber(sale?.qty ?? sale?.quantity ?? sale?.ticketQuantity ?? sale?.ticket_quantity ?? 1)
        buckets.set(label, (buckets.get(label) ?? 0) + qty)
      }
      const months = Array.from({ length: 12 }, (_, i) =>
        new Date(new Date().getFullYear(), i, 1).toLocaleString('en-US', { month: 'short' }),
      )
      return months.map(m => ({ day: m, sold: Math.round(buckets.get(m) ?? 0) }))
    }

    const byDay = new Map<string, number>()
    for (const sale of rows) {
      const dt = String(sale?.createdAt ?? sale?.created_at ?? sale?.payment?.createdAt ?? sale?.payment?.created_at ?? '')
      if (!dt) continue
      const key = dt.slice(0, 10)
      const qty = asNumber(sale?.qty ?? sale?.quantity ?? sale?.ticketQuantity ?? sale?.ticket_quantity ?? 1)
      byDay.set(key, (byDay.get(key) ?? 0) + qty)
    }

    const today = new Date()
    return Array.from({ length: ticketsTrendDays }, (_, idx) => {
      const i = ticketsTrendDays - 1 - idx
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      return { day: formatDayLabel(key, ticketsTrendDays), sold: Math.round(byDay.get(key) ?? 0) }
    })
  }, [recentSalesRaw, ticketsSoldRange, ticketsTrendDays])

  const menuRevenueDonut = useMemo((): MenuBreakdownRow[] => {
    const raw = (overview as any)?.menuItemsBreakdown ?? (overview as any)?.menuRevenueByCategory ?? (overview as any)?.menu_items_breakdown
    console.log('[financials] menu breakdown raw (from overview)', raw)
    const parsed: MenuBreakdownRow[] = []

    if (Array.isArray(raw)) {
      for (const r of raw) {
        const nameRaw = String((r as any)?.name ?? (r as any)?.category ?? (r as any)?.label ?? 'Other').trim()
        const name = nameRaw || 'Other'
        const value = asNumber((r as any)?.value ?? (r as any)?.revenue ?? (r as any)?.amount ?? (r as any)?.total)
        parsed.push({ name, value })
      }
    } else if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        parsed.push({ name: String(k).trim() || 'Other', value: asNumber(v) })
      }
    }

    const sorted = parsed.sort((a, b) => b.value - a.value)
    if (sorted.length <= 5) {
      const result = sorted.length ? sorted : [{ name: 'Other', value: Math.max(0, menuItemsEarnings) }]
      console.log('[financials] menu breakdown parsed', { parsed, result })
      return result
    }

    const top = sorted.slice(0, 4)
    const rest = sorted.slice(4)
    const restTotal = rest.reduce((s, r) => s + r.value, 0)
    const withOther = restTotal > 0 ? [...top, { name: 'Other', value: restTotal }] : top
    const result = withOther.length ? withOther : [{ name: 'Other', value: Math.max(0, menuItemsEarnings) }]
    console.log('[financials] menu breakdown parsed', { parsed, result })
    return result
  }, [menuItemsEarnings, overview])

  return {
    overviewLoading,
    recentSalesLoading,
    earningsSeriesLoading,
    totals,
    ticketEarnings,
    menuItemsEarnings,
    ticketsSold,
    averageTicketPrice,
    highestSellingEvent,
    trends,
    earningsTrendDir,
    earningsRange,
    setEarningsRange,
    dailyEarnings,
    menuRevenueDonut,
    ticketsSoldRange,
    setTicketsSoldRange,
    dailyTicketsSoldTrend,
    transactions,
  }
}
