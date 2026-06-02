import { useQuery } from '@tanstack/react-query'
import type { MockActivity, MockBooking } from '../mock/stats'
import { apiFetch } from '../../api/client'

export const adminStatsKeys = {
  dashboard: ['admin', 'stats', 'dashboard'] as const,
  overview: (upcomingLimit: number) => ['admin', 'stats', 'dashboard', 'overview', upcomingLimit] as const,
  stats: ['admin', 'stats', 'dashboard', 'stats'] as const,
  recentSales: (limit: number) => ['admin', 'stats', 'dashboard', 'recent-sales', limit] as const,
  revenueSeries: (days: number) => ['admin', 'stats', 'dashboard', 'revenue-series', days] as const,
}

type DashboardStatsUi = {
  upcomingEvents: number
  upcomingEventsDelta: number
  totalBookings: number
  totalBookingsDelta: number
  ticketsSold: number
  ticketsSoldDelta: number
}

type RevenueChartRowUi = { month: string; revenue: number; profit: number }
type RevenueSeriesRow = { date: string; revenue: number; profit?: number | null }

function asNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

function pick<T>(v: T | undefined | null, fallback: T): T {
  return v === undefined || v === null ? fallback : v
}

function unwrapData<T>(res: unknown): T {
  if (res && typeof res === 'object') {
    const anyRes = res as { data?: unknown }
    if (anyRes.data !== undefined) return anyRes.data as T
  }
  return res as T
}

function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short' })
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getDashboardStats(): Promise<DashboardStatsUi> {
  const res = await apiFetch<unknown>('/api/v1/common-api/dashboard/stats')
  const data = unwrapData<Record<string, unknown>>(res) ?? {}
  const stats = (data.stats as Record<string, unknown> | undefined) ?? data

  return {
    upcomingEvents: asNumber(
      (stats.upcomingEvents ?? stats.upcoming_events ?? stats.upcomingEventsCount ?? stats.upcoming_events_count) as unknown,
    ),
    upcomingEventsDelta: 0,
    totalBookings: asNumber(
      (stats.totalBookings ?? stats.total_bookings ?? stats.bookings ?? stats.totalBookingsCount ?? stats.total_bookings_count) as unknown,
    ),
    totalBookingsDelta: 0,
    ticketsSold: asNumber(
      (stats.ticketsSold ?? stats.tickets_sold ?? stats.ticketsSoldCount ?? stats.tickets_sold_count) as unknown,
    ),
    ticketsSoldDelta: 0,
  }
}

export async function getDashboardOverview(upcomingLimit = 6): Promise<Record<string, unknown>> {
  const res = await apiFetch<unknown>(`/api/v1/common-api/dashboard/overview?upcomingLimit=${upcomingLimit}`)
  return unwrapData<Record<string, unknown>>(res) ?? {}
}

export async function getDashboardRecentSales(limit = 10): Promise<unknown[]> {
  const res = await apiFetch<unknown>(`/api/v1/common-api/dashboard/recent-sales?limit=${limit}`)
  const data = unwrapData<unknown>(res)
  return Array.isArray(data) ? data : Array.isArray((data as any)?.recentSales) ? (data as any).recentSales : []
}

export async function getDashboardRevenueSeries(days = 30): Promise<RevenueSeriesRow[]> {
  const res = await apiFetch<unknown>(`/api/v1/common-api/dashboard/revenue?days=${days}`)
  const data = unwrapData<unknown>(res)
  const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.series) ? (data as any).series : []
  return rows
    .map((r: any): RevenueSeriesRow => ({
      date: String(r?.date ?? r?.day ?? r?.createdAt ?? r?.created_at ?? ''),
      revenue: asNumber(r?.revenue ?? r?.amount ?? r?.totalRevenue ?? r?.total_revenue ?? r?.value),
      profit: r?.profit !== undefined ? asNumber(r?.profit) : undefined,
    }))
    .filter((r: RevenueSeriesRow) => !!r.date)
}

export async function getRevenueChartMonths(months = 8): Promise<RevenueChartRowUi[]> {
  const days = Math.max(30, months * 31)
  const series = await getDashboardRevenueSeries(days)

  const now = new Date()
  const monthStarts: Date[] = Array.from({ length: months }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - idx), 1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const buckets = new Map<string, { revenue: number; profit: number }>()
  for (const d of monthStarts) {
    buckets.set(monthKey(d), { revenue: 0, profit: 0 })
  }

  for (const row of series) {
    const d = new Date(row.date)
    if (Number.isNaN(d.getTime())) continue
    const key = monthKey(d)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.revenue += asNumber(row.revenue)
    bucket.profit += asNumber(row.profit)
  }

  return monthStarts.map(d => {
    const bucket = buckets.get(monthKey(d)) ?? { revenue: 0, profit: 0 }
    return { month: monthLabel(d), revenue: Math.round(bucket.revenue), profit: Math.round(bucket.profit) }
  })
}

