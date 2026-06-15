import { Badge, cn } from '@glee/ui'
import { useFeedbackForTarget, type FeedbackTargetType } from '@glee/api'
import FeedbackStars from './FeedbackStars'

interface FeedbackReadOnlyProps {
  targetType: FeedbackTargetType
  targetId: string
  compact?: boolean
  className?: string
}

export default function FeedbackReadOnly({ targetType, targetId, compact = false, className }: FeedbackReadOnlyProps) {
  const { data: feedback } = useFeedbackForTarget(targetType, targetId)

  if (feedback === undefined) {
    return <Badge className={cn('border-admin bg-admin-input text-admin-40', className)}>Loading feedback</Badge>
  }

  if (!feedback) {
    return <Badge className={cn('border-admin bg-admin-input text-admin-40', className)}>No feedback</Badge>
  }

  if (compact) {
    return (
      <div className={cn('min-w-[150px] space-y-1', className)}>
        <FeedbackStars value={feedback.rating} readOnly size="sm" tone="admin" />
        {feedback.comment ? <p className="line-clamp-2 text-xs leading-5 text-admin-50">{feedback.comment}</p> : null}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-admin bg-admin-overlay p-3', className)}>
      <FeedbackStars value={feedback.rating} readOnly size="sm" tone="admin" />
      {feedback.comment ? <p className="mt-2 text-sm leading-6 text-admin-60">{feedback.comment}</p> : <p className="mt-2 text-xs text-admin-40">No comment added.</p>}
    </div>
  )
}
