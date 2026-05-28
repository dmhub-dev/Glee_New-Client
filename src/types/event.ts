export interface EventMenuItem {
  id: string
  name: string
  category: string
  price: number
  description?: string
}

export interface TicketTier {
  id: string
  waveId?: string
  waveName?: string
  name: string
  price: number
  quantity: number
  quantityRemaining: number
  description?: string
}

export interface TicketWave {
  id: string
  name: string
  description?: string
  sequence: number
  startsAt: string
  endsAt: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  ticketTiers: TicketTier[]
}

export interface EventSchedule {
  id?: string
  name: string
  description: string
  startDate: string
  endDate: string
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
  ticketWaves?: TicketWave[]
  activeTicketWave?: TicketWave
  menuItems?: EventMenuItem[]
  schedules?: EventSchedule[]
  flyerPortraitUrl?: string
  flyerSquareUrl?: string
  status: 'draft' | 'active' | 'postponed' | 'cancelled' | 'sold_out'
  location?: string
  locationId?: string
  dresscode?: string
  categoryId?: string
  categoryName?: string
  createdAt: string
  updatedAt: string
}
