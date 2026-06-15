import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  feedbackTargetKey,
  getAllFeedbackFromStorage,
  getFeedbackForTargetFromStorage,
  getFeedbackMapForTargetsFromStorage,
  upsertFeedbackInStorage,
  type Feedback,
  type FeedbackDraft,
  type FeedbackStorageLike,
  type FeedbackTarget,
  type FeedbackTargetType,
} from './feedbackStorage'

export type {
  Feedback,
  FeedbackDraft,
  FeedbackRating,
  FeedbackStorageLike,
  FeedbackTarget,
  FeedbackTargetType,
} from './feedbackStorage'
export { feedbackTargetKey } from './feedbackStorage'

export const feedbackKeys = {
  all: ['feedback'] as const,
  target: (targetType: FeedbackTargetType, targetId: string) => ['feedback', targetType, targetId] as const,
  targets: (targets: FeedbackTarget[]) => ['feedback', 'targets', targets.map(target => feedbackTargetKey(target.targetType, target.targetId)).sort()] as const,
}

function browserFeedbackStorage(): FeedbackStorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export async function getFeedbackForTarget(targetType: FeedbackTargetType, targetId: string): Promise<Feedback | null> {
  return getFeedbackForTargetFromStorage(browserFeedbackStorage(), targetType, targetId)
}

export async function getFeedbackMapForTargets(targets: FeedbackTarget[]): Promise<Record<string, Feedback>> {
  return getFeedbackMapForTargetsFromStorage(browserFeedbackStorage(), targets)
}

export async function getAllFeedback(): Promise<Feedback[]> {
  return getAllFeedbackFromStorage(browserFeedbackStorage())
}

export async function upsertFeedback(draft: FeedbackDraft): Promise<Feedback> {
  const storage = browserFeedbackStorage()
  if (!storage) throw new Error('Feedback storage is unavailable in this browser.')
  return upsertFeedbackInStorage(storage, draft)
}

export function useFeedbackForTarget(targetType: FeedbackTargetType, targetId: string | undefined) {
  return useQuery({
    queryKey: feedbackKeys.target(targetType, targetId ?? ''),
    queryFn: () => getFeedbackForTarget(targetType, targetId as string),
    enabled: Boolean(targetId),
  })
}

export function useFeedbackMapForTargets(targets: FeedbackTarget[]) {
  return useQuery({
    queryKey: feedbackKeys.targets(targets),
    queryFn: () => getFeedbackMapForTargets(targets),
    enabled: targets.length > 0,
  })
}

export function useUpsertFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertFeedback,
    onSuccess: feedback => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all })
      queryClient.setQueryData(feedbackKeys.target(feedback.targetType, feedback.targetId), feedback)
    },
  })
}
