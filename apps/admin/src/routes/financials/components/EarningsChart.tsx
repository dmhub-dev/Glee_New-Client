import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@glee/ui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TOOLTIP_STYLE } from '../constants'
import type { DailyEarningsRow, TimeRange } from '../types'

type TopPillBarProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
}

function TopPillBar({ x = 0, y = 0, width = 0, height = 0, fill = '#FF2D8F' }: TopPillBarProps) {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  if (w === 0 || h === 0) return null

  const r = Math.max(0, Math.min(w / 2, h))
  const right = x + w
  const bottom = y + h

  return (
    <path
      d={[
        `M ${x} ${y + r}`,
        `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
        `L ${right - r} ${y}`,
        `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
        `L ${right} ${bottom}`,
        `L ${x} ${bottom}`,
        'Z',
      ].join(' ')}
      fill={fill}
    />
  )
}

export default function EarningsChart({
  dailyEarnings,
  earningsRange,
  setEarningsRange,
  loading,
}: {
  dailyEarnings: DailyEarningsRow[]
  earningsRange: TimeRange
  setEarningsRange: (v: TimeRange) => void
  loading: boolean
}) {
  const total = dailyEarnings.reduce((s, d) => s + (d.earnings ?? 0), 0) ?? 0

  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-heading font-bold text-sm text-foreground">Daily Earnings</h3>
        <Select value={earningsRange} onValueChange={v => setEarningsRange(v as TimeRange)}>
          <SelectTrigger className="h-8 w-auto min-w-[110px] bg-admin-overlay border-admin rounded-full text-admin-40 text-xs px-3">
            <SelectValue placeholder="This week" />
          </SelectTrigger>
          <SelectContent className="bg-admin-surface border-admin">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="this_year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="font-heading font-black text-xl text-neon-pink mb-3">Ksh {total.toLocaleString()}</p>

      {!loading && dailyEarnings.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyEarnings} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--admin-t30)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${Math.round(Number(v) / 1000)}k`}
            />
            <RechartsTooltip
              formatter={(v, name) => [`Ksh ${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, String(name ?? '')]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="ticketEarnings" name="Tickets" fill="#FF2D8F" shape={<TopPillBar />} />
            <Bar dataKey="menuEarnings" name="Menu Items" fill="#7C3AED" shape={<TopPillBar />} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </div>
  )
}
