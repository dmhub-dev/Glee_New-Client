import { Badge, cn } from '@glee/ui'
import { feedbackTargetKey, useFeedbackMapForTargets, type FeedbackTargetType } from '@glee/api'
import FeedbackStars from './FeedbackStars'

interface FeedbackReadOnlyProps {
  targetType: FeedbackTargetType
  targetId?: string
  targetIds?: string[]
  compact?: boolean
  className?: string
}

function uniqueTargetIds(targetIds: string[]) {
  return Array.from(new Set(targetIds.map(id => id.trim()).filter(Boolean)))
}

export default function FeedbackReadOnly({ targetType, targetId, targetIds, compact = false, className }: FeedbackReadOnlyProps) {
  const targets = uniqueTargetIds(targetIds?.length ? targetIds : targetId ? [targetId] : [])
  const { data: feedbackMap } = useFeedbackMapForTargets(targets.map(id => ({ targetType, targetId: id })))
  const feedback = targets
    .map(id => feedbackMap?.[feedbackTargetKey(targetType, id)])
    .find(Boolean) ?? null

  if (targets.length > 0 && feedbackMap === undefined) {
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
