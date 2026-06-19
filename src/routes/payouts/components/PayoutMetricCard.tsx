import type { LucideIcon } from 'lucide-react'
import { AdminAnalyticsCard } from '../../../components/admin/AdminAnalyticsCard'
import { temporaryAnalyticsTrend } from '../../../components/admin/temporaryAnalyticsTrend'

export default function PayoutMetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
}) {
  return (
    <AdminAnalyticsCard label={label} value={value} detail={detail} icon={Icon} trend={temporaryAnalyticsTrend(label, value)} />
  )
}
