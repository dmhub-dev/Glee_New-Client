import type { Venue } from '@glee/types'

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => ['venues', 'list'] as const,
  list: (filters?: { status?: Venue['status'] }) => ['venues', 'list', filters] as const,
  byId: (id: string) => ['venues', id] as const,
}
