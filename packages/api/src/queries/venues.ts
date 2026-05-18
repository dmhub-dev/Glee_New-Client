export const venueKeys = {
  all: ['venues'] as const,
  list: () => ['venues', 'list'] as const,
  byId: (id: string) => ['venues', id] as const,
}
