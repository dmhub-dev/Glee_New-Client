import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@glee/ui'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyTicketsSoldRow, TimeRange } from '../types'
import { TOOLTIP_STYLE } from '../constants'

export default function TicketsTrendChart({
  dailyTicketsSoldTrend,
  ticketsSoldRange,
  setTicketsSoldRange,
}: {
  dailyTicketsSoldTrend: DailyTicketsSoldRow[]
  ticketsSoldRange: TimeRange
  setTicketsSoldRange: (v: TimeRange) => void
}) {
  const total = dailyTicketsSoldTrend.reduce((s, d) => s + d.sold, 0)

  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-heading font-bold text-sm text-foreground">Daily Tickets Sold Trend</h3>
        <Select value={ticketsSoldRange} onValueChange={v => setTicketsSoldRange(v as TimeRange)}>
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
      <p className="font-heading font-black text-xl text-neon-pink mb-3">{total.toLocaleString()} tickets</p>

      {dailyTicketsSoldTrend.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyTicketsSoldTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--admin-t30)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <RechartsTooltip
              formatter={(v, name) => [`${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, String(name ?? '')]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Line type="monotone" dataKey="sold" name="Tickets" stroke="#7C3AED" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </div>
  )
}
