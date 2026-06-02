import { Skeleton } from '@glee/ui'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'
import { DONUT_COLORS, TOOLTIP_STYLE } from '../constants'
import type { MenuBreakdownRow } from '../types'

export default function MenuBreakdownChart({ menuRevenueDonut }: { menuRevenueDonut: MenuBreakdownRow[] }) {
  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-sm text-foreground">Menu Items Breakdown</h3>
        <span className="text-xs text-admin-40 bg-admin-overlay border border-admin rounded-full px-2 py-0.5">By Category</span>
      </div>

      {menuRevenueDonut.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={menuRevenueDonut}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={82}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {menuRevenueDonut.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={v => [`Ksh ${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, 'Revenue']}
                contentStyle={TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {menuRevenueDonut.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-admin-50 flex-1 truncate">{d.name}</span>
                <span className="font-mono text-admin-70 whitespace-nowrap">Ksh {d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </div>
  )
}
