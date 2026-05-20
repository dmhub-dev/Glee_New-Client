import type { Event } from '@glee/types'

export const ADMIN_MOCK_EVENTS: Event[] = [
  {
    id: 'evt-001',
    vendorId: 'vendor-001',
    venueId: 'Club Privé',
    title: 'Neon Nights',
    description: 'The biggest electronic music night in Nairobi. Headlined by international DJs with a full light show, open bar packages, and VIP bottle service.',
    date: '2026-05-30',
    startTime: '21:00',
    endTime: '04:00',
    status: 'live',
    location: 'Club Privé, Westlands, Nairobi',
    flyerPortraitUrl: '/events pics sample/concert_frame.jpg',
    flyerSquareUrl: '/events pics sample/event_thumb_1.jpg',
    ticketTiers: [
      { id: 'tier-001a', name: 'Early Bird', price: 500, quantity: 100, quantityRemaining: 23 },
      { id: 'tier-001b', name: 'Regular', price: 1000, quantity: 200, quantityRemaining: 145 },
      { id: 'tier-001c', name: 'VIP', price: 3000, quantity: 50, quantityRemaining: 8, description: 'Includes welcome drink and priority entry' },
    ],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'evt-002',
    vendorId: 'vendor-002',
    venueId: 'Skybar Rooftop',
    title: 'AfroFusion Saturdays',
    description: 'Afrobeats, Amapiano, and good vibes every Saturday. Best rooftop in the city with breathtaking skyline views.',
    date: '2026-06-06',
    startTime: '20:00',
    endTime: '03:00',
    status: 'live',
    location: 'Skybar Rooftop, Upper Hill, Nairobi',
    flyerPortraitUrl: '/events pics sample/weoutside.jpg',
    flyerSquareUrl: '/events pics sample/event_thumb_2.jpg',
    ticketTiers: [
      { id: 'tier-002a', name: 'Standard', price: 800, quantity: 150, quantityRemaining: 92 },
      { id: 'tier-002b', name: 'VIP Table', price: 2500, quantity: 40, quantityRemaining: 3, description: 'Reserved table with bottle service' },
    ],
    createdAt: '2026-05-05T12:00:00Z',
    updatedAt: '2026-05-05T12:00:00Z',
  },
  {
    id: 'evt-003',
    vendorId: 'vendor-001',
    venueId: 'Club Privé',
    title: 'Red & Black Ball',
    description: "Nairobi's most exclusive themed night. Dress code strictly enforced. Live jazz, soulful R&B sets, and surprise performances.",
    date: '2026-06-13',
    startTime: '19:00',
    endTime: '02:00',
    status: 'live',
    location: 'Club Privé, Westlands, Nairobi',
    flyerPortraitUrl: '/events pics sample/incredible-and-friends.jpeg',
    flyerSquareUrl: '/events pics sample/event_thumb_3.jpg',
    ticketTiers: [
      { id: 'tier-003a', name: 'General', price: 1500, quantity: 120, quantityRemaining: 67 },
      { id: 'tier-003b', name: 'Couples', price: 2500, quantity: 60, quantityRemaining: 2, description: 'Entry for two' },
      { id: 'tier-003c', name: 'VVIP', price: 5000, quantity: 20, quantityRemaining: 0, description: 'Private booth, bottle service, and dinner' },
    ],
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'evt-004',
    vendorId: 'vendor-003',
    venueId: 'The Loft',
    title: 'House Nation',
    description: 'Deep house, tech house, and everything in between. Underground vibes with a world-class sound system.',
    date: '2026-06-20',
    startTime: '22:00',
    endTime: '05:00',
    status: 'live',
    location: 'The Loft, Karen, Nairobi',
    flyerPortraitUrl: '/events pics sample/club_frame.jpg',
    flyerSquareUrl: '/events pics sample/event_thumb_4.jpg',
    ticketTiers: [
      { id: 'tier-004a', name: 'Presale', price: 600, quantity: 80, quantityRemaining: 0, description: 'Limited presale — sold out' },
      { id: 'tier-004b', name: 'Door', price: 1200, quantity: 200, quantityRemaining: 178 },
    ],
    createdAt: '2026-05-12T14:00:00Z',
    updatedAt: '2026-05-12T14:00:00Z',
  },
  {
    id: 'evt-005',
    vendorId: 'vendor-002',
    venueId: 'Skybar Rooftop',
    title: 'Midsummer Dream',
    description: 'A magical midsummer night celebration under the stars. Live band, fire dancers, and an outdoor pool party.',
    date: '2026-06-27',
    startTime: '18:00',
    endTime: '02:00',
    status: 'draft',
    location: 'Skybar Rooftop, Upper Hill, Nairobi',
    flyerPortraitUrl: '/events pics sample/weoutside.jpg',
    flyerSquareUrl: '/events pics sample/event_thumb_5.jpg',
    ticketTiers: [
      { id: 'tier-005a', name: 'Early Bird', price: 1000, quantity: 100, quantityRemaining: 100 },
      { id: 'tier-005b', name: 'Standard', price: 1500, quantity: 200, quantityRemaining: 200 },
      { id: 'tier-005c', name: 'VIP Cabana', price: 4000, quantity: 30, quantityRemaining: 30, description: 'Cabana access + 1 bottle' },
    ],
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-05-15T09:00:00Z',
  },
  {
    id: 'evt-006',
    vendorId: 'vendor-004',
    venueId: 'Havana Club',
    title: 'Latin Night',
    description: 'Salsa, bachata, and reggaeton under one roof. Dance lessons from 7pm, DJ takes over at 10pm.',
    date: '2026-07-04',
    startTime: '19:00',
    endTime: '03:00',
    status: 'pending_approval',
    location: 'Havana Club, Kilimani, Nairobi',
    flyerPortraitUrl: '/events pics sample/concert_frame.jpg',
    flyerSquareUrl: '/events pics sample/event_thumb_1.jpg',
    ticketTiers: [
      { id: 'tier-006a', name: 'Standard', price: 700, quantity: 180, quantityRemaining: 180 },
      { id: 'tier-006b', name: 'VIP', price: 2000, quantity: 40, quantityRemaining: 40, description: 'Includes one cocktail on arrival' },
    ],
    createdAt: '2026-05-18T11:00:00Z',
    updatedAt: '2026-05-18T11:00:00Z',
  },
  {
    id: 'evt-007',
    vendorId: 'vendor-003',
    venueId: 'The Loft',
    title: 'New Year Pre-Party',
    description: 'The countdown warm-up event. Exclusive crowd, premium bottles, and surprise celebrity appearances.',
    date: '2025-12-28',
    startTime: '20:00',
    endTime: '03:00',
    status: 'past',
    location: 'The Loft, Karen, Nairobi',
    flyerSquareUrl: '/events pics sample/event_thumb_4.jpg',
    ticketTiers: [
      { id: 'tier-007a', name: 'Standard', price: 1200, quantity: 200, quantityRemaining: 0 },
      { id: 'tier-007b', name: 'VIP', price: 3500, quantity: 50, quantityRemaining: 0 },
    ],
    createdAt: '2025-11-20T10:00:00Z',
    updatedAt: '2025-12-29T08:00:00Z',
  },
]

let eventsStore: Event[] = [...ADMIN_MOCK_EVENTS]

export function getAdminEvents(): Promise<Event[]> {
  return new Promise(resolve => setTimeout(() => resolve([...eventsStore]), 300))
}

export function getAdminEvent(id: string): Promise<Event | undefined> {
  return new Promise(resolve => setTimeout(() => resolve(eventsStore.find(e => e.id === id)), 300))
}

export function createAdminEvent(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  const newEvent: Event = {
    ...data,
    id: `evt-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  eventsStore = [newEvent, ...eventsStore]
  return new Promise(resolve => setTimeout(() => resolve(newEvent), 300))
}

export function updateAdminEvent(id: string, data: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<Event> {
  eventsStore = eventsStore.map(e =>
    e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
  )
  const updated = eventsStore.find(e => e.id === id)!
  return new Promise(resolve => setTimeout(() => resolve(updated), 300))
}

export function deleteAdminEvent(id: string): Promise<void> {
  eventsStore = eventsStore.filter(e => e.id !== id)
  return new Promise(resolve => setTimeout(resolve, 300))
}
