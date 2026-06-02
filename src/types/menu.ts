export type MenuCategory =
  | 'whisky'
  | 'vodka'
  | 'champagne'
  | 'gin'
  | 'cocktails'
  | 'mixers'
  | 'food'
  | 'packages'

export interface MenuItem {
  id: string
  venueId: string
  category: MenuCategory
  name: string
  description?: string
  price: number
  imageUrl?: string
  available: boolean
  upsellSuggestions?: string[]
}

export interface MenuBundle {
  id: string
  venueId: string
  name: string
  description?: string
  items: string[]
  price: number
  available: boolean
  validForDates?: string[]
}
