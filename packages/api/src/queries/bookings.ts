export const bookingKeys = {
  all: ['bookings'] as const,
  byVenue: (venueId: string) => ['bookings', 'venue', venueId] as const,
  byId: (id: string) => ['bookings', id] as const,
}
