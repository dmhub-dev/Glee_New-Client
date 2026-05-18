export const eventKeys = {
  all: ['events'] as const,
  list: (filters?: Record<string, unknown>) => ['events', 'list', filters] as const,
  byId: (id: string) => ['events', id] as const,
}
