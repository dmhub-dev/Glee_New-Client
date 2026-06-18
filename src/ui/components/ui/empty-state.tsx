import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export type EmptyStateVariant = 'customer' | 'admin' | 'danger'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const emptyStateStyles: Record<EmptyStateVariant, string> = {
  customer: 'border-white/10 bg-white/[0.06] text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]',
  admin: 'border-admin bg-admin-surface text-foreground shadow-admin',
  danger: 'border-red-500/25 bg-red-500/10 text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]',
}

const iconStyles: Record<EmptyStateVariant, string> = {
  customer: 'bg-neon-pink/10 text-neon-pink ring-1 ring-neon-pink/20',
  admin: 'bg-neon-pink/10 text-neon-pink ring-1 ring-neon-pink/20',
  danger: 'bg-red-500/15 text-red-200 ring-1 ring-red-500/25',
}

const descriptionStyles: Record<EmptyStateVariant, string> = {
  customer: 'text-white/58',
  admin: 'text-admin-40',
  danger: 'text-red-100/75',
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'customer',
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-44 flex-col items-center justify-center rounded-2xl border px-5 py-10 text-center',
        emptyStateStyles[variant],
        className,
      )}
    >
      {icon && (
        <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', iconStyles[variant])}>
          {icon}
        </div>
      )}
      <h3 className="font-heading text-base font-black">{title}</h3>
      {description && (
        <p className={cn('mt-2 max-w-md text-sm leading-6', descriptionStyles[variant])}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export interface LoadingPanelProps {
  label?: string
  variant?: EmptyStateVariant
  className?: string
}

export function LoadingPanel({ label = 'Loading', variant = 'customer', className }: LoadingPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-32 items-center justify-center gap-3 rounded-2xl border px-5 py-8 text-sm font-semibold',
        emptyStateStyles[variant],
        variant === 'admin' ? 'text-admin-50' : 'text-white/60',
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-neon-pink" />
      <span>{label}</span>
    </div>
  )
}
