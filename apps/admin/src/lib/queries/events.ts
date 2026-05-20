import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Event } from '@glee/types'
import {
  getAdminEvents,
  getAdminEvent,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
} from '../mock/events'

export const adminEventKeys = {
  all: ['admin', 'events'] as const,
  byId: (id: string) => ['admin', 'events', id] as const,
}

export function useAdminEvents() {
  return useQuery({
    queryKey: adminEventKeys.all,
    queryFn: getAdminEvents,
  })
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: adminEventKeys.byId(id),
    queryFn: () => getAdminEvent(id),
    enabled: !!id && id !== 'new',
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => createAdminEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminEventKeys.all }),
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Event, 'id' | 'createdAt'>> }) =>
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminEventKeys.all }),
  })
}
