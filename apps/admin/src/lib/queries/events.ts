import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminEvents,
  getAdminEvent,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  type EventApiPayload,
} from '../api/events'

export const adminEventKeys = {
  all:  ['admin', 'events'] as const,
  byId: (id: string) => ['admin', 'events', id] as const,
}

export function useAdminEvents() {
  return useQuery({
    queryKey: adminEventKeys.all,
    queryFn:  getAdminEvents,
  })
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: adminEventKeys.byId(id),
    queryFn:  () => getAdminEvent(id),
    enabled:  !!id && id !== 'new',
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EventApiPayload) => createAdminEvent(payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: adminEventKeys.all }),
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventApiPayload }) =>
      updateAdminEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminEventKeys.all })
      queryClient.invalidateQueries({ queryKey: adminEventKeys.byId(id) })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: adminEventKeys.all }),
  })
}
