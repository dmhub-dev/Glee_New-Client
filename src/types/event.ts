export interface EventMenuItem {
  id: string
  name: string
  category: string
  price: number
  description?: string
}

export interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantityRemaining: number
  description?: string
}

export interface Event {
  id: string
  vendorId: string
  venueId: string
  title: string
  description: string
  startDate: string   // YYYY-MM-DD — first day of event
  endDate: string     // YYYY-MM-DD — last day (equals startDate for single-day events)
  startTime: string
  endTime?: string
  ticketTiers: TicketTier[]
  menuItems?: EventMenuItem[]
  flyerPortraitUrl?: string
  flyerSquareUrl?: string
  status: 'draft' | 'pending_approval' | 'live' | 'rejected' | 'past' | 'cancelled' | 'postponed'
  location?: string
  dresscode?: string
  categoryId?: string
  createdAt: string
  updatedAt: string
}
