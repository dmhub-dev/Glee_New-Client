import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'
import { TOOLTIP_STYLE, PIE_COLORS } from '../constants'

export default function RevenueBreakdownChart({
  ticketEarnings,
  menuItemsEarnings,
}: {
  ticketEarnings: number
  menuItemsEarnings: number
}) {
  return (
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-sm text-foreground">Revenue Breakdown</h3>
        <span className="text-xs text-admin-40 bg-admin-overlay border border-admin rounded-full px-2 py-0.5">Tickets vs Menu</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: 'Tickets', value: ticketEarnings },
                { name: 'Menu Items', value: menuItemsEarnings },
              ]}
              cx="50%"
              cy="50%"
              outerRadius={85}
              dataKey="value"
              strokeWidth={0}
            >
              {['Tickets', 'Menu Items'].map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={v => [`Ksh ${typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}`, 'Revenue']}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {[
            { name: 'Tickets', value: ticketEarnings, color: PIE_COLORS[0] },
            { name: 'Menu Items', value: menuItemsEarnings, color: PIE_COLORS[1] },
          ].map(row => (
            <div key={row.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
              <span className="text-admin-50 flex-1">{row.name}</span>
              <span className="font-mono text-admin-70 whitespace-nowrap">Ksh {row.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
