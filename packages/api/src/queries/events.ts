import type { Event } from '@glee/types'

export const eventKeys = {
  all: ['events'] as const,
  lists: () => ['events', 'list'] as const,
  list: (filters: { date?: string; venueId?: string; status?: Event['status']; minPrice?: number; maxPrice?: number }) =>
    ['events', 'list', filters] as const,
  byId: (id: string) => ['events', id] as const,
}

export async function fetchEvents(filters: {
  date?: string
  venueId?: string
  status?: Event['status']
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}): Promise<{ data: Event[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  throw new Error('Not implemented')
}

export async function fetchEventById(id: string): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}

export async function createEvent(_body: {
  venueId: string
  title: string
  description: string
  date: string
  startTime: string
  endTime?: string
  ticketTiers: { name: string; price: number; quantity: number; description?: string }[]
  flyerPortraitUrl?: string
  flyerSquareUrl?: string
}): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}

export async function updateEvent(_id: string, _body: Partial<{
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  ticketTiers: { id?: string; name: string; price: number; quantity: number; description?: string }[]
  flyerPortraitUrl: string
  flyerSquareUrl: string
}>): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}

export async function submitEventForApproval(_id: string): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}

export async function approveEvent(_id: string): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}

export async function rejectEvent(_id: string, _body: { reason: string }): Promise<{ data: Event }> {
  throw new Error('Not implemented')
}
