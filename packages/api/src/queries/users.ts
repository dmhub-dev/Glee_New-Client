import type { User } from '@glee/types'

export const userKeys = {
  all: ['users'] as const,
  lists: () => ['users', 'list'] as const,
  byId: (id: string) => ['users', id] as const,
  me: () => ['users', 'me'] as const,
}

export async function fetchMe(): Promise<{ data: User }> {
  throw new Error('Not implemented')
}

export async function fetchUserById(_id: string): Promise<{ data: User }> {
  throw new Error('Not implemented')
}

export async function fetchUsers(_filters?: {
  role?: User['role']
  page?: number
  limit?: number
}): Promise<{ data: User[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  throw new Error('Not implemented')
}
