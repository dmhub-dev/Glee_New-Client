import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@glee/ui'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyTrendRow, RevenueSeriesRow, TimeRange } from '../types'
import { TOOLTIP_STYLE } from '../constants'

function monthShortLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  if (Number.isNaN(d.getTime())) return yyyyMm
  return d.toLocaleString('en-US', { month: 'short' })
}

export default function RevenueTrendChart({
  view,
  setView,
  monthlyTrend,
  weeklyRevenue,
}: {
  view: TimeRange
  setView: (v: TimeRange) => void
  monthlyTrend: MonthlyTrendRow[] | undefined
  weeklyRevenue: RevenueSeriesRow[] | undefined
}) {
  const isYear = view === 'this_year'
  const data = isYear
    ? (monthlyTrend ?? []).map(r => ({ label: monthShortLabel(r.month), revenue: r.earnings }))
    : (weeklyRevenue ?? []).map(r => {
        const d = new Date(r.date)
        const label = Number.isNaN(d.getTime()) ? String(r.date).slice(0, 10) : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
        return { label, revenue: r.revenue }
      })

  const loading = isYear ? !monthlyTrend : !weeklyRevenue

  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-heading font-bold text-sm text-foreground">Revenue Trend</h3>
        <Select value={view} onValueChange={v => setView(v as TimeRange)}>
          <SelectTrigger className="h-8 w-auto min-w-[110px] bg-admin-overlay border-admin rounded-full text-admin-40 text-xs px-3">
            <SelectValue placeholder="This year" />
          </SelectTrigger>
          <SelectContent className="bg-admin-surface border-admin">
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && data.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--admin-t30)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${Math.round(Number(v) / 1000)}k`}
            />
            <RechartsTooltip
              formatter={(v) => [`Ksh ${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, 'Revenue']}
              contentStyle={TOOLTIP_STYLE}
            />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#FF2D8F" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </div>
  )
}
