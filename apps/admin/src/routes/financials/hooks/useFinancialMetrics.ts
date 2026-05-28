import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api/client'
import type {
  DailyEarningsRow,
  DailyTicketsSoldRow,
  HighestSellingEvent,
  MenuBreakdownRow,
  MonthlyTrendRow,
  PayoutRow,
  RevenueSeriesRow,
  TimeRange,
  TransactionRow,
  Trend,
} from '../types'
import { asNumber, daysForRange, formatDayLabel, normalizePaymentStatus, normalizeTransactionType } from '../utils'

const financialsKeys = {
  overview: (range: TimeRange, upcomingLimit: number, recentSalesLimit: number) =>
    ['admin', 'financials', 'overview', range, upcomingLimit, recentSalesLimit] as const,
  recentSales: (limit: number) => ['admin', 'financials', 'recent-sales', limit] as const,
  revenue: (days: number) => ['admin', 'financials', 'revenue', days] as const,
  dailyEarnings: (range: TimeRange) => ['admin', 'financials', 'daily-earnings', range] as const,
  ticketRevenue: (range: TimeRange) => ['admin', 'financials', 'ticket-revenue', range] as const,
  highestSellingEvent: (range: TimeRange) => ['admin', 'financials', 'highest-selling-event', range] as const,
  recentPayouts: (limit: number) => ['admin', 'financials', 'recent-payouts', limit] as const,
  monthlyTrend: (months: number) => ['admin', 'financials', 'monthly-trend', months] as const,
  revenueByRange: (range: TimeRange) => ['admin', 'financials', 'revenue', 'range', range] as const,
}

function unwrapData<T>(res: unknown): T {
  if (res && typeof res === 'object') {
    const anyRes = res as { data?: unknown }
    if (anyRes.data !== undefined) return anyRes.data as T
  }
  return res as T
}

async function getFinancialsOverview(range: TimeRange, upcomingLimit: number, recentSalesLimit: number) {
  const res = await apiFetch<unknown>(
    `/api/v1/financials/overview?range=${range}&upcomingLimit=${upcomingLimit}&recentSalesLimit=${recentSalesLimit}`,
  )
  return unwrapData<Record<string, unknown>>(res) ?? {}
}

async function getFinancialsRecentSales(limit: number) {
  const res = await apiFetch<unknown>(`/api/v1/financials/recent-sales?limit=${limit}`)
  const data = unwrapData<unknown>(res)
  return Array.isArray(data) ? data : Array.isArray((data as any)?.recentSales) ? (data as any).recentSales : []
}

async function getFinancialsRevenue(days = 14) {
  const res = await apiFetch<unknown>(`/api/v1/financials/revenue?days=${days}`)
  return normalizeRevenueSeriesResponse(res)
}

async function getFinancialsRevenueByRange(range: TimeRange) {
  const res = await apiFetch<unknown>(`/api/v1/financials/revenue?range=${range}`)
  return normalizeRevenueSeriesResponse(res)
}

function normalizeRevenueSeriesResponse(res: unknown): RevenueSeriesRow[] {
  const data = unwrapData<any>(res)
  const container = data?.data !== undefined ? data.data : data
  const rows =
    Array.isArray(container) ? container : Array.isArray(container?.data) ? container.data : Array.isArray(container?.series) ? container.series : []
  return rows
    .map((r: any): RevenueSeriesRow => ({
      date: String(r?.date ?? r?.day ?? r?.createdAt ?? r?.created_at ?? ''),
      revenue: asNumber(r?.revenue ?? r?.earnings ?? r?.amount ?? r?.totalRevenue ?? r?.total_revenue ?? r?.value),
      profit: r?.profit !== undefined ? asNumber(r?.profit) : undefined,
    }))
    .filter((r: RevenueSeriesRow) => !!r.date)
}

async function getFinancialsDailyEarnings(range: TimeRange) {
  const res = await apiFetch<unknown>(`/api/v1/financials/daily-earnings?range=${range}`)
  const data = unwrapData<unknown>(res)
  const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.series) ? (data as any).series : []
  return rows
    .map((r: any) => ({
      date: String(r?.date ?? r?.day ?? r?.createdAt ?? r?.created_at ?? ''),
      ticketEarnings: asNumber(r?.ticketEarnings ?? r?.ticketRevenue ?? r?.ticket_revenue ?? r?.ticket_earnings),
      menuEarnings: asNumber(r?.menuEarnings ?? r?.menuRevenue ?? r?.menu_revenue ?? r?.menu_earnings),
      ticketsSold: asNumber(r?.ticketsSold ?? r?.tickets_sold),
      earnings: asNumber(r?.earnings ?? r?.revenue ?? r?.amount ?? r?.total ?? r?.value),
    }))
    .filter((r: any) => !!r.date)
}

