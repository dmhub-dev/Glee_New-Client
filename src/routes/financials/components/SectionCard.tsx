import type { ReactNode } from 'react'

export default function SectionCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`bg-admin-surface rounded-2xl ${className ?? ''}`.trim()}>{children}</div>
}
