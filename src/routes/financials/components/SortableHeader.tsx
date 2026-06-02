import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SortDir } from '../types'

export default function SortableHeader({
  label,
  active,
  sortDir,
  onToggle,
}: {
  label: string
  active: boolean
  sortDir: SortDir
  onToggle: () => void
}) {
  const upActive = active && sortDir === 'asc'
  const downActive = active && sortDir === 'desc'

  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1.5 hover:text-admin-60 transition-colors">
      {label}
      <span className="flex flex-col -space-y-1">
        <ChevronUp className={`w-3 h-3 ${upActive ? 'text-neon-pink' : 'text-admin-30'}`} />
        <ChevronDown className={`w-3 h-3 ${downActive ? 'text-neon-pink' : 'text-admin-30'}`} />
      </span>
    </button>
  )
}
