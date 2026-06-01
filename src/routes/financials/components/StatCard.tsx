import { Banknote, MoreVertical, TrendingDown, TrendingUp } from 'lucide-react'
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
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown
  const trendClass = trend === 'up' ? 'text-neon-pink' : 'text-red-500'
  const trendText =
    trendPct === null || trendPct === undefined ? null : `${trend === 'up' ? '+' : '-'}${Math.abs(trendPct).toFixed(2)} %`

  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center shrink-0">
          <Banknote className="w-5 h-5 text-neon-pink" />
        </div>
        <button type="button" className="text-admin-30 hover:text-admin-60 transition-colors" aria-label="More options">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        <p className="font-heading font-black text-xl lg:text-2xl text-foreground">Ksh {value.toLocaleString()}</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-admin-40">{label}</p>
        {trendText && (
          <div className="h-7 px-2.5 rounded-full bg-[#7C3AED]/20 flex items-center gap-1.5 shrink-0">
            <TrendIcon className={`w-4 h-4 ${trendClass}`} />
            <span className={`text-xs font-mono ${trendClass}`}>{trendText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