async function getFinancialsTicketRevenue(range: TimeRange): Promise<number> {
  const res = await apiFetch<unknown>(`/api/v1/financials/ticket-revenue?range=${range}`)
  const data = unwrapData<any>(res)
  return asNumber(data?.ticketRevenue ?? data?.ticket_revenue ?? data?.revenue ?? data?.amount ?? data?.total ?? data?.value ?? data)
}

async function getFinancialsHighestSellingEvent(range: TimeRange): Promise<HighestSellingEvent | null> {
  const res = await apiFetch<unknown>(`/api/v1/financials/highest-selling-event?range=${range}`)
  const data = unwrapData<any>(res)
  if (!data) return null

  const event = data?.event ?? data?.highestSellingEvent ?? data?.highest_selling_event ?? data
  const id = String(event?.id ?? event?._id ?? data?.id ?? data?._id ?? '')
  const title = String(event?.title ?? event?.name ?? data?.title ?? data?.name ?? '').trim()
  const sold = asNumber(event?.ticketsSold ?? event?.tickets_sold ?? event?.sold ?? event?.count ?? data?.ticketsSold ?? data?.tickets_sold)

  if (!id && !title) return null
  return { id: id || title || 'top', title: title || '—', sold }
}

async function getFinancialsRecentPayouts(limit: number) {
  const res = await apiFetch<unknown>(`/api/v1/financials/recent-payouts?limit=${limit}`)
  const data = unwrapData<unknown>(res)
  return Array.isArray(data) ? data : Array.isArray((data as any)?.recentPayouts) ? (data as any).recentPayouts : []
}

async function getFinancialsMonthlyTrend(months = 12): Promise<MonthlyTrendRow[]> {
  const res = await apiFetch<unknown>(`/api/v1/financials/monthly-trend?months=${months}`)
  const data = unwrapData<any>(res)
  const container = data?.data !== undefined ? data.data : data
  const rows = Array.isArray(container) ? container : Array.isArray(container?.data) ? container.data : []
  return rows.map((r: any): MonthlyTrendRow => {
    return {
      month: String(r?.month ?? r?.key ?? ''),
      earnings: asNumber(r?.earnings ?? r?.revenue ?? r?.totalRevenue ?? r?.total_revenue),
      payouts: asNumber(r?.payouts ?? r?.totalPayouts ?? r?.total_payouts),
      pendingPayouts: asNumber(r?.pendingPayouts ?? r?.pending_payouts),
      balance: asNumber(r?.balance ?? (asNumber(r?.earnings ?? r?.revenue) - asNumber(r?.payouts))),
      ticketsSold: asNumber(r?.ticketsSold ?? r?.tickets_sold),
      ticketRevenue: asNumber(r?.ticketRevenue ?? r?.ticket_revenue ?? r?.ticketEarnings ?? r?.ticket_earnings),
      menuRevenue: asNumber(r?.menuRevenue ?? r?.menu_revenue ?? r?.menuEarnings ?? r?.menu_earnings),
    }
  })
}

