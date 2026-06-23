import { Banknote } from 'lucide-react'
import { AdminAnalyticsCard } from '../../../components/admin/AdminAnalyticsCard'
import type { Trend } from '../types'

export default function StatCard({
  label,
  value,
  trend,
  trendPct,
}: {
  label: string
  value: number
  trend: Trend
  trendPct?: number | null
}) {
  const trendText =
    trendPct === null || trendPct === undefined ? null : `${trend === 'up' ? '+' : '-'}${Math.abs(trendPct).toFixed(2)} %`

  return (
    <AdminAnalyticsCard
      label={label}
      value={`Ksh ${value.toLocaleString()}`}
      icon={Banknote}
      trend={trendText ? { direction: trend, label: trendText } : null}
      showMenuIndicator
    />
  )
}
