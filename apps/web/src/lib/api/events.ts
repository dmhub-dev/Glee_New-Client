import type { Event, EventMenuItem } from '@glee/types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// ── Backend shapes ────────────────────────────────────────────────────────────

interface BackendTicketCategory {
  id: string
  name: string
  price: string | number
  capacity: number | null
  available: number | null
}

interface BackendEvent {
  id: string
  name: string
  description: string | null
  price: string | number
  capacity: number | null
  availableTickets: number | null
  locationName: string | null
  city: string | null
  state: string | null
  country: string | null
  bannerImages: string[]
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  updatedAt: string
  location: { id: string; name: string; address: string } | null
  ticketCategories: BackendTicketCategory[]
  menuItems: Array<{
    id: string
    name: string
    category: string
    price: string | number
    description?: string | null
  }>
}

// ── Status map ────────────────────────────────────────────────────────────────

const BACKEND_TO_STATUS: Record<string, Event['status']> = {
  ACTIVE:    'live',
  INACTIVE:  'draft',
  SUSPENDED: 'pending_approval',
  DONE:      'past',
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapBackendToEvent(raw: BackendEvent): Event {
  const start     = raw.startDate ? new Date(raw.startDate) : null
  const end       = raw.endDate   ? new Date(raw.endDate)   : null
  const locationStr = (raw.location?.name
    ?? raw.locationName
    ?? [raw.city, raw.state, raw.country].filter(Boolean).join(', '))
    || undefined

  const ticketTiers = raw.ticketCategories?.length
    ? raw.ticketCategories.map(tc => ({
        id:                tc.id,
        name:              tc.name,
        price:             Number(tc.price),
        quantity:          tc.capacity ?? 0,
        quantityRemaining: tc.available ?? tc.capacity ?? 0,
      }))
    : (() => {
        const price     = Number(raw.price) || 0
        const capacity  = raw.capacity ?? 0
        const available = raw.availableTickets ?? capacity
        return capacity > 0 ? [{ id: raw.id + '_default', name: 'General', price, quantity: capacity, quantityRemaining: available }] : []
      })()

  return {
    id:               raw.id,
    vendorId:         '',
    venueId:          locationStr ?? '',
    title:            raw.name,
    description:      raw.description ?? '',
    startDate:        start ? start.toISOString().split('T')[0] : '',
    endDate:          end   ? end.toISOString().split('T')[0]   : (start ? start.toISOString().split('T')[0] : ''),
    startTime:        start ? start.toTimeString().slice(0, 5) : '',
    endTime:          end   ? end.toTimeString().slice(0, 5)   : undefined,
    ticketTiers,
    menuItems: raw.menuItems?.map((m): EventMenuItem => ({
      id:          m.id,
      name:        m.name,
      category:    m.category,
      price:       Number(m.price),
      description: m.description ?? undefined,
    })) ?? [],
    flyerSquareUrl:   raw.bannerImages[0] ?? undefined,
    flyerPortraitUrl: raw.bannerImages[1] ?? raw.bannerImages[0] ?? undefined,
    status:           BACKEND_TO_STATUS[raw.status] ?? 'draft',
    location:         locationStr,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
  }
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(`${BASE}/api/v1/event?page=1&limit=100`)
  if (!res.ok) return []
  const data = await res.json() as { success: boolean; data: BackendEvent[] }
  return (data.data ?? [])
    .map(mapBackendToEvent)
    .filter(e => e.status === 'live')
}

export async function fetchEvent(id: string): Promise<Event | undefined> {
  if (!id) return undefined
  const res = await fetch(`${BASE}/api/v1/event/${id}`)
  if (!res.ok) return undefined
  const data = await res.json() as { success: boolean; data: BackendEvent }
  if (!data.success || !data.data) return undefined
  return mapBackendToEvent(data.data)
}
