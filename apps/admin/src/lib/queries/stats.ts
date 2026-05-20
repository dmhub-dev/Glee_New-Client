import { useQuery } from '@tanstack/react-query'
import { MOCK_DASHBOARD_STATS, MOCK_REVENUE_CHART, MOCK_RECENT_BOOKINGS, MOCK_ACTIVITY } from '../mock/stats'

export const adminStatsKeys = {
  dashboard: ['admin', 'stats', 'dashboard'] as const,
}

function fetchDashboardStats() {
  return new Promise<typeof MOCK_DASHBOARD_STATS>(resolve =>
    setTimeout(() => resolve(MOCK_DASHBOARD_STATS), 300)
  )
}

function fetchRevenueChart() {
  return new Promise<typeof MOCK_REVENUE_CHART>(resolve =>
    setTimeout(() => resolve(MOCK_REVENUE_CHART), 300)
  )
}

function fetchRecentBookings() {
  return new Promise<typeof MOCK_RECENT_BOOKINGS>(resolve =>
    setTimeout(() => resolve(MOCK_RECENT_BOOKINGS), 300)
  )
}

function fetchActivity() {
  return new Promise<typeof MOCK_ACTIVITY>(resolve =>
    setTimeout(() => resolve(MOCK_ACTIVITY), 300)
  )
}

export function useDashboardStats() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'stats'], queryFn: fetchDashboardStats })
}

export function useRevenueChart() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'revenue'], queryFn: fetchRevenueChart })
}

export function useRecentBookings() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'bookings'], queryFn: fetchRecentBookings })
}

export function useActivity() {
  return useQuery({ queryKey: [...adminStatsKeys.dashboard, 'activity'], queryFn: fetchActivity })
}
