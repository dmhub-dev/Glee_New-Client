export const menuKeys = {
  all: ['menus'] as const,
  byVenue: (venueId: string) => ['menus', 'venue', venueId] as const,
  itemById: (venueId: string, itemId: string) => ['menus', 'venue', venueId, 'item', itemId] as const,
  bundleById: (venueId: string, bundleId: string) => ['menus', 'venue', venueId, 'bundle', bundleId] as const,
}
