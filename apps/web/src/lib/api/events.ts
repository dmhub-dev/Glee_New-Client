import type { Event } from '@glee/types'

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
  location: string | null
  vendorId: string | null
  vendor: { id: string; name: string } | null
  categoryId: string | null
  category: { id: string; name: string } | null
  bannerImages: string[]
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  updatedAt: string
  ticketCategories: BackendTicketCategory[]
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
  const start = raw.startDate ? new Date(raw.startDate) : null
  const end   = raw.endDate   ? new Date(raw.endDate)   : null

  return {
    id:               raw.id,
    vendorId:         raw.vendorId ?? '',
    venueId:          raw.vendor?.name ?? raw.location ?? '',
    title:            raw.name,
    description:      raw.description ?? '',
    date:             start ? start.toISOString().split('T')[0] : '',
    startTime:        start ? start.toTimeString().slice(0, 5) : '',
    endTime:          end   ? end.toTimeString().slice(0, 5)   : undefined,
    ticketTiers: raw.ticketCategories.map(tc => ({
      id:                tc.id,
      name:              tc.name,
      price:             Number(tc.price),
      quantity:          tc.capacity ?? 0,
      quantityRemaining: tc.available ?? 0,
    })),
    flyerSquareUrl:   raw.bannerImages[0] ?? undefined,
    flyerPortraitUrl: raw.bannerImages[1] ?? raw.bannerImages[0] ?? undefined,
    status:           BACKEND_TO_STATUS[raw.status] ?? 'draft',
    location:         raw.location ?? undefined,
    categoryId:       raw.categoryId ?? undefined,
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
