export const userKeys = {
  all: ['users'] as const,
  lists: () => ['users', 'list'] as const,
  byId: (id: string) => ['users', id] as const,
  me: () => ['users', 'me'] as const,
}
