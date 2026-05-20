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
  date: string
  startTime: string
  endTime?: string
  ticketTiers: TicketTier[]
  flyerPortraitUrl?: string
  flyerSquareUrl?: string
  status: 'draft' | 'pending_approval' | 'live' | 'rejected' | 'past' | 'cancelled' | 'postponed'
  location?: string
  dresscode?: string
  createdAt: string
  updatedAt: string
}
