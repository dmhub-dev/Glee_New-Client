import { useQuery } from '@tanstack/react-query'
import type { Event } from '@glee/types'

export const eventKeys = {
  all: ['events'] as const,
  lists: () => ['events', 'list'] as const,
  list: (filters: { date?: string; venueId?: string; status?: Event['status']; minPrice?: number; maxPrice?: number }) =>
    ['events', 'list', filters] as const,
  byId: (id: string) => ['events', id] as const,
}

type EventFilters = Parameters<typeof eventKeys.list>[0]
type FetchEventsFn = (filters?: EventFilters) => Promise<Event[]>
type FetchEventFn = (id: string) => Promise<Event | undefined>

let _fetchEvents: FetchEventsFn = async () => []
let _fetchEvent: FetchEventFn = async () => undefined

export function configureEventFetchers(fetchEvents: FetchEventsFn, fetchEvent: FetchEventFn) {
  _fetchEvents = fetchEvents
  _fetchEvent = fetchEvent
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: filters ? eventKeys.list(filters) : eventKeys.lists(),
    queryFn: () => _fetchEvents(filters),
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.byId(id),
    queryFn: () => _fetchEvent(id),
    enabled: Boolean(id),
  })
}
