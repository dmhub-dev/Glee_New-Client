import { Star } from 'lucide-react'
import { cn } from '@glee/ui'
import type { FeedbackRating } from '@glee/api'

const RATINGS: FeedbackRating[] = [1, 2, 3, 4, 5]

interface FeedbackStarsProps {
  value: number
  onChange?: (value: FeedbackRating) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function FeedbackStars({ value, onChange, readOnly = false, size = 'md', className }: FeedbackStarsProps) {
  const iconClassName = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`${value || 0} out of 5 stars`}>
      {RATINGS.map(rating => {
        const active = rating <= value
        if (readOnly) {
          return (
            <Star
              key={rating}
              className={cn(iconClassName, active ? 'fill-amber-300 text-amber-300' : 'text-white/22')}
              aria-hidden="true"
            />
          )
        }

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange?.(rating)}
            className="rounded-md p-0.5 text-white/30 transition hover:scale-110 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
            aria-label={`Rate ${rating} out of 5`}
          >
            <Star className={cn(iconClassName, active ? 'fill-amber-300 text-amber-300' : 'text-current')} />
          </button>
        )
      })}
    </div>
  )
}
