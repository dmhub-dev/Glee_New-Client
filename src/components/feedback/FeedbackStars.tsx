import { Star } from 'lucide-react'
import { cn } from '@glee/ui'
import type { FeedbackRating } from '@glee/api'

const RATINGS: FeedbackRating[] = [1, 2, 3, 4, 5]
type FeedbackStarsTone = 'dark' | 'light' | 'admin'

const TONE_CLASSES: Record<FeedbackStarsTone, { active: string; inactiveReadOnly: string; button: string }> = {
  dark: {
    active: 'fill-amber-300 text-amber-300',
    inactiveReadOnly: 'text-white/22',
    button: 'text-white/30 hover:text-amber-200 focus-visible:ring-amber-300/60',
  },
  light: {
    active: 'fill-amber-400 text-amber-400',
    inactiveReadOnly: 'text-slate-300',
    button: 'text-slate-300 hover:text-amber-500 focus-visible:ring-amber-400/60',
  },
  admin: {
    active: 'fill-amber-300 text-amber-300',
    inactiveReadOnly: 'text-admin-30',
    button: 'text-admin-30 hover:text-amber-300 focus-visible:ring-amber-300/60',
  },
}

interface FeedbackStarsProps {
  value: number
  onChange?: (value: FeedbackRating) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
  tone?: FeedbackStarsTone
  className?: string
}

export default function FeedbackStars({ value, onChange, readOnly = false, size = 'md', tone = 'dark', className }: FeedbackStarsProps) {
  const iconClassName = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  const classes = TONE_CLASSES[tone]
  const label = `${value || 0} out of 5 stars`

  if (readOnly) {
    return (
      <div className={cn('flex items-center gap-1', className)} role="img" aria-label={label}>
        {RATINGS.map(rating => {
          const active = rating <= value
          return (
            <Star
              key={rating}
              className={cn(iconClassName, active ? classes.active : classes.inactiveReadOnly)}
              aria-hidden="true"
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)} role="radiogroup" aria-label={label}>
      {RATINGS.map(rating => {
        const active = rating <= value

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={rating === value}
            onClick={() => onChange?.(rating)}
            className={cn('rounded-md p-0.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2', classes.button)}
            aria-label={`Rate ${rating} out of 5`}
          >
            <Star className={cn(iconClassName, active ? classes.active : 'text-current')} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
