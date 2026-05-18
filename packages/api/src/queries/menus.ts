export const menuKeys = {
  all: ['menus'] as const,
  byVenue: (venueId: string) => ['menus', 'venue', venueId] as const,
}
