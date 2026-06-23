import { Badge, cn } from '@glee/ui'
import type { PayoutProfileStatus, PayoutRequestStatus } from '@glee/api'
import { profileStatusLabel, requestStatusLabel } from '../utils'

type Status = PayoutProfileStatus | PayoutRequestStatus

const STATUS_CLASS: Partial<Record<Status, string>> = {
  VERIFIED: 'border-green-500/30 bg-green-500/10 text-green-400',
  PENDING_VERIFICATION: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  REJECTED: 'border-red-500/30 bg-red-500/10 text-red-400',
  REQUESTED: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  PENDING_ELIGIBILITY: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  ELIGIBLE: 'border-green-500/30 bg-green-500/10 text-green-400',
  APPROVED: 'border-neon-pink/30 bg-neon-pink/10 text-neon-pink',
  PAID: 'border-green-500/30 bg-green-500/10 text-green-400',
  CANCELLED: 'border-admin bg-admin-overlay text-admin-40',
  FAILED: 'border-red-500/30 bg-red-500/10 text-red-400',
}

export default function PayoutStatusBadge({ status }: { status: Status }) {
  const label = status === 'PENDING_VERIFICATION' || status === 'VERIFIED' || status === 'REJECTED'
    ? profileStatusLabel(status)
    : requestStatusLabel(status as PayoutRequestStatus)

  return (
    <Badge className={cn('border text-[11px] font-semibold', STATUS_CLASS[status] ?? 'border-admin bg-admin-overlay text-admin-50')}>
      {label}
    </Badge>
  )
}
