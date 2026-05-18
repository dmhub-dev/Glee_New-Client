import type { MenuItem, MenuBundle, MenuCategory } from '@glee/types'

export const menuKeys = {
  all: ['menus'] as const,
  byVenue: (venueId: string) => ['menus', 'venue', venueId] as const,
  itemById: (venueId: string, itemId: string) => ['menus', 'venue', venueId, 'item', itemId] as const,
  bundleById: (venueId: string, bundleId: string) => ['menus', 'venue', venueId, 'bundle', bundleId] as const,
}

export async function fetchVenueMenu(venueId: string): Promise<{
  data: { items: MenuItem[]; bundles: MenuBundle[] }
}> {
  throw new Error('Not implemented')
}

export async function addMenuItem(_venueId: string, _body: {
  category: MenuCategory
  name: string
  description?: string
  price: number
  imageUrl?: string
  available: boolean
  upsellSuggestions?: string[]
}): Promise<{ data: MenuItem }> {
  throw new Error('Not implemented')
}

export async function updateMenuItem(_venueId: string, _itemId: string, _body: Partial<{
  category: MenuCategory
  name: string
  description: string
  price: number
  imageUrl: string
  available: boolean
  upsellSuggestions: string[]
}>): Promise<{ data: MenuItem }> {
  throw new Error('Not implemented')
}

export async function deleteMenuItem(
  _venueId: string,
  _itemId: string,
  _options?: { force?: boolean },
): Promise<{ data: { deleted: true; id: string } }> {
  throw new Error('Not implemented')
}

export async function createMenuBundle(_venueId: string, _body: {
  name: string
  description?: string
  items: string[]
  price: number
  available: boolean
  validForDates?: string[]
}): Promise<{ data: MenuBundle }> {
  throw new Error('Not implemented')
}
