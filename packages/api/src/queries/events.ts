import type { Event } from '@glee/types'

export const eventKeys = {
  all: ['events'] as const,
  lists: () => ['events', 'list'] as const,
  list: (filters: { date?: string; venueId?: string; status?: Event['status']; minPrice?: number; maxPrice?: number }) =>
    ['events', 'list', filters] as const,
  byId: (id: string) => ['events', id] as const,
}
