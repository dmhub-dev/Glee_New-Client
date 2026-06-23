import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  feedbackTargetKey,
  type Feedback,
  type FeedbackDraft,
  type FeedbackTarget,
  type FeedbackTargetType,
} from './feedbackStorage'
import { apiFetch } from '../client'

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

interface FeedbackResponse<T> {
  success: boolean
  message?: string
  data: T
}

function uniqueTargetIds(targets: FeedbackTarget[]) {
  return Array.from(new Set(targets.map(target => target.targetId.trim()).filter(Boolean)))
}

function groupTargetsByType(targets: FeedbackTarget[]) {
  const grouped = new Map<FeedbackTargetType, string[]>()
  for (const target of targets) {
    const targetId = target.targetId.trim()
    if (!targetId) continue
    const group = grouped.get(target.targetType) ?? []
    group.push(targetId)
    grouped.set(target.targetType, group)
  }
  return Array.from(grouped.entries()).map(([targetType, targetIds]) => ({
    targetType,
    targetIds: uniqueTargetIds(targetIds.map(targetId => ({ targetType, targetId }))),
  }))
}

export async function getFeedbackForTarget(targetType: FeedbackTargetType, targetId: string): Promise<Feedback | null> {
  const feedbackMap = await getFeedbackMapForTargets([{ targetType, targetId }])
  return feedbackMap[feedbackTargetKey(targetType, targetId)] ?? null
}

export async function getFeedbackMapForTargets(targets: FeedbackTarget[]): Promise<Record<string, Feedback>> {
  const groupedTargets = groupTargetsByType(targets)
  if (groupedTargets.length === 0) return {}

  const responses = await Promise.all(groupedTargets.map(({ targetType, targetIds }) => {
    const params = new URLSearchParams({
      targetType,
      targetIds: targetIds.join(','),
    })
    return apiFetch<FeedbackResponse<Record<string, Feedback>>>(`/api/v1/feedback?${params.toString()}`)
  }))

  return responses.reduce<Record<string, Feedback>>((acc, response) => ({
    ...acc,
    ...(response.data ?? {}),
  }), {})
}

export async function getAllFeedback(): Promise<Feedback[]> {
  return []
}

export async function upsertFeedback(draft: FeedbackDraft): Promise<Feedback> {
  const response = await apiFetch<FeedbackResponse<Feedback>>('/api/v1/feedback', {
    method: 'PUT',
    body: JSON.stringify(draft),
  })
  return response.data
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
    onSuccess: (feedback, draft) => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all })
      queryClient.invalidateQueries({ queryKey: ['feedback', 'targets'] })
      queryClient.setQueryData(feedbackKeys.target(feedback.targetType, feedback.targetId), feedback)
      queryClient.setQueryData(feedbackKeys.target(draft.targetType, draft.targetId), feedback)
    },
  })
}