export async function getRecentBookings(limit = 10): Promise<MockBooking[]> {
  const rows = await getDashboardRecentSales(limit)
  return rows.map((sale: any, idx: number) => {
    const payment = sale?.payment ?? {}
    const user = sale?.user ?? sale?.customer ?? {}
    const event = sale?.event ?? {}
    const statusRaw = String(payment?.status ?? sale?.status ?? '').toLowerCase()
    const status: MockBooking['status'] =
      statusRaw.includes('pending') || statusRaw.includes('process')
        ? 'pending'
        : statusRaw.includes('cancel') || statusRaw.includes('fail') || statusRaw.includes('refund')
          ? 'cancelled'
          : 'confirmed'

    const qty = asNumber(sale?.qty ?? sale?.quantity ?? sale?.ticketQuantity ?? sale?.ticket_quantity ?? 1)
    return {
      id: String(sale?.id ?? payment?.reference ?? payment?.id ?? `SALE-${idx + 1}`),
      date: String(sale?.createdAt ?? sale?.created_at ?? payment?.createdAt ?? payment?.created_at ?? new Date().toISOString()),
      customerName: String(user?.name ?? `${pick(user?.firstName, '')} ${pick(user?.lastName, '')}`.trim() ?? user?.email ?? 'Customer'),
      event: String(event?.title ?? sale?.eventTitle ?? sale?.event_title ?? 'Event'),
      qty: qty > 0 ? qty : 1,
      amount: asNumber(payment?.amount ?? sale?.amount ?? sale?.totalAmount ?? sale?.total_amount),
      status,
    }
  })
}

export async function getActivityFeed(upcomingLimit = 6): Promise<MockActivity[]> {
  const overview = await getDashboardOverview(upcomingLimit)
  const recentSales = Array.isArray((overview as any).recentSales) ? (overview as any).recentSales : []
  const topEvents = Array.isArray((overview as any).topEvents) ? (overview as any).topEvents : []
  const upcomingEvents = Array.isArray((overview as any).upcomingEvents) ? (overview as any).upcomingEvents : []

  const items: MockActivity[] = []

  for (const sale of recentSales) {
    const eventTitle = String(sale?.event?.title ?? sale?.eventTitle ?? sale?.event_title ?? 'Event')
    const who = String(sale?.user?.name ?? sale?.user?.email ?? sale?.customerName ?? 'A customer')
    items.push({
      id: String(sale?.id ?? sale?.payment?.id ?? `sale-${items.length + 1}`),
      type: 'confirmed_booking',
      description: `${who} bought tickets for "${eventTitle}"`,
      timestamp: String(sale?.createdAt ?? sale?.created_at ?? sale?.payment?.createdAt ?? sale?.payment?.created_at ?? new Date().toISOString()),
    })
  }

  for (const ev of upcomingEvents) {
    const title = String(ev?.title ?? 'Upcoming event')
    const when = String(ev?.startDate ?? ev?.start_date ?? ev?.date ?? '')
    items.push({
      id: String(ev?.id ?? `upcoming-${items.length + 1}`),
      type: 'approved_event',
      description: when ? `Upcoming: "${title}" on ${when}` : `Upcoming: "${title}"`,
      timestamp: String(ev?.startDate ?? ev?.start_date ?? new Date().toISOString()),
    })
  }

  for (const ev of topEvents) {
    const title = String(ev?.title ?? 'Event')
    const sold = asNumber(ev?.ticketsSold ?? ev?.tickets_sold ?? ev?.sold ?? ev?.count)
    items.push({
      id: String(ev?.id ?? `top-${items.length + 1}`),
      type: 'updated_tickets',
      description: `"${title}" is top-selling this month (${sold.toLocaleString()} tickets)`,
      timestamp: new Date().toISOString(),
    })
  }

  return items
    .filter(i => i.description)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)
}

export function useDashboardStats() {
  return useQuery({ queryKey: adminStatsKeys.stats, queryFn: getDashboardStats })
}

export function useRevenueChart() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'revenue'], queryFn: () => getRevenueChartMonths(8) })
}

export function useRecentBookings() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'bookings'], queryFn: () => getRecentBookings(10) })
}

export function useActivity() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'activity'], queryFn: () => getActivityFeed(6) })
}

export function useDashboardOverview(upcomingLimit = 6) {
  return useQuery({
    queryKey: adminStatsKeys.overview(upcomingLimit),
    queryFn: () => getDashboardOverview(upcomingLimit),
  })
}

export function useDashboardRecentSales(limit = 10) {
  return useQuery({
    queryKey: adminStatsKeys.recentSales(limit),
    queryFn: () => getDashboardRecentSales(limit),
  })
}

export function useDashboardRevenueSeries(days = 30) {
  return useQuery({
    queryKey: adminStatsKeys.revenueSeries(days),
    queryFn: () => getDashboardRevenueSeries(days),
  })
}
