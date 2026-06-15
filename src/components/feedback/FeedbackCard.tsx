import { useEffect, useState } from 'react'
import { MessageSquare, Pencil, Send } from 'lucide-react'
import { Button, Textarea, cn, useToast } from '@glee/ui'
import { feedbackTargetKey, useFeedbackMapForTargets, useUpsertFeedback, type FeedbackRating, type FeedbackTargetType } from '@glee/api'
import FeedbackStars from './FeedbackStars'

interface FeedbackFormState {
  targetKey: string
  rating: FeedbackRating | 0
  comment: string
}

interface FeedbackCardProps {
  targetType: FeedbackTargetType
  targetId: string
  targetIds?: string[]
  title: string
  description?: string
  authorName?: string
  className?: string
  surface?: 'dark' | 'light'
}

function uniqueTargetIds(targetIds: string[]) {
  return Array.from(new Set(targetIds.map(id => id.trim()).filter(Boolean)))
}

export default function FeedbackCard({ targetType, targetId, targetIds, title, description, authorName, className, surface = 'dark' }: FeedbackCardProps) {
  const { toast } = useToast()
  const targets = uniqueTargetIds([targetId, ...(targetIds ?? [])])
  const feedbackQuery = useFeedbackMapForTargets(targets.map(id => ({ targetType, targetId: id })))
  const upsert = useUpsertFeedback()
  const targetKey = `${targetType}:${targetId}`
  const loadedFeedbackMap = feedbackQuery.data
  const feedback = targets
    .map(id => loadedFeedbackMap?.[feedbackTargetKey(targetType, id)])
    .find(Boolean) ?? null
  const activeTargetId = feedback?.targetId ?? targetId
  const feedbackLoading = loadedFeedbackMap === undefined
  const [editing, setEditing] = useState(false)
  const [formState, setFormState] = useState<FeedbackFormState>(() => ({ targetKey, rating: 0, comment: '' }))
  const formMatchesTarget = formState.targetKey === targetKey
  const editingCurrentTarget = formMatchesTarget ? editing : false
  const rating = formMatchesTarget ? formState.rating : 0
  const comment = formMatchesTarget ? formState.comment : ''
  const submitted = Boolean(feedback) && !editingCurrentTarget && !feedbackLoading
  const light = surface === 'light'
  const starTone = light ? 'light' : 'dark'

  useEffect(() => {
    setEditing(false)
    setFormState({ targetKey, rating: 0, comment: '' })
  }, [targetKey])

  useEffect(() => {
    if (loadedFeedbackMap === undefined) return
    setFormState({ targetKey, rating: feedback?.rating ?? 0, comment: feedback?.comment ?? '' })
  }, [feedback, loadedFeedbackMap, targetKey])

  function handleRatingChange(value: FeedbackRating) {
    setFormState(current => ({ ...current, targetKey, rating: value }))
  }

  function handleCommentChange(value: string) {
    setFormState(current => ({ ...current, targetKey, comment: value }))
  }

  async function handleSubmit() {
    if (!rating) return
    try {
      await upsert.mutateAsync({ targetType, targetId: activeTargetId, rating, comment, authorName })
      setEditing(false)
      toast({ title: feedback ? 'Feedback updated' : 'Feedback submitted', description: 'Thanks for sharing your experience.' })
    } catch (error) {
      toast({
        title: 'Could not save feedback',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <section
      className={cn(
        'rounded-2xl border p-4 shadow-[0_16px_50px_rgba(0,0,0,0.16)]',
        light ? 'border-slate-200 bg-white text-slate-950' : 'border-white/12 bg-white/[0.08] text-white',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={cn('mb-2 flex h-10 w-10 items-center justify-center rounded-xl', light ? 'bg-neon-pink/10 text-neon-pink' : 'bg-neon-pink/15 text-neon-pink')}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-lg font-black">{title}</h3>
          {description ? <p className={cn('mt-1 text-sm leading-5', light ? 'text-slate-500' : 'text-white/55')}>{description}</p> : null}
        </div>
        {feedback && !editingCurrentTarget ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(true)}
            className={cn('shrink-0 rounded-full', light ? 'text-slate-600 hover:bg-slate-100' : 'text-white/70 hover:bg-white/10 hover:text-white')}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : null}
      </div>

      {feedbackLoading ? (
        <div className={cn('mt-4 rounded-xl border p-4', light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20')}>
          <FeedbackStars value={0} readOnly tone={starTone} />
          <p className={cn('mt-3 text-sm', light ? 'text-slate-500' : 'text-white/55')}>Loading feedback...</p>
        </div>
      ) : submitted ? (
        <div className={cn('mt-4 rounded-xl border p-4', light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20')}>
          <FeedbackStars value={feedback?.rating ?? 0} readOnly tone={starTone} />
          {feedback?.comment ? <p className={cn('mt-3 text-sm leading-6', light ? 'text-slate-600' : 'text-white/70')}>{feedback.comment}</p> : null}
          <p className={cn('mt-3 text-xs', light ? 'text-slate-400' : 'text-white/38')}>{feedback?.updatedAt ? 'Updated' : 'Submitted'} {new Date(feedback?.updatedAt ?? feedback?.submittedAt ?? '').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <FeedbackStars value={rating} onChange={handleRatingChange} tone={starTone} />
          <Textarea
            value={comment}
            onChange={event => handleCommentChange(event.target.value)}
            placeholder="Add a comment (optional)"
            className={cn('min-h-24 resize-none rounded-xl', light ? 'border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400' : 'border-white/10 bg-black/20 text-white placeholder:text-white/35')}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || upsert.isPending || feedbackLoading}
            className="w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-45"
          >
            <Send className="mr-2 h-4 w-4" />
            {upsert.isPending ? 'Saving...' : feedback ? 'Update feedback' : 'Submit feedback'}
          </Button>
        </div>
      )}
    </section>
  )
}
