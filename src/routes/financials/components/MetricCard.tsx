import { MoreVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
    <div className="bg-admin-surface rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-neon-pink" />
        </div>
        <button type="button" className="text-admin-30 hover:text-admin-60 transition-colors" aria-label="More options">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        <p className="font-heading font-black text-xl lg:text-2xl text-foreground truncate">{value}</p>
        {subtitle && <p className="text-xs text-admin-40 mt-1">{subtitle}</p>}
      </div>

      <div className="mt-2">
        <p className="text-xs text-admin-40">{label}</p>
      </div>
    </div>
  )
}
