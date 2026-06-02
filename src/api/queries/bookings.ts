import type { BookingStatus } from '@glee/types'

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => ['bookings', 'list'] as const,
  list: (filters: { venueId?: string; status?: BookingStatus; date?: string; tableCategory?: string }) =>
    ['bookings', 'list', filters] as const,
  byVenue: (venueId: string) => ['bookings', 'venue', venueId] as const,
  byId: (id: string) => ['bookings', id] as const,
}
