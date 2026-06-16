import type { LucideIcon } from 'lucide-react'

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
    <div className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-admin-40">{label}</p>
          <p className="font-heading text-2xl font-black text-foreground">{value}</p>
          {detail && <p className="mt-1 truncate text-xs text-admin-40">{detail}</p>}
        </div>
      </div>
    </div>
  )
}
