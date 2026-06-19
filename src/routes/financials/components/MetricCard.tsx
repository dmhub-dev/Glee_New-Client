import type { LucideIcon } from 'lucide-react'
import { AdminAnalyticsCard } from '../../../components/admin/AdminAnalyticsCard'
import { temporaryAnalyticsTrend } from '../../../components/admin/temporaryAnalyticsTrend'

export default function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string
  value: string
  subtitle?: string
  icon: LucideIcon
}) {
  return (
    <AdminAnalyticsCard
      label={label}
      value={value}
      detail={subtitle}
      icon={Icon}
      trend={temporaryAnalyticsTrend(label, value)}
      showMenuIndicator
    />
  )
}
