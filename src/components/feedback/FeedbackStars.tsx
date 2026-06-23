import { useRef, type KeyboardEvent } from 'react'
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
  const groupRef = useRef<HTMLDivElement>(null)

  function updateRating(next: FeedbackRating) {
    onChange?.(next)
    window.requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`)?.focus()
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = Math.max(0, RATINGS.indexOf(value as FeedbackRating))
    let next: FeedbackRating | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      next = RATINGS[(currentIndex + 1) % RATINGS.length]
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      next = RATINGS[(currentIndex - 1 + RATINGS.length) % RATINGS.length]
    } else if (event.key === 'Home') {
      next = RATINGS[0]
    } else if (event.key === 'End') {
      next = RATINGS[RATINGS.length - 1]
    }

    if (next) {
      event.preventDefault()
      updateRating(next)
    }
  }

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
    <div ref={groupRef} className={cn('flex items-center gap-1', className)} role="radiogroup" aria-label={label} tabIndex={-1} onKeyDown={handleKeyDown}>
      {RATINGS.map(rating => {
        const active = rating <= value
        const tabIndex = rating === (value || 1) ? 0 : -1

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            data-rating={rating}
            tabIndex={tabIndex}
            aria-checked={rating === value}
            onClick={() => updateRating(rating)}
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
