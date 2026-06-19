import type { ReactNode } from 'react'
import { MoreVertical, TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@glee/ui'

export type AdminAnalyticsTrend = {
  direction: 'up' | 'down'
  label: string
}

export function AdminAnalyticsCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  onClick,
  className,
  iconClassName,
  showMenuIndicator = false,
}: {
  label: string
  value: ReactNode
  detail?: string
  icon: LucideIcon
  trend?: AdminAnalyticsTrend | null
  onClick?: () => void
  className?: string
  iconClassName?: string
  showMenuIndicator?: boolean
}) {
  const TrendIcon = trend?.direction === 'down' ? TrendingDown : TrendingUp
  const trendClass = trend?.direction === 'down' ? 'text-red-500' : 'text-neon-pink'
  const rootClassName = cn(
    'rounded-2xl border border-admin bg-admin-surface p-5 text-left shadow-admin-card transition-colors',
    onClick && 'hover:border-neon-pink/40 hover:bg-admin-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink/35',
    className,
  )

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-pink/10 text-neon-pink', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        {showMenuIndicator && (
          <span className="text-admin-30 transition-colors group-hover:text-admin-60" aria-hidden="true">
            <MoreVertical className="h-5 w-5" />
          </span>
        )}
      </div>

      <div className="mt-4 min-w-0">
        <p className="truncate font-heading text-xl font-black text-foreground lg:text-2xl">{value}</p>
        {detail && <p className="mt-1 truncate text-xs text-admin-40">{detail}</p>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-admin-40">{label}</p>
        {trend && (
          <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[#7C3AED]/20 px-2.5">
            <TrendIcon className={cn('h-4 w-4', trendClass)} />
            <span className={cn('font-mono text-xs', trendClass)}>{trend.label}</span>
          </div>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('group', rootClassName)}>
        {content}
      </button>
    )
  }

  return <div className={cn('group', rootClassName)}>{content}</div>
}
