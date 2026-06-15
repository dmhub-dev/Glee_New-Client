export type FeedbackTargetType = 'EVENT_TICKET' | 'RESERVATION'
export type FeedbackRating = 1 | 2 | 3 | 4 | 5

export interface Feedback {
  id: string
  targetType: FeedbackTargetType
  targetId: string
  rating: FeedbackRating
  comment?: string
  submittedAt: string
  updatedAt?: string
  authorName?: string
}

export interface FeedbackDraft {
  targetType: FeedbackTargetType
  targetId: string
  rating: number
  comment?: string
  authorName?: string
}

export interface FeedbackTarget {
  targetType: FeedbackTargetType
  targetId: string
}

export interface FeedbackStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export const FEEDBACK_STORAGE_KEY = 'glee:feedback:v1'

export function feedbackTargetKey(targetType: FeedbackTargetType, targetId: string) {
  return `${targetType}:${targetId}`
}

export function isFeedbackRating(value: number): value is FeedbackRating {
  return Number.isInteger(value) && value >= 1 && value <= 5
}

function isFeedback(value: unknown): value is Feedback {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Feedback>
  return (
    (item.targetType === 'EVENT_TICKET' || item.targetType === 'RESERVATION') &&
    typeof item.targetId === 'string' &&
    item.targetId.length > 0 &&
    typeof item.id === 'string' &&
    typeof item.submittedAt === 'string' &&
    typeof item.rating === 'number' &&
    isFeedbackRating(item.rating)
  )
}

export function getAllFeedbackFromStorage(storage: FeedbackStorageLike | null | undefined): Feedback[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(FEEDBACK_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isFeedback) : []
  } catch {
    return []
  }
}

export function writeAllFeedbackToStorage(storage: FeedbackStorageLike, feedback: Feedback[]) {
  storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedback))
}

export function getFeedbackForTargetFromStorage(
  storage: FeedbackStorageLike | null | undefined,
  targetType: FeedbackTargetType,
  targetId: string,
) {
  const key = feedbackTargetKey(targetType, targetId)
  return getAllFeedbackFromStorage(storage).find(item => feedbackTargetKey(item.targetType, item.targetId) === key) ?? null
}

export function getFeedbackMapForTargetsFromStorage(
  storage: FeedbackStorageLike | null | undefined,
  targets: FeedbackTarget[],
) {
  const wanted = new Set(targets.map(target => feedbackTargetKey(target.targetType, target.targetId)))
  return getAllFeedbackFromStorage(storage).reduce<Record<string, Feedback>>((acc, feedback) => {
    const key = feedbackTargetKey(feedback.targetType, feedback.targetId)
    if (wanted.has(key)) acc[key] = feedback
    return acc
  }, {})
}

export function upsertFeedbackInStorage(
  storage: FeedbackStorageLike,
  draft: FeedbackDraft,
  now: () => Date = () => new Date(),
) {
  if (!draft.targetId.trim()) throw new Error('Feedback target is required')
  if (!isFeedbackRating(draft.rating)) throw new Error('Rating must be between 1 and 5')

  const submittedAt = now().toISOString()
  const list = getAllFeedbackFromStorage(storage)
  const key = feedbackTargetKey(draft.targetType, draft.targetId)
  const comment = draft.comment?.trim() || undefined
  const existingIndex = list.findIndex(item => feedbackTargetKey(item.targetType, item.targetId) === key)

  const feedback: Feedback = existingIndex >= 0
    ? {
        ...list[existingIndex],
        rating: draft.rating,
        comment,
        authorName: draft.authorName?.trim() || list[existingIndex].authorName,
        updatedAt: submittedAt,
      }
    : {
        id: `${key}:${submittedAt}`,
        targetType: draft.targetType,
        targetId: draft.targetId,
        rating: draft.rating,
        comment,
        submittedAt,
        authorName: draft.authorName?.trim() || undefined,
      }

  const next = existingIndex >= 0
    ? list.map((item, index) => (index === existingIndex ? feedback : item))
    : [feedback, ...list]

  writeAllFeedbackToStorage(storage, next)
  return feedback
}
