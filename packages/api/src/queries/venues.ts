import type { Venue, MenuItem, MenuBundle } from '@glee/types'

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => ['venues', 'list'] as const,
  list: (filters?: { status?: Venue['status'] }) => ['venues', 'list', filters] as const,
  byId: (id: string) => ['venues', id] as const,
}

export async function fetchVenues(filters?: {
  status?: Venue['status']
  page?: number
  limit?: number
}): Promise<{ data: Venue[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  throw new Error('Not implemented')
}

export async function fetchVenueById(id: string): Promise<{
  data: Venue & { menu: { items: MenuItem[]; bundles: MenuBundle[] } }
}> {
  throw new Error('Not implemented')
}

export async function createVenue(_body: {
  name: string
  description: string
  location: string
  heroBannerUrl?: string
  galleryUrls?: string[]
  tableCategories: {
    name: string
    capacity: number
    minimumSpend: number
    depositAmount: number
    requiresFullPayment: boolean
    count: number
  }[]
  bookingRules?: string
}): Promise<{ data: Venue }> {
  throw new Error('Not implemented')
}

export async function updateVenue(_id: string, _body: Partial<{
  name: string
  description: string
  location: string
  heroBannerUrl: string
  galleryUrls: string[]
  tableCategories: {
    id?: string
    name: string
    capacity: number
    minimumSpend: number
    depositAmount: number
    requiresFullPayment: boolean
    count: number
  }[]
  bookingRules: string
}>): Promise<{ data: Venue }> {
  throw new Error('Not implemented')
}