export function useFinancialMetrics() {
  const overviewRange: TimeRange = 'this_month'
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: financialsKeys.overview(overviewRange, 6, 200),
    queryFn: () => getFinancialsOverview(overviewRange, 6, 200),
  })

  const { data: recentSalesRaw, isLoading: recentSalesLoading } = useQuery({
    queryKey: financialsKeys.recentSales(200),
    queryFn: () => getFinancialsRecentSales(200),
  })

  const { data: ticketRevenueRaw } = useQuery({
    queryKey: financialsKeys.ticketRevenue(overviewRange),
    queryFn: () => getFinancialsTicketRevenue(overviewRange),
  })

  const { data: highestSellingEventRaw } = useQuery({
    queryKey: financialsKeys.highestSellingEvent(overviewRange),
    queryFn: () => getFinancialsHighestSellingEvent(overviewRange),
  })

  const { data: recentPayoutsRaw } = useQuery({
    queryKey: financialsKeys.recentPayouts(50),
    queryFn: () => getFinancialsRecentPayouts(50),
  })

  const [earningsRange, setEarningsRange] = useState<TimeRange>('this_week')
  const [ticketsSoldRange, setTicketsSoldRange] = useState<TimeRange>('this_week')

  const earningsDays = daysForRange(earningsRange)
  const ticketsTrendDays = daysForRange(ticketsSoldRange)

  const { data: dailyEarningsRaw, isLoading: earningsSeriesLoading } = useQuery({
    queryKey: financialsKeys.dailyEarnings(earningsRange),
    queryFn: () => getFinancialsDailyEarnings(earningsRange),
  })

  const { data: trendSeriesRaw } = useQuery({
    queryKey: financialsKeys.revenue(14),
    queryFn: () => getFinancialsRevenue(14),
  })

  const [revenueTrendView, setRevenueTrendView] = useState<TimeRange>('this_year')

  const { data: monthlyTrendRaw } = useQuery({
    queryKey: financialsKeys.monthlyTrend(12),
    queryFn: () => getFinancialsMonthlyTrend(12),
  })

  const { data: weeklyRevenueRaw } = useQuery({
    queryKey: financialsKeys.revenueByRange('this_week'),
    queryFn: () => getFinancialsRevenueByRange('this_week'),
  })

  const overviewData = useMemo(() => {
    const o: any = overview ?? {}
    return (o.data ?? o) as Record<string, unknown>
  }, [overview])

  const overviewStats = useMemo(() => {
    const o: any = overviewData ?? {}
    return (o.stats ?? o) as Record<string, unknown>
  }, [overviewData])

  const overviewPayments = useMemo(() => {
    const o: any = overviewData ?? {}
    return (o.payments ?? {}) as Record<string, unknown>
  }, [overviewData])

  const payouts = useMemo(() => {
    const o: any = overviewData ?? {}
    return (o.payouts ?? {}) as Record<string, unknown>
  }, [overviewData])

  const admin = useMemo(() => {
    const o: any = overviewData ?? {}
    return (o.admin ?? {}) as Record<string, unknown>
  }, [overviewData])

  const payoutStats = useMemo(() => {
    const totalPayouts = asNumber((payouts as any).totalPayouts ?? (payouts as any).total_payouts)
    const pendingPayouts = asNumber((payouts as any).pendingPayouts ?? (payouts as any).pending_payouts)
    const payoutBalance = asNumber((payouts as any).payoutBalance ?? (payouts as any).payout_balance ?? totalPayouts)
    const totalRevenue = asNumber((payouts as any).totalRevenue ?? (payouts as any).total_revenue)
    return { totalPayouts, pendingPayouts, payoutBalance, totalRevenue }
  }, [payouts])

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

  const recentPayouts = useMemo((): PayoutRow[] => {
    const rows = (Array.isArray(recentPayoutsRaw) ? recentPayoutsRaw : []) as any[]
    return rows.map((p: any, idx: number): PayoutRow => {
      const payment = p?.payment ?? p
      const user = p?.user ?? payment?.user ?? {}
      const event = p?.event ?? payment?.event ?? {}

      const nameRaw = typeof user?.name === 'string' ? user.name.trim() : ''
      const first = typeof user?.firstName === 'string' ? user.firstName.trim() : ''
      const last = typeof user?.lastName === 'string' ? user.lastName.trim() : ''
      const fullName = `${first} ${last}`.trim()
      const emailRaw = typeof user?.email === 'string' ? user.email.trim() : ''
      const recipient = nameRaw || fullName || emailRaw || '—'

      const eventTitle = String(event?.title ?? p?.eventTitle ?? p?.event_title ?? '—')
      const payoutAmount = asNumber(p?.payoutAmount ?? p?.payout_amount ?? payment?.payoutAmount ?? payment?.payout_amount ?? payment?.amount)
      const ticketRevenue = asNumber(p?.ticketRevenue ?? p?.ticketEarnings ?? p?.ticket_revenue ?? p?.ticket_earnings)
      const menuRevenue = asNumber(p?.menuRevenue ?? p?.menuEarnings ?? p?.menu_revenue ?? p?.menu_earnings)
      const ticketsSold = asNumber(p?.ticketsSold ?? p?.tickets_sold)

      return {
        id: String(p?.id ?? payment?.id ?? payment?.reference ?? `PAYOUT-${idx + 1}`),
        date: String(p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? payment?.updatedAt ?? payment?.createdAt ?? new Date().toISOString()),
        recipient,
        event: eventTitle,
        payoutAmount,
        ticketRevenue,
        menuRevenue,
        ticketsSold,
      }
    })
  }, [recentPayoutsRaw])

  const ticketEarnings = useMemo(() => {
    const fromEndpoint = asNumber(ticketRevenueRaw)
    if (fromEndpoint > 0) return fromEndpoint
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
  }, [overviewStats, ticketRevenueRaw, transactions])

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
    if (highestSellingEventRaw) return highestSellingEventRaw
    const topEvents: any[] = Array.isArray((overviewData as any)?.topEvents) ? ((overviewData as any).topEvents as any[]) : []
    const first = topEvents[0]
    if (!first) return null
    const sold = asNumber(first?.ticketsSold ?? first?.tickets_sold ?? first?.sold ?? first?.count)
    return { id: String(first?.id ?? 'top'), title: String(first?.title ?? '—'), sold }
  }, [highestSellingEventRaw, overviewData])

  const trends = useMemo(() => {
    const rows = (trendSeriesRaw ?? []).filter((r: any) => !!r?.date) as any[]
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
    const days = earningsDays
    const series = (dailyEarningsRaw ?? []) as any[]
    const byDay = new Map<string, { ticketEarnings: number; menuEarnings: number; earnings: number }>()
    for (const row of series) {
      const key = String(row?.date ?? row?.day ?? '')
      if (!key) continue
      const ticketEarnings = asNumber(row?.ticketEarnings ?? row?.ticketRevenue ?? row?.ticket_revenue ?? row?.ticket_earnings)
      const menuEarnings = asNumber(row?.menuEarnings ?? row?.menuRevenue ?? row?.menu_revenue ?? row?.menu_earnings)
      const total = asNumber(row?.earnings ?? row?.total ?? row?.revenue ?? row?.amount ?? row?.value)
      const earnings = total > 0 ? total : ticketEarnings + menuEarnings
      byDay.set(key.slice(0, 10), { ticketEarnings, menuEarnings, earnings })
    }

    const today = new Date()
    return Array.from({ length: days }, (_, idx) => {
      const i = days - 1 - idx
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const found = byDay.get(key) ?? { ticketEarnings: 0, menuEarnings: 0, earnings: 0 }
      return {
        day: formatDayLabel(key, days),
        ticketEarnings: Math.round(found.ticketEarnings),
        menuEarnings: Math.round(found.menuEarnings),
        earnings: Math.round(found.earnings),
      }
    })
  }, [dailyEarningsRaw, earningsDays])

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
    const raw =
      (overviewData as any)?.menuItemsBreakdown ??
      (overviewData as any)?.menuRevenueByCategory ??
      (overviewData as any)?.menu_items_breakdown ??
      (overviewData as any)?.menu_items_revenue_by_category ??
      (overviewData as any)?.menuRevenueBreakdown
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
      return result
    }

    const top = sorted.slice(0, 4)
    const rest = sorted.slice(4)
    const restTotal = rest.reduce((s, r) => s + r.value, 0)
    const withOther = restTotal > 0 ? [...top, { name: 'Other', value: restTotal }] : top
    const result = withOther.length ? withOther : [{ name: 'Other', value: Math.max(0, menuItemsEarnings) }]
    return result
  }, [menuItemsEarnings, overviewData])

  return {
    overviewLoading,
    recentSalesLoading,
    earningsSeriesLoading,
    totals,
    ticketEarnings,
    menuItemsEarnings,
    payoutStats,
    admin,
    ticketsSold,
    averageTicketPrice,
    highestSellingEvent,
    trends,
    earningsTrendDir,
    earningsRange,
    setEarningsRange,
    dailyEarnings,
    revenueTrendView,
    setRevenueTrendView,
    monthlyTrendRaw,
    weeklyRevenueRaw,
    menuRevenueDonut,
    ticketsSoldRange,
    setTicketsSoldRange,
    dailyTicketsSoldTrend,
    transactions,
    recentPayouts,
  }
}
